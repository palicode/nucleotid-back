// Server
var express = require('express');
var createError = require('http-errors');
var path = require('path');
// Logger
var logger = require('morgan');
// Database
var db = require('./modules/db');
// Auth
//var session = require('express-session');
var passport = require('./modules/passport');
var auth = require('./modules/auth');
// Routers.
var indexRouter = require('./routes/index');

// Initialize app.
var app = express();

// Use middleware.
app.use(logger('dev'));
//app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// TODO:
// Set up a session store.
//app.use(session({secret: 'keyboard cat', resave: true, saveUninitialized: true}));
app.use(auth.initialize({key: 'TokenSignatureKey', db: db}));

app.use(passport.initialize());
//app.use(passport.session());
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
