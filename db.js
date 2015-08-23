var mongoose = require("mongoose");
mongoose.connect(require("./config.json").databaseLocation);
var db = mongoose.connection;
var Schema = mongoose.Schema;

const userModelName = "User";
const commentModelName = "Comment";
const replayModelName = "Replay";

// --- Users ---
var userSchema = Schema({
  username: String,
  email: {type: String, lowercase: true}
});

// Statics
// callback - function(error, user)
userSchema.statics.getOrCreateWithEmail = function (email, callback) {
  var self = this;
  email = email.toLowerCase();
  // Pass the user to the callback if it exists.
  // If the user doesn't exist, create a new one and pass it to the callback
  var onLookup = function(error, user) {
    if (user || error) {
      callback(error, user);
    } else {
      self.create({username: email, email: email}, callback);
    }
  };

  self.findOne({email: email}, onLookup);
};

// Methods
// callback - function(error, user)
userSchema.methods.changeUsername = function(newUsername, callback) {
  var self = this;
  if (newUsername == null || newUsername.length < 3) {
    callback(new Error("Username must be at least 3 charaters long."));
  } else if (newUsername.length > 20) {
    callback(new Error("Username must be at most 20 characters long."));
  } else if (!new RegExp(/^[a-zA-Z0-9_\-]*$/).test(newUsername)) {
    callback(new Error("Username must only contain characters, numbers, '-', or '_'."));
  } else {
    // If a user is found, then the username is not available.
    // Otherwise, procede with changeing the user's username.
    var onLookup = function(error, user) {
      if (error) {
        callback(error, null);
      } else if (user && user.username.toLowerCase() != self.username.toLowerCase()) {
        callback(new Error("The username \"" + user.username + "\" is already taken."), null);
      } else {
        self.username = newUsername;
        self.save(callback);
      } 
    };
    self.model(userModelName).findOne({username:  new RegExp(newUsername, "i")}, onLookup);
  }
};

exports.User = mongoose.model(userModelName, userSchema);

// --- Comments ---
var commentSchema = Schema({
  user: {type: Schema.Types.ObjectId, ref: userModelName},
  replayCode: String,
  message: String,
  date: {type: Date, default: Date.now},
  lastUpdated: Date
});

commentSchema.pre("save", function(next) {
  this.lastUpdated = new Date();
  next();
});

exports.Comment = mongoose.model(commentModelName, commentSchema);

// --- Replays ---
var Prismata = require("./prismata");

var playerSchema = Schema({
  name: String,
  rating: Number
}, {_id: false});

const LAST_REPLAY_SCHEMA_CHANGE = new Date(2015, 6, 13);
var replaySchema = Schema({
  code: String,
  players: [playerSchema],
  result: Number,
  rated: Boolean,
  date: Date,
  duration: Number,
  length: Number,
  timeControls: Number,
  randomCards: [String],
  replayData: {type: Object, select: false},
  
  // Meta data
  lastUpdated: Date,
  dateAdded: Date,
});

// Statics
// callback - function(error, replay)
replaySchema.statics.getOrFetchReplay = function(replayCode, callback) {
  self = this;

  function onFetch(error, replayData) {
    if (error) {
      callback(error, null);
    } else {
      var replay = new self(replayData);
      var now = Date.now();
      replay.lastUpdated = now;
      replay.dateAdded = now;
      replay.save(function(err) {
        callback(err, replay);
      });
    }
  }

  function onFind(error, replay) {
    if (error || replay) {
      callback(error, replay);
    } else {
      Prismata.fetchReplay(replayCode, onFetch);
    }
  };
  
  self.findOne({code: replayCode}, onFind);
};

