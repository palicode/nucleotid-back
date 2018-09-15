var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var User = require('../models/user');

// Configure Google OAUTH 2.0.
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_OAUTH_ID,
      clientSecret: process.env.GOOGLE_OAUTH_SECRET,
      callbackURL: 'http://127.0.0.1:3000/login/google/return'
    },
    function(accessToken, refreshToken, profile, cb) {
      // Find user by google ID.
      User.findOne(
	{"type.google.providerId": profile.id},
	(err, guser) => {
	  // Query error, propagate err through callback.
	  if (err) {
	    console.log('error findOne(googleID)');
	    return cb(err);
	  }
	  if (!guser) {
	    console.log('google userID not found in database');
	    // Google user not yet in DB: merge web user or create new.
	    // Get google e-mail.
	    var email = null;
	    for (var i = 0; i < profile.emails.length; i++) {
	      if (profile.emails[i].type == "account") {
		email = profile.emails[i].value;
		break;
	      }
	    }
	    console.log('find web user by email:' + email);
	    // Search google email in database.
	    User.findOne(
	      {email: email},
	      function (err, wuser) {
		// Query error, propagate through cb.
		if (err) {
		  console.log('error findOne(email)');
		  return cb(err);
		}
		if (!wuser) {
		  // email not found: create new user.
		  // Create user from google profile info.
		  // TODO: Sanitize this.
		  // TODO: function: userFromGoogleProfile
		  var newuser = userFromGoogleProfile(profile);
		  newuser.accessToken = accessToken;
		  // Store user in DB.
		  newuser.save((err) => {
		    if (err) {
		      console.log('error save(newuser)');
		      return cb(err);
		    }
		    console.log('new user created');
		    return cb(null, newuser);
		  });
		  
		} else {
		  console.log('user found but not using google oauth');
		  // email found: enable google login.
		  wuser.type.google.active = true;
		  wuser.type.google.providerId = profile.id;
		  wuser.type.google.accessToken = accessToken;
		  wuser.save((err) => {
		    if (err) {
		      console.log('error save(wuser) -- update wuser');
		      return cb(err);
		    }
		    console.log('user updated, now using google oauth');
		    return cb(null, wuser);
		  });
	      }
	      });
	  } else {
	    // Google user found: complete login.
	    console.log('google user found');
	    return cb(null, guser);
	  }
	}
      );
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

  function userFromGoogleProfile(profile) {
    // Get account e-mail.
    var email = null;
    for (var i = 0; i < profile.emails.length; i++) {
      if (profile.emails[i].type == "account") {
	email = profile.emails[i].value;
	break;
      }
    }

    // Fill user fields with profile data.
    var userobj = {
      givenName: profile.name.givenName,
      familyName: profile.name.familyName,
      email: email,
      type: {
	web: {
	  active: false
	},
	google: {
	  active: true,
	  providerId: profile.id,
	  accessToken: null
	}
      },
      birthdate: profile["birthday"],
      photo: profile["photos"] ? profile["photos"][0]["value"] : null,
      verified: true,
      creationDate: Date.now()
    };

    // Return new User object.
    return new User(userobj);
  }


module.exports = passport; 
