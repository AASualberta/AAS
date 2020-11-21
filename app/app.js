// app/app.js
const http = require('http');
const path = require('path');
const Koa = require('koa');
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

render(app, {
  root: path.join(__dirname, 'view'),
  layout: 'template',
  viewExt: 'html',
  cache: false,
  debug: false
});

app.use(koaBody());// for parsing koa ctx.request body

app
  .use(router.routes())
  .use(router.allowedMethods());

router.get('/', async (ctx, next) => {
  //console.log(ctx.request.body);
  await ctx.render('index');
});



async function stop(){
  console.log('exiting...');
  seleniumtest.close();
}


io.on('connection', async (socket) => {
  console.log(seleniumtest);
    await seleniumtest.init().then(()=>{
      console.log("connected")
      socket.emit("init", "world");
    })
    socket.on("startsocket", async (arg) => {
      seleniumtest.startFirstSound();
      timeout();
    });
    socket.on("nextsocket", async (arg) => {
      clearTimeout(seleniumtest.timeouts);
      timeout();
    });
    socket.on("stopsocket", async (arg) => {
      stop();
    });
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    function timeout() {
        /*
            Call playNext() every 10 seconds.
        */
        var msg = seleniumtest.playNext();
        msg.then((e)=>{
            socket.emit("next", e);
        })
        seleniumtest.timeouts = setTimeout(function () {
            timeout();
        }, seleniumtest.timer);
    }

});


server.listen(3000, () => {
    console.log('listening on *:3000');
});

module.exports = server;
