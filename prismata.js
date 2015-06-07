var http = require('http');
var zlib = require("zlib");
var db = require("./db");

const replay_url = require("./config.json").prismataReplaysLocation;

// Takes in the raw JSON string we get from the server and create a more useful object.
function rawToReplay(rawString) {
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

// Fetches the replay from the prismata service and updates the database.
// The callback will be passed the error (null if no errors) and the replay fetched.
function fetchReplay(replayID, callback) {
  var options = {
    host: replay_url,
    port: 80,
    path: '/' + replayID + ".json.gz"
  };

  http.get(options, function(res) {
    if (res.statusCode == 200) {
      unzip(res, function(raw) {
        var replay = rawToReplay(raw);
        db.insertReplay(replay, function() {
          callback(null, replay);
        });
      });
    } else {
      var error = new Error("Replay \"" + replayID + "\" not found.");
      callback(error, null);
    }
  }).on('error', function(error) {
    callback(error, null);
  });
}

// Takes in a response containing a .gz file and return the contents.
function unzip(response, callback) {
  var buffer = [];
  var gunzip = zlib.createGunzip();
  response.pipe(gunzip);
  gunzip.on('data', function(data) {
    buffer.push(data.toString());
  }).on("end", function() {
    callback(buffer.join(""));
  });
}

// Get the replay with the specified id.
// If the replay is not already in the database, this will fetch it from the prismata service and
// update the database with the newly fetched replay.
// The callback will be passed an error (if any) and the replay requested.
exports.getReplay = function(replayID, callback) {
  db.getReplayWithID(replayID, function(replay) {
    if (replay) {
      callback(null, replay);
    } else {
      fetchReplay(replayID, callback);
    }
  });
};

