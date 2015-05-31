var express = require("express");
var prismata = require("./prismata");

var router = express.Router();

router.get("/:replayID", function(req, res, next) {
  prismata.fetchReplay(req.params.replayID, function(replay, error) {
    res.render("index", {replay: replay, error: error});
  });
});

router.get("/", function(req, res) {
  res.render("index", {replay: null, error: null});
});

module.exports = router;

