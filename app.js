//jshint esversion:6

require("dotenv").config();
const ejs = require("ejs");
const express = require("express");
const passport = require("passport");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const findOrCreate = require("mongoose-findorcreate");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;

// init express
const app = express();

// connect to database
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.set("useCreateIndex", true);

// configure dependencies
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));

// configure sessions
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

// init and configure passport
app.use(passport.initialize());
app.use(passport.session());

// create user schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  facebookId: String
});

// plugin passportLocalMongoose to schema
userSchema.plugin(passportLocalMongoose);

// plugin findOrCreate method to schema
userSchema.plugin(findOrCreate);

// create user model/collection
const User = mongoose.model("User", userSchema);

// initialize local strategy.
passport.use(User.createStrategy());

// serialize user id to session
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

// deserialize user id from session query for a user using id.
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// Google strategy configuration
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    profileFields: ["id", "email", "displayName"]
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id, username: profile._json.email },
      function (err, user) {
        return cb(err, user);
    });
  }
));

// Facebook strategy configuration
passport.use(new FacebookStrategy({
  clientID: process.env.APP_ID,
  clientSecret: process.env.APP_SECRET,
  callbackURL: "/auth/facebook/secrets",
  profileFields: ["id", "email", "displayName"]
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ facebookId: profile.id, username: profile._json.email },
    function(err, user) {
      return cb(err, user);
  });
}));

// ================================== BODY ==================================//

// Home route.
app.route("/")
  .get(function(req, res) {
    res.render("home");
  });

// Authenticate user using google.
app.get("/auth/google",
  passport.authenticate("google", {scope: ["profile", "email"]}));

// Collect response from google and authenticate user on our server.
app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
  });

// Authenticate user using facebook.
app.get("/auth/facebook",
  passport.authenticate("facebook", {scope: "email"}));

// Collect response from facebook and authenticate user on our server.
app.get("/auth/facebook/secrets",
  passport.authenticate("facebook", {failureRedirect: "/login"}),
  function(req, res) {
    res.redirect("/secrets");
  });

// Secrets route.
app.route("/secrets")
  .get(function(req, res) {
    if (req.isAuthenticated()) {
      res.render("secrets");
    } else {
      res.redirect("/login");
    }
  });

// Register route.
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

// Login route.
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

// Logout route.
app.route("/logout")
  .get(function(req, res) {
    if (req.isAuthenticated()) {
      req.logout();
      res.redirect("/");
    } else {
      res.redirect("/");
    }
  });

// Connect to server
app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
