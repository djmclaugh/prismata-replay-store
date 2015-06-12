var express = require("express");
var prismata = require("./prismata");
var db = require("./db");
var passwordless = require("passwordless");

var router = express.Router();

function setUp(req, res, next) {
  if (typeof(res.locals) == "undefined") {
    res.locals = {};
  }
  res.locals.replays = [];
  res.locals.errors = req.session.errors || [];
  req.session.errors = [];
  var userID = req.user;
  db.User.findById(userID, function(error, user) {
    if (error) {
      req.locals.errors.push(error.message);
    }
    res.locals.user = user;
    next();
  });
}

function fetchReplay(req, res, next) {
  prismata.getReplay(req.params.replayID, function(error, replay) {
    if (replay) {
      res.locals.replays.push(replay);
    }
    if (error) {
      res.locals.errors.push(error.message);
    }
    next();
  });
}

function getComments(req, res, next) {
  db.Comment.find({replayCode: req.params.replayID})
    .populate("user")
    .exec(function(error, comments) {
      console.log(comments);
      if (error) {
        res.locals.errors.push(error.message);
      }
      res.locals.comments = comments;
      next();
    });
}

function getAllReplays(req, res, next) {
  db.Replay.find({}, null, {sort: {date: -1}}, function(error, replays) {
    if (error) {
      res.locals.errors.push(error.message);
    }
    res.locals.replays = replays;
    next()
  });
}

function getUserId(email, delivery, callback, req) {
  db.User.getOrCreateWithEmail(email, function(error, user) {
    callback(error, user._id);
  });
}

router.use(setUp);

router.get("/", getAllReplays, function(req, res) {
  res.render("index", res.locals);
});

router.get("/login", function(req, res) {
  res.render("login");
});

router.get("/logout", passwordless.logout(), function(req, res) {
  res.redirect("/");
});

router.post("/sendtoken", passwordless.requestToken(getUserId), function(req, res) {
  console.log(req.params);
  res.redirect("/");
});

router.get("/replay/:replayID", fetchReplay, getComments, function(req, res) {
  res.render("replay", res.locals);
});

router.post("/replay/:replayID", function(req, res) {
  var comment = {
    user: res.locals.user,
    replayCode: req.params.replayID,
    message: req.body.comment,
  };
  db.Comment.create(comment,  function(error) {
    if (error) {
      req.session.error.push(error.message);
    }
    res.redirect(303, "/replay/" + req.params.replayID);
  });
});

router.get("/settings", function(req, res) {
  res.render("user_settings");
});

router.post("/settings", function(req, res) {
  res.locals.user.changeUsername(req.body.new_username, function(error) {
    if (error) {
      req.session.errors.push(error.message);
    }
    res.redirect(303, "/settings");
  });
});

module.exports = router;

