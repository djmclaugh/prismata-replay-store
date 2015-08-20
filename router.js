var express = require("express");
var db = require("./db");
var passwordless = require("passwordless");
var https = require('https');

var router = express.Router();

function setUp(req, res, next) {
  if (typeof(res.locals) == "undefined") {
    res.locals = {};
  }
  db.User.findById(req.user, function(error, user) {
    if (error) {
      req.locals.errors.push(error.message);
    }
    res.locals.user = user;
    next();
  });
}

function checkRecaptcha(req, res, next) {
  var key = req.body["g-recaptcha-response"];
  req.recaptchaResult = {success: false};
  if (!key) {
    req.session.errors.push("No ReCaptcha information received.");
    next();
    return;
  }
  https.get(require("./config").recaptchaURL + key, function(recaptchaRes) {
    var data = "";
    recaptchaRes.on("data", function(chunk) {
      data += chunk.toString();
    });
    recaptchaRes.on("end", function() {
      try {
        var parsedData = JSON.parse(data);
        req.recaptchaResult = parsedData;
        if (!req.recaptchaResult.success) {
          req.session.errors.push("ReCAPTCHA verification failed.");
          console.log("Failed ReCAPTCHA: " + req.recaptchaResult);
        }
      } catch(error) {
        req.session.errors.push(error.message);
      }
      next();
    });
  });
}

function getUserId(email, delivery, callback, req) {
  db.User.getOrCreateWithEmail(email, function(error, user) {
    callback(error, user._id);
  });
}

function requestTokenIfRecaptcha(req, res, next) {
  if (req.recaptchaResult.success) {
    passwordless.requestToken(getUserId)(req, res, next);
  } else {
    next();
  }
}

router.use(setUp);

router.get("/services/currentUser", function(req, res) {
  res.send(res.locals.user);
});

router.get("/services/recent_replays", function(req, res) {
  function onFind(error, replays) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.send(replays);
    }
  }

  db.Replay.find({})
    .sort({dateAdded: -1})
    .limit(5)
    .exec(onFind);
});

router.get("/logout", passwordless.logout(), function(req, res) {
  res.redirect("/");
});

router.post("/services/sendtoken", function(req, res) {
  var key = req.body["g-recaptcha-response"];
  var recaptchaResult = {success: false};
  if (req.body.user == null) {
    res.status(400).send("No email received.");
    return;
  }
  if (!key) {
    res.status(400).send("No ReCaptcha information received.");
    return;
  }

  function onEmailSent() {
    res.send("An email has been sent to " + req.body.user + "." );
  }

  function getUserId(email, delivery, callback, req) {
    db.User.getOrCreateWithEmail(email, function(error, user) {
      callback(error, user._id);
    });
  }

  function onReCaptchaSuccess() {
    passwordless.requestToken(getUserId)(req, res, onEmailSent);
  }

  function onReCaptchaResponse(response) {
    var data = "";
    response.on("data", function(chunk) {
      data += chunk.toString();
    });
    response.on("end", function() {
      try {
        var parsedData = JSON.parse(data);
        recaptchaResult = parsedData;
        if (!recaptchaResult.success) {
          res.status(403).send("ReCAPTCHA verification failed.");
          return;
        }
      } catch(error) {
        res.status(500).send("Unable to parse ReCAPTCHA results.");
        return;
      }
      onReCaptchaSuccess();
    });
  }

  https.get(require("./config").recaptchaURL + key, onReCaptchaResponse);
});

router.post("/services/search", function(req, res) {
  console.log(req.body);
  db.Replay.search(req.body, function(error, replays) {
    if (error) {
      res.send(error.message);
    } else {
      res.send(replays);
    }
  });
});

router.get("/services/replay/:replayCode", function(req, res) {
  function onFetch(error, replay) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.send(replay);
    }
  }
  db.Replay.getOrFetchReplay(req.params.replayCode, onFetch);
});

router.post("/services/replay/addReplay", function(req, res) {
  function onFetch(error, replay) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.send(replay);
    }
  }

  function onFind(error, replay) {
    if (error) {
      res.status(500).send(error.message);
    } else if (replay) {
      res.status(400).send("Replay \"" + req.body.replayCode + "\" has already been added");
    } else {
      db.Replay.getOrFetchReplay(req.body.replayCode, onFetch);
    }
  }

  db.Replay.findOne({code: req.body.replayCode}, onFind);  
});

router.post("/services/comment", function(req, res) {
  if (res.locals.user == null) {
    res.status(403).send("You must be logged in to submit a comment.");
    return;
  }
  if (req.body.replayCode == null) {
    res.status(400).send("You must specify which replay your comment is targeting.");
    return;
  }
  if (req.body.comment.length == 0) {
    res.status(400).send("Cannot submit an empty comment.");
    return;
  }

  var comment = {
    user: res.locals.user,
    replayCode: req.body.replayCode,
    message: req.body.comment
  };

  db.Comment.create(comment, function(error, comment) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.send(comment);
    }
  });
});

router.put("/services/comment/:commentID", function(req, res) {
  function onSave(error, comment) {
    if (error) {
      res.status(500).send(error.message);
      return;
    }
    res.send(comment);
  }

  function onLookup(error, comment) {
    if (error) {
      res.status(500).send(error.message);
      return;
    }
    if (!comment) {
      res.status(404).send("Comment " + commentId + "not found.");
      return;
    }
    if (res.locals.user == null || comment.user.id != res.locals.user.id) {
      res.status(403).send("Cannot update a comment from another user!");
      return;
    }
    comment.message = req.body.comment;
    comment.save(onSave);
  }

  db.Comment.findById(req.params.commentID).populate("user").exec(onLookup);
});

router.get("/services/commentsForReplay/:replayCode", function(req, res) {
  db.Comment.find({replayCode: req.params.replayCode})
    .populate("user", "username")
    .select("-replayCode -__v")
    .sort({date: 1})
    .exec(function(error, comments) {
      if (error) {
        res.status(500).send(error.message);
      } else {
        res.send(comments);
      }
    });
});

router.post("/services/changeUsername", function(req, res) {
  if (res.locals.user == null) {
    res.status(400).send("You must be logged in to change your username");
    return;
  }
  if (res.locals.user.username == req.body.newUsername) {
    res.status(400).send("You already have \"" + req.body.newUsername + "\" as username.");
    return;
  }
  res.locals.user.changeUsername(req.body.newUsername, function(error, user) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.send(user);
    }
  });
});

// Views
router.get("/", function(req, res) {
  res.render("index");
});

router.get("/search", function(req, res) {
  res.render("search");
});

router.get("/replay/:replayID", function(req, res) {
  res.locals.replayCode = req.params.replayID;
  res.render("replay", res.locals);
});

router.get("/login", function(req, res) {
  res.render("login");
});

router.get("/settings", function(req, res) {
  res.render("settings");
});

router.get("/about", function(req, res) {
  res.render("about");
});

module.exports = router;

