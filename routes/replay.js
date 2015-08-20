var express = require("express");
var db = require("../db");

var router = express.Router();

// Returns the requested replay.
// This will also add the replay to the database if it wasn't in there previously.
// Will send a 500 response if this fails for any reason.
router.get("/:replayCode([A-z0-9@+]{5}-[$A-z0-9@+]{5})", function(req, res) {
  db.Replay.getOrFetchReplay(req.params.replayCode, onFetch);

  function onFetch(error, replay) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.send(replay);
    }
  }
});

// Returns the 5 most recently added replays.
// Will send a 500 response if this fails for any reason.
router.get("/recentReplays", function(req, res) {
  db.Replay.find({}).sort({dateAdded: -1}).limit(5).exec(onFind);
  
  function onFind(error, replays) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.send(replays);
    }
  }
});

// Tries to add the requested replay to the database and return it.
// Will send a 403 if the replay already is in the database.
// Will send a 500 if this fails for any other reason.
// body - {replayCode: the code for the replay you want to add.}
router.post("/addReplay", function(req, res) {
  db.Replay.findOne({code: req.body.replayCode}, onFind);
  
  function onFind(error, replay) {
    if (error) {
      res.status(500).send(error.message);
    } else if (replay) {
      res.status(403).send("Replay \"" + req.body.replayCode + "\" has already been added");
    } else {
      db.Replay.getOrFetchReplay(req.body.replayCode, onFetch);
    }
  }

  function onFetch(error, replay) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.send(replay);
    }
  }
});

// Returns the results for the provided search query.
// Will send a 500 response if this fails for any reason.
// body - See the comment for "replaySchema.statics.search" in "db.js" for acceptable fields.
//        All fields are optional. An empty body will fetch all replays.
router.post("/search", function(req, res) {
  console.log(req.body);
  db.Replay.search(req.body, function(error, replays) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.send(replays);
    }
  });
});

module.exports = router;

