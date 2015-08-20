var express = require("express");
var db = require("../db");

var router = express.Router();

// Creates and returns a new comment.
// Will send a 400 response if either "replayCode" or "comment" is missing from the body.
// Will send a 403 response if the user is not logged in.
// Will send a 500 response if this fails for any other reason.
// body - {
//     replayCode: The code for the replay your comment is targeting.
//     commment: The string containing your comment.
// }
router.post("/", function(req, res) {
  if (res.locals.user == null) {
    res.status(403).send("You must be logged in to submit a comment.");
    return;
  }
  if (req.body.replayCode == null) {
    res.status(400).send("You must specify which replay your comment is targeting.");
    return;
  }
  if (req.body.comment == null || req.body.comment.length == 0) {
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

// Updates the comment with the specified id and returns it.
// Will send a 403 response if the user making the request is not the author of the comment.
// Will send a 404 response if the comment with the specified id does not exist.
// Will send a 500 response if this fails for any other reason.
// body - {comment: the new message that should replace the old one}
router.put("/:commentId([a-f0-9]{24})", function(req, res) {
  db.Comment.findById(req.params.commentId).populate("user").exec(onLookup);  
  
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

  function onSave(error, comment) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.send(comment);
    }
  }
});

// Returns all comments associated with the provided replay code.
// Will send a 500 response with an error message if this fails for any reason.
router.get("/commentsForReplay/:replayCode", function(req, res) {
  db.Comment.find({replayCode: req.params.replayCode})
      .populate("user", "username")
      .select("-replayCode -__v")
      .sort({date: 1})
      .exec(onFind);
  
  function onFind(error, comments) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.send(comments);
    }
  }
});

module.exports = router;

