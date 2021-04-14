  const nextbutton = document.getElementById("next");
  const stopbutton = document.getElementById("stop");
  const formbutton = document.getElementById("formbutton");
  const modebutton = document.getElementsByName("mode");
  const pausebutton = document.getElementById("pause");
  const title = document.getElementById("h");
  const paramsbutton = document.getElementById("params");

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

  socket.on('reload', function(msg) {
    pausebutton.classList.toggle("playDisabled");
    console.log(msg)
    if (msg) {
      first = false;
      document.getElementById("h").innerHTML = "Playing";
      pausebutton.classList.toggle("active");
    }
    else{
      document.getElementById("h").innerHTML = "Pause";
    }
    document.getElementById("stop").disabled = false;
    document.getElementById("pause").disabled = false;
    document.getElementById("volume-control").disabled = false;
    if (!first) {
      nextbutton.disabled = false;
    }

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
  
  paramsbutton.addEventListener('click', function() {
    document.getElementById("collapseExample").classList.toggle("show");
  })


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

  function formbtn(){
    var x = document.getElementById("form");
    
    var i;
    for (i = 0; i < x.length ;i++) {
      bpm = x.elements[i].value;
    }
    document.getElementById("beforestart").style.display = "none";
    document.getElementById("started").style.display = "block";
  }
/*
  formbutton.addEventListener('click', function(){
    var x = document.getElementById("form");
    
    var i;
    for (i = 0; i < x.length ;i++) {
      bpm = x.elements[i].value;
    }
    document.getElementById("beforestart").style.display = "none";
    document.getElementById("started").style.display = "block";
    //document.getElementById("msg").innerHTML = bpm;
    
  })*/

document.getElementById("volume-control").addEventListener("change", function(){
  var slideAmount = document.getElementById("volume-control").value;
  //console.log(slideAmount);
  socket.emit("changeVolume", slideAmount-volume);
  volume = slideAmount;
});


document.getElementById("epsilon_range").addEventListener("change", function() {
  var epsilon_range = document.getElementById("epsilon_range").value;
  socket.emit("epsilon", epsilon_range);
  document.getElementById("epsilon_value").innerHTML = epsilon_range;
});

document.getElementById("alpha_range").addEventListener("change", function() {
  var alpha_range = document.getElementById("alpha_range").value;
  socket.emit("alpha", alpha_range);
  document.getElementById("alpha_value").innerHTML = alpha_range;
});


socket.on("volume",function(msg){
  volume = parseFloat(msg);
  document.getElementById("volume-control").value = volume;
})
