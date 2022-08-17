const mongoose = require("mongoose");

// INFO: Check if th id is valid or not
module.exports = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Invalid ID.");

  next();
};
