var router = require('express').Router();

// GET homepage
router.get('/', (req, res, next) => {
  if (req.isAuthenticated()) {
    res.send('<img src="'+req.user._data.photo +'"></img>Welcome to nucleotid, '+req.user._data.given_name+'!');
    console.log('Access by authenticated user');
    console.log(req.user);
  } else {
    res.send('Welcome to nucletoid! Please, <a href="/login">login</a>.');
  }
});

module.exports = router;
