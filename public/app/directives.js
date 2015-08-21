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

