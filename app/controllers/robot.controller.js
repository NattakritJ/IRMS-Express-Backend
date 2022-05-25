const db = require("../models");
const moment = require("moment");
const sanitize = require("mongo-sanitize");
const hbjs = require("handbrake-js");
const admin = require("firebase-admin");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const util = require("util");
const Robot_Setting = require("../models/robot/robotSetting.model");
const User = db.user;
const Robot = db.robot;
const Robot_Statistic = db.robot_statistic;
const Robot_Video = db.robot_video;
const Robot_Schedule = db.robot_schedule;
const Robot_Share = db.robot_share;
const Robot_Notification = db.robot_nofitication;
const Log = db.log;

exports.add_robot = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const new_robot = new Robot({
      ownerId: user,
      displayName: sanitize(req.body.displayName),
      key: sanitize(req.body.key),
    });
    await new_robot.save();
    new Log({
      user: user,
      robot: new_robot,
      message: "Add robot",
    }).save();
    return res.status(200).send({ message: "Robot added" });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.delete_robot = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    if (!robot.ownerId.equals(user.id)) {
      return res
        .status(403)
        .send({ Message: "You don't have permission to delete this robot." });
    }
    await robot.delete();
    return res.status(200).send({ message: "robot deleted" });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.edit_robot = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    if (!robot.ownerId.equals(user.id)) {
      return res
        .status(403)
        .send({ Message: "You don't have permission to edit this robot." });
    }
    if (req.body.displayName) {
      robot.displayName = sanitize(req.body.displayName);
      new Log({
        user: user,
        robot: robot,
        message: "Edit robot display name",
      }).save();
    }
    await robot.save();
    return res.status(200).send(robot);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.robot_detail = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    return res.status(200).send(robot);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.view_statistic = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    const statistic_list = await Robot_Statistic.find({
      robotId: robot.id,
    }).sort("-createdAt");
    return res.status(200).send(statistic_list);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.delete_statistic = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    const statistic = await Robot_Statistic.findById(
      sanitize(req.body.statisticId)
    );
    if (!statistic) {
      return res.status(404).send({ message: "record not found" });
    }
    if (!statistic.robotId.equals(robot.id) || !robot.ownerId.equals(user.id)) {
      return res
        .status(403)
        .send({ Message: "You don't have permission to edit this record." });
    }
    await statistic.delete();
    new Log({
      user: user,
      robot: robot,
      message: "Delete statistic",
    }).save();
    return res.status(200).send({ message: "record deleted" });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.statistic_summary = async (req, res) => {
  try {
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    const statistic_summary = await Robot_Statistic.aggregate([
      { $match: { robotId: { $in: [robot._id] } } },
      {
        $addFields: {
          durationTotal: {
            $divide: [{ $subtract: ["$timeStop", "$timeStart"] }, 1000],
          },
        },
      },
      {
        $group: {
          _id: { robotId: "$robotId" },
          sumOfTotalDistance: { $sum: "$totalDistance" },
          sumOfTotalTime: { $sum: "$durationTotal" },
          count: { $sum: 1 },
        },
      },
    ]);
    return res.status(200).send(statistic_summary);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.save_statistic = async (req, res) => {
  try {
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send();
    }
    await new Robot_Statistic({
      robotId: robot,
      timeStart: moment(req.body.startTime, "HH:mm:ss"),
      timeStop: moment(req.body.stopTime, "HH:mm:ss"),
      duration: req.body.duration,
      totalDistance: req.body.dist,
    }).save();
    robot.lastOperationTime = req.body.duration;
    await robot.save();
    return res.status(200).send();
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
};

exports.view_video = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    const video_list = await Robot_Video.find({ robotId: robot.id });
    return res.status(200).send(video_list);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.delete_video = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    const video = await Robot_Video.findById(sanitize(req.body.videoId));
    if (!video) {
      return res.status(404).send({ message: "record not found" });
    }
    if (!video.robotId.equals(robot.id) || !robot.ownerId.equals(user.id)) {
      return res
        .status(403)
        .send({ Message: "You don't have permission to edit this record." });
    }
    try {
      fs.unlinkSync(path.join(__dirname, "..", "public", video.fileName));
    } catch (err) {
      await video.delete();
      return res.status(200).send({
        message: "record delete but video file not found in the server",
      });
    }
    await video.delete();
    new Log({
      user: user,
      robot: robot,
      message: "Delete video",
    }).save();
    return res.status(200).send({ message: "record deleted" });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

// Upload Service
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "public"));
  },
  filename: (req, file, cb) => {
    const random = Math.round(Math.random() * 10 ** 7).toFixed(0);
    const fileName = `file-${Date.now()}-${random}${path.extname(
      file.originalname
    )}`;
    cb(null, fileName);
  },
});

