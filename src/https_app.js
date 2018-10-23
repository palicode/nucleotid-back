var express     = require('express');
var createError = require('http-errors');
var path        = require('path');
var morgan      = require('morgan');
var log         = require('./modules/logger').logmodule(module);
var psql        = require('./modules/db');
var passport    = require('./modules/passport');
var oauth       = require('./modules/oauth');
var cors        = require('./modules/cors');
var mailer      = require('./modules/mailer');
var config      = require('../config.js')[process.env.NODE_ENV || "dev"];

// Routers
var indexRouter = require('./routes/index');

// Configure CORS.
var cors_options = {
  origins: config.cors_origins,
  methods: ["GET"],
  headers: ["Authentication"]
};
log.info('initialize CORS: ', cors_options);
cors.defaults(cors_options);

// Initialize mailer.
log.info('initialize mailer module with address: ' + process.env.NUCLEOTID_MAILER_ADDRESS);
mailer.initialize({email: process.env.NUCLEOTID_MAILER_ADDRESS,
		   password: process.env.NUCLEOTID_MAILER_PASSWORD});

// Initialize app.
log.info(`initialize express`);
var app = express();
// Set middleware.
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(oauth.initialize({key: process.env.NUCLEOTID_OAUTH_SIGNATURE_SECRET || 'AuthSignatureSecret'}));
app.use(passport.initialize());
app.use(express.static(path.join(__dirname, 'public')));

// Use routes.
log.info('use route: /user');
app.use('/user', require('./routes/user'));
log.info('use route: /auth');
app.use('/auth', require('./routes/auth'));

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
