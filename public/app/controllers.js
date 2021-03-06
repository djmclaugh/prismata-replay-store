var app = angular.module("prismata-replays");

app.controller("AddReplayFormController", function(ReplayService) {
  var self = this;
  self.replayCode = "";
  self.alreadyAddedCode = "";
  self.error = "";
  self.addReplay = function() {
    ReplayService.addReplay(self.replayCode, function(result) {
      if (result == "SUCCESSFULLY_ADDED") {
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
  self.query.players = {};
  self.query.ratings = {};
  self.query.timeControls = {};
  self.query.length = {};
  self.query.duration = {};
  self.query.date = {};
  self.query.result = {p1: true, p2:true, draw:true};
  self.query.gameType = {arena: true, casual: true};
  self.query.comments = {hasComments: true, noComments: true};

  self.submit = function () {
    updateNumberOfReplaysMessage(true);
    if (self.autocomplete_p1.length == 1) {
      self.query.players.p1 = self.autocomplete_p1[0];
    } else {
      self.query.players.p1 = null;
    }
    if (self.autocomplete_p2.length == 1) {
      self.query.players.p2 = self.autocomplete_p2[0];
    } else {
      self.query.players.p2 = null;
    }
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

app.controller("LoginFormController", function($http) {
  var self = this;

  self.email = null;
  self.recaptchaKey = null;
  self.error = null;
  self.emailSent = false;
  self.isSubmiting = false;
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

    self.isSubmiting = true;

    body.user = self.email;

    function onSuccess(response) {
      self.emailSent = true;
      self.error = null;
      self.successMessage = response.data;
      self.isSubmiting = false;
    }

    function onError(response) {
      self.error = new Error(response.data);
      self.isSubmiting = false;
    }
    $http.post("/api/user/sendToken", body).then(onSuccess, onError);
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

app.controller("TagBarForReplayController", function(TagService, UserService, $attrs) {
  var self = this;

  self.replayCode = null;
  self.tags = [];
  self.error = [];
  self.newLabel = null;
  self.expanded = false;
  self.UserService = UserService;

  self.showDetails = function() {
    self.expanded = true;
  }

  self.hideDetails = function() {
    self.expanded = false;
  }

  self.addTag = function() {
    for (var i = 0; i < self.tags.length; ++i) {
      if (self.tags[i].label == self.newLabel.toLowerCase()) {
        self.error = new Error("Tag '" + self.tags[i].label + "' already exists.");
        return;
      }
    }
    TagService.upvoteTag(self.replayCode, self.newLabel, function(error, tag) {
      self.error = error;
      if (error == null) {
        self.newLabel = "";
        self.tags.push(tag);
      }
    });
  };

  self.shouldShowAddTagButton = function() {
    return UserService.isLoggedIn();
  }

  $attrs.$observe("replayCode", function(replayCode) {
    self.replayCode = replayCode;
    TagService.fetchTagsForReplay(self.replayCode, function(error, tags) {
      self.tags = tags;
      self.error = error;
    });
  });
});

app.controller("TagController", function(TagService, UserService, $scope) {
  var self = this;
  self.error = null;

  self.shouldShowVoteButtons = function() {
    return UserService.isLoggedIn();
  }

  self.hasUpvoted = function() {
    if (!UserService.isLoggedIn()) {
      return false;
    }
    var userId = UserService.user._id;
    return $scope.tag.upvotes.indexOf(userId) != -1;
  }

  self.hasDownvoted = function() {
    if (!UserService.isLoggedIn()) {
      return false;
    }
    var userId = UserService.user._id;
    return $scope.tag.downvotes.indexOf(userId) != -1;
  }

  self.upvote = function() {
    $scope.tag.upvotes.push(UserService.user._id);
    TagService.upvoteTag($scope.tag.replayCode, $scope.tag.label, onUpvote);
    function onUpvote(error, tag) {
      self.error = error;
      if (!error) {
        $scope.tag.value = tag.value;
        $scope.tag.upvotes = tag.upvotes;
        $scope.tag.downvotes = tag.downvotes;
      }
    }
  };

  self.downvote = function() {
    $scope.tag.downvotes.push(UserService.user._id);
    TagService.downvoteTag($scope.tag.replayCode, $scope.tag.label, onDownvote);
    function onDownvote(error, tag) {
      self.error = error;
      if (!error) {
        $scope.tag.value = tag.value;
        $scope.tag.upvotes = tag.upvotes;
        $scope.tag.downvotes = tag.downvotes;
      }
    }
  };
});
