const signupbutton = document.getElementById("signup_button");
const signinbutton = document.getElementById("signin_button");

signupbutton.addEventListener("click", function(){
	document.getElementById("choose").style.display = "none";	
	document.getElementById("signup").style.display = "block";
});

signinbutton.addEventListener("click", function(){
	document.getElementById("choose").style.display = "none";	
	document.getElementById("signin").style.display = "block";
});

function setRequired(id){
	document.getElementById(id).required=true;
}

function removeRequired(id){
	if(document.getElementById(id).required == true){
		document.getElementById(id).required=false;
	}
}
