const mongoose = require("mongoose");
const sanitizerPlugin = require("mongoose-sanitizer-plugin");

const Robot_Setting = mongoose.model(
  "Robot_Setting",
  new mongoose.Schema({
    robotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Robot",
    },
    key: String,
    value: String,
  }).plugin(sanitizerPlugin)
);

module.exports = Robot_Setting;
