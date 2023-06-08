const finishbutton = document.getElementById("finish_button");
const statustext = document.getElementById("status_text");
const heart = document.getElementById("heart");

let progress = 0;

socket.on('updateProgress', () => {
	let str = "Measuring...";
	if (progress < 5){
		document.getElementById("status").style.display = "block";
		heart.style.visibility = "visible";
		setTimeout(function(){
			heart.style.visibility = "hidden";
		}, 1000);	
	}
	else{
		str = "Complete!"
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

finishbutton.addEventListener("click", function(){
	socket.close();
});