const uploadSingle = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype &&
      ["image/png", "image/jpg", "image/jpeg", "text/plain"].indexOf(
        file.mimetype
      ) > -1
    ) {
      cb(null, true);
    } else {
      cb(null, true);
      // cb(null, false);
      // req.validationError = true;
      // return cb(null, false, "Forbidden file extension.");
    }
  },
}).single("file");
const UploadSingleService = util.promisify(uploadSingle);

exports.upload_video = async (req, res) => {
  try {
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    await UploadSingleService(req, res);

    if (req.validationError) {
      console.log("file invalid");
      return res.status(500).send();
    }
    if (!req.file) {
      console.log("file is req");
      return res.status(500).send();
    }
    const fileName = req.file.filename;
    const fileNameMp4 = fileName.substring(0, fileName.indexOf(".")) + ".mp4";
    hbjs
      .spawn({
        input: path.join(__dirname, "..", "public", fileName),
        output: path.join(__dirname, "..", "public", fileNameMp4),
      })
      .on("error", (err) => {
        console.log(err);
      })
      .on("progress", (progress) => {
        console.log("Percent complete: %s", progress.percentComplete);
      })
      .on("complete", () => {
        fs.unlinkSync(path.join(__dirname, "..", "public", fileName));
      });
    await new Robot_Video({
      robotId: robot,
      date: new Date(),
      fileName: fileNameMp4,
      url: `${process.env.BACKEND_URL}/video/${fileNameMp4}`,
    }).save();
    return res.status(200).send();
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: err });
  }
};

exports.view_setting = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    const setting_list = await Robot_Setting.find({ robotId: robot.id });
    return res.status(200).send(setting_list);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.update_setting = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    const setting = await Robot_Setting.findById(sanitize(req.body.settingId));
    if (!setting.robotId.equals(robot.id) || !robot.ownerId.equals(user.id)) {
      return res
        .status(403)
        .send({ Message: "You don't have permission to edit this record." });
    }
    setting.value = sanitize(req.body.value);
    await setting.save();
    new Log({
      user: user,
      robot: robot,
      message: "Change robot " + setting.key + " to " + setting.value,
    }).save();
    return res.status(200).send({
      message:
        "Your robot " + setting.key + " has been updated to: " + setting.value,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.view_schedule = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    const schedule_list = await Robot_Schedule.find({ robotId: robot.id }).sort(
      { hour: 1, minute: 1 }
    );
    return res.status(200).send(schedule_list);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.create_schedule = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send();
    }
    await new Robot_Schedule({
      robotId: robot,
      userId: user,
      activate: req.body.activate,
      name: req.body.name,
      hour: req.body.hour,
      minute: req.body.minute,
      interval: req.body.interval,
      daySelected: req.body.daySelected,
    }).save();
    const schedule_list = await Robot_Schedule.find({ robotId: robot.id }).sort(
      { hour: 1, minute: 1 }
    );
    new Log({
      user: user,
      robot: robot,
      message: "Create schedule " + req.body.name,
    }).save();
    return res.status(200).send(schedule_list);
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
};

