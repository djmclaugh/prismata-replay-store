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
      replay.popularity = 1;
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
//   player,
//   min_rating, 
//   max_rating, 
//   min_time_controls, 
//   max_time_controls,
//   min_length,
//   max_length,
//   min_duration_minutes,
//   max_duration_minutes,
//   units
// }
// callback - function(error, replays)
replaySchema.statics.search = function(search, callback) {
  console.log("Search queary: " + new Date().toISOString());
  console.log(search);
  var filter = {};
  
  if (search.player && typeof search.player == "string") {
    filter["players.name"] = { $regex : new RegExp(search.player, "i") };
  }

  var min;
  var max;

  if (search.min_rating || search.max_rating) {
    min = search.min_rating ? Number(search.min_rating) : 0;
    max = search.max_rating ? Number(search.max_rating) : Number.MAX_VALUE;
    filter["players"] =
        {$not: {$elemMatch: {$or: [{rating: {$lt: min}}, {rating: {$gt: max}}]}}};
  }

  if (search.min_time_controls || search.max_time_controls) {
    min = search.min_time_controls ? Number(search.min_time_controls) : 0;
    max = search.max_time_controls ? Number(search.max_time_controls) : Number.MAX_VALUE;
    filter["timeControls"] = {$lte: max, $gte:min};
  }

  if (search.min_length || search.max_length) {
    min = search.min_length ? Number(search.min_length) : 0;
    max = search.max_length ? Number(search.max_length) : Number.MAX_VALUE;
    filter["length"] = {$lte: max, $gte:min};
  }

  if (search.min_duration_minutes || search.max_duration_minutes) {
    min = search.min_duration_minutes ? Number(search.min_duration_minutes) * 60 : 0;
    max = search.max_duration_minutes ? Number(search.max_duration_minutes) * 60 : Number.MAX_VALUE;
    filter["duration"] = {$lte: max, $gte:min};
  }

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
    filter["randomCards"] = {};
    if (excludedUnits.length > 0) {
      filter["randomCards"].$not = {$in: excludedUnits};
    }
    if (requiredUnits.length > 0) {
      filter["randomCards"].$all = requiredUnits;
    }
  }

  if (search.include_rated && !search.include_unrated) {
    filter["rated"] = true;
  } else if (!search.include_rated && search.include_unrated) {
    filter["rated"] = false;
  } else if (!search.include_rated && !search.include_unrated) {
    filter["$where"] = "false";
  }

  this.find(filter, null, {sort: {date: -1}}, function(error, replays) {
    callback(error, replays);
  });
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

// callback - function(error)
replaySchema.statics.modifyPopularityOfAllReplays = function(factor, callback) {
  var modifyPopularity = function(replay) {
    // TODO: Better error handling
    replay.popularity = replay.popularity * factor;
    replay.save(function(error) {
      if (error) {
        console.log(error);
      }
    });
  }

  this.find({}).stream()
    .on("data", modifyPopularity)
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

