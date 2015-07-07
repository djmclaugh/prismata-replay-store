var express = require("express");
var db = require("./db");
var passwordless = require("passwordless");

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

function getUserId(email, delivery, callback, req) {
  db.User.getOrCreateWithEmail(email, function(error, user) {
    callback(error, user._id);
  });
}

router.use(setUp);

router.get("/", getPopularReplays, getRecentReplays, function(req, res) {
  res.render("index", res.locals);
});

/* No login version. Uncomment once login enabled.
router.get("/login", function(req, res) {
  res.render("login");
});

router.get("/logout", passwordless.logout(), function(req, res) {
  res.redirect("/");
});

router.post("/sendtoken", passwordless.requestToken(getUserId), function(req, res) {
  res.redirect("/");
});
*/

router.get("/search", populateSearch, function(req, res) {
  res.render("search", res.locals);
});

router.post("/search", function(req, res) {
  req.session.search = req.body;
  res.redirect(303, "/search");
});

router.get("/replay/:replayID", fetchReplay, getComments, function(req, res) {
  if (res.locals.errors.length > 0) {
    res.render("replay", res.locals);
  } else {
    res.redirect(303, "/");
  }
});

/* No Login version. Uncomment once login enabled.
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
*/

router.get("/about", function(req, res) {
  res.render("about");
});

module.exports = router;

