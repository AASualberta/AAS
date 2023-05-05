const fs = require('fs');

const allSounds = fs.readdirSync('./sounds');

const num = allSounds.length;

const Algorithm = require('./alg.js');

const alg = new Algorithm(num);

class Audio{
    constructor(){
        this.select_msg = null;
        this.avg_bpm = 0;
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

    select(mode, pressed){
        var idx = alg.generateNext(this.avg_bpm, mode, pressed); //generate reward from averaged bpm
        this.select_msg = alg.getMessage();
        this.bpms = [];
        return idx;
    }

    getFirstSound(){
        let ind = alg.current;
        let name = allSounds[ind];
        this.select_msg = alg.getMessage()
        return [name, "; soundscape: "+ name + "; value index: "+ ind.toString() + this.select_msg]
    }

    getNext(mode, pressed){
        let ind = this.select(mode, pressed);
        let name = allSounds[ind];
        return [name, "; soundscape: "+ name + "; value index: "+ ind.toString() + this.select_msg]
    }

}

var audio = new Audio();

module.exports = audio;
