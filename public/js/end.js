const submitbutton = document.getElementById("formbutton");

submitbutton.addEventListener("click", function(){
    // close window

    window.open("", "_self");
    window.close();

    // document.getElementById("endmessage").style.display = "none";
    // document.getElementById("terminated").style.display = "block";
})