var express = require("express");
var db = require("../db");

var router = express.Router();

const replayCodeRegex = "[A-z0-9@+]{5}-[$A-z0-9@+]{5}";
// Returns the requested replay.
// This will also add the replay to the database if it wasn't in there previously.
// Will send a 500 response if this fails for any reason.
router.get("/:replayCode("+ replayCodeRegex +")", function(req, res) {
  db.Replay.getOrFetchReplay(req.params.replayCode, onFetch);

  function onFetch(error, replay) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.send(replay);
    }
  }
});

// Returns an array of all unit names.
// Will send a 500 response if this fails for any reason.
router.get("/allUnitNames", function (req, res) {
  db.Replay.getAllUnitNames(onGet);
  function onGet(error, allUnitNames) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.send(allUnitNames);
    }
  }
});

// Returns an array of all player names.
// Will send a 500 response if this fails for any reaosn.
router.get("/allPlayerNames", function (req, res) {
  db.Replay.getAllPlayerNames(onGet);
  function onGet(error, allPlayerNames) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.send(allPlayerNames);
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
      db.Tag.attachValidTagLabelsToReplays(replays, onLabelsAdded);
    }
  }

  function onLabelsAdded(error, replayObjects) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.send(replayObjects);
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
  db.Replay.search(req.body, function(error, replays) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      db.Tag.attachValidTagLabelsToReplays(replays, onLabelsAdded);
    }
  });

  function onLabelsAdded(error, replayObjects) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.send(replayObjects);
    }
  }
});

module.exports = router;

