const finishbutton = document.getElementById("finish_button");
const restartbutton = document.getElementById("restart_button");
const statustext = document.getElementById("status_text");
const heart = document.getElementById("heart");

let progress = 0;

socket.on('updateProgress', (ave) => {
	let str = "Measuring...";
	if (progress < 5){
		document.getElementById("status").style.display = "block";
		heart.style.visibility = "visible";
		setTimeout(function(){
			heart.style.visibility = "hidden";
		}, 1000);	
	}
	else if (progress == 5){
		str = "Complete! Average BPM: " + ave;
        document.getElementById("finish_button_div").style.display = "block";
	}
	statustext.textContent = str;
	progress+=1;
})

socket.on('nosignal', () => {
	console.log("No signal from watch! Please contact Mariia! \n Ending Session.");
	statustext.textContent = "No signal from watch! Please contact Mariia! \n Ending Session.";
	finishbutton.disabled = true;
});

socket.on('done', () => {
	statustext.textContent = "Sign up complete! Terminating";
	socket.close();
});

finishbutton.addEventListener("click", function(){
	document.getElementById("finish_button_div").style.display = "none";
	socket.emit("finish");
});

restartbutton.addEventListener("click", function(){
	document.getElementById("finish_button_div").style.display = "none";
	socket.emit("restart");
	progress = 0;
	statustext.textContent = "Measuring...";
});

