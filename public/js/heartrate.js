const startbutton = document.getElementById("start_button");
const finishbutton = document.getElementById("finish_button");
const statustext = document.getElementById("status_text");

let progress = 0;

socket.on('updateProgress', () => {
	let str;
	if (progress == 0){
		str = "Connected";
	}
	else if (progress < 5){
		str = "Progress: "+progress*20+"%";
	}
	else{
		str = "Complete!"
        document.getElementById("finish_button_div").style.display = "block";
		socket.close();
	}
	statustext.textContent = str;
	progress+=1;
})

startbutton.addEventListener("click", function(){
	document.getElementById("start_button_div").style.display = "none";
	document.getElementById("status").style.display = "block";
	socket.emit('getBPM', null);
});
