const submitbutton = document.getElementById("formbutton");

submitbutton.addEventListener("click", function(){
    // close window

    // window.open("", "_blank", "");
    // window.close();

    document.getElementById("endmessage").style.display = "none";
    document.getElementById("terminated").style.display = "block";
})