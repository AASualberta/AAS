const submitbutton = document.getElementById("formbutton");

submitbutton.addEventListener("click", function(){
    document.getElementById("endmessage").style.display = "none";
    document.getElementById("terminated").style.display = "block";
})