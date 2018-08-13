var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');


// Routers.
var indexRouter = require('./routes/index');

// Initialize app.
var app = express();

//Set up mongoose connection.
var mongoose = require('mongoose');
var mongoDB = 'mongodb://127.0.0.1:27017/nucleotid';
mongoose.connect(mongoDB, { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Use middleware.
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Use routes.
app.use('/', indexRouter);

// Catch 404 and forward to error handler.
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler.
app.use(function(err, req, res, next) {
  // Set locals, only providing error in development.
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render the error page.
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
