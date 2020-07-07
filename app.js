//jshint esversion:6

const express = require("express");
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));


mongoose.connect("mongodb://localhost:27017/userDB",
{
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

const secret = "thisisourlittlesecret";

userSchema.plugin(encrypt, {
  secret: secret, encryptedFields: ['password']
});


const User = mongoose.model("User", userSchema);


// CHAINED requests for home route
app.route("/")
  .get(function(req, res) {
    res.render("home");
  });


app.route("/login")
  // Login GET request handler
  .get(function(req, res) {
    res.render("login");
  })
  // Login POST request handler
  .post(function(req, res) {
    User.findOne({
      email: req.body.username
    }, function(err, result) {
      if (!err) {
        if (result) {
          if (result.password === req.body.password) {
            console.log("Login successful");
            res.render("secrets");
          } else {
            res.render("login");
            console.log("Invalid password, please try again");
          }
        } else {
          res.render("login");
          console.log("No user matches the provided email, check for typos or head to the registration page");
        }
      } else {
        res.render("login");
        console.error(err);
      }
    });
  });


app.route("/register")
  // Register GET request handler
  .get(function(req, res) {
    res.render("register");
  })
  // Register POST request handler
  .post(function(req, res) {
    // Create new user
    const newUser = new User({
      email: req.body.username,
      password: req.body.password
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




app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
