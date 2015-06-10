var MongoClient = require('mongodb').MongoClient;
var assert = require("assert");
var ObjectID = require("mongodb").ObjectID;
var url = require("./config.json").databaseLocation;

const replay_collection = "replays";
const user_collection = "users";

// --- Replays ---

function getReplay(db, replayID, callback) {
  var cursor = db.collection(replay_collection).find({"id": replayID});
  cursor.next(function(err, doc) {
    assert.equal(err, null);
    callback(doc);
  });
}

function getAllReplays(db, callback) {
  var results = [];
  var cursor = db.collection(replay_collection).find().sort({start: -1});
  var iterator = function(doc) {
    results.push(doc);
  }
  cursor.forEach(iterator, function(error) {
    assert.equal(error, null);
    callback(results);
  });
}
  
function addReplay(db, replay, callback) {
  var filter = {id: replay.id};
  var options = {upsert: true};
  db.collection(replay_collection).updateOne(filter, replay, options, callback);
}

function addComment(db, replayID, comment, callback) {
  var filter = {id: replayID};
  var update = {$push: {comments: comment}};
  db.collection(replay_collection).updateOne(filter, update, callback);
}

// Adds (or updates if it already exists) a replay in the database.
// The callback will be passed no parameters.
exports.insertReplay = function(replay, callback) {
  MongoClient.connect(url, function(error, db) {
    assert.equal(error, null);
    addReplay(db, replay, function(addError, result) {
      assert.equal(addError, null);
      callback();
    });
  });
};

// Get the replay with the specified id.
// The callback will be passed a the replay if found, null otherwise.
exports.getReplayWithID = function(replayID, callback) {
  MongoClient.connect(url, function(error, db) {
    assert.equal(error, null);
    getReplay(db, replayID, function(result) {
      callback(result);
    });
  });
}

// Get an array containing all of the replays sorted from most to least recent.
// The callback will be passed a single parameter; the array of all replays.
exports.getReplays = function(callback) {
  MongoClient.connect(url, function(error, db) {
    assert.equal(error, null);
    getAllReplays(db, function(result) {
      callback(result);
      db.close();
    });
  });
};

exports.addCommentToReplay = function(replayID, user, text, callback) {
  comment = {user: user, text: text, time: Date.now()};
  MongoClient.connect(url, function(error, db) {
    assert.equal(error, null);
    addComment(db, replayID, comment, function(result) {
      callback();
      db.close();
    });
  });
};

// --- Users ---

function getUserWithEmail(db, email, callback) {
  var cursor = db.collection(user_collection).find({email: email});
  cursor.next(function(err, doc) {
    assert.equal(err, null);
    callback(doc);
  });
}

function getUserWithUsername(db, username, callback) {
  var cursor = db.collection(user_collection).find({username: username});
  cursor.next(function(err, doc) {
    assert.equal(err, null);
    callback(doc);
  });
}

function getUserWithId(db, id, callback) {
  var cursor = db.collection(user_collection).find({_id: id});
  cursor.next(function(err, doc) {
    assert.equal(err, null);
    callback(doc);
  });
}

function addUser(db, email, callback) {
  var collection = db.collection(user_collection);
  var user = {username: email, email: email};
  db.collection(user_collection).insert(user, function(error, result) {
    assert.equal(error, null);
    callback(result);
  });
}

function changeUsername(db, id, newUsername, callback) {
  if (newUsername.length < 3) {
    callback(new Error("Username must be at least 3 characters long."));
    return;
  }
  if (newUsername.length > 20) {
    callback(new Error("Username must be at most 20 characters long."));
    return;  
  }
  getUserWithUsername(db, newUsername, function(doc) {
    if (doc) {
      var error = new Error("Username \"" + username + "\" is already taken.");
      callback(error);
      return;
    }
    var filter = {_id: id};
    var update = {$set: {username: newUsername}};
    db.collection(user_collection).updateOne(filter, update, function(error, result) {
      assert.equal(error, null);
      callback(null);
    });
  });
}

exports.getOrCreateUserWithEmail = function(email, callback) {
  MongoClient.connect(url, function(error, db) {
    assert.equal(error, null);
    getUserWithEmail(db, email, function(doc) {
      if (doc) {
        callback(doc);
        db.close();
      } else {
        addUser(db, email, function(result) {
          callback(result.ops[0]);
          db.close();
        });
      }
    });
  });
};

exports.changeUsername = function(id, newUsername, callback) {
  var _id = typeof id == "string" ? new ObjectID(id) : id;
  MongoClient.connect(url, function(error, db) {
    assert.equal(error, null);
    changeUsername(db, _id, newUsername, function(err) {
      callback(err);
      db.close();
    });
  });
};

exports.getUser = function(id, callback) {
  if (!id) {
    callback(null);
    return;
  }
  var _id = typeof id == "string" ? new ObjectID(id) : id;
  MongoClient.connect(url, function(error, db) {
    assert.equal(error, null);
    getUserWithId(db, _id, function(user) {
      callback(user);
      db.close();
    });
  });
};

