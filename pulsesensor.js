const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;
let portser;
let PulseSensor;
let path;
var hr_arr = []; // array of [timestamp, heart rate]
var xhr = new XMLHttpRequest();
var url='http://127.0.0.1:3000/test';

(async () => {
  try {
    const serialList = await SerialPort.list();

    serialList.forEach((port) =>{
    	//console.log(port.path)
    	if (port.path.includes("/dev/tty.usbserial") || port.path.includes("/dev/tty.usbmodem"))
    		path = port.path;
    })
    //console.log(path)
    portser = new SerialPort(path, {baudRate: 9600});
    
	PulseSensor = portser.pipe(new Readline('\r\n'))
	
	PulseSensor.on('data', function (data) {
	  //console.log(Date.now(), data.toString('utf8'));
	  dt = parseInt(data.toString('utf8'));
	  console.log(dt);
	  if (dt) {
	  	hr_arr.push([Date.now(), dt]);
	  	averageHR();
	  }
	});

  } catch (e) {
    console.log(e);
  }
})()

/*var arduinoPort =  SerialPort.list().then((ports)=>{
	return ports.forEach((port) => {
		if (port.includes("/dev/tty.usbserial") || port.include("/dev/tty.usbmodem")) {
			return port;
		}
	})
})

const port = new SerialPort(arduinoPort, {
  baudRate: 9600,
})*/



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
	//console.log(avg)
}


module.exports = PulseSensor;




