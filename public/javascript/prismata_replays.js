var app = angular.module("prismata-replays", []);

app.config(function($sceDelegateProvider) {
  $sceDelegateProvider.resourceUrlWhitelist([
    "self",
    "http://play.prismata.net/**"
  ]); 
});

app.service("UserService", function($http) {
  var self = this;
 
  self.user = null; 
  self.error = null;

  self.isLoggedIn = function() {
    return (self.user != null) && (self.user.username != null);
  };

  self.changeUsername = function(newUsername, callback) {
    console.log(newUsername);
    if (self.user.username == null) {
      callback(new Error("You must be logged in to change your username."));
      return;
    }
    function onSuccess(response) {
      self.user = response.data;
      callback(null);
    }
    function onError(response) {
      callback(new Error(response.data));
    }
    $http.post("/services/changeUsername", {newUsername: newUsername}).then(onSuccess, onError);
  };

  function onSuccess(response) {
    self.user = response.data;
  }
  function onError(response) {
    self.error = new Error(response.data);
  }
  $http.get("/services/currentUser").then(onSuccess, onError);
});

app.service("CommentService", function(ReplayService, $http) {
  var self = this;

  self.fetchCommentsForReplay = function(replayCode, callback) {
    if (replayCode == null) {
      callback(new Error("No replay code received to fetch comments."), []);
      return;
    }
    if (!ReplayService.isValidReplayCode(replayCode)) {
      callback(new Error("\"" + replayCode + "\" is not a valid replay code."), []);
      return;
    }
    function onSuccess(response) {
      callback(null, response.data);
    }
    function onError(response) {
      callback(new Error(response.data), null)
    }
    $http.get("/services/commentsForReplay/" + replayCode).then(onSuccess, onError);
  };

  self.postComment = function(replayCode, message, callback) {
    function onSuccess(response) {
      callback(null, response.data);
    }
    function onError(response) {
      callback(new Error(response.data), null);
    }
    $http.post("/services/comment", {replayCode: replayCode, comment: message}).then(onSuccess, onError);
  };

  self.updateComment = function(comment, callback) {
    function onSuccess(response) {
      callback(null, response.data);
    }
    function onError(response) {
      callback(new Error(response.data), null);
    }
    $http.put("/services/comment/" + comment._id, {comment: comment.message}).then(onSuccess, onError);
  };
});

app.service("ReplayService", function($http) {
  var self = this;
  
  self.recentReplays = [];
  self.searchResults = [];

  var replayRegex = new RegExp("^[A-z0-9@+]{5}-[$A-z0-9@+]{5}$");
  self.isValidReplayCode = function(code) {
    return replayRegex.test(code);
  }

  self.fetchRecentReplays = function(callback) {
    function onSuccess(response) {
      self.recentReplays.splice.apply(self.recentReplays, [0, self.recentReplays.length].concat(response.data));
      if (callback) {
        callback(null);
      }
    }
    function onError(response) {
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
      callback("SUCCESSFULLY_ADDED");
      self.fetchRecentReplays();
    }
    function onError(response) {
      if (response.status == 400) {
        callback("ALREADY_EXISTS");
      } else {
        callback(response.data);
      }
    }
    $http.post("/services/replay/addReplay", {replayCode: replayCode}).then(onSuccess, onError);
  };

  self.fetchReplay = function(replayCode, callback) {
    if (!self.isValidReplayCode(replayCode)) {
      callback(new Error("\"" + replayCode + "\" is not a valid replay code."), null);
      return;
    }
    function onSuccess(response) {
      callback(null, response.data);
    }
    function onError(response) {
      callback(new Error(response.data), null);
    }
    $http.get("/services/replay/" + replayCode).then(onSuccess, onError);
  };
});

app.controller("AddReplayFormController", function(ReplayService) {
  var self = this;
  self.replayCode = "";
  self.alreadyAddedCode = "";
  self.error = "";
  self.addReplay = function() {
    ReplayService.addReplay(self.replayCode, function(result) {
      if (result == "SUCESSFULLY_ADDED") {
        self.replayCode = self.alreadyAddedCode = self.error = "";
      } else if (result == "ALREADY_EXISTS") {
        self.error = "";
        self.alreadyAddedCode = self.replayCode;
        self.replayCode = "";
      } else {
        self.replayCode = self.alreadyAddedCode = "";
        self.error = result;
      }
    });
  };
});

