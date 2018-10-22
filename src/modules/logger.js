const winston = require('winston');
/* log levels
  error: 0, 
  warn: 1, 
  info: 2, 
  verbose: 3, 
  debug: 4, 
  silly: 5 
*/

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log` 
    // - Write all logs error (and below) to `error.log`.
    //
    new winston.transports.File({ filename: '../../logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: '../../logs/combined.log' })
  ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
// 
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports.logmodule = function (module) {
  var filename = module.id.split('src/');
  filename = filename[filename.length-1];
  if (filename == '.') filename = 'node';
  return {
    info : function (msg, ...args) { 
      logger.info(filename + ': ' + msg, ...args); 
    },
    warn : function (msg, ...args) {
      logger.warn(filename + ': ' + msg, ...args);
    },
    error : function (msg, ...args) {
      logger.error(filename + ': ' + msg, ...args);
    },
    log : function (level, msg, ...args) {
      logger.log(level, filename + ': ' + msg, ...args);
    }
  };
};

module.exports.logger = logger;
