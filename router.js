var express = require("express");
var prismata = require("./prismata");
var db = require("./db");
var passwordless = require("passwordless");

var router = express.Router();

var pendin

function setUp(req, res, next) {
  if (typeof(res.locals) == "undefined") {
    res.locals = {};
  }
  res.locals.replays = [];
  res.locals.errors = req.session.errors || [];
  req.session.errors = [];
  var userID = req.user;
  db.getUser(userID, function(user) {
    res.locals.user = user;
    next();
  });
}

function insertReplay(req, res, next) {
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

function getReplays(req, res, next) {
  db.getReplays(function(replays) {
    res.locals.replays = replays;
    next()
  });
}

function getUserId(email, delivery, callback, req) {
  db.getOrCreateUserWithEmail(email, function(user) {
    callback(null, user._id);
  });
}

function addUsernamesToComments(req, res, next) {
  if (res.locals.replays.length == 0) {
    next();
  } else {
    var comments = res.locals.replays[0].comments;
    if (!comments) {
      comments = res.locals.replays[0].comments = [];
    }
    var index = 0;
    var addUsername = function () {
      if (index < comments.length) {
        db.getUser(comments[index].user, function(user) {
          comments[index].username = user.username;
          ++index;
          addUsername();
        });
      } else {
        next();
      }
    };
    addUsername();
  }
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

router.post("/sendtoken", passwordless.requestToken(getUserId), function(req, res) {
  console.log(req.params);
  res.redirect("/");
});

router.get("/replay/:replayID", insertReplay, addUsernamesToComments, function(req, res) {
  res.render("replay", res.locals);
});

router.post("/replay/:replayID", function(req, res) {
  db.addCommentToReplay(req.params.replayID, res.locals.user._id, req.body.comment, function() {
    res.redirect(303, "/replay/" + req.params.replayID);
  });
});

router.get("/settings", function(req, res) {
  res.render("user_settings");
});

router.post("/settings", function(req, res) {
  db.changeUsername(res.locals.user._id, req.body.new_username, function(error) {
    if (error) {
      req.session.errors.push(error.message);
    }
    res.redirect(303, "/settings");
  });
});

module.exports = router;

