// app/app.js
const http = require('http');
const request = require('request');
const path = require('path');
const Koa = require('koa');
var serve = require('koa-static');
const koaRouter = require('koa-router');
const koaBody = require('koa-body');
const render = require('koa-ejs');
const audio = require('./audio.js');
const json = require('json')
const fs = require('fs');

const db = require('./db.js')

const Drive = require('./drivelog');

const app = module.exports = new Koa();
const router = koaRouter();

const server = require('http').createServer(app.callback());
var io = require('socket.io')(server);
var currentSocket;
var hgSocket = null;
var indexSocket = null;

var timer;
var skipList = [];

var bpm_connected = false;
var mode = 0; // default is training mode
var pause_num = 0;
var inited = false;
var playing = false;

var drivelog;
var logfile;
var user = null;
var tempuser = null; // username entered at signup, used before signup is complete.
var isAdmin = false;
var restBPM;
var signupanswers;

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
  console.log("in post s");
  drivelog = new Drive(user);
  logfile = "./log/" + user + ".log";
  
  restbpm(db.getRestBPM(user)); // set restbpm for user

  if (user.toLowerCase() == "admin") {
    isAdmin = true;
  }

  await ctx.render('soundscape');
  // if (!inited) {
  //   bpmUsedForAlg = true;
  //   console.log("bout to io");
  //   //ioconnection();
  //   console.log("bout to init");
  //   initialize();
  // }

  soundscapes_listen = true;

  // log user mood description
  let str = "Timestamp: "+Date.now()+"; Pre log: "+ctx.request.body['mood']+"\n";
  fs.appendFileSync(logfile, str);
})

router.get('/soundscape', async (ctx, next) => {
  console.log("in get s");
  if (inited && user) {
    await ctx.render('soundscape');
  }
  else{
    ctx.redirect("/");
  }
})

