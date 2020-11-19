const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const {Builder, By, Key, until} = require('selenium-webdriver');
var driver = new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(/* ... */)
    .build();

const num = 3;

class SeleniumTest{

    constructor(){
        this.timeouts = null;
        this.first = 0;
//        this.num = 3; // number of sounds in personalized sound library.
        this.timer = 10000; // Each sound is played up to 10 seconds.
        this.init();
    }


// initialize the server
//init();
/*
// keyboard listening
const readline = require('readline');
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on('keypress', async function(str, key){
    if (key && key.ctrl && key.name=='c') {
        // Exiting by pressing CTRL+'c'
        console.log('exiting...');
        driver.quit().then((e)=>{
            process.exit();
        });
    }
    else if (key.name == 'return') {
        // Start the server by pressing 'ENTER'.
        console.log('Started');
        timeout();        
    }
    else if (key.name == 'n') {
        // Switch soundscape manually by pressing 'n'.
        console.log('n pressed');
        clearTimeout(timeouts);
        timeout();
    }

});*/

operate(op){
    var self = this;
    if(op == 1){
        console.log('Started');
        self.timeout();  
    }
    if(op == 2){
        console.log('next');
        clearTimeout(this.timeouts);
        self.timeout();
    }
    if(op == 3){
        console.log('exiting...');
        driver.quit().then((e)=>{
            process.exit();
        }); 
    }
}


timeout() {
    /*
        Call playNext() every 10 seconds.
    */
    var self = this;
    if (this.first == 0) {
        this.startFirstSound();
        this.first += 1;
    }
    else{
        this.playNext();
    } 
    
    this.timeouts = setTimeout(function () {
        self.timeout();
    }, this.timer);
}


select(){
    /*
        Select the next soundscape.
    */
    //return index
    return Math.floor(Math.random()*num); // randomly generated.
}

startFirstSound(){
    /*
        Play the first soundscape.
    */
    driver.findElement(By.css('body')).then((el)=>{
        el.sendKeys(Key.chord("m")).then((a)=>{
            console.log("unmute...");
        }).catch((e) => { console.error(e.message) });
    }).catch((e) => { console.error(e.message) });
}

playNext(){
    /*
        1. Mute currently playing soundscape.
        2. Select the next soundscape by calling select().
        3. Switch the window to the next tab.
        4. Unmute the soundscape.
    */   
    var self = this;
    driver.findElement(By.css('body')).then((el)=>{
        // mute currently playing soundscape
        el.sendKeys(Key.chord("m")).then(async function(a) {
            //console.log("mute...");
            // determine the next soundscape
            let ind = self.select();
            // switch tab
            var windows = await driver.getAllWindowHandles().then((value)=>{return value});
            await driver.switchTo().window(windows[ind+1]);
            await self.sleep(1000);
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
    var allSounds = [];
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
    }

    // Select sounds.
    var lib = this.getLibrary(allSounds);

    //Open all tabs and wait until all sounds are loaded.
    this.openTabs(lib);
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
                        console.log("loading..."+((i+1)/num).toFixed(2)*100+"%.");
                    }).catch((e)=>{console.error(e.message);});
                }).catch((e)=>{console.error(e.message);});
            }
        });  
    }
    console.log("Press ENTER to start.");
    console.log("Press 'n' to switch soundscape manually.");
    console.log("Press CTRL+'c' to exit the program.");

}




}
module.exports = SeleniumTest