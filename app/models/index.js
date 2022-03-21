const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;

db.user = require("./user/user.model");
db.user_detail = require("./user/userDetail.model");
db.user_setting = require("./user/userSetting.model");
db.robot = require("./robot/robot.model");
db.robot_nofitication = require("./robot/robotNotification.model");
db.robot_schedule = require("./robot/robotSchedule.model");
db.robot_setting = require("./robot/robotSetting.model");

module.exports = db;
