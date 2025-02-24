//jshint esversion:6
const dotenv=require("dotenv");
dotenv.config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose"); 
const session = require('express-session');
const passport  =require("passport");
const passportLocalMongoose= require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
    secret:"this is little serect.",
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB" ,{useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate); 

const User = mongoose.model("User", userSchema);



passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  
 done(null, user.id);
 
});

passport.deserializeUser(function(id, done) {
 User.findById(id,function(err,user){
    done(err,user);
 });
});


passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:2000/auth/google/secret", 
  userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));



app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }));

  app.get("/auth/google/secret", 
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/secrets');
    });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/logout", (req,res)=>{
    req.logout;
    res.redirect("/");
  
})

app.get("/secrets", function(req,res){
    if(req.isAuthenticated()){
      res.render("secrets");  
    }else{
      res.render("/login")
    }
});

app.get("/submit", (req,res)=>{
  if(req.isAuthenticated()){
    res.render("submit");  
  }else{
    res.render("/login")
  }
})

app.post("/register", function(req, res){ 
   User.register({username: req.body.username}, req.body.password, function(err, user){
      if(err){
        console.log(err);
        res.redirect("/register");
      }else{
        passport.authenticate("local")(req,res ,()=>{
          res.redirect("/secrets") 
        })
      }
   })
});

app.post("/login", function(req, res){
      const user = new User({
        username: req.body.username,
        password: req.body.password
      })

      req.login(user, function(err){
        if(err){
          console.log(err);
        }else{
          passport.authenticate("local")(req,res,()=>{
            res.redirect("secrets");
          });
        }
      });
});

app.listen(2000, function() {
  console.log("Server started on port 2000.");
});
