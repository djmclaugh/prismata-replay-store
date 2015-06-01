var express = require("express");
var prismata = require("./prismata");
var db = require("./db");

var router = express.Router();

router.get("/:replayID", function(req, res, next) {
  prismata.fetchReplay(req.params.replayID, function(replay, error) {
    var replays = [];
    if (!error && replay) {
      replays.push(replay);
      db.insertReplay(replay, function() {
        //NOOP
      });
    }
    res.render("index", {replays: replays, error: error});
  });
});

router.get("/", function(req, res) {
  db.getReplays(function(replays) {
    res.render("index", {replays: replays, error: null});
  });
});

module.exports = router;

