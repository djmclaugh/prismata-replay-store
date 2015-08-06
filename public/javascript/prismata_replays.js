const replayRegex = new RegExp("^[A-z0-9@+]{5}-[$A-z0-9@+]{5}");

function addReplay() {
  var replayCode = document.getElementById("replayCode").value;
  if (replayRegex.test(replayCode)) {
    window.location.href = "/replay/" + replayCode;
  } else {
    document.getElementById('replayCodeError').innerHTML = "Invalid Replay Code Format";
  }
}

var comments = {};

function editComment(commentId) {
  var commentDiv = document.getElementById("comment_" + commentId);
  var comment = commentDiv.innerHTML;
  comments[commentId] = comment;
  commentDiv.innerHTML = "<form action='/comment/" + commentId + "' method='POST'>" +
      "<textarea name='comment' rows='3' cols='50'>" + comment + "</textarea><br>" +
      "<button type='button' onclick='return cancelEditComment(\"" + commentId + "\")'>Cancel</button>" +
      "<input type='submit' value='Submit'></form>";
  document.getElementById("edit_" + commentId).style.display = "none";
}

function cancelEditComment(commentId) {
  var commentDiv = document.getElementById("comment_" + commentId);
  commentDiv.innerHTML = comments[commentId];
  delete comments[commentId];
  var linkElement = document.getElementById("edit_" + commentId);
  document.getElementById("edit_" + commentId).style.display = "initial";
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

// To check if the user at least tried the capcha before submiting the form.
var isCaptchaFilled = false;

function onCaptchaFilled() {
  isCaptchaFilled = true;
}

function onCaptchaExpired() {
  isCaptchaFilled = false;
}

function checkIfCaptchaIsFilled() {
  if (isCaptchaFilled) {
    return true;
  }
  alert("Please answer the reCAPTCHA.");
  return false;
}
