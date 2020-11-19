// app/routes/index.js

const path = require('path');
const koaRouter = require('koa-router');
const buttonController = require('../controllers/button');


const router = koaRouter();

router.post('/switch', buttonController.switch);
//router.post('/switch', buttonController.switch);
//router.post('/switch', buttonController.switch);
//router.post('/switch', buttonController.switch);

router.get('/', async (ctx, next) => {
  //console.log(ctx.request.body);
  await ctx.render('index');
});


module.export = router;
