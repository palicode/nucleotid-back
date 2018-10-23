var router = require('express').Router();
var passport = require('passport');
var path = require('path');

router.get('/', (req, res, next) => {
  if (req.isAuthenticated()) {
    res.redirect('/');
  } else {
    res.sendFile(path.resolve('src/static_views/login.html'), (err) => {
      if (err) {
	console.log('error sending file: ' + err);
	return next(err);
      } else {
	console.log('sent file.');
      }
    });
  }
});

router.post('/', passport.authenticate('local', {failureRedirect: '/login'}),
	   // If login suceeds this code will be executed -> Redirect to home.
	    (req, res) => {
	      res.redirect('/');
	    }
	   );

router.get('/google', passport.authenticate('google', {scope: ['email']}));

router.get('/google/return', passport.authenticate('google', {failureRedirect: '/login'}),
	   // If login suceeds this code will be executed -> Redirect to home.
	   (req, res) => {
	     // API login, register auth and refresh tokens.
	     res.redirect('/');
	   }
	  );


module.exports = router;
