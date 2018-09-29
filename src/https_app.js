// Server
var express = require('express');
var createError = require('http-errors');
var path = require('path');
// Logger
var logger = require('morgan');
// Database
var psql = require('./modules/db');
// Auth
//var session = require('express-session');
var passport = require('./modules/passport');
var auth = require('./modules/auth');
// Routers.
var indexRouter = require('./routes/index');
// Cross Origin Resourse Sharing
var cors = require('./modules/cors');
cors.defaults({
  origins: ["https://www.nucleotid.com", "https://nucleotid.com", "https://nucleotid-dev.com"],
  methods: ["GET"],
  headers: ["Authentication"]
});

// Initialize DB. (TODO: Disable in production)
psql.createDBTables();
auth.createDBTables(psql.db);

// Initialize app.
var app = express();

// Use middleware.
app.use(logger('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(auth.initialize({key: 'TokenSignatureKey', db: psql.db}));
app.use(passport.initialize());
app.use(express.static(path.join(__dirname, 'public')));

// Use routes.

// This route will be deleted when the app has a working react frontend.
app.use('/', require('./routes/index'));
// End of delete.
app.use('/auth', require('./routes/auth'));
app.use('/notebook', require('./routes/notebook'));

/*
app.use('/user', require('./routes/user'));
app.use('/protocol', require('./routes/protocol'));
app.use('/dataset', require('./routes/dataset'));
app.use('/notebook', require('./routes/notebook'));
app.use('/pipeline', require('./routes/pipeline'));
*/

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
