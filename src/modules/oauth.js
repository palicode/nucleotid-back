const crypto = require('crypto');
const uuid = require('uuid/v4');

var signature_key_access;
var signature_key_refresh;
var token_validity;
var minimum_validity;
var db;

// TODO: Add an option or a chron job to revoke all refresh tokens that haven't been used for X days.

module.exports.initialize = function initialize(options) {
  if (!options.key && (!options.access_key || !options.refresh_key)) {
    throw new Error("auth: Error initializing module -- 'key' option not defined.");
  }

  if (options.db === undefined) {
    throw new Error("auth: Error initializing module -- 'db' not defined.");
  }

  signature_key_access = options.access_key || options.key;
  signature_key_refresh = options.refresh_key || options.key;
  token_validity = options.max_validity || 35;
  minimum_validity = options.min_validity || 5;
  db = options.db;

  return authTokenMiddleware;
};


/*
** SESSION FUNCTIONS
*/

module.exports.newSession = (userId) => {
  
  return async (req, res, next) => {
    var refreshId = uuid();

    try {
      await db.none("INSERT INTO auth_session VALUES($1,$2,$3,$4);", [refreshId, userId, (new Date()).toISOString(), (new Date()).toISOString()]);
    } catch(err) {
      // TODO: Filter error, it may fail because refreshId is not unique (generate new uuid).
      res.status(500).end();
      return;
    }
    
    var tokens = {
      accessToken: newToken(userId, null, signature_key_access),
      refreshToken: newToken(userId, refreshId, signature_key_refresh)
    };

    res.status(200);
    res.json(tokens);
    return;
  };
  
};


module.exports.extendSession = () => {
  return async (req, res, next) => {
    // Check request header.
    var auth_header = req.header('Authentication');
    if (auth_header === undefined) {
      res.status(400);
      res.json({err: "Missing header"});
      return;
    }
    
    // Extract authorization token.
    var m = auth_header.split(' ');
    if (m[0] !== "Bearer") {
      res.status(400);
      res.json({err: "Invalid header"});
      return;
    }
    var token = m[1];

    // Validate token.
    var data = await validateRefreshToken(token);

    if (!data) {
      res.status(401);
      res.json({err: "Invalid token"});
      return;
    }

    var last_refresh = (new Date(data.refreshed)).getTime();
    if (last_refresh + minimum_validity*60000 > Date.now()) {
      res.status(400);
      res.json({err: "Minimum validity"});
      return;
    }

    var tokens = {
      accessToken: newToken(data.uid, null, signature_key_access)
    };

    // Update refreshed timestamp.
    try {
      await db.none("UPDATE auth_session SET refreshed=$1 WHERE tokenid=$2", [(new Date()).toISOString(), data.tokenid]);
    } catch (err) {
      res.status(500).end();
      return;
    }

    // Valid request, send new token.
    res.status(200);
    res.json(tokens);

    return;
  };
};


module.exports.logout = () => {
  return async (req,res,next) => {
    // Check request header.
    var auth_header = req.header('Authentication');
    if (auth_header === undefined) {
      res.status(400);
      res.json({err: "Missing header"});
      return;
    }
    
    // Extract authorization token.
    var m = auth_header.split(' ');
    if (m[0] !== "Bearer") {
      res.status(400);
      res.json({err: "Invalid header"});
      return;
    }
    var token = m[1];

    // Validate token.
    var data = await validateRefreshToken(token);

    if (!data) {
      res.status(401);
      res.json({err: "Invalid token"});
      return;
    }

    try {
      await db.none("DELETE FROM auth_session WHERE tokenid=$1", [data.tokenid]);
    } catch(err) {
      res.status(500);
      res.end();
    }

    res.status(200);
    res.end();
  };
};


module.exports.endSessions = () => {
  return async (req,res,next) => {

    // Check if user bears a valid token.
    if (!req.auth.validToken) {
      res.status(401);
      res.end();
    }

    // Then revoke all refresh tokens.
    try {
      await db.none("DELETE FROM auth_session WHERE userid=$1", [userId]);
    } catch(err) {
      throw err;
    }
  };
};


