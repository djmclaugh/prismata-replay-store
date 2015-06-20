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
  email: String
});

// Statics
// callback - function(error, user)
userSchema.statics.getOrCreateWithEmail = function (email, callback) {
  var self = this;
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
// callback - function(error)
userSchema.methods.changeUsername = function(newUsername, callback) {
  var self = this;
  if (newUsername.length < 3) {
    callback(new Error("Username must be at least 3 charaters long."));
  } else if (newUsername.length > 20) {
    callback(new Error("Username must be at most 20 characters long."));
  } else {
    // If a user is found, then the username is not available.
    // Otherwise, procede with changeing the user's username.
    var onLookup = function(error, user) {
      if (error) {
        callback(error);
      } else if (user) {
        callback(new Error("Username " + newUsername + " is not available."));
      } else {
        self.username = newUsername;
        self.save(callback);
      } 
    };
    self.model(userModelName).findOne({username: newUsername}, onLookup);
  }
};

exports.User = mongoose.model(userModelName, userSchema);

// --- Comments ---
var commentSchema = Schema({
  user: {type: Schema.Types.ObjectId, ref: userModelName},
  replayCode: String,
  message: String,
  date: {type: Date, default: Date.now}
});

exports.Comment = mongoose.model(commentModelName, commentSchema);

// --- Replays ---
var Prismata = require("./prismata");

var playerSchema = Schema({
  name: String,
  rating: Number
});


const LAST_REPLAY_SCHEMA_CHANGE = new Date(2015, 5, 20);
var replaySchema = Schema({
  // Replay Data
  code: String,
  players: [playerSchema],
  result: Number,
  date: Date,
  duration: Number,
  length: Number,
  timeControls: Number,
  randomCards: [String],
  // Meta data
  lastUpdated: Date,
  dateAdded: Date,
  popularity: Number
});

// Statics
// callback - function(error, replay)
replaySchema.statics.getOrFetchReplay = function(replayCode, callback) {
  self = this;
  var onReplayFetch = function(error, replayData) {
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
  };

  var onFind = function (error, replay) {
    if (error || replay) {
      callback(error, replay);
    } else {
      Prismata.fetchReplay(replayCode, onReplayFetch);
    }
  };
  
  this.findOne({code: replayCode}, onFind);
};

// callback - function(error)
replaySchema.statics.syncAllOutdatedReplays = function(callback) {
  var syncReplay = function(replay) {
    // TODO: Better error handling
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
    console.log("Fetched replay: " + replayData.code);
    replayData.lastUpdated = Date.now();
    var filter = {code: replayData.code};
    var options = {upsert: true};
    self.model(replayModelName).update(filter, replayData, options, callback);
  };
 
  Prismata.fetchReplay(self.code, onFetch);
}

exports.Replay = mongoose.model(replayModelName, replaySchema);

