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
class Algorithm{

	constructor(num){
		this.num = num;
		this.sounds = [];
		for (var i = this.num; i > 0; i--) {
			this.sounds.push(0);
		}
		this.previous_bpm = -1;
		this.restbpm = 0;
		this.current = this.num - 1;
		this.learning_rate = 0.3;
		this.epsilon = 0.5
		this.msg = null
		this.mode = -1; // 0: training, 1: therapeutic
		this.started = 0;
	}
	getMessage(){
		return this.msg;
	}
	generateNext(d, mode, pressed){

		this.mode = mode;
		var m = null;
		var rew = this.generateReward(d, pressed);
		//console.log("reward", rew);
		this.updateState(rew);
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
		this.msg = "; reward: "+rew.toString()+ "; value_function: "+this.sounds + "; mode: "+ m;
		return this.current;
	}

	Greedy(pressed, rew, isRandom){
		if (isRandom) {
			return Math.floor(Math.random() * this.num);
		}
		var max_ind = indexOfMax(this.sounds);
		var current;
		if (max_ind==this.current && (rew<0 || pressed)) {
			var temp = this.sounds[max_ind];
			this.sounds[max_ind] = -Infinity;
			current = indexOfMax(this.sounds);
			this.sounds[max_ind] = temp;
		}
		else
			current = max_ind;
		return current;
	}

	epsilonGreedy(pressed){
		var rand = Math.random();
		var current, max_ind;
		if (rand < this.epsilon){ // randomly picked
			current = Math.floor(Math.random() * this.num);
			if (pressed && current==this.current) {
				current = ((current-1)%this.num + this.num)%this.num; // index minus 1
			}
		}
		else{ // maximum value
			max_ind = indexOfMax(this.sounds);
			if (pressed && max_ind==this.current) {
				var temp = this.sounds[max_ind];
				this.sounds[max_ind] = -Infinity;
				current = indexOfMax(this.sounds);
				this.sounds[max_ind] = temp;
			}
			else{
				current = max_ind;
			}
		}
		return current;
	}

	updateState(rew){
		var s = this.sounds[this.current];
		this.sounds[this.current] += this.learning_rate * (rew - s);
	}

	setRestBPM(d) {
		this.restbpm = parseFloat(d);
	}

	generateReward(d, pressed){
		var bpm = d;

		if (this.previous_bpm == -1) {
			this.previous_bpm = this.restbpm;
		}
		var rate_dif = this.previous_bpm - bpm;
		var rest_dif = this.restbpm - bpm;
		this.previous_bpm = bpm;
		var rew = Math.max(rate_dif, rest_dif);
		rew = 2/(1+Math.pow(Math.E, -rew)) - 1; //normalize to -1 ~ 1
		if (pressed) {
			return -1;
		}
		return rew;
	}

}

module.exports = Algorithm