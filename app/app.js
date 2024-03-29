// app/app.js
const http = require('http');
const path = require('path');
const Koa = require('koa');
const serve = require('koa-static');
const koaRouter = require('koa-router');
const koaBody = require('koa-body');
const render = require('koa-ejs');

const seleniumtest = require('./selenium-test.js');
const json = require('json')
const fs = require('fs');
// low db
const db = require('./db.js')

const Drive = require('./drivelog');
const { set } = require('mongoose');

const app = module.exports = new Koa();
const router = koaRouter();

// http instance for the server to connect to
const browserServer = http.createServer(app.callback());
var browserio = require('socket.io')(browserServer);

// http instance for the phone to connect to 
const dataServer = http.createServer(app.callback());
var dataio = require('socket.io')(dataServer);

var portnumber = 0; // portnumber is assigned manually
var arm = 1; // default arm for experiments is 1

var browserConnected = false; 
var hgConnected = false; // true once a watch connects
var killOnDisconnect = false;
var firstHR = false;
var critHR = false;
var paused = false;
var inited = false;
var bpm_connected = false;

var timer;
var skipList = [];


var mode = 0; // default is training mode
var pause_num = 0;
var total = 0;
var average = 0;


var drivelog;
var logfile;
var user = null;
var isAdmin = false;
var restBPM;
var browserSocket;
var dataSocket;

var soundscapes_listen = false;
var signup_listen = false;

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
  if (user) {
    killOnDisconnect = true;
    drivelog = new Drive(user);
    logfile = "./log/" + user + ".log";
    seleniumtest.setLogFile(logfile);
    restbpm(db.getRestBPM(user)); // set restbpm for user

    if (user.toLowerCase() == "admin") {
      isAdmin = true;
    }

    await ctx.render('soundscape');
    if (!inited) {
      if (arm == 1 || arm == 2 || arm == 3){
        initialize();
      }
    }

    soundscapes_listen = true;

    // log user mood description
    let str = Date.now()+"; Experiment Arm: "+arm+"\n";
    fs.appendFileSync(logfile, str);
    str = Date.now()+"; Pre log: "+ctx.request.body['mood']+"\n";
    fs.appendFileSync(logfile, str);
  }
  else{
    ctx.redirect("/");
  }
})

router.get('/soundscape', async (ctx, next) => {
  if (inited && user) {
    await ctx.render('soundscape');
  }
  else{
    ctx.redirect("/");
  }
})

router.post('/signin', async (ctx, next) => {
  let nait = ctx.request.body['nait']
  
  if (nait == "2arm"){
    arm = 2;
    // reset values to 0
  }
  else if (nait == "3arm"){
    arm = 3;
    // grey noise. No learning
  }
  else if (nait == "4arm"){
    arm = 4;
    // no sound. no learning
  }

  if (user != ctx.request.body['username']) {
    var re = db.findName(ctx.request.body['username']); // check if user exists
    if (re){
      user = re["name"]; // get user name
      if (arm == 1){
        seleniumtest.loadValues(user); // load action values from file
      }
      else if (arm == 2){
        seleniumtest.resetValues(user+"_arm2"); // set action values to 0
      }

      // check if training time > 3hours
      if (db.findTime(user) > 10800000){
        mode = 1;
        seleniumtest.setMode(1)
      }

      if (db.getRestBPM(user) > 0){
        // redirect to the url '/soundscape'
        portnumber = db.getPortNumber(user);
        dataServer.listen(portnumber, () => {  // start data server
          console.log('data server is running at http://localhost:' + portnumber);
        });
        ctx.status = 307;
        ctx.redirect("/soundscape");
      }
      else{
        ctx.status = 307;
        ctx.redirect("/heartrate");
      }
    }
    else {
      // haven't signed up yet, requires to sign up first
      ctx.response.status = 400;
      ctx.response.body = "<p>This user does not exist!</p></br><button class=\"btn btn-block\" onclick=\"location.href='http://localhost:3000'\" >return to main page </button> ";
    }
  }
  // else {
  //   // if signed in/up, redirect to url '/soundscape'
  //   if (db.getRestBPM(user) > 0){
  //     seleniumtest.loadValues(user); // load action values from file
  //     // check if training time > 3hours
  //     if (db.findTime(user) > 10800000){
  //       mode = 1;
  //       seleniumtest.setMode(1)
  //     }
  //     // redirect to the url '/soundscape'
  //     ctx.status = 307;
  //     ctx.redirect("/soundscape");
  //   }
  //   else{
  //     ctx.status = 307;
  //     ctx.redirect("/heartrate");
  //   }
  // }
})

router.post('/end', async(ctx, next) => {
  let str = Date.now()+"; Post log: "+ctx.request.body['endmood']+"\n";
  fs.appendFileSync(logfile, str);
  try{
    await logToDrive();
  }
  catch(err){
    console.log("failed to log to drive");
  }
  process.exit();
})

