var router = require('express').Router();

// GET homepage
router.get('/', (req, res, next) => {
  if (req.isAuthenticated()) {
    res.send('<img src="'+req.user.photos[0].value +'"></img>Welcome to nucleotid, '+req.user.displayName+'!');
    console.log('Access by authenticated user');
    console.log(req.user);
  } else {
    res.send('Welcome to nucletoid! Please, <a href="/login">login</a>.');
  }
});

module.exports = router;
