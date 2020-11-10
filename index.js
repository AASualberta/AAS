const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const {Builder, By, Key, until} = require('selenium-webdriver');
var driver = new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(/* ... */)
    .build();

var timeouts;
var first = 0;
var num = 3;


init();

// keyboard listening
const readline = require('readline');
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on('keypress', async function(str, key){
    if (key && key.ctrl && key.name=='c') {
        console.log('exiting...');
        driver.quit().then((e)=>{
            process.exit();
        });
    }
    else if (key.name == 'return') {
        console.log('Started');
        timeout();        
    }
    else if (key.name == 'n') {
        console.log('n pressed');
        clearTimeout(timeouts);
        timeout();
    }

});

function timeout() {
    if (first == 0) {
        startFirstSound();
        first += 1;
    }
    else{
        playNext();
    } 
    
    timeouts = setTimeout(function () {
        timeout();
    }, 10000);
}

function select(){
    //return index
    return Math.floor(Math.random()*num); 
}

function startFirstSound(){
    driver.findElement(By.css('body')).then((el)=>{
        el.sendKeys(Key.chord("m")).then((a)=>{
            console.log("unmute...");
        }).catch((e) => { console.error(e.message) });
    }).catch((e) => { console.error(e.message) });
}

function playNext(){
    
    driver.findElement(By.css('body')).then((el)=>{
        // mute currently playing soundscape
        el.sendKeys(Key.chord("m")).then(async function(a) {
            //console.log("mute...");
            // determine the next soundscape
            let ind = select();
            // switch tab
            var windows = await driver.getAllWindowHandles().then((value)=>{return value});
            
            await driver.switchTo().window(windows[ind+1]);

            await driver.findElement(By.css('body')).then(async function(el){
                // unmute next soundscape
                await el.sendKeys(Key.chord("m")).then((a)=>{
                    //console.log("unmute...");
                });
                await driver.findElement(By.css('div.bigTitle')).then(async function (el){
                    await el.getText().then((value)=>{
                        console.log("Switched to "+value);
                    });
                });
            });
        });
    });
}

async function init(){
    SELENIUM_REMOTE_URL = "https://mynoise.net/noiseMachines.php";
    var allSounds = [];

    driver.get(SELENIUM_REMOTE_URL);

    var elems = await driver.findElements(By.css('span.DIM'));

    for (var i = 0; i < elems.length; i++) {
        let comb = [];
        await elems[i].getAttribute("class").then(function(value){
            comb.push(value.split(' ')[1]);
        });
        await elems[i].findElement(By.xpath(".//a")).then(function(el){
            el.getAttribute("href").then(function(value){
                comb.push(value);
            });
        });
        allSounds.push(comb);
    }
    var lib = getLibrary(allSounds);
    openTabs(lib);
}

function getLibrary(allSounds){
    let ret = [];
    let count = 0;
    for (var i = 0; i < allSounds.length; i++) {
        if (Math.random() > 0.5 && count < num) {
            ret.push(allSounds[i]);
            count += 1;
        }
    }
    return ret;
}

async function openTabs(lib){
    for (var i = 0; i < lib.length; i++) {
        await driver.executeScript("window.open('"+lib[i][1]+"', '"+i+"');", );
    }
    var windows = await driver.getAllWindowHandles();
    console.log(windows);
    for (var i = 0; i < windows.length-1; i++) {
        await driver.switchTo().window(windows[i+1]);
        let processed = false;
        //console.log(i,windows[i+1]);
        //driver.getWindowHandle().then((va)=>{console.log(va);});
        var p1 = driver.wait(until.elementIsVisible(driver.findElement(By.css('div.contextPlay'))), 100000);
        var p2 = driver.wait(function(){
            return driver.findElement(By.id('mute')).then((elem1)=>{
                return elem1.getAttribute("class").then(async function(classes){           
                    if (classes.indexOf('active') < 0 && classes.indexOf('disabled') < 0 && !processed) {
                        elem1.getDriver().getWindowHandle().then((va)=>{console.log(va);});
                        await driver.findElement(By.css('body')).then(async function (el){
                            // mute next soundscape
                            await el.sendKeys(Key.chord("m")).then((a)=>{
                                //console.log("mute...initialized");
                            });
                        }).catch((e)=>{console.error(e.message);});
                        return elem1;   
                    }  
                });
            })
        }, 100000);
        await Promise.race([p1, p2]).then(async function(ele) {
            processed = true;
            let value = await ele.getId().then((value)=>{return value});
            if (value !== 'mute') {
                await driver.findElement(By.css('div.contextPlay')).click()
                                .then((e)=>{}).catch((e)=>{console.error(e.message);});

                await driver.findElement(By.css('body')).then(async function(bd){
                    await bd.sendKeys(Key.chord("m")).then((a)=>{
                        console.log(windows[i+1]+" initialized");
                    }).catch((e)=>{console.error(e.message);});
                }).catch((e)=>{console.error(e.message);});
            }
        });  
    }
    console.log("Press ENTER to start.");

}



