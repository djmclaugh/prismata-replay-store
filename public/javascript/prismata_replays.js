const replayRegex = new RegExp("^[A-z0-9@+]{5}-[$A-z0-9@+]{5}");

function stopPropagation() {
  e = window.event;
  e.cancelBubble = true;
  if (e.stopPropagation) {
    e.stopPropagation();
  }
}

function addReplay() {
  var replayCode = document.getElementById("replayCode").value;
  if (replayRegex.test(replayCode)) {
    window.location.href = "/replay/" + replayCode;
  } else {
    document.getElementById('replayCodeError').innerHTML = "Invalid Replay Code Format";
  }
}

function onReplayClick(replayCode) {
  // Don't change page if the user is selecting text
  console.log(window.getSelection());
  if (window.getSelection().type != "Range") {
    window.location.href = "/replay/" + replayCode;
  }
}

