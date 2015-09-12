var app = angular.module("prismata-replays");

app.directive("userSettings", function() {
  return {
    restrict: "E",
    templateUrl: "/app/html/userSettings.html"
  };
});

app.directive("navigationBar", function() {
  return {
    restrict: "E",
    templateUrl: "/app/html/navigationBar.html"
  };
});

app.directive("login", function() {
  return {
    restrict: "E",
    templateUrl: "/app/html/login.html"
  };
});

app.directive("replay", function() {
  return {
    restrict: "E",
    templateUrl: "/app/html/replay.html"
  };
});

app.directive("comment", function() {
  return {
    restrict: "E",
    templateUrl: "/app/html/comment.html"
  };
});

app.directive("recentReplays", function() {
  return {
    restrict: "E",
    templateUrl: "/app/html/recentReplays.html"
  };
});

app.directive("searchReplays", function() {
  return {
    restrict: "E",
    templateUrl: "/app/html/searchReplays.html"
  };
});

app.directive("searchForm", function() {
  return {
    restrict: "E",
    templateUrl: "/app/html/searchForm.html"
  };
});

app.directive("addReplayForm", function() {
  return {
    restrict: "E",
    templateUrl: "/app/html/addReplayForm.html"
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
    templateUrl: "/app/html/commentsSection.html",
    scope: {replayCode: "@replayCode"}
  };
});

app.directive("tagsSection", function() {
  return {
    restrict: "E",
    templateUrl: "/app/html/tagsSection.html",
    scope: {replayCode: "@replayCode"}
  };
});

app.directive("replayIframe", function($log) {
  return {
    restrict: "E",
    templateUrl: "/app/html/replayIframe.html",
    scope: {replayCode: "@replayCode"},
    link: function(scope, element, attrs) {
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


app.directive('autoComplete', function($http) {
  return {
    restrict:'E',
    scope: {
      selectedTags:'=model'
    },
    templateUrl:'/app/html/autocompleteMultipleInput.html',
    link: function(scope, elem, attrs) {
      scope.placeholder = attrs.placeholder;
      scope.limit = attrs.limit ? Number(attrs.limit) : Number.MAX_VALUE;
      scope.suggestions = [];
      scope.selectedTags = [];
      scope.selectedIndex = 0;
      scope.error = null;

      $http.get(attrs.source).then(onSuccess, onError);
      function onSuccess(response) {
        scope.wordBank = response.data;
      }
      function onError(response) {
        scope.error = new Error(response.data);
      }

      scope.removeTag = function(tag) {
        var index = scope.selectedTags.indexOf(tag);
        if (index >= 0) {
          scope.selectedTags.splice(index, 1);
        }
      };

      scope.search = function() {
        var regex = new RegExp(scope.searchText, "i");
        scope.suggestions = scope.wordBank.filter(function(item) {
          return regex.test(item) && scope.selectedTags.indexOf(item) == -1;
        });
        scope.selectedIndex = 0;
      };

      scope.addToSelectedTags = function(tag) {
        if (scope.selectedTags.indexOf(tag) == -1) {
          scope.selectedTags.push(tag);
          scope.searchText = '';
          scope.suggestions = [];
        }
      };

      scope.onKeyDown = function(event) {
        if (event.keyCode == 40){
          event.preventDefault();
          if (scope.selectedIndex + 1 < scope.suggestions.length){
            scope.selectedIndex++;
          }
        } else if (event.keyCode == 38) {
          event.preventDefault();
          if (scope.selectedIndex >= 0) {
            scope.selectedIndex--;
          }
        } else if (event.keyCode == 13) {
          event.preventDefault();
          if (scope.selectedIndex < scope.suggestions.length) {
            scope.addToSelectedTags(scope.suggestions[scope.selectedIndex]);
          }
        }
      };

      scope.onMousedown = function(event) {
        event.preventDefault();
      }

      scope.onClick = function(suggestion) {
        scope.addToSelectedTags(suggestion);
      } 

      scope.lostFocus = function() {
        scope.suggestions = [];
        scope.searchText = "";
        scope.selectedIndex = 0;
      };
    }
  }
});
