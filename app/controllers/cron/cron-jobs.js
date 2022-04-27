const cron_config = require("../../config/cron.config");
const { JOB_SCHEDULE } = cron_config;
const cron = require("node-cron");
const moment = require("moment");
const admin = require("firebase-admin");
const axios = require("axios").default;
const db = require("../../models");
const Robot_Schedule = db.robot_schedule;
const Robot = db.robot;
const Robot_Notification = db.robot_nofitication;

async function runSchedule(robot) {
  try {
    const robotKey = robot.key;
    const firebase_robot = await admin
      .firestore()
      .collection("robots")
      .where("key", "==", robotKey)
      .limit(1)
      .get();
    const firebase_robot_data = firebase_robot.docs.map((doc) => doc.data())[0];
    await axios.get(
      process.env.WEBSOCKET_BACKEND_URL +
        firebase_robot_data.ownerId +
        "/" +
        robotKey
    );
    return;
  } catch (err) {
    console.log(err);
  }
}

cron.schedule(JOB_SCHEDULE, async () => {
  const now = moment();
  const pastTenSec = moment().subtract(10, "seconds");
  const schedule_list = await Robot_Schedule.find({ activate: true });
  for (let i = 0; i < schedule_list.length; i++) {
    let schedule = schedule_list[i];
    if (schedule.interval === "on-time") {
      const robot = await Robot.findById(schedule.robotId);
      let time = moment();
      time.hour(schedule.hour);
      time.minute(schedule.minute);
      time.second(0);
      if (time.isBetween(pastTenSec, now)) {
        console.log("run ontime schedule");
        runSchedule(robot);
        schedule.activate = false;
        await new Robot_Notification({
          robotId: robot,
          message: `On-time schedule (${schedule.name}) started`,
          isView: false,
          isComplete: false,
        }).save();
        await schedule.save();
      }
    } else if (schedule.interval === "daily") {
      const robot = await Robot.findById(schedule.robotId);
      let time = moment();
      time.hour(schedule.hour);
      time.minute(schedule.minute);
      time.second(0);
      if (time.isBetween(pastTenSec, now)) {
        console.log("run daily schedule");
        runSchedule(robot);
        await new Robot_Notification({
          robotId: robot,
          message: `Daily schedule (${schedule.name}) started`,
          isView: false,
          isComplete: false,
        }).save();
        await schedule.save();
      }
    } else if (schedule.interval === "weekly") {
      let weekDayName = moment().format("dddd").toLowerCase();
      if (schedule.daySelected[weekDayName]) {
        const robot = await Robot.findById(schedule.robotId);
        let time = moment();
        time.hour(schedule.hour);
        time.minute(schedule.minute);
        time.second(0);
        if (time.isBetween(pastTenSec, now)) {
          console.log("run weekly schedule");
          runSchedule(robot);
          await new Robot_Notification({
            robotId: robot,
            message: `Weekly schedule (${schedule.name}) started`,
            isView: false,
            isComplete: false,
          }).save();
          await schedule.save();
        }
      }
    } else continue;
  }
});
