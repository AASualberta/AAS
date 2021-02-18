
  console.log("hello")
  var bpm;
  const socket = io();
  socket.on('init', function(msg){ 
    document.getElementById("h").innerHTML = "loaded";
    document.getElementById("start").disabled = false;
    document.getElementById("stop").disabled = false;
    document.getElementById("switch").disabled = false;
    socket.emit("restbpm", bpm);
  });

  socket.on('next', function(msg){
    document.getElementById("h").innerHTML = "Playing";
    document.getElementById("msg").innerHTML = msg;
  })


  const startbutton = document.getElementById("start")
  const nextbutton = document.getElementById("next")
  const stopbutton = document.getElementById("stop")
  const formbutton = document.getElementById("formbutton")
  const switchbutton = document.getElementById("switch")

  switchbutton.addEventListener('change', function(){
    if (this.checked) {
      document.getElementById("switchtext").innerHTML = "Training Mode";
    }
    else{
      document.getElementById("switchtext").innerHTML = "Therapeutic Mode";
    }
  })

  startbutton.addEventListener('click', function() {
    startbutton.disabled = true;
    nextbutton.disabled = false;
    socket.emit("startsocket", null);

  })


  nextbutton.addEventListener('click', function() {
    socket.emit("nextsocket", null);
  })


  stopbutton.addEventListener('click', function() {
    socket.emit("stopsocket", null);
    socket.close();
  })

  formbutton.addEventListener('click', function(){
    var x = document.getElementById("form");
    
    var i;
    for (i = 0; i < x.length ;i++) {
      bpm = x.elements[i].value;
    }
    document.getElementById("beforestart").style.display = "none";
    document.getElementById("started").style.display = "block";
    //document.getElementById("msg").innerHTML = bpm;
    
  })