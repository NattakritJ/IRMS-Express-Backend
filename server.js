require("dotenv").config();
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const express = require("express");
const cors = require("cors");
const db = require("./app/models");
const app = express();

//enable dotenv
require("dotenv").config();
app.use("/video", express.static("./app/public"));

//enable cron
require("./app/controllers/cron/cron-jobs");

//firebase configuration
var serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://uvc-robot-dev.appspot.com/",
});
app.locals.bucket = admin.storage().bucket();

// give permission for fetch resource
// https://acoshift.me/2019/0004-web-cors.html
// https://stackabuse.com/handling-cors-with-node-js/
const corsOptions = {
  origin: process.env.ALLOW_URLS.split(",").map((d) => {
    return new RegExp(`${d.replace(/http:\/\/|https:\/\/|\//g, "")}$`);
  }),
  credentials: true,
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(bodyParser.json());

// enabled file upload
// app.use(
//   fileUpload({
//     limits: {
//       fileSize: 1000000, //1mb
//     },
//   })
// );

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// routes
require("./app/routes/auth.routes")(app);
require("./app/routes/user.routes")(app);
require("./app/routes/robot.routes")(app);

// redirect all other route to frontend
app.get("*", function (req, res) {
  res.redirect(process.env.ALLOW_URLS);
});

// set port, listen for requests
const port = process.env.SERVER_PORT;
server = app.listen(port, () => console.log("server running on port " + port));

// connect to database
db.mongoose
  .connect(process.env.DB)
  .then(() => {
    new db.mongoose.mongo.Admin(db.mongoose.connection.db).buildInfo(function (
      err,
      info
    ) {
      console.log("Successfully connect to MongoDB version " + info.version);
    });
  })
  .catch((err) => {
    console.error("Connection error", err);
    process.exit();
  });

module.exports = app;
