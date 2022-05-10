const { auth } = require("firebase-admin");

module.exports = function (app) {
  const router = require("express").Router();
  const { authJwt } = require("../middlewares");
  const robotController = require("../controllers/robot.controller");

  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  router.post("/add", authJwt.verifyToken, robotController.add_robot);
  router.get("/:robotKey", authJwt.verifyToken, robotController.robot_detail);
  router.post(
    "/:robotKey/edit",
    authJwt.verifyToken,
    robotController.edit_robot
  );
  router.post(
    "/:robotKey/delete",
    authJwt.verifyToken,
    robotController.delete_robot
  );
  router.get(
    "/:robotKey/statistic",
    authJwt.verifyToken,
    robotController.statistic_summary
  );
  router.post("/:robotKey/statistic/create", robotController.save_statistic);
  router.get(
    "/:robotKey/statistic/list",
    authJwt.verifyToken,
    robotController.view_statistic
  );
  router.post(
    "/:robotKey/statistic/delete",
    authJwt.verifyToken,
    robotController.delete_statistic
  );
  router.get(
    "/:robotKey/video/list",
    authJwt.verifyToken,
    robotController.view_video
  );
  router.post(
    "/:robotKey/video/delete",
    authJwt.verifyToken,
    robotController.delete_video
  );
  router.get(
    "/:robotKey/schedule/list",
    authJwt.verifyToken,
    robotController.view_schedule
  );
  router.post(
    "/:robotKey/schedule/create",
    authJwt.verifyToken,
    robotController.create_schedule
  );
  router.post(
    "/:robotKey/schedule/toggle",
    authJwt.verifyToken,
    robotController.toggle_schedule
  );
  router.post(
    "/:robotKey/schedule/delete",
    authJwt.verifyToken,
    robotController.delete_schedule
  );
  router.post(
    "/:robotKey/share/add",
    authJwt.verifyToken,
    robotController.add_shared_robot
  );
  router.post(
    "/:robotKey/share/remove",
    authJwt.verifyToken,
    robotController.remove_share_user
  );
  router.get(
    "/:robotKey/share/list",
    authJwt.verifyToken,
    robotController.list_shared_robot_user
  );
  router.post("/:robotKey/video/upload", robotController.upload_video);
  router.get(
    "/:robotKey/setting/list",
    authJwt.verifyToken,
    robotController.view_setting
  );
  router.get(
    "/:robotKey/notification/list",
    authJwt.verifyToken,
    robotController.view_notification
  );
  router.get(
    "/:robotKey/notification/:notiId/accept",
    authJwt.verifyToken,
    robotController.accept_notification
  );
  router.get(
    "/:robotKey/notification/:notiId/postpone",
    authJwt.verifyToken,
    robotController.abandon_notification
  );

  router.post(
    "/:robotKey/setting/update",
    authJwt.verifyToken,
    robotController.update_setting
  );

  app.use("/apis/robot", router);
};