/*
** AUTHORIZATION MIDDLEWARE
*/

function authTokenMiddleware(req, res, next) {
  // Assume invalid token.
  req.auth = {
    validToken: false
  };
  
  // Check request header.
  var auth_header = req.header('Authentication');
  if (auth_header === undefined) {
    return next();
  }
  
  // Extract authorization token.
  var m = auth_header.split(' ');
  if (m[0] !== "Bearer") {
    return next();
  }
  var token64 = m[1];

  // Validate token.
  var token = validateAccessToken(token64);

  if (!token) {
    return next();
  }

  req.auth.validToken = true;
  req.auth.token = token;

  return next();
}


/*
** TOKEN FUNCTIONS
*/

function newToken(userId, tokenId, key) {
  // Create token parts.
  var headerobj = {
    "alg": "HS256",
    "typ": "JWT"
  };

  var dataobj = {uid: userId};
  if (tokenId) {
    dataobj.tokenid = tokenId;
  } else {
    dataobj.max_valid = Date.now() + token_validity*60000;
    dataobj.min_valid = Date.now() + minimum_validity*60000;
  };

  // Encode token parts.
  header = Buffer.from(JSON.stringify(headerobj),'base64');
  data = Buffer.from(JSON.stringify(dataobj),'base64');

  // Sign token.
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(header+"."+data);
  var signature = hmac.digest('base64');

  return header + "." + data + "." + signature;
}



function decodeToken(token) {
  // JWT must contain 3 parts separated by '.'
  var parts = token.split('.');
  if (parts != 3) {
    // Invalid token format.
    return null;
  }

  // Parse JSON object.
  try {
    var header = JSON.parse(Buffer.from(parts[0], 'base64').toString('ascii'));
    var data = JSON.parse(Buffer.from(parts[1], 'base64').toString('ascii'));
  } catch(err) {
    // Invalid syntax.
    return null;
  }

  return {
    header: header,
    payload: data,
    signature: parts[2]
  };
}


function validateAccessToken(token64) {
  // Decode token.
  token = decodeToken(token64);
  if (!token) {
    return null;
  }
  
  // Check algorithm and token type.
  // Supported are 'typ': "JWT" and 'alg': "HS256"
  if (token.header.typ !== "JWT" || token.header.alg !== "HS256") {
    return null;
  }

  // Check expiration date.
  if (token.payload.valid === undefined) {
    return null;
  }
  if (Date.now() > (new Date(parseInt(token.payload.valid,10))).getTime()) {
    // Token has expired.
    return null;
  }

  // Check signature.
  var m = token64.split('.');
  const hmac = crypto.createHmac('sha256', signature_key_access);
  hmac.update(m[0]+"."+m[1]);

  var computed_signature = hmac.digest('base64');
  var bearer_signature = Buffer.from(token.signature, 'base64');
 
  if (crypto.timingSafeEqual(computed_signature, bearer_signature)) {
    return token;
  } else {
    return null;
  }
}


async function validateRefreshToken(token64) {
  // Decode token.
  token = decodeToken(token64);
  if (!token) {
    return null;
  }
  
  // Check algorithm and token type.
  // Supported are 'typ': "JWT" and 'alg': "HS256"
  if (token.header.typ !== "JWT" || token.header.alg !== "HS256") {
    return null;
  }

  // Check payload info.
  if (token.payload.tokenid === undefined || token.payload.uid === undefined) {
    return null;
  }

  // Check signature.
  var m = token64.split('.');
  const hmac = crypto.createHmac('sha256', signature_key_refresh);
  hmac.update(m[0]+"."+m[1]);

  var computed_signature = hmac.digest('base64');
  var bearer_signature = Buffer.from(token.signature, 'base64');
 
  if (!crypto.timingSafeEqual(computed_signature, bearer_signature)) {
    return null;
  }

  // Now check if token is still valid.
  try {
    var data = await db.oneOrNone("SELECT * FROM auth_session WHERE tokenid=$1", [token.payload.tokenid]);
  } catch (err) {
    throw err;
  }

  var uid = parseInt(token.payload.uid, 10);
  if (!data || data.uid != uid) {
    return null;
  }

  return data;
}
