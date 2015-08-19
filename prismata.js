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
  replay.rated = json.ratingInfo.ratedGame;
  replay.date = new Date(1000 * json.startTime);
  replay.duration = json.endTime - json.startTime;
  replay.length = json.commandInfo.moveDurations.length - 1;
  
  // We assume both players have the same time controls.
  // We use Number.MAX_VALUE for the case with no time controls.
  // TODO: Find a more elegent solution.
  if (json.timeInfo.playerTime[0]) {
    replay.timeControls = json.timeInfo.playerTime[0].increment;
  } else {
    replay.timeControls = Number.MAX_VALUE;
  }

  // We assume both players have the same random cards.
  replay.randomCards = 
      getUINames(json.deckInfo.randomizer[0], json.deckInfo.mergedDeck);
  return replay;
}

// Given a list of legacy names, return the list of UINames sorted by cost.
function getUINames(legacyNames, mergedDeck) {
  // Get the units coresponding to the legacy names.
  var units = [];
  for (var i = 0; i < legacyNames.length; ++i) {
    name = legacyNames[i];
    for (var j = 0; j < mergedDeck.length; ++j) {
      var card = mergedDeck[j];
      if (card.name == name) {
        var unit = {};
        unit.name = card.UIName || name;
        unit.cost = card.buyCost;
        units.push(unit);
      }
    }
  }

  // Sort the units based on their cost.
  units.sort(function(a, b) {
    // Green
    aHasG = (a.cost.indexOf("G") != -1);
    bHasG = (b.cost.indexOf("G") != -1);
    // Blue
    aHasB = (a.cost.indexOf("B") != -1);
    bHasB = (b.cost.indexOf("B") != -1);
    // Red - Red is denoted by C in the replay data.
    aHasR = (a.cost.indexOf("C") != -1);
    bHasR = (b.cost.indexOf("C") != -1);
    // Gold
    aGold = parseInt(a.cost, 10);
    bGold = parseInt(b.cost, 10);

    aNumTech = aHasG + aHasB + aHasR;
    bNumTech = bHasG + bHasB + bHasR;
    
    // The unit that needs more different techs to buy should go later. 
    if (aNumTech != bNumTech) {
      return aNumTech - bNumTech;
    }
    
    // G < B < R and GB < GR < BR.
    if (aHasR != bHasR) {
      return aHasR ? 1 : -1;
    }
    if (aHasB != bHasB) {
      return aHasB ? 1 : -1;
    }

    // If everything so far is the same, sort by gold cost.
    if (aGold != bGold) {
      return aGold - bGold;
    }

    // As a final resort, sort by the name of the unit.
    return a.name.localeCompare(b.name);
  });

  // We only want the names
  var names = [];
  for (var i = 0; i < units.length; ++i) {
    names.push(units[i].name);
  }
  return names;
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
      var error = new Error("Cannot get replay \"" + replayID + "\" from Prismata's API.");
      callback(error, null);
    }
  }).on('error', function(error) {
    callback(error, null);
  });
}

