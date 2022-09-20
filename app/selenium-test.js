const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const {Builder, By, Key, until, Capabilities} = require('selenium-webdriver');
const Algorithm = require('./alg.js');

var options = new chrome.Options();
options.headless();
options.addArguments("--autoplay-policy=no-user-gesture-required");
options.windowSize({height:5, width:5, x:0, y:0});
var driver = new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

//driver.manage().window().setRect({height:5, width:5, x:0, y:0});

const num = 10;
const allSounds = [['White Noise & Co.', 'https://mynoise.net/NoiseMachines/whiteNoiseGenerator.php'],
                ['White Rain', 'https://mynoise.net/NoiseMachines/whiteRainNoiseGenerator.php'],
                ['Grey Noise', 'https://mynoise.net/NoiseMachines/greyNoiseGenerator.php'],
                ['88 Keys', 'https://mynoise.net/NoiseMachines/acousticPianoSoundscapeGenerator.php'],
                ['Furry Friend', 'https://mynoise.net/NoiseMachines/catPurrNoiseGenerator.php'],
                ['Rainforest', 'https://mynoise.net/NoiseMachines/rainforestNoiseGenerator.php'],
                ['Primeval Forest', 'https://mynoise.net/NoiseMachines/primevalEuropeanForestSoundscapeGenerator.php'],
                ['Summer Night', 'https://mynoise.net/NoiseMachines/ultrasonicNoiseGenerator.php'],
                ['Aircraft Cabin Noise', 'https://mynoise.net/NoiseMachines/cabinNoiseGenerator.php'],
                ['Tierra del Fuego', 'https://mynoise.net/NoiseMachines/landOfFireNaturalSoundscapeGenerator.php']];
const alg = new Algorithm(num);
class SeleniumTest{

