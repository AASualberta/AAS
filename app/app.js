// app/app.js
const http = require('http');
const path = require('path');
const Koa = require('koa');
const koaRouter = require('koa-router');
const koaBody = require('koa-body');
const render = require('koa-ejs');
const SeleniumTest = require('./selenium-test.js');

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

//router.post('/switch', buttonControllers.switch);
//router.post('/switch', buttonController.switch);
//router.post('/switch', buttonController.switch);
//router.post('/switch', buttonController.switch);

router.get('/', async (ctx, next) => {
  //console.log(ctx.request.body);
  await ctx.render('index');
});

//console.log(seleniumtest);

router.post('/next', next)
router.post('/start', start)
router.post('/stop', stop)

async function start(ctx){
	ctx.redirect('back');
  console.log(seleniumtest)
  seleniumtest.then((e)=>{

    e.operate(1);
  });
	console.log("start")
}

async function next(ctx){
	ctx.redirect('back');
  seleniumtest.then((e)=>{
    e.operate(2);
  });
}

async function stop(ctx){
	ctx.redirect('back');
  seleniumtest.then((e)=>{
    e.operate(3);
  });
}

io.on('connection', async (socket) => {
  console.log(seleniumtest);
    await seleniumtest.then(()=>{
      console.log("connected")
      socket.emit("init", "world");
    })
    socket.on('msg', (msg) => {
        console.log('message: '+msg);
        io.emit('msg', msg);
    });
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});


server.listen(3000, () => {
    console.log('listening on *:3000');
});
module.exports = app;
