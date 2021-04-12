// app/alg.js
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

function actionValueLog(values, num){
	var output = '[';

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
		this.epsilon = 0.5
		this.greedy_prob = 1 - this.epsilon + this.epsilon / this.num;
		this.nongreedy_prob = this.epsilon / this.num;
		// equal probability for initialization
		for (var j = 0; j < this.num; j++) {
			this.values.push(0);
		}
	
		var maxIndex = indexOfMax(this.values);
		for (var j = 0; j < this.num; j++) {
			if (j == maxIndex) {
				this.policy.push(this.greedy_prob);
			}
			else{
				this.policy.push(this.nongreedy_prob);
			}
		}	
		
		this.previous_bpm = -1;
		this.restbpm = 60; //set default restbpm
		this.upperbound = this.restbpm + 5; //default upper bound of restbpm
		this.current = Math.floor(Math.random() * this.num);
		//this.previous = this.num - 1;
		this.step_size = 0.7;
		
		this.msg = null
		this.mode = -1; // 0: training, 1: therapeutic
		this.started = 0;
		this.gamma = 0.9;
	}
	getMessage(){
		return this.msg;
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
		var max_ind = indexOfMax(this.values);
		var current;
		if (max_ind==this.current && (rew<0 || pressed)) {
			var temp = this.values[max_ind];
			this.values[max_ind] = -Infinity;
			current = indexOfMax(this.values);
			this.values[max_ind] = temp;
		}
		else
			current = max_ind;
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

		/*
		if (rand < this.epsilon){ // randomly picked
			current = Math.floor(Math.random() * this.num);
			if (pressed && current==this.current) {
				current = ((current-1)%this.num + this.num)%this.num; // index minus 1
			}
		}
		else{ // maximum value
			max_ind = indexOfMax(this.values[this.current]);
			if (pressed && max_ind==this.current) {
				var temp = this.values[this.current][max_ind];
				this.values[this.current][max_ind] = -Infinity;
				current = indexOfMax(this.values[this.current]);
				this.values[this.current][max_ind] = temp;
			}
			else{
				current = max_ind;
			}
		}*/
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
		this.restbpm = parseFloat(d); // upper bound of the restbpm
		this.upperbound = this.restbpm + 5;
	}

	generateReward(d, pressed){
		var bpm = d; 

		if (this.previous_bpm == -1) {
			this.previous_bpm = this.upperbound;
		}
		var rate_dif = this.previous_bpm - bpm;
		var rest_dif = this.upperbound - bpm; 
		this.previous_bpm = bpm;
		var rew = Math.max(rate_dif, rest_dif);
		// 
		// rew = 2/(1+Math.pow(Math.E, -rew)) - 1; //normalize to -1 ~ 1
		if (pressed) {
			return -30; // maximum penalty
		}
		return rew;
	}

}

module.exports = Algorithm