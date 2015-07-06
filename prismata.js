var http = require('http');
var zlib = require("zlib");

const replay_url = require("./config.json").prismataReplaysLocation;

// Takes in the raw JSON string we get from the server and create a more useful object.
function rawToReplay(rawString) {
  var json = JSON.parse(rawString);
  var replay = {};
  replay.code = json.code;
  replay.players = [];
  for (var i = 0; i < json.playerInfo.length; ++i) {
    replay.players.push({
        name: json.playerInfo[i].displayName,
        rating: Math.round(json.ratingInfo.initialRatings[i].displayRating)
    });
  }
  replay.result = json.result;
  replay.date = new Date(1000 * json.startTime);
  replay.duration = json.endTime - json.startTime;
  replay.length = json.commandInfo.moveDurations.length - 1;
  
  // We assume both players have the same time controls.
  replay.timeControls = json.timeInfo.playerTime[0].increment;

  // We assume both players have the same random cards.
  replay.randomCards = json.deckInfo.randomizer[0];
  for (var i = 0; i < replay.randomCards.length; ++i) {
    replay.randomCards[i] = getUIName(replay.randomCards[i], json.deckInfo.mergedDeck);
  }

  return replay;
}

// The replay data uses the internal names to describe cards.
// The card info, including the UI names, are only available in the deckInfo.mergedDeck property.
function getUIName(name, mergedDeck) {
  for (var i = 0; i < mergedDeck.length; ++i) {
    var card = mergedDeck[i];
    if (card.name == name) {
      return card.UIName || name;
    }
  }
  return name;
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

// Fetches the replay from the prismata service and updates the database.
// callback - function(error, replay) 
exports.fetchReplay = function(replayID, callback) {
  var options = {
    host: replay_url,
    port: 80,
    path: '/' + replayID + ".json.gz"
  };
  http.get(options, function(res) {
    if (res.statusCode == 200) {
      unzip(res, function(raw) {
        callback(null, rawToReplay(raw));
      });
    } else {
      var error = new Error("Replay \"" + replayID + "\" not found.");
      callback(error, null);
    }
  }).on('error', function(error) {
    callback(error, null);
  });
}