app.controller("SearchFormController", function(ReplayService) {
  var self = this;  

  self.error = null;
  self.query = {};
  self.query.include_rated = true;
  self.query.include_unrated = true;
  
  self.submit = function () {
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

app.controller("ReplayViewController", function(ReplayService, $attrs) {
  var self = this;
  self.error = null;
  self.replay = null;
  if ($attrs.replayCode == null) {
    self.error = new Error("No replay code received!");
  } else {
    ReplayService.fetchReplay($attrs.replayCode, function(error, replay) {
      self.replay = replay;
      self.error = error;
    });
  } 
});

app.controller("CommentsForReplayController", function(CommentService, UserService, $attrs) {
  var self = this;
  self.error = null;
  self.comments = [];
  self.replayCode = null;
  self.newComment = "";
  self.newCommentError = null;
  self.UserService = UserService;

  self.addComment = function() {
    CommentService.postComment(self.replayCode, self.newComment, function(error, comment) {
      self.newCommentError = error;
      if (error == null) {
        self.newComment = "";
        self.comments.push(comment);
      }
    });
  };

  $attrs.$observe("replayCode", function(replayCode) {
    self.replayCode = replayCode;
    CommentService.fetchCommentsForReplay($attrs.replayCode, function(error, comments) {
      self.comments = comments;
      self.error = error;
    });
  });
  
  CommentService.fetchCommentsForReplay($attrs.replayCode, function(error, comments) {
    self.comments = comments;
    self.error = error;
  }); 
});

app.controller("CommentController", function(CommentService, UserService, $scope) {
  var self = this;
  self.isEditing = false;
  self.editMessage = "";
  self.error = null;
  self.hasBeenEdited = function() {
    if ($scope.comment.lastUpdated == null) {
      return false;
    }
    return new Date($scope.comment.lastUpdated).getTime() - new Date($scope.comment.date).getTime() > 1000;
  };
  self.startEdit = function() {
    self.isEditing = true;
    self.editMessage = $scope.comment.message;
  };
  self.cancelEdit = function() {
    self.isEditing = false;
  };
  self.submitEdit = function() {
    self.isEditing = false;
    var previousMessage = $scope.comment.message;
    $scope.comment.message = self.editMessage;
    CommentService.updateComment($scope.comment, function(error, comment) {
      self.error = error;
      if (comment != null) {
        $scope.comment = comment;
      } else {
        $scope.comment.message = previousMessage;
      }
    });
  };
  self.canEdit = function() {
    return UserService.user != null && UserService.user._id == $scope.comment.user._id;
  };
});

// This contorller needs https://www.google.com/recaptcha/api.js to be loaded.
app.controller("LoginFormController", function($http) {
  var self = this;

  self.email = null;
  self.recaptchaKey = null;
  self.error = null;
  self.emailSent = false;
  self.successMessage = "";
  self.submit = function() {
    var body = {};
    if (grecaptcha == null) {
      console.log("No recaptcha");
      self.error = new Error("ReCaptcha has not finished loading. Please try again.");
      return;
    } 
    body["g-recaptcha-response"] = grecaptcha.getResponse();
    if (body["g-recaptcha-response"].length == 0) {
      console.log("bad recaptcha");
      self.error = new Error("Please answer the ReCaptcha.");
      return;
    }
    body.user = self.email;

    function onSuccess(response) {
      self.emailSent = true;
      self.error = null;
      self.successMessage = response.data;
    }

    function onError(response) {
      self.error = new Error(response.data);
    }
    $http.post("/services/sendToken", body).then(onSuccess, onError); 
  };
});

app.controller("NavigationBarController", function(UserService) {
  var self = this;
  self.UserService = UserService;
});

app.controller("UserSettingsFormController", function(UserService) {
  var self = this;
  self.UserService = UserService;
  self.newUsername = "";
  self.error = null;
  self.submit = function() {
    UserService.changeUsername(self.newUsername, function(error) {
      self.error = error;
    });
  }
});

app.directive("userSettings", function() {
  return {
    restrict: "E",
    templateUrl: "html/userSettings.html"
  };
});

app.directive("navigationBar", function() {
  return {
    restrict: "E",
    templateUrl: "/html/navigationBar.html"
  };
});

app.directive("login", function() {
  return {
    restrict: "E",
    templateUrl: "/html/login.html"
  };
});

app.directive("replay", function() {
  return {
    restrict: "E",
    templateUrl: "/html/replay.html"
  };
});

app.directive("comment", function() {
  return {
    restrict: "E",
    templateUrl: "/html/comment.html"
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

app.directive("replayCodeValidator", function(ReplayService) {
  return {
    restrict: "A",
    require: "ngModel",
    link: function(scope, ele, attrs, ctrl) {
      ctrl.$parsers.unshift(function(value) {
        ctrl.$setValidity("invalidFormat", ReplayService.isValidReplayCode(value));
        return value;
      });
    }
  };
});

app.directive("commentsSection", function() {
  return {
    restrict: "E",
    templateUrl: "/html/commentsSection.html",
    scope: {replayCode: "@replayCode"} 
  };
});

app.directive("replayIframe", function($log) {
  return {
    restrict: "E",
    templateUrl: "/html/replayIframe.html",
    scope: {replayCode: "@replayCode"},
    link: function(scope, element, attrs) {
      // Inspired by:
      // http://stackoverflow.com/questions/998245/how-can-i-detect-if-flash-is-installed-and-if-not-display-a-hidden-div-that-inf
      scope.hasFlash = function() {
        try {
          if (Boolean(new ActiveXObject('ShockwaveFlash.ShockwaveFlash'))) {
            return true;
          }
        } catch (e) {
          var types = navigator.mimeTypes;
          if (types && types['application/x-shockwave-flash'] != undefined
              && types['application/x-shockwave-flash'].enabledPlugin) {
            return true;
          }
        }
        return false;
      }
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

app.filter("replayCodeToPrismataUrl", function() {
  return function(replayCode) {
    return "http://play.prismata.net/?r=" + replayCode;
  };
});

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
