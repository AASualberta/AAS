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

router.post('/test', async (ctx, next) =>{
  if (ctx.request.body["bpm"] > 0) {
    seleniumtest.addBPM(ctx.request.body["bpm"]);
  }
});


async function restbpm(arg){
  //console.log(arg);
  seleniumtest.restBPM(arg);
}

async function stop(){
  console.log('exiting...');
  seleniumtest.close();
}


io.on('connection', async (socket) => {
  console.log(seleniumtest);
    await seleniumtest.init().then(()=>{
      router.post('/first', async (ctx, next) =>{
        console.log("connected");
        socket.emit("init", "world");
      });
    })
    socket.on("startsocket", async (arg) => {
      await seleniumtest.startFirstSound().then((e)=>{
        socket.emit("next", e);
      });
      timeout(1);
    });
    socket.on("nextsocket", async (arg) => {
      clearTimeout(seleniumtest.timeouts);
      timeout(0);
    });
    socket.on("stopsocket", async (arg) => {
      stop();
    });
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    socket.on('restbpm', async (arg)=>{
      restbpm(arg);
    })

    function timeout(first) {
        /*
            Call playNext() every 10 seconds.
        */
        if(!first){
            var msg = seleniumtest.playNext();
            msg.then((e)=>{
                socket.emit("next", e);
            })
        }
        seleniumtest.timeouts = setTimeout(function () {
            timeout(0);
        }, seleniumtest.timer);
    }

});


server.listen(3000, () => {
    console.log('listening on *:3000');
});

module.exports = server;
