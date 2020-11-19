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

let port = 3000;
app.listen(port, () => console.log(`the server is running at ${port}`));



//router.post('/switch', buttonControllers.switch);
//router.post('/switch', buttonController.switch);
//router.post('/switch', buttonController.switch);
//router.post('/switch', buttonController.switch);

router.get('/', async (ctx, next) => {
  //console.log(ctx.request.body);
  await ctx.render('index');
});

//console.log(seleniumtest);

router.post('/test', test)
router.post('/start', start)
router.post('/stop', stop)

async function start(ctx){
	ctx.redirect('back');
	seleniumtest.operate(1);
	console.log("start")
}

async function test(ctx){
	ctx.redirect('back');
	seleniumtest.operate(2);
}

async function stop(ctx){
	ctx.redirect('back');
	seleniumtest.operate(3);
}

module.exports = app;
