var express = require("express");
var path = require("path");
var router = require("./router");

var app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.use(router);

app.listen(8080);