router.get('/end', async(ctx, next) => {
  if (inited && user) {
    await ctx.render('end');
  }
  else{
    ctx.redirect("/");
  }
})

router.post('/signup', async(ctx, next) => {
  // add a new user to database
  user = ctx.request.body['username'];
  portnumber = ctx.request.body['portnumber'];

  dataServer.listen(portnumber, () => {  // start data server
    console.log('data server is running at http://localhost:' + portnumber);
  });

  console.log('added user: ' + user);
  logfile = db.addUser(user, 0, portnumber);
  ctx.response.status = 307;
  ctx.redirect("/heartrate");
})

router.post('/heartrate', async(ctx, next) => {
  signup_listen = true;
  await ctx.render('heartrate');
})

router.get('/heartrate', async(ctx, next) => {
  if (user) {
    signup_listen = true;
    await ctx.render('heartrate');
  }
  else{
    ctx.redirect("/");
  }
})

router.get('/', async (ctx, next) => {
  if (!user || !inited) {
    db.cleanDB();
    if (db.dbEmpty()){
      await ctx.render('signup');
    }
    else{
      await ctx.render('start');
    }
  }
  else {
    ctx.redirect("/soundscape");
  }
});

async function initialize(){
  if (arm == 1 || arm == 2){
    await seleniumtest.init().then(()=>{
        inited = true;
        if (!bpm_connected){
          browserSocket.emit("loaded");
        }
        else{ // already connnected from resting hr
          browserSocket.emit("init123", "world");
        }
      })
    }
  else if (arm == 3){
    await seleniumtest.initGrey().then(()=>{
      inited = true;
      browserSocket.emit("arm34", null);
            if (!bpm_connected){
        browserSocket.emit("loaded");
      }
      else{ // already connnected from resting hr
        browserSocket.emit("init123", "world");
      }
    })
  }
}

async function restbpm(arg){
  seleniumtest.restBPM(arg);
}

async function logToDrive(){
  fileId = db.getDriveId(user);
  if (fileId == -1){ // user log file not in drive yet
    await drivelog.createAndUploadFile().then((id) => {
      if (id == -1){
        console.log("Failed to create log in drive");
      }
      else{
        db.setDriveId(user,id);
      }
    });

  }
  else{ // user log file exists in 
    await drivelog.updateFile(fileId).then((returnStatus) => {
      if (returnStatus == -1){
        console.log("Failed to update log in drive");
      }
    })
  }
}


async function stop(fromTimeout){
  var sessionTime;
  if (typeof timer == 'undefined' || !inited){ // timer not initialized means play never clicked
    sessionTime = 0;
  }
  else{
    sessionTime = timer.getSessionTime();
  }
  var totalTime = db.updateTime(user, sessionTime);
  var str = Date.now()+'; Action: exiting; Session lenght: '+sessionTime+' - Total time: '+totalTime+'\n';
  fs.appendFileSync(logfile, str);
  seleniumtest.close(fromTimeout);
}

