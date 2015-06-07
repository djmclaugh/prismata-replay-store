var MongoClient = require('mongodb').MongoClient;
var assert = require("assert");
var ObjectId = require("mongodb").ObjectID;
var url = require("./config.json").databaseLocation;

const replay_collection = "replays";

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
  var filter = {"id": replay.id};
  var options = {upsert: true};
  db.collection(replay_collection).updateOne(filter, replay, options, callback);
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
    getAllReplays(db, callback);
  });
};
