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
var playerSchema = Schema({
  name: String,
  rating: Number
});

var replaySchema = Schema({
  code: String,
  players: [playerSchema],
  result: Number,
  date: Date,
  duration: Number,
  length: Number,
  randomCards: [String],
});

// Statics
// callback - function(error)
replaySchema.statics.upsert = function(replay, callback) {
  var upsertData = replay.toObject();
  delete upsertData._id;
  this.update({_id: replay.id}, upsertData, {upsert: true}, callback);
};

exports.Replay = mongoose.model(replayModelName, replaySchema);

