var express = require('express');
var createError = require('http-errors');
var path = require('path');
// Logger
var logger = require('morgan');
// Auth
var session = require('express-session');
var passport = require('./auth/passport-cfg');

// Routers.
var indexRouter = require('./routes/index');

// Initialize app.
var app = express();

//Set up mongoose connection.
var mongoose = require('mongoose');
var mongoDB = 'mongodb://nucleotid:nucleotid1234@127.0.0.1:27017/nucleotid';
mongoose.connect(mongoDB, { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Use middleware.
app.use(logger('dev'));
//app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// TODO:
// Set up a session store.
app.use(session({secret: 'keyboard cat', resave: true, saveUninitialized: true}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

// Use routes.
app.use('/', require('./routes/index'));
app.use('/login', require('./routes/login'));


// Catch 404 and forward to error handler.
/*
app.use(function(req, res, next) {
  next(createError(404));
});
*/

// Error handler.
app.use(function(err, req, res, next) {
  // Set locals, only providing error in development.
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  console.log(err);
  // Render the error page.
  res.status(err.status || 500);
  //res.render('error');
});

module.exports = app;
