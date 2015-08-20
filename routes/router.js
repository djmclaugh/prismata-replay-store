var express = require("express");
var db = require("../db");
var passwordless = require("passwordless");

var router = express.Router();

router.use("/api", require("./api.js"));

router.get("/", function(req, res) {
  res.render("index");
});

router.get("/search", function(req, res) {
  res.render("search");
});

router.get("/replay/:replayCode", function(req, res) {
  res.render("replay", {replayCode: req.params.replayCode});
});

router.get("/login", function(req, res) {
  res.render("login");
});

router.get("/logout", passwordless.logout(), function(req, res) {
  res.redirect("/");
});

router.get("/settings", function(req, res) {
  res.render("settings");
});

router.get("/about", function(req, res) {
  res.render("about");
});

module.exports = router;

