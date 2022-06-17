// app/alg.js
const fs = require('fs');
const readline = require('readline');
const Stream = require('stream');

function indexOfMax(arr) {
    if (arr.length === 0) {
        return -1;
    }

    var max = arr[0];
    var maxIndex = 0;

    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}

function readActionValuesFromFile(filename) {
	if (!fs.existsSync(filename)) {
		console.log("doesn't exist")
		return null;
	}
	var lines = fs.readFileSync(filename, 'utf-8').split('\n');
	for (var i = lines.length - 1; i >= 0; i--) { // get latest action values from logfile
		if (lines[i].includes("value_function")){
			var temp = lines[i].split(";");
			var actionValues = temp[temp.length-2].split(':')[1].match(/(\-\d|\d)+(?:\.\d+)?/g).map(Number);
			return actionValues;
		}
	}
}

function actionValueLog(values, num){
	var output = '[';
	//console.log(values)
	for (var j = 0; j < num-1; j++) {
		output += (values[j].toFixed(2).toString() + ',');
	}
	output += (values[j].toFixed(2).toString() + ']');

	return output;
}

class Algorithm{

	constructor(num){
		this.num = num;
		this.values = []; // action values
		this.policy = []; // probability of choosing an action
		//this.max = 30;
		//this.min = -30;
		this.epsilon = 1;
		this.greedy_prob = 1 - this.epsilon + this.epsilon / this.num;
		this.nongreedy_prob = this.epsilon / this.num;
		// equal probability for initialization
		for (var j = 0; j < this.num; j++) {
			this.values.push(0);
		}
		this.loadPolicy();
		
		this.previous_bpm = -1;
		this.restbpm = 60; //set default restbpm
		this.upperbound = this.restbpm + 5; //default upper bound of restbpm
		this.current = Math.floor(Math.random() * this.num);
		//this.previous = this.num - 1;
		this.step_size = 0.7;
		this.mode = 0; // 0: training, 1: therapeutic
		this.msg = "; value_function: "+actionValueLog(this.values, this.num)+"; mode: " + this.getModeMsg(this.mode);
		
		this.started = 0;
		this.gamma = 0.9;
	}
	getMessage(){
		return this.msg;
	}

	setMode(mode){
		this.mode = mode;
		this.msg = "; value_function: "+actionValueLog(this.values, this.num)+"; mode: " + this.getModeMsg(this.mode);
	}

	getModeMsg(mode) {
		var m;
		if (this.mode == 0) { //training
			m = "training";
		}
		else{ //therapeutic
			m = "therapeutic";
		}
		return m;
	}

	loadPolicy() {
		var maxIndex = indexOfMax(this.values);
		if (this.values.every(i => i===0)) { // if action values are all zeros
			this.policy = Array(this.num).fill(1.0/this.num); // same prob for all actions
			//console.log(this.policy);
		}
		else{
			for (var j = 0; j < this.num; j++) {
				if (j == maxIndex) {
					this.policy.push(this.greedy_prob);
				}
				else{
					this.policy.push(this.nongreedy_prob);
				}
			}
		}	
	}

	loadValues(filename, mode){
		var values = readActionValuesFromFile(filename);
		if (values) {
			this.values = values;
			//console.log(this.values)
			this.loadPolicy();
		}
		this.msg = "; value_function: "+actionValueLog(this.values, this.num) + "; mode: " + this.getModeMsg(mode);
	}

	setAlpha(alpha){
		this.step_size = alpha;
	}

	setEpsilon(epsilon) {
		this.epsilon = epsilon;
	}

	generateNext(d, mode, pressed){

		this.mode = mode;
		var m = null;
		var rew = this.generateReward(d, pressed);
		//console.log("reward", rew);
		this.update(rew);
		//this.previous = this.current;
		if (this.mode == 0) { //training
			m = "training";
			this.current = this.epsilonGreedy(pressed);
		}
		else{ //therapeutic
			m = "therapeutic";
			var isRandom = 0;
			if (!this.started) {
				isRandom = 1;
				this.started = 1;
			}
			this.current = this.Greedy(pressed, rew, isRandom);
		}
		//console.log(this.current);
		this.msg = "; reward: "+rew.toString()+ "; value_function: "+actionValueLog(this.values, this.num) + "; mode: "+ m;
		return this.current;
	}

	Greedy(pressed, rew, isRandom){
		if (isRandom) {
			return Math.floor(Math.random() * this.num);
		}
		var current;

		if (rew<0 || pressed) {
			var temp = this.values[this.current];
			this.values[this.current] = -Infinity;
			current = indexOfMax(this.values);
			this.values[this.current] = temp;
		}
		else
			current = this.current;

		return current;
	}

	epsilonGreedy(pressed){
		var current = this.current;
		// epsilon greedy
		while (true) {
			var prob=0;
			var rand = Math.random();
			for (var i = 0; i < this.num; i++) {
				if (rand > prob && rand <= prob+this.policy[i]) {
					current = i;
					break;
				}
				prob += this.policy[i];
			}
			if (!pressed || current != this.current) {
				break;
			}
		}
		return current;
	}

	update(rew){
		var s = this.values[this.current];
		// update state action value
		this.values[this.current] += 
			this.step_size * (rew - s).toFixed(3);
		// update policy
		var maxIndex = indexOfMax(this.values);
		for (var j = 0; j < this.num; j++) {
			if (j == maxIndex) {
				this.policy[j] = this.greedy_prob;
			}
			else{
				this.policy[j] = this.nongreedy_prob;
			}
		}
	}

	setRestBPM(d) {
		this.restbpm = parseFloat(d); 
		this.upperbound = this.restbpm + 5; // upper bound of the restbpm
	}

	generateReward(d, pressed){
		var bpm = d; 
		if (this.previous_bpm == -1) {
			this.previous_bpm = this.upperbound;
		}
		var rate_dif = this.previous_bpm - bpm;  // heart rate increases: negative, heart rate decreases: positive
		var rest_dif = Math.min(0, this.upperbound - bpm); // good: 0, bad: negative
		var rew = Math.max(rate_dif, rest_dif);
		this.previous_bpm = bpm;
		if (pressed) {
			return -30; // maximum penalty
		}
		return rew;
	}

}

module.exports = Algorithm