// search - object {
//   players - object {p1, p2, preserveOrder},
//   ratings - object {min, max}, 
//   timeControls - object {min, max}, 
//   length - object {min, max},
//   duration - object {minMinutes, maxMinutes},
//   units
//   gameType - object {arena, casual},
//   result - object {p1, p2, draw}
// }
// callback - function(error, replays)
replaySchema.statics.search = function(search, callback) {
  console.log("Search queary: " + new Date().toISOString());
  console.log(search);

  var conditions = [];

  // Players 
  if (search.players && (search.players.p1 || search.players.p2)) {
    if (search.players.preserveOrder) {
      if (search.players.p1) {
        var regex = new RegExp("^" + escapeRegExp(search.players.p1) + "$", "i");
        conditions.push({"players.0.name": {$regex: regex}});
      }
      if (search.players.p2) {
        var regex = new RegExp("^" + escapeRegExp(search.players.p2) + "$", "i");
        conditions.push({"players.1.name": {$regex: regex}});
      }
    } else {
      if (search.players.p1 && search.players.p2) {
        var regex = new RegExp("^(" + escapeRegExp(search.players.p1) + "|" +
            escapeRegExp(search.players.p2) + ")$", "i");
        conditions.push({"players.0.name": {$regex: regex}});
        conditions.push({"players.1.name": {$regex: regex}});
      } else {
        var regex = search.players.p1 ?
            new RegExp("^" + escapeRegExp(search.players.p1) + "$", "i") :
            new RegExp("^" + escapeRegExp(search.players.p2) + "$", "i");
        conditions.push({"players.name": {$regex: regex}});
      }
    }
  }

  // Ratings
  if (search.ratings && (search.ratings.min || search.ratings.max)) {
    var min = search.ratings.min ? Number(search.ratings.min) : 0;
    var max = search.ratings.max ? Number(search.ratings.max) : Number.MAX_VALUE;
    conditions.push(
        {players: {$not: {$elemMatch: {$or: [{rating: {$lt: min}}, {rating: {$gt: max}}]}}}}
    );
  }

  // Time Controls
  if (search.timeControls && (search.timeControls.min || search.timeControls.max)) {
    var min = search.timeControls.min ? Number(search.timeControls.min) : 0;
    var max = search.timeControls.max ? Number(search.timeControls.max) : Number.MAX_VALUE;
    conditions.push({timeControls: {$lte: max, $gte:min}});
  }

  // Game Length
  if (search.length && (search.length.min || search.length.max)) {
    var min = search.length.min ? Number(search.length.min) : 0;
    var max = search.length.max ? Number(search.length.max) : Number.MAX_VALUE;
    conditions.push({length: {$lte: max, $gte:min}});
  }

  // Game Duration
  if (search.duration && (search.duration.minMinutes || search.duration.maxMinutes)) {
    min = search.duration.minMinutes ? Number(search.duration.minMinutes) * 60 : 0;
    max = search.duration.maxMinutes ? Number(search.duration.maxMinutes) * 60 : Number.MAX_VALUE;
    conditions.push({duration: {$lte: max, $gte:min}});
  }

  // Random Units
  if (search.units && typeof search.units == "string") {
    var units = normalizeUnitNames(search.units);
    var requiredUnits = [];
    var excludedUnits = [];
    for (var i = 0; i < units.length; ++i) {
      if (units[i].charAt(0) == "!") {
        excludedUnits.push(units[i].substr(1));
      } else {
        requiredUnits.push(units[i]);
      }
    }
    if (excludedUnits.length > 0) {
      conditions.push({randomCards: {$not: {$in: excludedUnits}}});
    }
    if (requiredUnits.length > 0) {
      conditions.push({randomCards: {$all: requiredUnits}});
    }
  }

  // Game Type
  if (search.gameType) {
    if (search.gameType.arena != null && !search.gameType.arena) {
      conditions.push({rated: false});
    }
    if (search.gameType.casual != null && !search.gameType.casual) {
      conditions.push({rated: true});
    }
  }

  // Result
  if (search.result) {
    if (search.result.p1 != null && !search.result.p1) {
      conditions.push({result: {$ne: 0}});
    }
    if (search.result.p2 != null && !search.result.p2) {
      conditions.push({result: {$ne: 1}});
    }
    if (search.result.draw != null && !search.result.draw) {
      conditions.push({result: {$ne: 2}});
    }
  }

  var filter = conditions.length > 0 ? {$and: conditions} : {};
  this.find(filter, null, {sort: {date: -1}}, function(error, replays) {
    callback(error, replays);
  });
};

// Converts the string so that it can be used as a literal in a regular expression.
function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function normalizeUnitNames(unitsString) {
  var units = unitsString.split(",");
  for (var i = 0; i < units.length; ++i) {
    // Remove whitespace.
    units[i]  = units[i].trim();
    // Normalize capitalization.
    units[i] = units[i].replace(/\w+/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }
  return units;
}

// callback - function(error)
replaySchema.statics.syncAllOutdatedReplays = function(callback) {
  var syncReplay = function(replay) {
    // TODO: Better error handling
    console.log("Updating information for replay " + replay.code);
    replay.syncWithPrismata(function(error) {
      if (error) {
        console.log(error);
      }
    });
  }

  this.find({lastUpdated: {$lt: LAST_REPLAY_SCHEMA_CHANGE}}).stream()
    .on("data", syncReplay)
    .on("error", callback)
    .on("end", function() {
      callback(null);
    });
};

// Methods
// callback - function(error)
replaySchema.methods.syncWithPrismata = function(callback) {
  self = this;
  
  var onFetch = function(error, replayData) {
    replayData.lastUpdated = Date.now();
    var filter = {code: replayData.code};
    var options = {upsert: true};
    self.model(replayModelName).update(filter, replayData, options, callback);
  };
 
  Prismata.fetchReplay(self.code, onFetch);
}

exports.Replay = mongoose.model(replayModelName, replaySchema);

