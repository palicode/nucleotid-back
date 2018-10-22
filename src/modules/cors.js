const log = require('./logger').logmodule(module);
var def_origins;
var def_methods;
var def_headers;
var preflight_max_age = 2592000; // 30 days.

var method_names = ["GET", "HEAD", "POST", "PUT", "DELETE", "CONNECT", "OPTIONS", "TRACE", "PATCH"];

module.exports.defaults = (options) => {

  // Check variable types.
  if (options.origins && options.origins.constructor !== Array) {
    throw new Error("CORS: Error in options - 'origins' must be an array of strings");
  }

  if (options.methods && options.methods.constructor !== Array) {
    throw new Error("CORS: Error in options - 'methods' must be an array of strings");
  }

  if (options.headers && options.headers.constructor !== Array) {
    throw new Error("CORS: Error in options - 'headers' must be an array of strings");
  }

  if (options.preflight_max_age && options.preflight_max_age.constructor !== Number) {
    throw new Error("CORS: Error in options - 'preflight_max_age' must be numeric");
  }

  // Set origins.
  def_origins = options.origins;
  // Set options.methods.
  if (!options.methods || options.methods.length == 0) def_methods = ["GET","POST"];
  else {
    for(var i=0; i < options.methods.length; i++) {
      if (method_names.indexOf(options.methods[i]) === -1) {
	throw new Error("CORS: Incorrect HTTP method: "+options.methods[i]);
      }
    }
    def_methods = options.methods;
  }
  // Set headers.
  def_headers = options.headers;
  // Set preflight cache.
  if (options.preflight_max_age) preflight_max_age = options.preflight_max_age;
};

module.exports.cors = (options) => {
  // Set origins.
  var origins = options && options.origins;
  if (origins && origins.constructor !== Array) origins = new Array(origins);
  if (!origins) origins = def_origins;
  // Set methods.
  var methods = options && options.methods;
  if (methods && methods.constructor !== Array) methods = new Array(methods);
  if (!methods) methods = def_methods;
  else {
    // Filter non-valid methods.
    methods = methods.filter(method => {return method_names.indexOf(method) !== -1;});
  }
  // Set headers.
  var headers = options && options.headers;
  if (headers && headers.constructor !== Array) headers = new Array(headers);
  if (!headers) headers = def_headers;
  
  return (req, res, next) => {
    // Check origins.
    var origin_header = req.header('Origin');
    // Assume that missing Origin header means same-origin.
    if (origin_header && origins) {
      if (origins.indexOf(origin_header) === -1) {
	
	res.status(403); // Forbidden
	return res.end();
      }
    }
    // Create allow-origin header.
    res.set('Access-Control-Allow-Origin', origins ? origin_header : '*');

    // Respond PREFLIGHT request.
    if (req.method === "OPTIONS") {
      res.set('Access-Control-Allow-Methods', methods.join(', '));
      res.set('Access-Control-Max-Age', preflight_max_age.toString());
      if (headers) res.set('Access-Control-Allow-Headers', headers.join(', '));
      res.status(200);
      return res.end();
    }
    // Check if requested method is allowed.
    if (methods.indexOf(req.method) === -1) {
      res.status(405); // Method not allowed.
      return res.end();
    }
      
    // Call next.
    return next();
  };
};
