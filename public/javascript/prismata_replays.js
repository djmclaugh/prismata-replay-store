var app = angular.module("prismata-replays", []);

app.service("ReplayService", function($http) {
  var self = this;
  
  self.recentReplays = [];
  self.searchResults = [];
  
  self.fetchRecentReplays = function(callback) {
    function onSuccess(response) {
      self.recentReplays.splice.apply(self.recentReplays, [0, self.recentReplays.length].concat(response.data));
      if (callback) {
        callback(null);
      }
    }
    function onError(responce) {
      if (callback) {
        callback(new Error("Failled to fetch Recent Replays."));
      }
    }
    $http.get("/services/recent_replays").then(onSuccess, onError);
  };
  
  self.fetchSearchResults = function(query, callback) {
    function onSuccess(response) {
      self.searchResults.splice.apply(self.searchResults, [0, self.searchResults.length].concat(response.data));
      if (callback) {
        callback(null);
      }
    }
    function onError(responce) {
      if (callback) {
        callback(new Error("Failled to fetch Search Results."));
      }
    }
    $http.post("/services/search", query).then(onSuccess, onError);
  };
  
  self.addReplay = function(replayCode, callback) {
    function onSuccess(response) {
      callback(null, response.data);
      self.fetchRecentReplays();
    }
    function onError(response) {
      callback(new Error("Failled to add replay."), null);
    }
    $http.put("/services/replay/" + replayCode).then(onSuccess, onError);
  };
});

app.controller("AddReplayFormController", function($scope, ReplayService) {
  var self = this;
  self.replayCode = "";
  self.alreadyAddedCode = "";
  self.error = "";
  self.addReplay = function() {
    ReplayService.addReplay(self.replayCode, function(error, data) {
      if (error) {
        self.error = error.message;
        self.replayCode = self.alreadyAddedCode = "";
      } else if (data == "REPLAY_ADDED") {
        self.replayCode = self.alreadyAddedCode = self.error = "";
      } else if (data == "ALREADY_EXISTS") {
        self.error = "";
        self.alreadyAddedCode = self.replayCode;
        self.replayCode = "";
      } else {
        self.replayCode = self.alreadyAddedCode = "";
        self.error = data;
      }
    });
  };
});

app.controller("SearchFormController", function(ReplayService, $log) {
  var self = this;  

  self.error = null;
  self.query = {};
  self.query.include_rated = true;
  self.query.include_unrated = true;
  
  self.submit = function () {
    $log.log(self.query);
    updateNumberOfReplaysMessage(true);
    ReplayService.fetchSearchResults(self.query, function(error) {
      self.error = error;
      updateNumberOfReplaysMessage(false);
    });
  };
  
  self.numberOfReplaysMessage = "";

  function updateNumberOfReplaysMessage(isCurrentlySearching) {
    if (isCurrentlySearching) {
      self.numberOfReplaysMessage = "Searching...";
      return;
    }
    var amount = ReplayService.searchResults.length;
    if (amount == 0) {
      self.numberOfReplaysMessage = "No replays found";
      return;
    }
    self.numberOfReplaysMessage = amount + "  " + (amount == 1 ? "replay" : "replays") + " found";
  };
});

app.controller("RecentReplaysController", function(ReplayService) {
  var self = this;
  self.error = null;
  self.replays = ReplayService.recentReplays;
  ReplayService.fetchRecentReplays(function(error) {
    self.error = error;
  });
});

app.controller("SearchReplaysController", function(ReplayService) {
  var self = this;
  self.replays = ReplayService.searchResults;
});

app.directive("replay", function() {
  return {
    restrict: "E",
    templateUrl: "/html/replay.html"
  };
});

app.directive("recentReplays", function() {
  return {
    restrict: "E",
    templateUrl: "/html/recentReplays.html"
  };
});

app.directive("searchReplays", function() {
  return {
    restrict: "E",
    templateUrl: "/html/searchReplays.html"
  };
});

app.directive("searchForm", function() {
  return {
    restrict: "E",
    templateUrl: "/html/searchForm.html"
  };
});

app.directive("addReplayForm", function() {
  return {
    restrict: "E",
    templateUrl: "/html/addReplayForm.html"
  };
});

app.directive("replayCodeValidator", function() {
  return {
    restrict: "A",
    require: "ngModel",
    link: function(scope, ele, attrs, ctrl) {
      ctrl.$parsers.unshift(function(value) {
        var replayRegex = new RegExp("^[A-z0-9@+]{5}-[$A-z0-9@+]{5}$");
        ctrl.$setValidity("invalidFormat", replayRegex.test(value));
        return value;
      });
    }
  };
});

app.filter("durationToString", function() {
  return function(duration) {
    return Math.floor(duration / 60) + "m. " + Math.floor(duration % 60) + "s.";
  }
});

app.filter("thumbnailImageSource", function() {
  return function(unitName) {
    return "/images/unit_thumbnails/" + unitName.replace(/ /g,'') + ".png";
  };
});

app.filter("replayTitle", function() {
  return function(replay) {
    var gameTitle = "";
    if (replay.result == 0) {
      gameTitle += "*";
    }
    gameTitle += replay.players[0].name + " (" + replay.players[0].rating + ")" + " vs. "
    if (replay.result == 1) {
      gameTitle += "*";
    }
    gameTitle += replay.players[1].name + " (" + replay.players[1].rating + ")";
    return gameTitle;
  };
});

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
  var comment = commentDiv.innerHTML.trim();
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
