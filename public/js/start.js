
function setRequired(id){
	document.getElementById(id).required=true;
}

function removeRequired(id){
	if(document.getElementById(id).required == true){
		document.getElementById(id).required=false;
	}
}
