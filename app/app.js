// app/app.js
const http = require('http');
const request = require('request');
const path = require('path');
const Koa = require('koa');
var serve = require('koa-static');
const koaRouter = require('koa-router');
const koaBody = require('koa-body');
const render = require('koa-ejs');
const seleniumtest = require('./selenium-test.js');
const json = require('json')
const fs = require('fs');

const db = require('./db.js')

const app = module.exports = new Koa();
const router = koaRouter();

const server = require('http').createServer(app.callback());
var io = require('socket.io')(server);
var currentSocket;

var timer;
var skipList = [];

var bpm_connected = false;
var bpmUsedForAlg = false;
var mode = 0; // default is training mode
var pause_num = 0;
var inited = false;
var playing = false;

var logfile;
var user = null;
var isAdmin = false;
var restBPM;

render(app, {
  root: path.join(__dirname, 'view'),
  layout: 'template',
  viewExt: 'html',
  cache: false,
  debug: false
});
app.use(serve('./public'));
app.use(koaBody());// for parsing koa ctx.request body

app
  .use(router.routes())
  .use(router.allowedMethods());

router.post('/soundscape', async (ctx, next) => {
  // if (!user) { // if no user is signed in/up
  //   user = ctx.request.body['username'];
  //   var re = db.findName(ctx.request.body['username']); // check if user exists
  //   if (re) {
  //     user = re["name"]; // get user name
  //     seleniumtest.loadValues(user, mode); // load action values from file
  //   }
  //   // add a new user to database
  //   // if an existing user signs up again, restbpm is updated.
  //   logfile = db.addUser(user, ctx.request.body['restbpm']);
  //   seleniumtest.setLogFile(logfile);

  //   // check if training time > 3hours
  //   if (db.findTime(user) > 10800000){
  //     mode = 1;
  //     seleniumtest.setMode(1)
  //   }
  // }
  // else { // if already sign in/up, prevent it to sign in/up again
  logfile = "./log/" + user + ".log";
  seleniumtest.setLogFile(logfile);
  
  restbpm(db.getRestBPM(user)); // set restbpm for user

  if (user.toLowerCase() == "admin") {
    isAdmin = true;
  }

  await ctx.render('soundscape');
  if (!inited) {
    bpmUsedForAlg = true;
    initialize();
    ioconnection();
  }
  // log user mood description
  let str = "Timestamp: "+Date.now()+"; Pre log: "+ctx.request.body['mood']+"\n";
  fs.appendFileSync(logfile, str);
})

router.get('/soundscape', async (ctx, next) => {
  console.log("getting");
  if (inited && user) {
    await ctx.render('soundscape');
  }
  else{
    //ctx.response.status = 400;
    //ctx.response.body = "alert(\"You have to sign in/up first!\")";
    ctx.redirect("/");
  }
})

router.post('/signin', async (ctx, next) => {
  if (!user) {
    var re = db.findName(ctx.request.body['username']); // check if user exists
    if (re){
      user = re["name"]; // get user name
      seleniumtest.loadValues(user); // load action values from file

      // check if training time > 3hours
      if (db.findTime(user) > 10800000){
        mode = 1;
        seleniumtest.setMode(1)
      }

      // redirect to the url '/soundscape'
      ctx.status = 307;
      ctx.redirect("/soundscape");
    }
    else {
      // haven't signed up yet, requires to sign up first
      ctx.response.status = 400;
      ctx.response.body = "<p>You have to sign up first!</p></br><button class=\"btn btn-block\" onclick=\"location.href='http://localhost:3000'\" >return to main page </button> ";
      //ctx.redirect("/");
    }
  }
  else {
    // if signed in/up, redirect to url '/soundscape'
    ctx.redirect("/soundscape");
  }
})

router.post('/end', async(ctx, next) => {
  let str = "Timestamp: "+Date.now()+"; Post log: "+ctx.request.body['endmood']+"\n";
  fs.appendFileSync(logfile, str);
  process.exit();
})

router.get('/end', async(ctx, next) => {
  await ctx.render('end');
})

