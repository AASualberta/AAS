// app/alg.js
const fs = require('fs');
const readline = require('readline');
const Stream = require('stream');

/*
 * Return index of sound with highest value
 */
function indexOfMax(arr)
{
    var indices = [];

    var j = 0;
    for (var i = 0; i < arr.length; ++i) {
        if (arr[i] == Math.max(...arr))
            indices[j++] = i;
    }
    return indices[Math.floor(Math.random() * indices.length)];
}

/*
 * Return action values list from log file
 */
function readActionValuesFromFile(filename) {
	if (!fs.existsSync(filename)) {
		console.log("logfile doesn't exist")
		return null;
	}
	var lines = fs.readFileSync(filename, 'utf-8').split('\n');
	for (var i = lines.length - 1; i >= 0; i--) { // get latest action values from logfile
		if (lines[i].includes("values")){
			var temp = lines[i].split(";");
			var actionValues = temp[temp.length-2].split(':')[1].match(/(\-\d|\d)+(?:\.\d+)?/g).map(Number);
			return actionValues;
		}
	}
}

/*
 * Return string rep of action values
 */
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
		this.num = num; // num of sounds
		this.values = []; // action values
		this.policy = []; // probability of choosing an action
		this.epsilon = 1/3;
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
		this.current = null;
		this.step_size = 0.7;
		this.mode = 0; // 0: training, 1: therapeutic
		this.msg = "; values: "+actionValueLog(this.values, this.num)+"; mode: " + this.getModeMsg(this.mode);
		
		this.started = 0;
		this.gamma = 0.9;
	}

	getMessage(){
		return this.msg;
	}

	setMode(mode){
		this.mode = mode;
		this.msg = "; values: "+actionValueLog(this.values, this.num)+"; mode: " + this.getModeMsg(this.mode);
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
			this.loadPolicy();
		}
		this.msg = "; values: "+actionValueLog(this.values, this.num) + "; mode: " + this.getModeMsg(mode);
	}

	resetValues(){
		var values = Array(this.num).fill(0);
		this.values = values;
		this.loadPolicy();
		this.msg = "; values: "+actionValueLog(this.values, this.num) + "; mode: " + this.getModeMsg(this.mode);
	}

	setAlpha(alpha){
		this.step_size = alpha;
	}

	setEpsilon(epsilon) {
		this.epsilon = epsilon;
	}

	getFirstSound(){
		if (this.mode == 0) { //training
			this.current = Math.floor(Math.random() * this.num);
		}
		else{ //therapeutic
			this.current = indexOfMax(this.values);
		}
		return this.current;
	}
	/*
 	* Return index of next sound to be played
 	*/
	generateNext(d, mode, pressed){
		this.mode = mode;
		var m = null;
		var rew = this.generateReward(d, pressed);
		this.update(rew);
		if (this.mode == 0) { //training
			m = "training";
			if (pressed){ // if next button pressed
				this.current = this.randomIndex();
			}
			else{
				this.current = this.epsilonGreedy();
			}
			
		}
		else{ //therapeutic
			var therapeutic;
			if (!pressed) {
				therapeutic = this.isTherapeutic(d);
			}
			else{
				therapeutic = 0;
			}
			m = "therapeutic";
			this.current = this.Greedy(therapeutic);
		}
		
		this.msg = "; reward: "+rew.toFixed(1).toString()+ "; values: "+actionValueLog(this.values, this.num) + "; mode: "+ m;
		return this.current;
	}

	randomIndex(){
		// return random index in range [0, num) that is not current
		var ind = Math.floor(Math.random() * this.num);
			while (ind == this.current) {
				ind = Math.floor(Math.random() * this.num);
			}
			return ind;
	}

	Greedy(therapeutic){
		var current;
		if (!therapeutic) { // choose highest vlaue that isn't current
			var temp = this.values[this.current];
			this.values[this.current] = -Infinity;
			current = indexOfMax(this.values);
			this.values[this.current] = temp;
		}
		else { // else stay at current sound
			current = this.current;
		}
		return current;
	}

	epsilonGreedy(){
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
			break;
		}
		return current;
	}

	/*
 	* Update action values and policy
 	*/
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

	setPrevBPM(d){
		this.previous_bpm = d;
		//console.log("prev set to " + d);
	}

	isTherapeutic(d){
		/* 
		* Return 1 if sound is therapeutic, 0 otherwise
		* Sound is therapeutic if it is less then previous bpm or less then or equal to uperbound threshold. 
		*/
		var bpm = d;
		return (bpm < this.previous_bpm || bpm <= this.upperbound);
	}

	/*
 	* Return reward for previous sound
	*
	* Martha note: if hr is at or below thresh assign 0. Above thresh: reward = -(abs(thresh-hr))
 	*/
	generateReward(d, pressed){
		var bpm = d; 
		var rest_dif = Math.min(0, this.upperbound - bpm);
		this.previous_bpm = bpm;
		if (pressed) {
			return -30; // maximum penalty
		}
		//return rew;
		return rest_dif;
	}
}

module.exports = Algorithm