dataio.on('connection', async (socket) => {

  if (!hgConnected){
    console.log("watch connected");
    hgConnected = true;
    dataSocket = socket;
  }
  else{
    console.log("too many connections to data server");
    // kill here?
  }

  socket.on('message', function name(data) {
    if (!paused){
      fs.appendFileSync(logfile, Date.now()+"; received message from watch: "+JSON.stringify(data)+"\n");
      console.log(data)
      if (soundscapes_listen){  // handle data on soundscapes page
        if (data.hasOwnProperty("command")){
          if (data.command == "Connect"){
            if (data.id == user){
              console.log("connected");
              let str = Date.now()+"; connected with watch\n";
              fs.appendFileSync(logfile, str);
              bpm_connected = true;
              browserSocket.emit("init123", "world");
              browserSocket.emit("setMode", mode);
            }
          }
          else if (data.command == "Heartrate"){
            if (bpm_connected && inited){
              if (arm == 1 || arm == 2){
                if (firstHR){ 
                  firstHR = false;
                  if (timer){
                    total = 0;
                    timer.stop();
                    timer.startIota();
                  }
                }
                else{ 
                  total += 1;
                  seleniumtest.addBPM(data.heartrate);
                  if (total == 5 && !critHR) {
                    stop(true);
                  }
                  else if (critHR){
                    let timeElapsed = timer.getSessionTime();
                    if (timeElapsed + db.findTime(user) > 10800000){
                      mode = 1;
                      seleniumtest.setMode(1);
                      browserSocket.emit("setMode", mode);
                    }
                    total = 0;
                    critHR = false;
                    timer.switch();
                  }
                }
              }
              else if (arm == 3 || arm == 4){
                seleniumtest.addBPM(data.heartrate);
                timer.start();
              }
            }
          }
        } 
      }
      else if (signup_listen){  // handle data on signup page (get resting hr)
        if (!timer){
          timer = new ComplexTimer(callbackfn);
        }
        if (data.hasOwnProperty("command")){
          if (data.command == "Connect"){
            if (data.id == user){
              bpm_connected = true;
              browserSocket.emit('updateProgress', null);
              timer.start();
            }
          }
          else if (data.command == "Heartrate"){
            if (firstHR){ // ignore first hr
              firstHR = false;
              browserSocket.emit('updateProgress', null);
              if (timer){
                total = 0;
                timer.stop();
                timer.start();
              }
            }
            else if (bpm_connected){
              var hr = data.heartrate
              total += 1;
              if (total < 5){
                browserSocket.emit('updateProgress', null);
              }
              if (total > 2){ // after 2 minutes start averaging hr (first is ignored)
                average+=hr;
              }
              if (total==5){ // after 5 minutes return average
                if (timer.stopWithIota()){
                  timer = null;
                  total = 0;
                  restBPM = (average/3).toFixed(1);
                  browserSocket.emit('updateProgress', restBPM);
                }
                else{
                  browserSocket.emit('nosignal', null);
                  setTimeout(function(){  // wait 1 seconds before stopping
                    stop(true);
                  }, 1000);
                }
              }
            }
          }
        } 
      }
    }
  })

  socket.on('disconnect', () => {
    console.log(`socket ${socket.id} disconnected.`);
    if (killOnDisconnect){
      browserSocket.emit('nosignal', null); // phone disconnected. stop
      let str = Date.now()+"; phone disconnected!\n";
      fs.appendFileSync(logfile, str);
      setTimeout(function(){  // wait 2 seconds before stopping
        if (killOnDisconnect){
          stop(true);
        }
      }, 2000);
    }
  });

});


browserio.on('connection', async (socket) => {

  if (!browserConnected){
    console.log("browser connected");
    browserConnected = true;
    browserSocket = socket;
    if (arm == 3){
      browserSocket.emit("arm34", null);
    }
    if (arm == 4){ //initialize arm 4 here
      inited = true;
      browserSocket.emit("arm34", null);
      if (!bpm_connected){
        browserSocket.emit("loaded");
      }
      else{ // already connnected from resting hr
        browserSocket.emit("init123", "world");
      }
    }
  }
  else{
    console.log("too many connections to browser");
    // kill here?
  }

  // if (inited) {

  //   if (pause_num%2 == 0) {
  //     socket.emit("reload", false);
  //   }
  //   else socket.emit("reload", true);
  // } 
  
  socket.on("finish", async (arg) => {
    let str = "resting heart rate: " + restBPM + "; Signed up\n";
    fs.appendFileSync(logfile, str);
    db.addUser(user, restBPM, portnumber);
    setTimeout(function(){  // wait half a second before stopping
      socket.emit('done', null);
      stop(true);
    }, 500);
  });

  socket.on("restart", async (arg) => {
    let str = "resting heart rate calculated: " + restBPM + "; RESTARTING\n";
    fs.appendFileSync(logfile, str);
    total = 0;
    average = 0;
    firstHR = true;
  });

  socket.on("startsocket", async (arg) => {
    if (arm == 1 || arm == 2){
      await seleniumtest.startFirstSound().then((e)=>{
        let str = Date.now()+ "; Action: started" + e[1] + "\n";
        fs.appendFileSync(logfile, str);
        socket.emit("next", e[0]);
      });
      timer = new ComplexTimer(callbackfn);
      timer.startIota();
    }
    else if (arm == 3){
      await seleniumtest.startGrey().then(()=>{
        let str = Date.now()+ "; Action: started grey noise\n";
        fs.appendFileSync(logfile, str);
        socket.emit("next", null);
      });
      timer = new SimpleTimer(callbackfn);
      timer.start();
    }
    else if (arm == 4){
      let str = Date.now()+ "; Action: started no sound\n";
      fs.appendFileSync(logfile, str);
      socket.emit("next", null);
      timer = new SimpleTimer(callbackfn);
      timer.start();
    }
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
      timer.next();
    }
  });

  socket.on("stopsocket", async (arg) => {
    if (arg){ // timeout
      let str = Date.now()+ "; Action: session timed out\n";
      fs.appendFileSync(logfile, str);
    }
    killOnDisconnect = false;
    stop(arg);
  });

  socket.on("mode", async (arg) => {
    mode = arg;
    seleniumtest.setMode(mode);
  })

  socket.on("pausesocket", async (arg) => {
    if (paused) {
      timer.resume();
      paused = false;
    }
    else{
      timer.pause();
      paused = true;
    }
  });

  // socket.on("changeVolume", async (arg) => {
  //   console.log("changeVolume", arg);
  //   var change_nums = Math.floor(parseFloat(arg) / 3);
  //   seleniumtest.changeVolume(change_nums);
  // });

  socket.on("epsilon", async (arg) =>{
    seleniumtest.changeEpsilon(parseFloat(arg));
    let str = (Date.now() + "; Action: change epsilon to: " + arg+ "\n");
    fs.appendFileSync(logfile, str);
  })

  socket.on("alpha", async(arg) => {
    seleniumtest.changeAlpha(parseFloat(arg));
    let str = (Date.now() + "; Action: change alpha to: " + arg+ "\n");
    fs.appendFileSync(logfile, str);
  })

  socket.on("setprevious", async() => {
    seleniumtest.setPrevBPM();
  })
});


