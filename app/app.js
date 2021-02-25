// app/app.js
const http = require('http');
const path = require('path');
const Koa = require('koa');
var serve = require('koa-static');
const koaRouter = require('koa-router');
const koaBody = require('koa-body');
const render = require('koa-ejs');
const SeleniumTest = require('./selenium-test.js');
const json = require('json')

const app = module.exports = new Koa();
const router = koaRouter();
const seleniumtest = new SeleniumTest();

const server = require('http').createServer(app.callback());
const io = require('socket.io')(server);
var bpm_connected = false;
var mode = 0; // default is training mode
var pause_num = 0;

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

router.get('/', async (ctx, next) => {
  //console.log(ctx.request.body);
  await ctx.render('index');
});
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

async function stop(){
  console.log(Date.now(),'; Action: exiting');
  seleniumtest.close();
}


io.on('connection', async (socket) => {
    var timer;
    //console.log(seleniumtest);
    await seleniumtest.init().then(()=>{
      router.post('/test', async (ctx, next) =>{
        if (!bpm_connected){
          console.log("Timestamp: ",Date.now(),"; connected");
          socket.emit("init", "world");
          bpm_connected = true;
        }
        else{
          if (ctx.request.body["bpm"] > 0) {
            seleniumtest.addBPM(ctx.request.body["bpm"]);
          }
        }
      });
    })
    socket.on("startsocket", async (arg) => {
      await seleniumtest.startFirstSound().then((e)=>{
        console.log("Timestamp: "+ Date.now()+ "; Action: started" + e[1]);
        socket.emit("next", e[0]);
      });
      //timeout(1, 0);
      timer = new Timer(callbackfn, seleniumtest.timer);
    });
    socket.on("nextsocket", async (arg) => {
      //console.log("Timestamp: ", Date.now(), "Action: next_pressed")
      //clearTimeout(seleniumtest.timeouts);
      //timeout(0, 1);
      if (pause_num%2) {
        timer.resume();
      }
      timer.restart();

    });
    socket.on("stopsocket", async (arg) => {
      stop();
    });
    socket.on('disconnect', () => {
        //console.log("Timestamp: ", Date.now(),' user disconnected');
    });
    socket.on('restbpm', async (arg)=> {
      restbpm(arg);
    })
    socket.on("mode", async (arg) => {
      mode = arg;
    })
    socket.on("pausesocket", async (arg) => {
      pause_num += 1;
      if (pause_num%2) {
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
          console.log("Timestamp: "+ Date.now()+ "; Action: "+ a + e[1])
          socket.emit("next", e[0]);
          seleniumtest.getVolume().then((v) =>{
            //console.log("get volume:", v);
            socket.emit("volume", v);
          });
          
        })
    }
    var Timer = function(callback, delay) {
        var timerId, start, fixedtime = delay, remaining = delay;
        var first = true;
        this.pause = function() {
            seleniumtest.pause()
            clearTimeout(timerId);
            console.log("Timestamp: "+ Date.now()+ "; Action: pause")
            remaining -= Date.now() - start;
        };

        this.resume = async function() {
            if(!first){
              seleniumtest.pause()
              console.log("Timestamp: "+ Date.now()+ "; Action: resume")
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
            timerId = setTimeout(callback, remaining);  
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

        this.resume();
    };

    /*
    function timeout(first, action) {

        if(!first){
            var msg = seleniumtest.playNext(mode, action);
            msg.then((e)=>{
              var a = null;
              switch(action){
                case 1:
                  a = "next_pressed";
                  break;
                case 0:
                  a = "switched";
                  break;
              }
              console.log("Timestamp: "+ Date.now()+ "; Action: "+ a + e[1])
              socket.emit("next", e[0]);
            })
        }
        seleniumtest.timeouts = setTimeout(function () {
            timeout(0, 0);
        }, seleniumtest.timer);
    }*/


});


server.listen(3000, () => {
    //console.log('listening on *:3000');
});

module.exports = server;
