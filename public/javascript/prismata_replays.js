const replayRegex = new RegExp("^[A-z0-9@+]{5}-[$A-z0-9@+]{5}");

function addReplay() {
  var replayCode = document.getElementById("replayCode").value;
  if (replayRegex.test(replayCode)) {
    window.location.href = "/replay/" + replayCode;
  } else {
    document.getElementById('replayCodeError').innerHTML = "Invalid Replay Code Format";
  }
}

