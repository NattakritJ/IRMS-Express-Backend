const mongoose = require("mongoose");
const sanitizerPlugin = require("mongoose-sanitizer-plugin");

const Robot_Statistic = mongoose.model(
  "Robot_Statistic",
  new mongoose.Schema(
    {
      robotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Robot",
      },
      timeStart: Date,
      timeStop: Date,
      duration: String,
      totalDistance: Number,
    },
    { timestamps: true }
  ).plugin(sanitizerPlugin)
);

module.exports = Robot_Statistic;
