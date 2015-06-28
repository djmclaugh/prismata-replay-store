var config = require("./config.json");
var express = require("express");
var path = require("path");
var session = require("express-session");
var ConnectMongoStore = new require("connect-mongo")(session);
var bodyParser = require("body-parser");

var email = require("emailjs");
var PasswordlessMongoStore = require("passwordless-mongostore");
var passwordless = require("passwordless");

var db = require("./db");

var emailServer = email.server.connect(config.emailServerOptions);
var emailDelivery = function(tokenToSend, uidToSend, recipient, callback) {
  var email = {
      text: "You can now access your account by following this link:\n" +
            config.appURL + "?token=" + tokenToSend + "&uid=" +
            encodeURIComponent(uidToSend),
      from: config.emailAddress,
      to: recipient,
      subject: "Login Prismata Replay Store"
  };
  emailServer.send(email, function(error, message) {
    if (error) {
      console.log(error);
    }
    callback(error);
  });
};

passwordless.init(new PasswordlessMongoStore(config.databaseLocation));
passwordless.addDelivery(emailDelivery);

var app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
  secret: config.secret,
  saveUninitialized: true,
  resave: false,
  store: new ConnectMongoStore({url: config.databaseLocation})
}));

app.use(passwordless.sessionSupport());
app.use(passwordless.acceptToken({ successRedirect: "/"}));

app.use(require("./router"));

setInterval(function() {
  db.Replay.modifyPopularityOfAllReplays(0.9, function() {});
}, 1000 * 60 * 60);

app.listen(config.port);

