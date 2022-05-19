const mongoose = require("mongoose");
const sanitizerPlugin = require("mongoose-sanitizer-plugin");

const Robot = mongoose.model(
  "Robot",
  new mongoose.Schema({
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    displayName: String,
    key: String,
    waypoint: Array,
    lastOperationTime: { type: String, default: "" },
    lastConnection: Date,
  }).plugin(sanitizerPlugin)
);

module.exports = Robot;
