const mongoose = require("mongoose");
const sanitizerPlugin = require("mongoose-sanitizer-plugin");

const Robot_Share = mongoose.model(
  "Robot_Share",
  new mongoose.Schema({
    robotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Robot",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  }).plugin(sanitizerPlugin)
);

module.exports = Robot_Share;