    constructor(){
        this.timeouts = null;
        this.first = 0;
//        this.num = 3; // number of sounds in personalized sound library.
        this.timer = 300000; // Each sound is played up to 5 (300000ms) minutes.
        this.msg = null;
        this.select_msg = null;
        this.bpms = [];
        this.avg_bpm = 0;
        //await this.init();
        this.logfile = null;

    }


close(fromTimeout){
    if (fromTimeout){
        driver.quit().then((e)=>{
            process.exit();
        })
    }
    else{
        driver.quit();
    }
}

async getVolume(){
    var msg = driver.findElement(By.css('body')).then(async (el)=>{
        return await driver.findElement(By.css('div.ui-slider-range-min')).then(async (ele)=>{
            return await ele.getAttribute("style").then((e)=>{
                //console.log(e.split(":"))
                return parseFloat(e.split(":")[1]);
            });
        });
    }).catch((e) => { console.error(e.message) });
    
    return msg;
}

async setMode(mode){
    alg.setMode(mode);
}

async loadValues(user, mode) {
    var userfile = "./log/"+user+".log";
    alg.loadValues(userfile, mode);
}

async changeAlpha(alpha) {
    alg.setAlpha(alpha);
}

async changeEpsilon(epsilon) {
    alg.setEpsilon(epsilon);
}

async setPrevBPM(bpm){
    alg.setPrevBPM(this.avg_bpm);
}

async changeVolume(change_num){
    var self = this;
    var key;
    if (change_num < 0){
        key = "j";
    }
    else {
        key = "k";
    }
    change_num = Math.abs(change_num)
    for (var i = change_num - 1; i >= 0; i--) {
        await driver.findElement(By.css('body')).then(async (el)=>{
            el.sendKeys(Key.chord(key)).then((a)=>{
                //console.log("change volume value...");
            }).catch((e) => { console.error(e.message) });
        }).catch((e) => { console.error(e.message) });
    }
}

async pause() {
    var self = this;
    var msg = driver.findElement(By.css('body')).then(async (el)=>{
        el.sendKeys(Key.chord("p")).then((a)=>{
            //console.log("unmute...");
        }).catch((e) => { console.error(e.message) });
        return await driver.findElement(By.css('div.bigTitle')).then(async (ele)=>{
            return await ele.getText().then((e)=>{
                return e;
            });
        });
    }).catch((e) => { console.error(e.message) });
}

addBPM(bpm){
    //console.log(this.bpms)
    //this.bpms.push(bpm);
    this.avg_bpm = bpm;
}

restBPM(restbpm){
    if (restbpm) {
        alg.setRestBPM(restbpm);
    }
    
}

setLogFile(logfile) {
    this.logfile = logfile;
    //console.log(logfile);
}

select(mode, pressed){
    /*
        Select the next soundscape.
    
    //return index
    var sum = 0;
    for (var i = this.bpms.length - 1; i >= 0; i--) {
        sum += parseFloat(this.bpms[i]);
    }
    var avg = sum / this.bpms.length
    //console.log(Date.now(),"average", avg);
    this.avg_bpm = avg;*/
    //console.log(this.avg_bpm)
    var idx = alg.generateNext(this.avg_bpm, mode, pressed); //generate reward from averaged bpm
    this.select_msg = alg.getMessage();
    this.bpms = [];
    return idx; // randomly generated.
}

async startFirstSound(){
    /*
        Play the first soundscape.
    */
    var self = this;
    var ind = alg.current;
    //console.log(alg.current);
    var windows = await driver.getAllWindowHandles();
    await driver.switchTo().window(windows[ind+1]);
    var msg = driver.findElement(By.css('body')).then(async (el)=>{
        el.sendKeys(Key.chord("p")).then((a)=>{
            //console.log("unmute...");
        }).catch((e) => { console.error(e.message) });
        return await driver.findElement(By.css('div.bigTitle')).then(async (ele)=>{
            return await ele.getAttribute("textContent").then((e)=>{
                return e;
            });
        });
    }).catch((e) => { console.error(e.message) });
    this.select_msg = alg.getMessage();
    //console.log(this.select_msg)
    return msg.then((e)=>{
        let name = e.trim();
        return [name,"; soundscape: "+ name + "; value index: "+ ind.toString() + this.select_msg]
    })
}

async playNext(mode, pressed){
    /*
        1. Mute currently playing soundscape.
        2. Select the next soundscape by calling select().
        3. Switch the window to the next tab.
        4. Unmute the soundscape.
    */
    var self = this;
    var msg = driver.findElement(By.css('body')).then((el)=>{
        // mute currently playing soundscape
        return el.sendKeys(Key.chord("p")).then(async function(a) {
            //console.log("mute...");
            // determine the next soundscape
            let ind = self.select(mode, pressed);
            // switch tab
            var windows = await driver.getAllWindowHandles().then((value)=>{return value});
            await driver.switchTo().window(windows[ind+1]);
            //await self.sleep(1000);
            var m = await driver.findElement(By.css('body')).then(async function(el){
                // unmute next soundscape
                await el.sendKeys(Key.chord("p")).then((a)=>{
                    //console.log("unmute...");
                });
                return await driver.findElement(By.css('div.bigTitle')).then(async function (el){
                   return await el.getAttribute("textContent").then((value)=>{
                        //console.log("Switched to "+value);
                        //el.getDriver().getWindowHandle().then((va)=>{console.log(va);});
                        return value;
                    });
                });
            });
            return [m, ind];
        });
    });
    return msg.then((e)=>{
        let name = e[0].trim();
        return [name,"; soundscape: "+ name + "; value index: "+e[1]+ "; heart_rate: " + self.avg_bpm.toString() + self.select_msg]
    })
}

sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async init(){
    /*
        1. Initialize the chromedriver.
        2. Find all listed sound categories.
        3. Select a part of categories.
        4. Initialize the browser and all tabs, load all sounds.
    */
    var SELENIUM_REMOTE_URL = "https://mynoise.net/noiseMachines.php";
    /*var allSounds = [];
    // Initialize the driver.
    driver.get(SELENIUM_REMOTE_URL);

    // Look for all sound categories.
    // Sound categories are stored in parameter 'allSounds'.
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
    }*/
    // Select sounds.
    var lib = allSounds;

    //Open all tabs and wait until all sounds are loaded.
    await this.openTabs(lib);
    return true;
}

getLibrary(allSounds){
    /*
        Select a subset of sound categories.
    */
    let ret = [];
    let count = 0;
    for (var i = 0; i < allSounds.length; i++) {
        // Sounds are randomly selected.
        if (Math.random() > 0.5 && count < num) {
            ret.push(allSounds[i]);
            count += 1;
        }
    }
    return ret;
}

async openTabs(lib){
    /*
        1. Open all tabs.
        2. Switch the chromedriver to each tab for loading sounds.
        3. For each tab,
            if the autoplay of audiocontext is disabled:
                a. Wait until the 'play' button is displayed in 'div.contextPlay'.
                b. Click the 'play' button to enable the audiocontext.
                c. Send key 'm' to mute the sound.
            if the autoplay of audiocontext is enabled:
                a. Wait until the 'mute' button is pointer-interactive.
                b. Send key 'm' to mute the sound.
    */
    var self = this;
    for (var i = 0; i < lib.length; i++) {
        await driver.executeScript("window.open('"+lib[i][1]+"', '"+i+"');", );
    }
    var windows = await driver.getAllWindowHandles();
    //console.log(windows);
    for (var i = 0; i < windows.length-1; i++) {
        await driver.switchTo().window(windows[i+1]);
        let processed = false;
        //console.log(i,windows[i+1]);
        //driver.getWindowHandle().then((va)=>{console.log(va);});
        //var p1 = driver.wait(until.elementIsVisible(driver.findElement(By.css('div.contextPla'))), 100000);
        var p2 = driver.wait(function(){
            return driver.findElement(By.id('mute')).then((elem1)=>{
                return elem1.getAttribute("class").then(async function(classes){
                    if (classes.indexOf('active') < 0 && classes.indexOf('disabled') < 0 && !processed) {
                        
                        return elem1;
                    }
                });
            })
        }, 100000);
        //var p2 = driver.wait(until.elementTextContains(driver.findElement(By.id('msg')),'Playing'),100000);
        await p2.then(async function(ele){
            processed = true;
            let value = await ele.getAttribute("class").then((value)=>{return value});
            //console.log(value);
            /*
            if (value == 'contextPlay') {
                await ele.click().then((e)=>{console.log("clicked")}).catch((e)=>{console.error(e.message);});
            }*/
            ele.getDriver().getWindowHandle().then((va)=>{});
            await driver.findElement(By.css('body')).then(async function(bd){
                //driver.getTitle().then((e)=>console.log(e))
                await bd.sendKeys(Key.chord("p")).then((a)=>{
                    //let str = "loading..."+((i+1)/num).toFixed(3)*100+"%.\n";
                    //fs.appendFileSync(self.logfile, str);
                }).catch((e)=>{console.error(e.message);});
            }).catch((e)=>{console.error(e.message);});
            
        });
        /*
        await Promise.any([p1, p2]).then(async function(ele) {
            processed = true;
            let value = await ele.getAttribute("class").then((value)=>{return value});
            console.log(value);
            if (value == 'contextPlay') {
                await ele.click().then((e)=>{console.log("clicked")}).catch((e)=>{console.error(e.message);});
            }
            ele.getDriver().getWindowHandle().then((va)=>{console.log(va);});
            await driver.findElement(By.css('body')).then(async function(bd){
                //driver.getTitle().then((e)=>console.log(e))
                await bd.sendKeys(Key.chord("p")).then((a)=>{
                    console.log("loading..."+((i+1)/num).toFixed(2)*100+"%.");
                }).catch((e)=>{console.error(e.message);});
            }).catch((e)=>{console.error(e.message);});
            
        });*/
    }
    //this.msg = "Press ENTER to start.\nPress 'n' to switch soundscape manually.\nPress CTRL+'c' to exit the program."

    //document.getElementById("msg").innerHTML = s;
    //console.log("Press ENTER to start.");
    //console.log("Press 'n' to switch soundscape manually.");
    //console.log("Press CTRL+'c' to exit the program.");

}




}
var seleniumtest = new SeleniumTest();

module.exports = seleniumtest;
