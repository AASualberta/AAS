const signupbutton = document.getElementById("signup_button");
const signinbutton = document.getElementById("signin_button");
const startbutton = document.getElementById("start_button");
const submitbutton = document.getElementById("signupformbutton");
const statustext = document.getElementById("status_text");

let progress = 10;

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
		submitbutton.disabled = false;
		socket.close();
	}
	statustext.textContent = str;
	progress+=1;
})

signupbutton.addEventListener("click", function(){
	document.getElementById("choose").style.display = "none";	
	document.getElementById("signup").style.display = "block";
});

signinbutton.addEventListener("click", function(){
	document.getElementById("choose").style.display = "none";	
	document.getElementById("signin").style.display = "block";
});

startbutton.addEventListener("click", function(){
	document.getElementById("start_button_div").style.display = "none";
	document.getElementById("status").style.display = "block";
	socket.emit('getBPM', null);
});

function setRequired(id){
	document.getElementById(id).required=true;
}

function removeRequired(id){
	if(document.getElementById(id).required == true){
		document.getElementById(id).required=false;
	}
}
