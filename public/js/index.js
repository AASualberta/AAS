  const nextbutton = document.getElementById("next");
  const stopbutton = document.getElementById("stop"); 
  const formbutton = document.getElementById("formbutton");
  const modebutton = document.getElementsByName("mode");
  const pausebutton = document.getElementById("pause");
  const title = document.getElementById("h");
  const alert = document.getElementById("alert");
  const paramsbutton = document.getElementById("params");

  var bpm;
  var volume;
  var currentMode;
  var skiptimeout;
  var setprevtimeout;


  // called when sounds are loaded and system is ready
  socket.on('init123', function(msg){ 
    document.getElementById("stop").disabled = false;
    socket.emit("restbpm", bpm);
    // start playing right when loaded
    socket.emit("startsocket", null);
    setprevtimeout = setTimeout(setPrevBpm, 90000); // timeout after 1.5 minute (900000 ms) of first sound to set previous bpm in alg
    nextbutton.disabled = false;
    pausebutton.classList.toggle("playDisabled");
    pausebutton.classList.toggle("active");
    document.getElementById("pause").disabled = false;
    document.getElementById("volume-control").disabled = false;
  });

  socket.on('setMode', function(msg){
    if (msg == 0){
      currentMode = "Discovery Mode"
    }
    else{
      currentMode = "Therapeutic Mode"
    }
  })

  socket.on('next', function(msg){
    document.getElementById("h").innerHTML = currentMode;
  })

  socket.on('reload', function(msg) {
    pausebutton.classList.toggle("playDisabled");
    console.log("reload" + msg)
    if (msg) {
      first = false;
      document.getElementById("h").innerHTML = currentMode;
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

  socket.on('isAdmin', function(msg) {
    if (msg) {
      document.getElementById("parambutton").style.display = "flex";
      paramsbutton.disabled = false;
      for (var i = 0; i < modebutton.length; i++) {
        modebutton[i].disabled = false;
      }
    }
    else {
      document.getElementById("parambutton").style.display = "none";
      paramsbutton.disabled = true;
      document.getElementById("modebuttons").style.display = "none";
      for (var i = 0; i < modebutton.length; i++) {
        modebutton[i].disabled = true;
      }
    }
  })

  socket.on('surfing', function(msg){
    document.getElementById("alert").innerHTML = "Stop surfing and listen!"
    document.getElementById("alert").style.visibility = "visible";
    setTimeout(hideAlert, 5000);
  })

  socket.on('loaded', function(msg){
    document.getElementById("h").innerHTML = "Loaded, you can now connect with the app";
  })

  function hideAlert(){
    document.getElementById("alert").style.visibility = "hidden";
  }

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
  
  paramsbutton.addEventListener('click', function() {
    document.getElementById("collapseExample").classList.toggle("show");
  })


  nextbutton.addEventListener('click', function() {
    socket.emit("nextsocket", null);
    if (setprevtimeout){
      clearTimeout(setprevtimeout);
    }
  })


  stopbutton.addEventListener('click', function() {
    socket.emit("stopsocket", null);
    socket.close();
  })

  pausebutton.addEventListener('click', function(){
    pausebutton.classList.toggle("active");
    socket.emit("pausesocket", null);
    if (title.innerHTML == currentMode) {
      title.innerHTML = "Paused";
      skiptimeout = setTimeout(timeoutFunction, 900000); // timeout after 15 minutes (900000 ms) terminates session
    }
    else{
      title.innerHTML = currentMode;
      clearTimeout(skiptimeout);
    }
  })

  function timeoutFunction(){
    title.innerHTML = "SESSION TIMED OUT!"
    socket.emit("stopsocket", true);
    socket.close();
  }

  function setPrevBpm(){
    socket.emit("setprevious");
  }

  // ????
  // function formbtn(){
  //   var x = document.getElementById("form");
    
  //   var i;
  //   for (i = 0; i < x.length ;i++) {
  //     bpm = x.elements[i].value;
  //   }
  //   document.getElementById("beforestart").style.display = "none";
  //   document.getElementById("started").style.display = "block";
  // }


document.getElementById("volume-control").addEventListener("change", function(){
  var slideAmount = document.getElementById("volume-control").value;
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
