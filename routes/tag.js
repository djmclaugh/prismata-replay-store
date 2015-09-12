var express = require("express");
var db = require("../db");

var router = express.Router();

const replayCodeRegex = "[A-z0-9@+]{5}-[$A-z0-9@+]{5}";

// Returns an array of all labels that are currently valid.
// Will send 500 resonse if this fails for any reason.
router.get("/allTagLabels", function (req, res) {
  db.Tag.getAllTagLabels(onGet);
  function onGet(error, allTagLabels) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.send(allTagLabels);
    }
  }
});


// Returns all tags associated with the provided replay.
// Will send a 500 response if this fails for any reason.
router.get("/tagsForReplay/:replayCode(" + replayCodeRegex + ")", function (req, res) {
  db.Tag.find({replayCode: req.params.replayCode}).sort({value: -1}).exec(onFind);

  function onFind(error, tags) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.send(tags);
    }
  }
});

// Upvotes the described tag and returns it.
// This will also remove your downvote of this tag if it exists.
// Will send a 403 response if you are not logged in.
// Will send a 500 response if this fails for any other reason.
// body - {
//     replayCode: the replay that is being tagged
//     label: the label of the tag
//     value: -1 for downvote, 0 to cancel any vote, and 1 for upvote
// }
router.put("/", function(req, res) {
  if (!res.locals.user) {
    res.status(403).send("You must be logged in to modify tags.");
    return;
  }

  if (!req.body.value || typeof req.body.value != "number") {
    res.status(400).send("Field 'value' of body is missing or isn't a number.");
  }
  if (!req.body.replayCode || typeof req.body.replayCode != "string") {
    res.status(400).send("Field 'replayCode' of body is missing or isn't a string.");
  }
  if (!req.body.label || typeof req.body.label != "string") {
    res.status(400).send("Field 'label' of body is missing or isn't a string.");
  }

  db.Tag.getOrCreateTag(req.body.label, req.body.replayCode, onFind);

  function onFind(error, tag) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      if (req.body.value < 0) {
        tag.downvote(res.locals.user, onVote);
      } else if (req.body.value == 0) {
        tag.cancelVote(res.locals.user, onVote);
      } else {
        tag.upvote(res.locals.user, onVote);
      }
    }
  }

  function onVote(error, tag) {
    console.log(tag);
    if (error) {
      res.result(500).send(error.message);
    } else {
      res.send(tag);
    }
  }
});

module.exports = router;

