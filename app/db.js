const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

// Set some defaults (required if your JSON file is empty)
	
class Database {
	constructor() {
		this.adapter = new FileSync('db.json');
		this.db = low(this.adapter);
		this.db.defaults({ users: [] }).write();
	}
	findName(name) {
		var re = this.db.get('users')
		  .find({ name: name })
		  .value()
		if (re) {return re;}
		else return false;
	}

	addUser(name, restbpm) {
		var filename = "./log/" + name + ".log";
		if (!this.findName(name)) { // add new user
			this.db.get('users')
  			.push({ name: name, restbpm: restbpm, totaltime: 0, driveid: -1})
  			.write()

		}
		else{ // update user's restbpm
  			this.db.get('users')
			  .find({ name: name})
			  .assign({ restbpm: restbpm})
			  .write()
		}
		return filename;
	}

	updateTime(name, sessionTime){
		var previousTime = this.db.get('users').find({ name: name}).value().totaltime;
		var newTime = previousTime + sessionTime;
		this.db.get('users')
		.find({ name: name})
		.assign({totaltime: newTime})
		.write()
	}

	findTime(name){
		return this.db.get('users').find({name: name}).value().totaltime;
	}

	getRestBPM(name){
		return this.db.get('users').find({name: name}).value().restbpm;
	}

	getDriveId(name){
		return this.db.get('users').find({name: name}).value().driveid;
	}

	setDriveId(name, id){
		this.db.get('users')
		.find({ name: name})
		.assign({driveid: id})
		.write()
	}
}

var DB = new Database()
module.exports = DB;