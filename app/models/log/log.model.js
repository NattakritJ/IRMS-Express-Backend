const mongoose = require("mongoose");
const sanitizerPlugin = require("mongoose-sanitizer-plugin");

const Log = mongoose.model(
  "Log",
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      robot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Robot",
      },
      message: String,
    },
    { timestamps: true }
  ).plugin(sanitizerPlugin)
);

module.exports = Log;
