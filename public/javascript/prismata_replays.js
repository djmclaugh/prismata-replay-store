const replayRegex = new RegExp("^[A-z0-9@+]{5}-[$A-z0-9@+]{5}");

function addReplay() {
  var replayCode = document.getElementById("replayCode").value;
  if (replayRegex.test(replayCode)) {
    window.location.href = "/replay/" + replayCode;
  } else {
    document.getElementById('replayCodeError').innerHTML = "Invalid Replay Code Format";
  }
}

// Inspired by:
// http://stackoverflow.com/questions/998245/how-can-i-detect-if-flash-is-installed-and-if-not-display-a-hidden-div-that-inf
function hasFlash() {
  try {
    if (Boolean(new ActiveXObject('ShockwaveFlash.ShockwaveFlash'))) {
      return true;
    }
  } catch (e) {
    if (navigator.mimeTypes
        && navigator.mimeTypes['application/x-shockwave-flash'] != undefined
        && navigator.mimeTypes['application/x-shockwave-flash'].enabledPlugin) {
      return true;
    }
  }
  return false;
}