exports.delete_schedule = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    const schedule = await Robot_Schedule.findById(
      sanitize(req.body.scheduleId)
    );
    if (!schedule) {
      return res.status(404).send({ message: "record not found" });
    }
    if (!schedule.robotId.equals(robot.id) || !robot.ownerId.equals(user.id)) {
      return res
        .status(403)
        .send({ Message: "You don't have permission to edit this record." });
    }
    new Log({
      user: user,
      robot: robot,
      message: "Delete schedule " + schedule.name,
    }).save();
    await schedule.delete();
    return res.status(200).send({ message: "record deleted" });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.toggle_schedule = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    const schedule = await Robot_Schedule.findById(
      sanitize(req.body.scheduleId)
    );
    if (!schedule) {
      return res.status(404).send({ message: "record not found" });
    }
    schedule.activate = req.body.activate;
    await schedule.save();
    new Log({
      user: user,
      robot: robot,
      message: "Set schedule " + schedule.name + " to " + schedule.activate,
    }).save();
    return res.status(200).send({ state: schedule.activate });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.add_shared_robot = async (req, res) => {
  try {
    const ownerUser = await User.findById(req.userId);
    const user = await User.findOne({ email: sanitize(req.body.email) });
    if (!user) {
      return res.status(404).send({ message: "user not found" });
    }
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    const check_duplicate = await Robot_Share.findOne({
      robotId: robot,
      userId: user,
    });
    if (check_duplicate)
      return res.status(403).send({ message: "Already share to this user" });
    const firebase_robot = admin.firestore().doc("robots/" + robot.key);
    if (!firebase_robot) {
      return res.status(404).send();
    }
    await admin.firestore().collection("robotsUsers").add({
      robot: firebase_robot,
      uid: user.uid,
    });
    await new Robot_Share({
      robotId: robot,
      userId: user,
    }).save();
    new Log({
      user: ownerUser,
      robot: robot,
      message: "Share robot to " + user.displayName,
    }).save();
    return res.status(200).send({ message: "Share successful" });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.list_shared_robot_user = async (req, res) => {
  try {
    let result = [];
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    const share_list = await Robot_Share.find({ robotId: robot }).populate(
      "userId"
    );
    console.log(share_list);
    for (let i = 0; i < share_list.length; i++) {
      const firebase_user = await admin
        .auth()
        .getUser(share_list[i].userId.uid);
      result.push(firebase_user);
    }
    return res.status(200).send(result);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.remove_share_user = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    const firebase_robot = admin.firestore().doc("robots/" + robot.key);
    const user_to_remove = await User.findOne({ uid: sanitize(req.body.uid) });
    const share_data = await Robot_Share.findOne({
      robotId: robot,
      userId: user_to_remove,
    });
    if (!share_data) {
      return res.status(404).send({ message: "user not found" });
    }
    const data = await admin
      .firestore()
      .collection("robotsUsers")
      .where("uid", "==", user_to_remove.uid)
      .where("robot", "==", firebase_robot)
      .get();
    data.forEach(async (doc) => {
      console.log(doc.id);
      await admin.firestore().collection("robotsUsers").doc(doc.id).delete();
    });
    await share_data.delete();
    new Log({
      user: user,
      robot: robot,
      message:
        "Remove user " + user_to_remove.displayName + " from robot sharing",
    }).save();
    return res.status(200).send({ message: "remove user successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.view_notification = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    const notification_list = await Robot_Notification.find({
      robotId: robot.id,
      isComplete: false,
      userAcknowledge: { $ne: user },
    }).populate({ path: "userAcknowledge", select: "displayName" });
    return res.status(200).send(notification_list);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.accept_notification = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    const notifiation = await Robot_Notification.findById(
      sanitize(req.params.notiId)
    );
    if (!notifiation) {
      return res.status(404).send({ message: "notifiation not found" });
    }
    notifiation.userAcknowledge = user;
    notifiation.isComplete = true;
    await notifiation.save();
    return res.status(200).send({ message: "Notification accepted" });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.abandon_notification = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    const notifiation = await Robot_Notification.findById(
      sanitize(req.params.notiId)
    );
    if (!notifiation) {
      return res.status(404).send({ message: "notifiation not found" });
    }
    notifiation.userAcknowledge = user;
    notifiation.isComplete = false;
    await notifiation.save();
    return res.status(200).send({ message: "Notification ignoreded" });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.update_waypoint = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    robot.waypoint = req.body.waypointArray;
    await robot.save();
    new Log({
      user: user,
      robot: robot,
      message: "Update waypoint",
    }).save();
    return res.status(200).send({
      message: "Waypoint update successfully",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.get_waypoint = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    if (!robot) {
      return res.status(404).send({ message: "robot not found" });
    }
    return res.status(200).send(robot.waypoint);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.get_log = async (req, res) => {
  try {
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    const logs = await Log.find({ robot: robot.id })
      .populate({ path: "user", select: "displayName" })
      .sort("-createdAt");
    return res.status(200).send(logs);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.connect_to_ws = async (req, res) => {
  try {
    const robot = await Robot.findOne({ key: sanitize(req.params.robotKey) });
    robot.lastConnection = new Date();
    robot.save();
    return res.status(200).send();
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};
