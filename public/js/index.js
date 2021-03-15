  const nextbutton = document.getElementById("next");
  const stopbutton = document.getElementById("stop");
  const formbutton = document.getElementById("formbutton");
  const modebutton = document.getElementsByName("mode");
  const pausebutton = document.getElementById("pause");
  const title = document.getElementById("h");

  var bpm;
  //const socket = io();
  var first = true;
  var volume;

  socket.on('init123', function(msg){ 
    console.log(msg)
    document.getElementById("h").innerHTML = "loaded";
    pausebutton.classList.toggle("playDisabled");
    document.getElementById("stop").disabled = false;
    document.getElementById("pause").disabled = false;
    document.getElementById("volume-control").disabled = false;
    socket.emit("restbpm", bpm);
  });

  socket.on('next', function(msg){
    document.getElementById("h").innerHTML = "Playing";
    //document.getElementById("msg").innerHTML = msg;
  })




  var prev = null;
  for (var i = 0; i < modebutton.length; i++) {
      modebutton[i].addEventListener('change', function() {
          if (this !== prev) {
              prev = this;
          }
          if (this.value == "Training") {
            socket.emit("mode",0); // 0: training
          }
          else{
            socket.emit("mode",1); // 1: therapeutic
          }
      });
  }
/*
  modebutton.addEventListener('change', function(){
    if (this.checked) {
      document.getElementById("switchtext").innerHTML = "Training Mode";
      socket.emit("mode",0); // 0: training
    }
    else{
      document.getElementById("switchtext").innerHTML = "Therapeutic Mode";
      socket.emit("mode",1); // 1: therapeutic
    }
  })
*/


  nextbutton.addEventListener('click', function() {
    socket.emit("nextsocket", null);
  })


  stopbutton.addEventListener('click', function() {
    socket.emit("stopsocket", null);
    socket.close();
  })

  pausebutton.addEventListener('click', function(){
    pausebutton.classList.toggle("active");
    if (first) {
      socket.emit("startsocket", null);
      nextbutton.disabled = false;
      first = false;
    }
    else{
      socket.emit("pausesocket", null);
      if (title.innerHTML == "Playing") {
        title.innerHTML = "Pause";
      }
      else{
        title.innerHTML = "Playing";
      }
    }

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

document.getElementById("volume-control").addEventListener("change", function(){
  slideAmount = document.getElementById("volume-control").value;
  //console.log(slideAmount);
  socket.emit("changeVolume", slideAmount-volume);
  volume = slideAmount;
})


socket.on("volume",function(msg){
  volume = parseFloat(msg);
  document.getElementById("volume-control").value = volume;
})
