// Module
const db = require("../models");
const sanitize = require("mongo-sanitize");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const mailer = require("nodemailer");
const { v4: uuidV4 } = require("uuid");
const Robot = db.robot;

const profileImage = require("../assets/profileImage.json");

// Database Collection
const User = db.user;
const User_Detail = db.user_detail;

// const variable
const saltRounds = 10;
const smtp = {
  host: process.env.SMTP_HOST, //set to your host name or ip
  port: Number(process.env.SMTP_PORT), //25, 465, 587 depend on your
  secure: false, // use TLS
  auth: {
    user: process.env.SMTP_USERNAME, //user account
    pass: process.env.SMTP_PASSWORD, //user password
  },
};
const smtpTransport = mailer.createTransport(smtp);

// Firebase
const admin = require("firebase-admin");

exports.users_list = async (req, res) => {
  try {
    const usersResult = await admin.auth().listUsers(1000);
    return res.json(usersResult.users);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.signin = async (req, res) => {
  try {
    const user = await User.findOne({ uid: sanitize(req.body.uid) });
    if (user) {
      console.log("user exist");
      let accesstoken = jwt.sign(
        { id: user.id },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: process.env.ACCESS_TOKEN_LIFE,
        }
      );
      res.cookie("accessToken", accesstoken, {
        maxAge: process.env.ACCESS_TOKEN_LIFE,
        httpOnly: true,
        secure: false,
      });
      return res.status(200).send(user);
    } else {
      console.log("user not exist");
      const firebase_user = await admin.auth().getUser(req.body.uid);
      const new_user = new User({
        uid: firebase_user.uid,
        email: firebase_user.email,
        displayName: firebase_user.displayName,
        role: "User",
        status: true,
      });
      const user_detail = new User_Detail({
        userId: new_user,
        firstName: "",
        lastName: "",
        profileImage: profileImage.value,
      });
      await user_detail.save();
      new_user.userDetail = user_detail;
      await new_user.save();
      return res.status(200).send(new_user);
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.sign_up = async (req, res) => {
  try {
    const check_exist = await User.countDocuments({
      email: sanitize(req.body.email),
    });
    if (check_exist) {
      return res.status(403).send({ message: "Email already exist" });
    }
    const firebase_user = await admin.auth().createUser({
      email: req.body.email,
      emailVerified: false,
      password: req.body.password,
      displayName: req.body.displayName,
      disabled: true,
    });
    const customClaims = {
      newUser: false,
      role: "user",
    };
    await admin.auth().setCustomUserClaims(firebase_user.uid, customClaims);
    await admin
      .firestore()
      .collection("userTokens")
      .doc(firebase_user.uid)
      .set({ wsToken: uuidV4(), revoked: false });
    await admin
      .firestore()
      .collection("authMetadata")
      .doc("1")
      .update({ count: admin.firestore.FieldValue.increment(1) });
    const new_user = new User({
      uid: firebase_user.uid,
      email: firebase_user.email,
      displayName: firebase_user.displayName,
      role: "User",
      status: false,
    });
    const user_detail = new User_Detail({
      userId: new_user,
      firstName: sanitize(req.body.firstName),
      lastName: sanitize(req.body.lastName),
      profileImage: profileImage.value,
    });
    await user_detail.save();
    new_user.userDetail = user_detail;
    await new_user.save();
    const token = jwt.sign(
      { uid: firebase_user.uid },
      process.env.VERIFY_SECRET,
      {
        expiresIn: process.env.VERIFY_TOKEN_LIFE,
      }
    );
    // send vertification email
    const email_html = fs.readFileSync(
      path.join(__dirname, "../assets/fromEmail/register/index.html"),
      "utf8"
    );
    let template = handlebars.compile(email_html);
    let replacements = {
      emailUrl: process.env.EMAIL_DOMAIN,
      verifyLink: process.env.EMAIL_DOMAIN + "/app/signup/verify/" + token,
    };
    let complete_html = template(replacements);
    const msg = {
      to: firebase_user.email,
      from: process.env.EMAIL_FROM,
      subject: "[IRMS] Verify Email",
      html: complete_html,
    };
    smtpTransport.sendMail(msg, function (err, response) {
      smtpTransport.close();
      if (err) {
        return res.status(500).send({ message: "internal server error" });
      } else {
        // return res.status(200).send({ status: "Transfer request created"})
        return res.status(200).send({ verifyLink: token });
      }
    });
    return res.status(200).send({
      message:
        "An email was sent to " +
        req.body.email +
        ". Please check your inbox to verify your account",
      verifyLink: token,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.verify_email = async (req, res) => {
  try {
    if (!req.params.token) {
      return res.status(401).send({ message: "Invalid verify token" });
    }
    const decoded = jwt.verify(req.params.token, process.env.VERIFY_SECRET);
    const firebase_user = await admin.auth().getUser(decoded.uid);
    if (firebase_user.disabled) {
      await admin.auth().updateUser(decoded.uid, {
        emailVerified: true,
        disabled: false,
      });
      const user = await User.findOne({ uid: decoded.uid });
      user.status = true;
      await user.save();
      return res.status(200).send({ message: "user activated" });
    }
    return res.status(403).send({ message: "user already activated" });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.generate_forgot_pwd_email = async (req, res) => {
  try {
    const user = await User.findOne({ email: sanitize(req.body.email) });
    if (!user) {
      return res.status(200).send({
        message:
          "If a matching account was found an email was sent to " +
          req.body.email +
          " to allow you to reset your password",
      });
    }
    const token = jwt.sign({ id: user.id }, process.env.RESET_PWD_SECRET, {
      expiresIn: process.env.RESET_PWD_TOKEN_LIFE,
    });
    const email_html = fs.readFileSync(
      path.join(__dirname, "../assets/fromEmail/forgotpwd/index.html"),
      "utf8"
    );
    let template = handlebars.compile(email_html);
    let replacements = {
      emailUrl: process.env.EMAIL_DOMAIN,
      verifyLink:
        process.env.EMAIL_DOMAIN + "/app/auth/reset-password/" + token,
    };
    let complete_html = template(replacements);
    const msg = {
      to: user.email,
      from: process.env.EMAIL_FROM,
      subject: "[IRMS] Reset Password",
      html: complete_html,
    };
    smtpTransport.sendMail(msg, function (err, response) {
      smtpTransport.close();
      if (err) {
        return res.status(500).send({ message: "internal server error" });
      } else {
        // return res.status(200).send({ status: "Transfer request created"})
        return res.status(200).send({
          message:
            "If a matching account was found an email was sent to " +
            req.body.email +
            " to allow you to reset your password",
        });
      }
    });
    return res.status(200).send({
      message:
        "If a matching account was found an email was sent to " +
        req.body.email +
        " to allow you to reset your password",
      verifyLink: token,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};

exports.reset_pwd = async (req, res) => {
  try {
    if (!req.body.token) {
      return res.status(401).send({ message: "Invalid verify token" });
    }
    const decoded = jwt.verify(req.body.token, process.env.RESET_PWD_SECRET);
    const user = await User.findById(decoded.id);
    await admin.auth().updateUser(user.uid, {
      password: req.body.password,
    });
    return res.status(200).send({ message: "done" });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
};
