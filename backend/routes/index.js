var express = require('express');
var router = express.Router();


// GET homepage
router.get('/', (req,res,next) => {
  res.send('Welcome to nucleotid');
});

module.exports = router;
