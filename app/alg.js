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
		this.epsilon = 0.1
		this.msg = null
	}
	getMessage(){
		return this.msg;
	}
	generateNext(d){
		var rew = this.generateReward(d);
		//console.log("reward", rew);
		this.updateState(rew);
		var rand = Math.random();
		//console.log(this.sounds);
		if (rand < this.epsilon)
			this.current = Math.floor(Math.random() * this.num);
		else
			this.current = indexOfMax(this.sounds);
		//console.log(this.current);
		this.msg = "; reward: "+rew.toString()+ "; value_function: "+this.sounds;
		return this.current;
	}

	updateState(rew){
		var s = this.sounds[this.current];
		this.sounds[this.current] += this.learning_rate * (rew - s);
	}

	setRestBPM(d) {
		this.restbpm = parseFloat(d);
	}

	generateReward(d){
		var bpm = d;

		if (this.previous_bpm == -1) {
			this.previous_bpm = this.restbpm;
		}
		var rate_dif = this.previous_bpm - bpm;
		var rest_dif = this.restbpm - bpm;
		this.previous_bpm = bpm;
		var rew = Math.max(rate_dif, rest_dif);
		rew = 2/(1+Math.pow(Math.E, -rew)) - 1; //normalize to -1 ~ 1
		return rew;
	}

}

module.exports = Algorithm