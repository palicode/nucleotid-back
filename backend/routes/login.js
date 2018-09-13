var router = require('express').Router();
var passport = require('passport');
var path = require('path');

router.get('/', (req, res, next) => {
  if (req.isAuthenticated()) {
    res.redirect('/');
  } else {
    res.sendFile(path.resolve('backend/static_views/login.html'), (err) => {
      if (err) {
	console.log('error sending file: ' + err);
	next(err);
      } else {
	console.log('sent file.');
      }
    });
  }
});

router.get('/google', passport.authenticate('google', {scope: ['email']}));

router.get('/google/return',
	   // Mw1: if authentication failed, redirect back to /login.
	   passport.authenticate('google', {failureRedirect: '/login'}),
	   // Mw2: Otherwise redirect to home.
	   (req, res) => {
	     res.redirect('/');
	   }
	  );


module.exports = router;
