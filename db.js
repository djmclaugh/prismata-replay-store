var mongoose = require("mongoose");
mongoose.connect(require("./config.json").databaseLocation);
var db = mongoose.connection;
var Schema = mongoose.Schema;

const userModelName = "User";
const commentModelName = "Comment";
const tagModelName = "Tag";
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

// Statics
// callback - function(error, replayCodes)
commentSchema.statics.getReplaysWithComments = function(callback) {
  this.aggregate([
    {$group: {_id: null, replayCodes: {$addToSet: "$replayCode"}}}
  ], onCompletion);

  function onCompletion(error, documents) {
    if (error) {
      callback(error, null);
    } else if (documents.length > 0) {
      callback(null, documents[0].replayCodes);
    } else {
      callback(null, []);
    }
  }
};

exports.Comment = mongoose.model(commentModelName, commentSchema);

// --- Tags ---
var tagSchema = Schema({
  label: {type: String, match: /^[a-z0-9\-]+$/},
  replayCode: {type: String, index: true},
  upvotes: [String],
  downvotes: [String],
  value: Number
}, {
  toObject: {versionKey: false},
  toJSON: {versionKey: false}
});

tagSchema.pre("save", function(next) {
  this.value = this.upvotes.length - this.downvotes.length;
  next();
});


// Statics
// callback - function(error, tag)
tagSchema.statics.getOrCreateTag = function(label, replayCode, callback) {
  self = this;
  self.findOne({label: label, replayCode:replayCode}, onFind);

  function onFind(error, tag) {
    if (error) {
      callback(error, null);
    } else if (tag) {
      callback(null, tag);
    } else {
      var tag = new self({
        label: label,
        replayCode: replayCode,
        downvotes: [],
        upvote: [],
        value: 0
      });
      tag.save(onSave);
    }
  }

  function onSave(error, tag) {
    if (error) {
      callback(error, null);
    } else {
      callback(null, tag);
    }
  }
};

// callback - function(error, replayCodes)
tagSchema.statics.getReplaysWithAllTagsOf = function(labels, callback) {
  // Find all tags with relevent labels.
  // For each replay, count how many labels have matched and keep track of the lowest valued label.
  // Only keep replays that match all labels and that all labels have a positive value.
  // Group the remaining replay codes in a set.
  this.aggregate([
    {$match: {label: {$in: labels}}},
    {$group: {_id: "$replayCode", sum: {$sum: 1}, minValue: {$min: "$value"}}},
    {$match: {minValue: {$gte: 1}, sum: labels.length}},
    {$group: {_id: null, replayCodes: {$addToSet: "$_id"}}}
  ], onCompletion);

  function onCompletion(error, documents) {
    if (error) {
      callback(error, null);
    } else if (documents.length > 0) {
      callback(null, documents[0].replayCodes);
    } else {
      callback(null, []);
    }
  }
};

// callback - function(error, replayCodes)
tagSchema.statics.getReplaysWithAtLeastOneTagOf = function(labels, callback) {
  // Find all relevent tags.
  // For each replay, keep track of the highest valued label.
  // Find all replays that have at least one positively valued label.
  // Group the remainig replay codes in a set.
  this.aggregate([
    {$match: {label: {$in: labels}}},
    {$group: {_id: "$replayCode", maxValue: {$max: "$value"}}},
    {$match: {maxValue: {$gte: 1}}},
    {$group: {_id: null, replayCodes: {$addToSet: "$_id"}}}
  ], onCompletion);

  function onCompletion(error, documents) {
    if (error) {
      callback(error, null);
    } else if (documents.length > 0) {
      callback(null, documents[0].replayCodes);
    } else {
      callback(null, []);
    }
  }
};

// callback - function(error, replayObjects)
tagSchema.statics.attachValidTagLabelsToReplays = function(replays, callback) {
  var codeMap = {};
  var replayObjects = [];
  var replayCodes = [];
  for (var i = 0; i < replays.length; ++i) {
    replayCodes.push(replays[i].code);
    replayObjects.push(replays[i].toObject());
    codeMap[replays[i].code] = i;
  }
  this.aggregate([
    {$match: {replayCode: {$in: replayCodes}, value: {$gt: 0}}},
    {$group: {_id: "$replayCode", labels: {$addToSet: "$label"}}}
  ], onCompletion);

  function onCompletion(error, documents) {
    if (error) {
      callback(error, null);
    } else {
      for (var i = 0; i < documents.length; ++i) {
        var objectIndex = codeMap[documents[i]._id];
        replayObjects[objectIndex].labels = documents[i].labels;
      }
      callback(null, replayObjects);
    }
  }
};

// Methods
// callback - function(error, tag)
tagSchema.methods.upvote = function(user, callback) {
  var self = this;
  var id = user.id;
  removeIfPresent(id, self.downvotes);
  addIfMissing(id, self.upvotes);
  self.save(onSave);

  function onSave(error, tag) {
    if (error) {
      callback(error, null);
    } else {
      callback(null, tag);
    }
  }
};

