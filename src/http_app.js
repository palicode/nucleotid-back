// Server
var express = require('express');
// Logger
var logger = require('morgan');

// Initialize app.
var app = express();

// Use middleware.
app.use(logger('dev'));
app.use((req, res, next) => {
  if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect('https://' + req.get('host') + req.url);
  }
  return next();
});

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