router.post('/signup', async(ctx, next) => {
    // add a new user to database
    newUserLogFile = db.addUser(ctx.request.body['username'], restBPM);
    let str = "resting heart rate: " + restBPM + "\n";
    fs.appendFileSync(newUserLogFile, str);
    ctx.response.status = 200;
    ctx.response.body = "<p>You have successfully signed up!</p></br><button class=\"btn btn-block\" onclick=\"location.href='http://localhost:3000'\" >return to main page </button> ";
})


router.get('/', async (ctx, next) => {
  if (!user) {
    await ctx.render('index');
    getHeartRateAtSignUp();
  }
  else {
    ctx.redirect("/soundscape");
  }
});

async function initialize(){
  await seleniumtest.init().then(()=>{
      inited = true;
    })
}
/*
router.post('/test', async (ctx, next) =>{
  if (ctx.request.body["bpm"] > 0) {
    seleniumtest.addBPM(ctx.request.body["bpm"]);
  }
});
*/


async function restbpm(arg){
  //console.log(arg);
  seleniumtest.restBPM(arg);
}


async function stop(fromTimeout){
  var sessionTime;
  if (typeof timer == 'undefined'){ // timer not initialized means play never clicked
    sessionTime = 0;
  }
  else{
    sessionTime = timer.getSessionTime();
  }
  var str = "Timestamp: "+Date.now()+'; Action: exiting; Session lenght: '+sessionTime+'\n';
  fs.appendFileSync(logfile, str);
  db.updateTime(user, sessionTime);
  seleniumtest.close(fromTimeout);
}

function getHeartRateAtSignUp(){
  let firstRequest = true;
  let startTime;
  let total = 0;
  let average = 0;
  io.on('connection', async(socket) => {
    currentSocket = socket;
    currentSocket.on('getBPM', () => {
      router.post('/test', async (ctx, next) =>{
        if (bpmUsedForAlg){
          if (!bpm_connected){
            if (inited) {
              let str = "Timestamp: "+Date.now()+"; connected\n";
              fs.appendFileSync(logfile, str);
              currentSocket.emit("init123", "world");
              bpm_connected = true;
            }
          }
          else
            if (ctx.request.body && inited) {
              //console.log(ctx.request.body)
              seleniumtest.addBPM(ctx.request.body);
            }
        }
        else{ // used for signup
          if (firstRequest){
            startTime = Date.now();
            currentSocket.emit('updateProgress',null);
            firstRequest = false;
          }
          if (Date.now()-startTime > 60000){
            currentSocket.emit('updateProgress',null);
            total += 1;
            if (total > 3){
              average+=parseInt(ctx.request.body);
            }
            if (total==10){
              restBPM = average/7;
            }
          }
        }
      })
    })

  })
}


function ioconnection(){
  io.on('connection', async (socket) => {
    currentSocket = socket;
      //console.log(seleniumtest);
      //await seleniumtest.init().then(()=>{
      router.post('/test', async (ctx, next) =>{
        if (!bpm_connected){
          if (inited) {
            let str = "Timestamp: "+Date.now()+"; connected\n";
            fs.appendFileSync(logfile, str);
            socket.emit("init123", "world");
            bpm_connected = true;
          }
        }
        else
          if (ctx.request.body && inited) {
            //console.log(ctx.request.body)
            seleniumtest.addBPM(ctx.request.body);
          }
      });
      socket.emit("isAdmin", isAdmin);
      socket.emit("setMode", mode);  
  }); 
}

