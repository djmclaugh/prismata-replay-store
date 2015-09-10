var app = angular.module("prismata-replays");

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
    $http.post("/api/user/changeUsername", {newUsername: newUsername}).then(onSuccess, onError);
  };

  function onSuccess(response) {
    self.user = response.data;
  }
  function onError(response) {
    self.error = new Error(response.data);
  }
  $http.get("/api/user/currentUser").then(onSuccess, onError);
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
    $http.get("/api/comment/commentsForReplay/" + replayCode).then(onSuccess, onError);
  };

  self.postComment = function(replayCode, message, callback) {
    function onSuccess(response) {
      callback(null, response.data);
    }
    function onError(response) {
      callback(new Error(response.data), null);
    }
    $http.post("/api/comment", {replayCode: replayCode, comment: message}).then(onSuccess, onError);
  };

  self.updateComment = function(comment, callback) {
    function onSuccess(response) {
      callback(null, response.data);
    }
    function onError(response) {
      callback(new Error(response.data), null);
    }
    $http.put("/api/comment/" + comment._id, {comment: comment.message}).then(onSuccess, onError);
  };
});

app.service("TagService", function($http) {
  var self = this;

  var replayRegex = new RegExp("^[A-z0-9@+]{5}-[$A-z0-9@+]{5}$");
  var labelRegex = new RegExp("^[a-z0-9\-]+$");

  self.fetchTagsForReplay = function(replayCode, callback) {
    if (!replayRegex.test(replayCode)) {
      callback(new Error("Invalid replay code."), null);
      return;
    }

    $http.get("/api/tag/tagsForReplay/" + replayCode).then(onSuccess, onError);
    
    function onSuccess(response) {
      callback(null, response.data);
    }

    function onError(response) {
      callback(new Error(response.data), null);
    }
  };

  self.upvoteTag = function(replayCode, label, callback) {
    modifyTag(replayCode, label, 1, callback);
  };

  self.downvoteTag = function(replayCode, label, callback) {
    modifyTag(replayCode, label, -1, callback);
  };

  self.cancelVoteOnTag = function(replayCode, label, callback) {
    modifyTag(replayCode, label, 0, callback);
  };

  function modifyTag(replayCode, label, value, callback) {
    var body = {
      replayCode: replayCode,
      label: label.toLowerCase(),
      value: value
    };
    if (!replayRegex.test(body.replayCode)) {
      callback(new Error("Invalid replay code."), null);
      return;
    }
    if (!labelRegex.test(body.label)) {
      callback(new Error("Invalid label. Labels can only contain letters, numbers, and the character '-'."), null);
      return;
    }
    
    $http.put("/api/tag", body).then(onSuccess, onError);

    function onSuccess(response) {
      callback(null, response.data);
    }

    function onError(response) {
      callback(new Error(response.data), null);
    }
  }
});

app.service("ReplayService", function($http, TagService) {
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
    $http.get("/api/replay/recentReplays").then(onSuccess, onError);
  };
  
  self.fetchSearchResults = function(query, callback) {
    function onSuccess(response) {
      self.searchResults.splice.apply(self.searchResults, [0, self.searchResults.length].concat(response.data));
      if (callback) {
        callback(null);
      }
    }
    function onError(response) {
      if (callback) {
        callback(new Error("Failled to fetch search sesults: " + response.data));
      }
    }
    $http.post("/api/replay/search", query).then(onSuccess, onError);
  };

  self.addReplay = function(replayCode, callback) {
    function onSuccess(response) {
      callback("SUCCESSFULLY_ADDED");
      self.fetchRecentReplays();
    }
    function onError(response) {
      if (response.status == 403) {
        callback("ALREADY_EXISTS");
      } else {
        callback(response.data);
      }
    }
    $http.post("/api/replay/addReplay", {replayCode: replayCode}).then(onSuccess, onError);
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
    $http.get("/api/replay/" + replayCode).then(onSuccess, onError);
  };
});

