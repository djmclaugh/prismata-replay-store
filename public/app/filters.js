var app = angular.module("prismata-replays");

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

