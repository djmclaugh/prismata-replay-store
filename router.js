var express = require("express");
var prismata = require("./prismata");
var db = require("./db");
var passwordless = require("passwordless");

var router = express.Router();

function setUp(req, res, next) {
  res.locals = typeof(res.locals) == "undefined" ? {} : res.locals;
  res.locals.replays = [];
  res.locals.error = null;
  res.locals.user = req.user ? req.user : null;
  next();
}

function insertReplay(req, res, next) {
  prismata.getReplay(req.params.replayID, function(error, replay) {
    if (!error && replay) {
      res.locals.replays.push(replay);
    }
    res.locals.error = error;
    next();
  });
}

function getReplays(req, res, next) {
  db.getReplays(function(replays) {
    res.locals.replays = replays;
    next()
  });
}

router.use(setUp);

router.get("/", getReplays, function(req, res) {
  res.render("index", res.locals);
});

router.get("/login", function(req, res) {
  res.render("login");
});

router.get("/logout", passwordless.logout(), function(req, res) {
  res.redirect("/");
});

var requestToken = passwordless.requestToken(
  function(user, delivery, callback, req) {
    callback(null, user);
  }
);

router.post("/sendtoken", requestToken, function(req, res) {
  res.redirect("/");
});

router.get("/replay/:replayID", insertReplay, function(req, res) {
  res.render("replay", res.locals);
});

module.exports = router;

