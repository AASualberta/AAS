const startbutton = document.getElementById("start_button");
const statustext = document.getElementById("status_text");

let progress = 0;

socket.on('updateProgress', () => {
	let str;
	if (progress == 0){
		str = "Connected";
	}
	else if (progress < 10){
		str = "Progress: "+progress*10+"%";
	}
	else{
		str = "Complete"
        // make button clickable to finish, button redirects to /soundscapes
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

