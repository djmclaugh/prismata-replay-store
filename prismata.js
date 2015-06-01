var http = require('http');
var zlib = require("zlib");

const replay_url = "saved-games-alpha.s3-website-us-east-1.amazonaws.com";

// Takes in the raw JSON string we get from the server and create a more useful object.
function rawToObject(rawString) {
  var original_json = JSON.parse(rawString);
  var replay = {};
  
  replay.id = original_json.code;
  replay.players = [];
  for (var i = 0; i < 2; ++i) {
    replay.players[i] = {
        name: original_json.playerInfo[i].displayName,
        rating: Math.round(original_json.ratingInfo.initialRatings[i].displayRating)
    };
  }
  replay.result = original_json.result;
  replay.start = new Date(1000 * original_json.startTime);
  replay.duration = original_json.endTime - original_json.startTime;
  replay.length = original_json.commandInfo.moveDurations.length - 1;

  // We assume both players have the same random cards.
  replay.randomCards = original_json.deckInfo.randomizer[0];
  for (var i = 0; i < replay.randomCards.length; ++i) {
    replay.randomCards[i] = getUIName(replay.randomCards[i], original_json.deckInfo.mergedDeck);
  }

  return replay;
}

// The replay data uses the internal names to describe cards.
// The card info, including the UI names, are only available in the deckInfo.mergedDeck property.
function getUIName(name, mergedDeck) {
  for (var i = 0; i < mergedDeck.length; ++i) {
    var card = mergedDeck[i];
    if (card.name == name) {
      return card.UIName ? card.UIName : name;
    }
  }
  return name;
}

exports.fetchReplay = function(replayID, callback) {
  var options = {
    host: replay_url,
    port: 80,
    path: '/' + replayID + ".json.gz"
  };

  var buffer = [];

  http.get(options, function(res) {
    if (res.statusCode == 200) {
      var gunzip = zlib.createGunzip();
      res.pipe(gunzip);
      gunzip.on('data', function(data) {
        buffer.push(data.toString());
      }).on("end", function() {
        callback(rawToObject(buffer.join("")), null);
      });
    } else {
      callback(null, new Error("Received " + res.statusCode +
          " status code while trying to fetch replay \"" + replayID + "\"."));
    }
  }).on('error', function(e) {
    callback(null, e);
  });
};