io.on('connection', async (socket) => {
      //console.log(`Socket ${socket.id} connected. pause_num:`, pause_num);

      socket.on('disconnect', () => {
        //console.log(`Socket ${socket.id} disconnected.`);
      });
      if (inited) {
        //console.log(socket.id, pause_num)
        if (pause_num%2 == 0) {
          socket.emit("reload", false);
        }
        else socket.emit("reload", true);
      }

      socket.on("startsocket", async (arg) => {
        await seleniumtest.startFirstSound().then((e)=>{
          let str = "Timestamp: "+ Date.now()+ "; Action: started" + e[1] + "\n";
          fs.appendFileSync(logfile, str);
          socket.emit("next", e[0]);
        });
        //timeout(1, 0);
        timer = new Timer(callbackfn, seleniumtest.timer);
        pause_num += 1;
      });
      socket.on("nextsocket", async (arg) => {
        let canskip = true;
        if (skipList.length < 4){
          skipList.push(Date.now());
        }
        else{
          if ((Date.now()-skipList[0]) > 600000){
            skipList.shift(); // remove skip if it has been more than 10 minutes
            skipList.push(Date.now());
          }
          else{
            socket.emit('surfing', null); // alert using he is skipping too much
            canskip = false;
          }
        }
        if (canskip){
          if (pause_num%2 == 0) {
            timer.resume();
          }
          timer.restart();
        }
      });
      socket.on("stopsocket", async (arg) => {
        if (arg){ // timeout
          let str = "Timestamp: "+ Date.now()+ "; Action: session timed out\n";
          fs.appendFileSync(logfile, str);
        }
        stop(arg);
      });
      /*
      socket.on('disconnect', () => {
        stop();
          console.log("Timestamp: ", Date.now(),' user disconnected');
      });
      */
      socket.on('restbpm', async (arg)=> {
        restbpm(arg);
      })
      socket.on("mode", async (arg) => {
        mode = arg;
        seleniumtest.setMode(mode);
      })
      socket.on("pausesocket", async (arg) => {
        pause_num += 1;
        //console.log(pause_num)
        if (pause_num%2 == 0) {
          timer.pause();
        }
        else{
          timer.resume();
        }
      });
      socket.on("changeVolume", async (arg) => {
        var change_nums = Math.floor(parseFloat(arg) / 3);
        seleniumtest.changeVolume(change_nums);
      });

      socket.on("epsilon", async (arg) =>{
        seleniumtest.changeEpsilon(parseFloat(arg));
        let str = ("Timestamp: " + Date.now() + "; Action: change epsilon to: " + arg+ "\n");
        fs.appendFileSync(logfile, str);
      })

      socket.on("alpha", async(arg) => {
        seleniumtest.changeAlpha(parseFloat(arg));
        let str = ("Timestamp: " + Date.now() + "; Action: change alpha to: " + arg+ "\n");
        fs.appendFileSync(logfile, str);
      })

      function callbackfn(){
          timer.switch(this, seleniumtest.timeouts)
      }
      

      async function playNext(action){
          var msg = seleniumtest.playNext(mode, action);
          msg.then(async (e)=>{
            var a = null;
            switch(action){
              case 1:
                a = "next_pressed";
                break;
              case 0:
                a = "switched";
                break;
            }
            let str = ("Timestamp: "+ Date.now()+ "; Action: "+ a + e[1]+ "\n");
            fs.appendFileSync(logfile, str);
            socket.emit("next", e[0]);
            seleniumtest.getVolume().then((v) =>{
              //console.log("get volume:", v);
              socket.emit("volume", v);
            });
            
          })
      }
      var Timer = function(callback, delay) {
          var timerId, start, fixedtime = delay
          var first = true;
          var lastStart = Date.now();
          var total = 0
          this.pause = function() {
              seleniumtest.pause()
              clearTimeout(timerId);
              let str = "Timestamp: "+ Date.now()+ "; Action: pause\n";
              fs.appendFileSync(logfile, str);
              total += Date.now() - lastStart; // update time spent in training
          };

          this.resume = async function() {
              if(!first){
                seleniumtest.pause()
                let str = "Timestamp: "+ Date.now()+ "; Action: resume; restarting previous sound\n";
                fs.appendFileSync(logfile, str);
              }
              else{
                seleniumtest.getVolume().then((v) =>{
                  //console.log("get volume:", v);
                  socket.emit("volume", v);
                });
                first = false;
              }
              start = Date.now();
              clearTimeout(timerId);
              timerId = setTimeout(callback, fixedtime);
              lastStart = Date.now();  
          };

          this.restart = function() {
              playNext(1)
              start = Date.now();
              clearTimeout(timerId);
              timerId = setTimeout(callback, fixedtime);
          };

          this.switch = function (){
              playNext(0)
              start = Date.now();
              clearTimeout(timerId);
              timerId = setTimeout(callback, fixedtime);
          }

          this.getSessionTime = function(){
            total += Date.now() - lastStart; // update time spent in training
            return total;
          }

          this.resume();
      };
  });

server.listen(3000, () => {
    //console.log('listening on *:3000');
});

module.exports = server;
