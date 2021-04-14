// app/app.js
const http = require('http');
const path = require('path');
const Koa = require('koa');
var serve = require('koa-static');
const koaRouter = require('koa-router');
const koaBody = require('koa-body');
const render = require('koa-ejs');
const seleniumtest = require('./selenium-test.js');
const json = require('json')

const app = module.exports = new Koa();
const router = koaRouter();

const server = require('http').createServer(app.callback());
var io = require('socket.io')(server);

var bpm_connected = false;
var mode = 0; // default is training mode
var pause_num = 0;
var inited = false;
var playing = false;

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

router.get('/soundscape', async (ctx, next) => {
  //console.log("soundscape loaded")
  await ctx.render('soundscape');
  if (!inited) {
    initialize();
    ioconnection();
  }
  if (ctx.request.query['restbpm']) {
    restbpm(ctx.request.query['restbpm']);
  }
})


router.get('/', async (ctx, next) => {
  await ctx.render('index');
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

async function stop(){
  console.log(Date.now()+'; Action: exiting');
  seleniumtest.close();
}

function ioconnection(){
  io.on('connection', async (socket) => {
      var timer;
      //console.log(seleniumtest);
      //await seleniumtest.init().then(()=>{
        router.post('/test', async (ctx, next) =>{
          //console.log(inited, bpm_connected, ctx.request.body)
          if (!bpm_connected){
            if (inited) {
              console.log("Timestamp: "+Date.now()+"; connected");
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
          console.log("Timestamp: "+ Date.now()+ "; Action: started" + e[1]);
          socket.emit("next", e[0]);
        });
        //timeout(1, 0);
        timer = new Timer(callbackfn, seleniumtest.timer);
        pause_num += 1;
      });
      socket.on("nextsocket", async (arg) => {
        //console.log("Timestamp: ", Date.now(), "Action: next_pressed")
        //clearTimeout(seleniumtest.timeouts);
        //timeout(0, 1);
        if (pause_num%2 == 0) {
          timer.resume();
        }
        timer.restart();

      });
      socket.on("stopsocket", async (arg) => {
        stop();
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
        console.log("Timestamp: " + Date.now() + "; Action: change epsilon to: " + arg);
      })

      socket.on("alpha", async(arg) => {
        seleniumtest.changeAlpha(parseFloat(arg));
        console.log("Timestamp: " + Date.now() + "; Action: change alpha to: " + arg);
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
  });

server.listen(3000, () => {
    //console.log('listening on *:3000');
});

module.exports = server;