router.post('/signin', async (ctx, next) => {
  console.log("in post si");
  if (user != ctx.request.body['username']) {
    var re = db.findName(ctx.request.body['username']); // check if user exists
    if (re){
      user = re["name"]; // get user name
      audio.loadValues(user); // load action values from file

      // check if training time > 3hours
      if (db.findTime(user) > 10800000){
        mode = 1;
        audio.setMode(1)
      }

      if (db.getRestBPM(user) > 0){
        // redirect to the url '/soundscape'
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
      ctx.response.body = "<p>You have to sign up first!</p></br><button class=\"btn btn-block\" onclick=\"location.href='http://localhost:3000'\" >return to main page </button> ";
    }
  }
  else {
    // if signed in/up, redirect to url '/soundscape'
    if (db.getRestBPM(user) > 0){
      audio.loadValues(user); // load action values from file
      // check if training time > 3hours
      if (db.findTime(user) > 10800000){
        mode = 1;
        audio.setMode(1)
      }
      // redirect to the url '/soundscape'
      ctx.status = 307;
      ctx.redirect("/soundscape");
    }
    else{
      ctx.status = 307;
      ctx.redirect("/heartrate");
    }
  }
})

router.post('/end', async(ctx, next) => {
  console.log("in post e ");
  let str = "Timestamp: "+Date.now()+"; Post log: "+ctx.request.body['endmood']+"\n";
  fs.appendFileSync(logfile, str);
  await logToDrive();
  process.exit();
})

router.get('/end', async(ctx, next) => {
  console.log("in get e");
  if (inited && user) {
    await ctx.render('end');
  }
  else{
    ctx.redirect("/");
  }
})

router.post('/signup', async(ctx, next) => {
  console.log("in post su");
  // add a new user to database
  user = ctx.request.body['username'];
  newUserLogFile = db.addUser(user, 0);
  logSurvey(ctx, newUserLogFile);
  ctx.response.status = 307;
  ctx.redirect("/heartrate");
})

router.post('/heartrate', async(ctx, next) => {
  console.log("in post h");
  signup_listen = true;
  await ctx.render('heartrate');
  //getHeartRateAtSignUp();
  console.log(ctx.request.body);
})

router.get('/heartrate', async(ctx, next) => {
  console.log("in get h");
  if (user) {
    signup_listen = true;
    await ctx.render('heartrate');
  }
  else{
    ctx.redirect("/");
  }
})

router.get('/', async (ctx, next) => {
  console.log("in get ");
  if (!user || !inited) {
    await ctx.render('index');
  }
  else {
    ctx.redirect("/soundscape");
  }
});

async function initialize(){
    inited = true;
    if (!bpm_connected){
      indexSocket.emit("loaded");
    }
    else{ // already connnected from resting hr
      indexSocket.emit("init123", "world");
    }
}

async function logSurvey(ctx, logfile){
  let answers = "\nSurvey Answers:\n";
  if (ctx.request.body['age'] == "custom"){
    answers += ("Age: " + ctx.request.body['agetext'] + "\n");
  }
  else{
    answers += ("Age: " + ctx.request.body['age'] + "\n");
  }
  if (ctx.request.body['occupation'] == "custom"){
    answers += ("Occupation: " + ctx.request.body['occupationtext'] + "\n");
  }
  else{
    answers += ("Occupation: " + ctx.request.body['occupation'] + "\n");
  }
  if (ctx.request.body['gender'] == "custom"){
    answers += ("Gender: " + ctx.request.body['gendertext'] + "\n");
  }
  else{
    answers += ("Gender: " + ctx.request.body['gender'] + "\n");
  }
  fs.appendFileSync(logfile, answers);
}

async function restbpm(arg){
  audio.restBPM(arg);
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
  if (typeof timer == 'undefined'){ // timer not initialized means play never clicked
    sessionTime = 0;
  }
  else{
    sessionTime = timer.getSessionTime();
  }
  var str = "Timestamp: "+Date.now()+'; Action: exiting; Session lenght: '+sessionTime+'\n';
  fs.appendFileSync(logfile, str);
  db.updateTime(user, sessionTime);
  // might need to stop howler here?
  process.exit();
}



io.on('connection', async (socket) => {

  if (inited) {

    if (pause_num%2 == 0) {
      socket.emit("reload", false);
    }
    else socket.emit("reload", true);
  } 

  if (indexSocket == null){
    indexSocket = socket;
    initialize();
  }
  else if (hgSocket == null){
    hgSocket = socket;
  }
  else{
    console.log("too many connections");
    return;
  }

  console.log("socket connect");
  let total = 0;
  let average = 0;

  let firstHR = true;

  if (hgSocket != null){
    hgSocket.on('message', function name(data) {
      console.log(data)
      if (soundscapes_listen){  // handle data on soundscapes page
        if (data.hasOwnProperty("command")){
          if (data.command == "Connect"){
            // if (data.UserName == user){
            console.log("connected");
            let str = "Timestamp: "+Date.now()+"; connected\n";
            fs.appendFileSync(logfile, str);
            bpm_connected = true;
            indexSocket.emit("init123", "world");
            console.log("init123 sent");
            // }
          }
          else if (data.command == "Heartrate"){
            if (bpm_connected && inited){
              if (firstHR){ // ignore first hr (bad)
                firstHR = false;
              }
              else{ 
                total += 1;
                timer.restart();
                console.log(data.heartrate);
                audio.addBPM(data.heartrate);
                if (total == 5){ // switch
                  total = 0;
                  timer.switch();
                }
              }
            }
          }
        } 
      }
      else if (signup_listen){  // handle data on signup page (get resting hr)
        if (data.hasOwnProperty("command")){
          if (data.command == "Connect"){
            if (data.UserName == user){
              console.log("connected");
              bpm_connected = true;
            }
          }
          else if (data.command == "Heartrate"){
            if (bpm_connected){
              var hr = data.heartrate
              console.log(data.heartrate);
              indexSocket.emit('updateProgress', null);
              total += 1;
              if (total > 2){ // after 2 minutes start averaging hr
                average+=hr;
              }
              if (total==5){ // after 5 minutes return average
                total = 0;
                restBPM = average/3;
                let str = "resting heart rate: " + restBPM + "\n";
                var filename = "./log/" + user + ".log";
                fs.appendFileSync(filename, str);
                db.addUser(user, restBPM);
                firstHR = false;
              }
            }
          }
        } 
      }
      io.emit('message', data)
    })
  }
  indexSocket.emit("isAdmin", isAdmin);
  indexSocket.emit("setMode", mode); 

  indexSocket.on('disconnect', () => {
    indexSocket = null;
    console.log(`indexSocket ${socket.id} disconnected.`);
  });

  if (hgSocket != null){
    hgSocket.on('disconnect', () => {
      hgSocket = null;
      console.log(`hgSocket ${socket.id} disconnected.`);
    });
  }

 

  socket.on("startsocket", async (arg) => {  // get sound file and send to browser
    let sound = audio.getFirstSound();
    socket.emit("firstsound", sound[0]);
    let str = "Timestamp: "+ Date.now()+ "; Action: started" + sound[1] + "\n";
    fs.appendFileSync(logfile, str);
    socket.emit("next"); // set mode
    
    timer = new Timer(callbackfn, 75000);
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
      timer.next();
    }
  });

  socket.on("stopsocket", async (arg) => {
    if (arg){ // timeout
      let str = "Timestamp: "+ Date.now()+ "; Action: session timed out\n";
      fs.appendFileSync(logfile, str);
    }
    stop(arg);
  });
  
  socket.on('restbpm', async (arg)=> {
    restbpm(arg);
  })

  socket.on("mode", async (arg) => {
    mode = arg;
    audio.setMode(mode);
  })

  socket.on("pausesocket", async (arg) => {
    pause_num += 1;
    console.log(pause_num)
    if (pause_num%2 == 0) {
      timer.pause();
    }
    else{
      timer.resume();
    }
  });

  socket.on("epsilon", async (arg) =>{
    audio.changeEpsilon(parseFloat(arg));
    let str = ("Timestamp: " + Date.now() + "; Action: change epsilon to: " + arg+ "\n");
    fs.appendFileSync(logfile, str);
  })

  socket.on("alpha", async(arg) => {
    audio.changeAlpha(parseFloat(arg));
    let str = ("Timestamp: " + Date.now() + "; Action: change alpha to: " + arg+ "\n");
    fs.appendFileSync(logfile, str);
  })

  socket.on("setprevious", async() => {
    audio.setPrevBPM();
  })

  function callbackfn(){ // chnage this so it ends session
    let str = ("Timestamp: " + Date.now() + "; No signal from watch!\n");
    fs.appendFileSync(logfile, str);
    stop(true);
  }
  

  async function playNext(action){
    var sound = audio.getNext(mode, action);
    var a = null;
    switch(action){
      case 1:
        a = "next_pressed";
        break;
      case 0:
        a = "switched";
        break;
    }
    let str = ("Timestamp: "+ Date.now()+ "; Action: "+ a + sound[1]+ "\n");
    fs.appendFileSync(logfile, str);
    socket.emit("next_sound", sound[0]);
    socket.emit("next");
  }
  var Timer = function(callback, delay) {
      var timerId, start, fixedtime = delay
      var first = true;
      var lastStart = Date.now();
      var total = 0
      this.pause = function() {
          audio.pause()
          clearTimeout(timerId);
          let str = "Timestamp: "+ Date.now()+ "; Action: pause\n";
          fs.appendFileSync(logfile, str);
          total += Date.now() - lastStart; // update time spent in training
      };

      this.resume = async function() {
          if(!first){
            audio.pause()  // do in browaser
            let str = "Timestamp: "+ Date.now()+ "; Action: resume; restarting previous sound\n";
            fs.appendFileSync(logfile, str);
          }
          else{
            first = false;
          }
          start = Date.now();
          clearTimeout(timerId);
          timerId = setTimeout(callback, fixedtime);
          lastStart = Date.now();  
      };

      this.next = function() {
          playNext(1)
          start = Date.now();
          clearTimeout(timerId);
          timerId = setTimeout(callback, fixedtime);
      };

      this.restart = function() {
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


// function getHeartRateAtSignUp(){
//  console.log("getHeartRateAtSignUp")
//   let total = 0;
//   let average = 0;
//   io.on('connection', async(socket) => {
//     console.log("getHeartRateAtSignUp_connect")
//     currentSocket = socket;
//     currentSocket.on('getBPM', () => {
//       router.post('/test', async (ctx, next) =>{
//         if (bpmUsedForAlg){ // using /test route for soundscapes page
//           if (inited) {
//             try{
//               let body = JSON.parse(ctx.request.body);
//               if (body.hasOwnProperty("command")){
//                 if (body.command == "Heartrate"){
//                   console.log(body.heartrate);
//                   seleniumtest.addBPM(body.heartrate);
//                   ctx.status = 200;
//                 }
//               }
//               console.log(ctx.request.body);
//             }
//             catch(e){
//               console.log(e);
//             }
//           }
//         }
//         else{ // using /test route for signup
//           if (!bpm_connected){
//             try{
//               let body = JSON.parse(ctx.request.body);
//               if (body.hasOwnProperty("command")){
//                 if (body.command == "Connect"){
//                   if (body.id == user){
//                     ctx.status = 200;
//                     bpm_connected = true;
//                     currentSocket.emit('updateProgress', null);
//                   }
//                 }
//               }
//             }
//             catch(e){
//               console.log(e);
//             }
//           }

//           else{
//             var hr = null;
//             try{
//               let body = JSON.parse(ctx.request.body);
//               if (body.hasOwnProperty("command")){
//                 if (body.command = "Heartrate"){
//                   hr = body.heartrate;
//                   console.log(hr);
//                   ctx.status = 200;
//                 }
//               }
//             }
//             catch(e){
//               console.log(e);
//             }
          
//             if (hr){
//               currentSocket.emit('updateProgress',null);
//               total += 1;
//               if (total > 2){ // after 2 minutes start averaging hr
//                 average+=hr;
//               }
//               if (total==5){ // after 5 minutes return average
//                 restBPM = average/3;
//                 let str = "resting heart rate: " + restBPM + "\n";
//                 var filename = "./log/" + user + ".log";
//                 fs.appendFileSync(filename, str);
//                 db.addUser(user, restBPM);
//               }
//             }
//           }
//         }
//       })
//     })
//   })
// }


// function ioconnection(){
//   io.on('connection', async (socket) => {
//     //console.log("socket connect");
//     currentSocket = socket;
//       router.post('/test', async (ctx, next) =>{
//         if (!bpm_connected && inited){
//           try{
//             let body = JSON.parse(ctx.request.body);
//             if (body.hasOwnProperty("command")){
//               if (body.command == "Connect"){
//                 if (body.id == user){
//                   let str = "Timestamp: "+Date.now()+"; connected\n";
//                   fs.appendFileSync(logfile, str);
//                   socket.emit("init123", "world");
//                   bpm_connected = true;
//                   ctx.status = 200;
//                 }
//               }
//             }
//           }
//           catch(e){
//             console.log(e);
//           }
//         }
//         else{ // watch already connected
//           if (inited && bpm_connected) {
//             try{
//               let body = JSON.parse(ctx.request.body);
//               if (body.hasOwnProperty("command")){
//                 if (body.command == "Heartrate"){
//                   console.log(body.heartrate);
//                   seleniumtest.addBPM(body.heartrate);
//                   ctx.status = 200;
//                 }
//               }
//             }
//             catch(e){
//               console.log(e);
//             }
//           }
//         }
//       });
//       socket.emit("isAdmin", isAdmin);
//       socket.emit("setMode", mode); 
//   }); 
// }
