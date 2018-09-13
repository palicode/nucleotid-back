var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth20').Strategy;


// Configure Google OAUTH 2.0.
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_OAUTH_ID,
      clientSecret: process.env.GOOGLE_OAUTH_SECRET,
      callbackURL: 'http://127.0.0.1:3000/login/google/return'
    },
    function(accessToken, refreshToken, profile, cb) {
      // TODO:
      // Here one must implement a function to check the database
      // if the profiled user exists in the database, log it in, so
      // return cb(null, profile), if it does not exist, register it
      // in the database, in case of error, return cb(err, null);
      /*
	User.findOrCreate(
	  { googleId: profile.id }, 
          function (err, user) {
	    return cb(err, user);
	  }
	);
      */

      // Now we assume no error and direct authentication.
      return cb(null, profile);
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