// callback - function(error, tag)
tagSchema.methods.downvote = function(user, callback) {
  var self = this;
  var id = user.id;
  addIfMissing(id, self.downvotes);
  removeIfPresent(id, self.upvotes);
  self.save(onSave);

  function onSave(error, tag) {
    if (error) {
      callback(error, null);
    } else {
      callback(null, tag);
    }
  }
};

// callback - function(error, tag)
tagSchema.methods.cancelVote = function(user, callback) {
  var self = this;
  var id = user.id;
  removeIfPresent(id, self.downvotes);
  removeIfPresent(id, self.upvotes);
  self.save(onSave);

  function onSave(error, tag) {
    if (error) {
      callback(error, null);
    } else {
      callback(null, tag);
    }
  }
};

function removeIfPresent(item, list) {
  var index = list.indexOf(item);
  if (index >= 0) {
    list.splice(index, 1);
  }
}

function addIfMissing(item, list) {
  if (list.indexOf(item) == -1) {
    list.push(item);
  }
}

exports.Tag = mongoose.model(tagModelName, tagSchema);

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
//   date - object {min, max},
//   units
//   gameType - object {arena, casual},
//   result - object {p1, p2, draw},
//   comments - object {hasComment, noComments},
//   tags
// }
// callback - function(error, replays)
replaySchema.statics.search = function(search, callback) {
  console.log("Search queary: " + new Date().toISOString());
  console.log(search);

  // Conditions that the replay must satisfy.
  var conditions = [];
  // Some conditions need async call to be formulated.
  // Perform all methods in array asynchronously to add these conditions.
  var asyncCalls = [];

  var self = this;

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

  // Date
  if (search.date) {
    if (search.date.min) {
      var date = new Date(search.date.min);
      conditions.push({date: {$gte: date}});
    }
    if (search.date.max) {
      var date = new Date(search.date.max);
      conditions.push({date: {$lte: date}});
    }
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

  // Comments
  var excludeReplaysWithComments = function(next) {
    self.base.models.Comment.getReplaysWithComments(onGetReplays);
    function onGetReplays(error, replayCodes) {
      if (error) {
        callback(error, null);
      } else {
        conditions.push({code: {$nin: replayCodes}});
        next();
      }
    }
  };
  var excludeReplaysWithoutComments = function(next) {
    self.base.models.Comment.getReplaysWithComments(onGetReplays);
    function onGetReplays(error, replayCodes) {
      if (error) {
        callback(error, null);
      } else {
        conditions.push({code: {$in: replayCodes}});
        next();
      }
    }
  };

  if (search.comments) {
    if (search.comments.hasComments != null && !search.comments.hasComments) {
      asyncCalls.push(excludeReplaysWithComments);  
    }
    if (search.comments.noComments != null && !search.comments.noComments) {
      asyncCalls.push(excludeReplaysWithoutComments);
    }
  }

  // Tags
  if (search.tags && typeof search.tags == "string") {
    var tags = normalizeTags(search.tags);
    var requiredTags = [];
    var excludedTags = [];
    for (var i = 0; i < tags.length; ++i) {
      if (tags[i].charAt(0) == "!") {
        excludedTags.push(tags[i].substr(1));
      } else {
        requiredTags.push(tags[i]);
      }
    }
    var filterRequiredTags = function(next) {
      self.base.models.Tag.getReplaysWithAllTagsOf(requiredTags, function(error, replayCodes) {
        if (error) {
          callback(error, null);
        } else {
          conditions.push({code: {$in: replayCodes}});
          next();
        }
      });
    };
    var filterExcludedTags = function(next) {
      self.base.models.Tag.getReplaysWithAtLeastOneTagOf(excludedTags, function(error, replayCodes) {
        if (error) {
          callback(error, null);
        } else {
          conditions.push({code: {$nin: replayCodes}});
          next();
        }
      });
    };
    if (requiredTags.length > 0) {
      asyncCalls.push(filterRequiredTags);
    }
    if (excludedTags.length > 0) {
      asyncCalls.push(filterExcludedTags);
    }
  }

  asyncDo(0);

  function asyncDo(index) {
    if (index < asyncCalls.length) {
      asyncCalls[index](function () {
        asyncDo(index + 1);
      });
    } else {
      onAsyncDone();
    }
  }

  function onAsyncDone() {
    var filter = conditions.length > 0 ? {$and: conditions} : {};
    self.find(filter, null, {sort: {date: -1}}, function(error, replays) {
      callback(error, replays);
    });
  };
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

function normalizeTags(tagsString) {
  var tags = tagsString.split(",");
  for (var i = 0; i < tags.length; ++i) {
    tags[i] = tags[i].trim();
  }
  return tags;
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
  var self = this;
  
  var onFetch = function(error, replayData) {
    replayData.lastUpdated = Date.now();
    var filter = {code: replayData.code};
    var options = {upsert: true};
    self.model(replayModelName).update(filter, replayData, options, callback);
  };
 
  Prismata.fetchReplay(self.code, onFetch);
};

exports.Replay = mongoose.model(replayModelName, replaySchema);

