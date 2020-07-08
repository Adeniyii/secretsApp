//jshint esversion:6

require("dotenv").config();
const ejs = require('ejs');
const express = require("express");
const passport = require('passport');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const findOrCreate = require('mongoose-findorcreate');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;


// connect to database
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set('useCreateIndex', true);

const app = express();
const secret = process.env.SECRET;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));
// init express-session
app.use(session({
  secret: secret,
  resave: false,
  saveUninitialized: false
}));
// init passport
app.use(passport.initialize());
app.use(passport.session());



// create user schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String
});
// add passportLocalMongoose plugin to schema
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = mongoose.model("User", userSchema);

// create authentication strategy for user.
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


// ================================== BODY ==================================

// CHAINED requests for home route
app.route("/")
  .get(function(req, res) {
    res.render("home");
  });


// Authenticate user on google's server
// Ask for user's profile once logged in
app.get("/auth/google", passport.authenticate("google", {scope: ["profile"]}));


//
app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication redirect
    res.redirect('/secrets');
  });

// CHAINED requests for secrets route
app.route("/secrets")
  .get(function(req, res) {
    if (req.isAuthenticated()) {
      res.render("secrets");
    } else {
      res.redirect("/login");
    }
  });

// CHAINED requests for register route
app.route("/register")
  .get(function(req, res) {
    res.render("register");
  })
  .post(function(req, res) {
    User.register({username: req.body.username}, req.body.password, function(err, user) {
      if (err) {
        console.error(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function(err){
          res.redirect("/secrets");
        });
      }
    });
  });


// CHAINED requests for login route
app.route("/login")
  .get(function(req, res) {
    res.render("login");
  })
  .post(function(req, res) {
    newUser = new User({
      username: req.body.username,
      password: req.body.password
    });
    req.login(newUser, function(err) {
      if (err) {
        console.error(err);
        res.redirect("/login");
      } else {
        passport.authenticate("local")(req, res, function(err) {
          if (err) {
            console.error(err);
            res.redirect("/login");
          } else {
            res.redirect("/secrets");
          }
        });
      }
    });
  });

// CHAINED requests for logout route
app.route("/logout")
  .get(function(req, res) {
    if (req.isAuthenticated()) {
      req.logout();
      res.redirect("/");
    } else {
      res.redirect("/");
    }
  });


app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
