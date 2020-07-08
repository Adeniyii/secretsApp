//jshint esversion:6

require("dotenv").config();
const express = require("express");
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

const secret = process.env.SECRET;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));


mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});


const User = mongoose.model("User", userSchema);


// CHAINED requests for home route
app.route("/")
  .get(function(req, res) {
    res.render("home");
  });

// CHAINED requests for register route
app.route("/register")
  // Register GET request handler
  .get(function(req, res) {
    res.render("register");
  })
  // Register POST request handler
  .post(function(req, res) {
    // salt and hash user password
    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
      // Create new user
      const newUser = new User({
        email: req.body.username,
        password: hash
      });
      // save new user
      newUser.save(function(err) {
        if (err) {
          res.render("register");
          console.error(err);
        } else {
          res.render("secrets");
        }
      });
    });
  });


// CHAINED requests for login route
app.route("/login")
  // Login GET request handler
  .get(function(req, res) {
    res.render("login");
  })
  // Login POST request handler
  .post(function(req, res) {
    const username = req.body.username;
    const password = req.body.password;
    // Query database using user email.
    User.findOne({
      email: username
    }, function(err, result) {
      if (!err) {
        if (result) {
          // compare password hashes using bcrypt
          bcrypt.compare(password, result.password, function(err, result) {
            if (!err) {
              if (result) {
                res.render("secrets");
                console.log("Login successful.");
              } else {
                res.render("login");
                console.log("Invalid password.");
              }
            } else {
              console.error(err);
            }
          });
        } else {
          res.render("login");
        }
      } else {
        res.render("login");
        console.error(err);
      }
    });
  });







app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
