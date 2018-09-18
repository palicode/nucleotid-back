var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var db = require('../modules/db');
var users = require('../models/user');

// Configure Google OAUTH 2.0.
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_OAUTH_CLIENTID,
      clientSecret: process.env.GOOGLE_OAUTH_SECRET,
      callbackURL: 'http://nucleotid-dev.com:3000/login/google/return'
    },
    // Google login routine.
    async function(accessToken, refreshToken, profile, cb) {
      try {
	// Find user by Google ID.
	var user = await users.findByGoogleId(profile.id);
	if (!user) {
	  console.log('Google ID not found.');
	  // Try to find user by e-mail.
	  user = await users.findByEmail(users.emailFromGoogleProfile(profile));

	  // User does not exist -> create it.
	  if (!user) {
	    var userinfo = users.userFromGoogleProfile(profile);
	    console.log('User not found, creating user.');
	    user = await users.newUser(userinfo);
	    // Log new user in (e-mail is verified).
	    return cb(null, user);
	  }
	  
	  // First Google login -> activate Google.
	  console.log('Web user exists, activating google profile.');
	  await user.activateGoogleProfile(user.id, profile);
	}
	console.log('Google id found! Logging in!');
	// User found -> log user in.
	return cb(null, user);
      } catch (e) {
	console.log(e);
      }
    }
  )
);

// TODO:
// This serializes the user information across HTTP requests, to
// maintain a persisten authentication. In production, only the
// minimal user information (like user id) should be serialized.
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

// TODO:
// Once the user reaches the next HTTP page, the user info is
// deserialized as described here. In production here we must
// check the data base if the deserialized user ID exists and
// return error otherwise.
passport.deserializeUser(function(obj, cb){
  cb(null, obj);
});

module.exports = passport; 
