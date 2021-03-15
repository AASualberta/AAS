const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;
const port = new SerialPort('/dev/tty.usbserial-A6008lMx', {
  baudRate: 9600,
})

var xhr = new XMLHttpRequest();
var url='http://127.0.0.1:3000/test';
const PulseSensor = port.pipe(new Readline('\r\n'))
var hr_arr = []; // array of [timestamp, heart rate]

PulseSensor.on('data', function (data) {
  //console.log(Date.now(), data.toString('utf8'));
  dt = parseInt(data.toString('utf8'));
  if (dt) {
  	hr_arr.push([Date.now(), dt]);
  	averageHR();
  }
});

function averageHR() {
	// get the last minute's heart rate
	if ((hr_arr[hr_arr.length-1][0] - hr_arr[0][0]) > 60000) {
		hr_arr = hr_arr.slice(1) // only stores the last minute's heart rate
	}
		var sum = 0;
		for (var i = 0; i < hr_arr.length; i++) {
			sum += hr_arr[i][1];
		}
		var avg = (sum / hr_arr.length).toFixed(2); // average heart rate over 1 minute
		xhr.open("POST", url, true);
		xhr.send(avg.toString());
	
}


module.exports = PulseSensor;