function callbackfn(){
  let str = (Date.now() + "; No signal from watch!\n");
  fs.appendFileSync(logfile, str);
  browserSocket.emit('nosignal', null);
  setTimeout(function(){  // wait 2 seconds before stopping
    stop(true);
}, 2000);
}


async function playNext(action){
    var msg = seleniumtest.playNext(mode, action);
    msg.then(async (e)=>{
      var a = null;
      switch(action){
        case 1:
          a = "next_pressed";
          firstHR = true;  // reset firstHR to ignore first hr after user switches
          break;
        case 0:
          a = "switched";
          break;
      }
      let str = (Date.now()+ "; Action: "+ a + e[1]+ "\n");
      fs.appendFileSync(logfile, str);
      browserSocket.emit("next", e[0]);
      
    })
}


var ComplexTimer = function(callback) {
  var timerId, start;
  var delta = 30000; // 30 seconds
  var longTime = 420000; // 7 minutes
  var shortTime = 75000; // 1.25 minutes
  var iota = 285000; // 4.75 minutes
  var lastStart = Date.now();
  var totalTime = 0;
  
  this.startIota = function(){
    if (timerId){
      clearTimeout(timerId);
      timerId = null;
    }
    start = Date.now();
    timerId = setTimeout(function(){
      critHR = true;
      timerId = setTimeout(function(){ 
        callbackfn();
      }, delta);
    }, iota);
  };

  this.start = function(){
    if (timerId){
      clearTimeout(timerId);
      timerId = null;
    }
    start = Date.now();
    timerId = setTimeout(callback, longTime);
  }

  this.stop = function(){
    if (timerId){
      clearTimeout(timerId);
      timerId = null;
    }
  }

  this.pause = function() {
    seleniumtest.pause()
    clearTimeout(timerId);
    let str = Date.now()+ "; Action: pause\n";
    fs.appendFileSync(logfile, str);
    totalTime += Date.now() - lastStart; // update time spent in training
  };

  this.resume = async function() {
    firstHR = true;
    seleniumtest.pause()
    let str = Date.now()+ "; Action: resume; restarting previous sound\n";
    fs.appendFileSync(logfile, str);
    start = Date.now();
    clearTimeout(timerId);
    timerId = setTimeout(function(){
      critHR = true;
      timerId = setTimeout(function(){ 
        callbackfn();
      }, delta);
    }, iota);
    lastStart = Date.now();
  };

  this.next = function() {
    playNext(1)
    start = Date.now();
    clearTimeout(timerId);
    timerId = setTimeout(callback, shortTime);
  };

  this.switch = function (){
    playNext(0)
    start = Date.now();
    clearTimeout(timerId);
    timerId = setTimeout(function(){
      critHR = true;
      timerId = setTimeout(function(){ 
        callbackfn();
      }, delta);
    }, iota);
  }

  this.stopWithIota = function(){
    clearTimeout(timerId);
    if (!this.checkIota()){
      // log iota not reached to file
      let str = Date.now()+ "; Action: stop; Iota not reached\n";
      fs.appendFileSync(logfile, str);
      return false;
    }
    else{
      return true;
    }
  } 
  
  this.checkIota = function(){
    if (Date.now() - start > iota){  // 4.5 minute iota
      return true;
    }
    else{
      console.log("iota not reached");
      return false;
    }
  }

  this.getSessionTime = function(){
    return totalTime + (Date.now() - lastStart);
  }
};

var SimpleTimer = function(callback) {
  var lastStart = Date.now();
  var timerId;
  var totalTime = 0;

  this.start = function(){
    if (timerId){
      clearTimeout(timerId);
      timerId = null;
    }
    timerId = setTimeout(callback, 300000); // 5 minutes
  }
    
  this.getSessionTime = function(){
    return totalTime + (Date.now() - lastStart);
  }
};

browserServer.listen(3000, () => {
    console.log('browser server is running at http://localhost:3000');
});

async function openBrowser(){
  import('open').then(open =>{
    open.default('http://localhost:3000');
  });
}

openBrowser();

module.exports = browserServer;
