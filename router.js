var express = require("express");
var db = require("./db");
var passwordless = require("passwordless");
var https = require('https');

var router = express.Router();

function setUp(req, res, next) {
  if (typeof(res.locals) == "undefined") {
    res.locals = {};
  }
  res.locals.replay = null;
  res.locals.replays = [];
  res.locals.recentReplays = [];
  res.locals.popularReplays = [];
  res.locals.errors = req.session.errors || [];
  req.session.errors = [];
  req.session.recaptchaPass = false;
  var userID = req.user;
  db.User.findById(userID, function(error, user) {
    if (error) {
      req.locals.errors.push(error.message);
    }
    res.locals.user = user;
    next();
  });
}

function populateSearch(req, res, next) {
  var search = req.session.search;
  res.locals.search = search;
  req.session.search = null;
  
  if (!search) {
    res.locals.search = {};
    res.locals.search.include_rated = true;
    res.locals.search.include_unrated = true;
    next();
    return;
  }
  
  db.Replay.search(search, function(error, replays) {
    if (error) {
      res.locals.errors.push(error.message);
      console.log(error);
    }
    if (replays.length == 0) {
      res.locals.errors.push("No results found.");
    } 
    res.locals.replays = replays;
    next();
  });
}

function fetchReplay(req, res, next) {
  db.Replay.getOrFetchReplay(req.params.replayID, function(error, replay) {
    if (replay) {
      res.locals.replay = replay;
      replay.popularity += replay.popularity + 1;
      replay.save(function(err) {
        if (err) {
          res.locals.errors.push(err.message);
        }
        next();
      });
    } else {
      if (error) {
        res.locals.errors.push(error.message);
      }
      next();
    }
  });
}

function getComments(req, res, next) {
  db.Comment.find({replayCode: req.params.replayID})
    .populate("user")
    .sort({date: 1})
    .exec(function(error, comments) {
      if (error) {
        res.locals.errors.push(error.message);
      }
      res.locals.comments = comments;
      next();
    });
}

function getPopularReplays(req, res, next) {
  var onFind = function(error, replays) {
    if (error) {
      res.locals.errors.push(error.message);
    }
    res.locals.popularReplays = replays;
    next();
  };

  db.Replay.find({})
    .sort({popularity: -1})
    .limit(5)
    .exec(onFind); 
}

function getRecentReplays(req, res, next) {
  var onFind = function(error, replays) {
    if (error) {
      res.locals.errors.push(error.message);
    }
    res.locals.recentReplays = replays;
    next();
  };

  db.Replay.find({})
    .sort({dateAdded: -1})
    .limit(5)
    .exec(onFind);
}

function checkRecaptcha(req, res, next) {
  var key = req.body["g-recaptcha-response"];
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
    if (error) {
      req.session.errors.push(error.message);
    } else {
      req.session.errors.push("An email has been sent to " + email + ".");
    }
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

router.get("/services/recent_replays", getRecentReplays, function(req, res) {
  res.send(res.locals.recentReplays);
});

router.get("/", getPopularReplays, getRecentReplays, function(req, res) {
  res.render("index", res.locals);
});

router.get("/login", function(req, res) {
  res.render("login");
});

router.get("/logout", passwordless.logout(), function(req, res) {
  res.redirect("/");
});

router.post("/sendtoken", checkRecaptcha, requestTokenIfRecaptcha, function(req, res) {
  if (req.recaptchaResult && req.recaptchaResult.success) {
    res.redirect("/");
  } else {
    res.redirect("/login");
  }
});

router.get("/search", populateSearch, function(req, res) {
  res.render("search", res.locals);
});

router.post("/search", function(req, res) {
  req.session.search = req.body;
  res.redirect(303, "/search");
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

router.get("/replay/:replayID", fetchReplay, getComments, function(req, res) {
  res.render("replay", res.locals);
});

router.put("/services/replay/:replayCode", function(req, res) {
  function onFetch(error, replay) {
    if (error) {
      res.send(error.message);
    } else {
      res.send("REPLAY_ADDED");
    }
  }

  function onFind(error, replay) {
    if (error) {
      res.send(error.message);
    } else if (replay) {
      res.send("ALREADY_EXISTS");
    } else {
      db.Replay.getOrFetchReplay(req.params.replayCode, onFetch);
    }
  }

  db.Replay.findOne({code: req.params.replayCode}, onFind);  
});

router.post("/replay/:replayID", function(req, res) {
  var comment = {
    user: res.locals.user,
    replayCode: req.params.replayID,
    message: req.body.comment,
  };
  if (comment.message.length == 0) {
    req.session.errors.push("Cannot submit empty comment");
    res.redirect(303, "/replay/" + req.params.replayID);
  } else {
    db.Comment.create(comment,  function(error) {
      if (error) {
        req.session.errors.push(error.message);
      }
      res.redirect(303, "/replay/" + req.params.replayID);
    });
  }
});

router.post("/comment/:commentID", function(req, res) {
  db.Comment.updateComment(req.params.commentID, res.locals.user, req.body.comment, function(error) {
    if (error) {
      req.session.errors.push(error.message);
    }
    res.redirect(303, "back");
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

router.get("/about", function(req, res) {
  res.render("about");
});

module.exports = router;

