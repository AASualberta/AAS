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
	}
	statustext.textContent = str;
	progress+=1;
})

socket.on('nosignal', () => {
	console.log("No signal from watch! Please contact Martha! \n Ending Session.");
	statustext.textContent = "No signal from watch! Please contact Martha! \n Ending Session.";
	finishbutton.disabled = true;
});

startbutton.addEventListener("click", function(){
	document.getElementById("start_button_div").style.display = "none";
	document.getElementById("status").style.display = "block";
	socket.emit('getBPM', null);
});

finishbutton.addEventListener("click", function(){
	socket.close();
});