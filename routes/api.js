var express = require("express");
var db = require("../db");

var router = express.Router();

function fetchUserInformation(req, res, next) {
  if (typeof(res.locals) == "undefined") {
    res.locals = {};
  }
  db.User.findById(req.user, function(error, user) {
    res.locals.user = user;
    next();
  });
}

router.use(fetchUserInformation);

router.use("/user", require("./user.js"));
router.use("/comment", require("./comment.js"));
router.use("/tag", require("./tag.js"));
router.use("/replay", require("./replay.js"));

module.exports = router;
