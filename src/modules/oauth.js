const crypto = require('crypto');
const uuid = require('uuid/v4');
const log  = require('./logger').logmodule(module);
const psql = require('./db');

var signature_key_access;
var signature_key_refresh;
var token_validity;
var minimum_validity;
var db = psql.db;

/* TODO:
** - Add an option or a chron job to revoke all refresh tokens that haven't been confirmed for X days.
*/   

module.exports.initialize = function initialize(options) {
  if (!options.key && (!options.access_key || !options.refresh_key)) {
    throw new Error("auth: Error initializing module -- 'key' option not defined.");
  }

  signature_key_access = options.access_key || options.key;
  signature_key_refresh = options.refresh_key || options.key;
  token_validity = options.max_validity || 35;
  minimum_validity = options.min_validity || 5;

  return authValidation;
};


/*
** SESSION FUNCTIONS
*/

module.exports.newSession = (userId) => {
  
  return async (req, res, next) => {
    
    // generateRefreshId
    // Generates a unique UUIDv4 to identify the refresh token.
    var refreshId = uuid();
    log.info(`newSession(generateRefreshId) new refresh uuid: ${refreshId}`);

    // registerRefreshToken
    // Inserts the refresh token id in auth_session.
    var timestamp = new Date();
    try {
      await db.none("INSERT INTO $1~ VALUES($2,$3,$4,$5);",
		    [psql.table_auth_session,
		     refreshId,
		     userId,
		     timestamp.toISOString(),
		     timestamp.toISOString()]
		   );
    } catch(err) {
      log.error(`newSession(registerRefreshToken) 500 - database error: ${err}`);
      return res.status(500).end();
    }
    log.info(`newSession(registerRefreshToken) token registered successfully`);

    // generateAuthTokens
    // Creates a new pair of valid tokens for authorization and refresh.
    var tokens = {
      accessToken: newToken(userId, refreshId, signature_key_access, timestamp.getTime()),
      refreshToken: newToken(userId, refreshId, signature_key_refresh)
    };

    log.log('debug', `newSession(generateAuthTokens) accessToken: ${tokens.accessToken}`);
    log.log('debug', `newSession(generateAuthTokens) refreshToken: ${tokens.refreshToken}`);

    // Status 200
    log.info(`newSession() 200`);
    return res.status(200).json(tokens);
  };
  
};


module.exports.extendSession = () => {
  return async (req, res, next) => {

    // checkAuthHeader
    // Check Authorization header.
    var auth_header = req.header('Authentication');
    if (auth_header === undefined) {
      let e = {error: "authentication header not present"};
      log.info(`extendSession(checkAuthHeader) 401 - ${e.error}`);
      return res.status(401).json(e);
    }

    // authProtocol
    // Gets the authentication protocol from the header.
    var m = auth_header.split(' ');
    if (m[0] !== "Bearer") {
      let e = {error: "authentication protocol not supported"};
      log.info(`extendSession(authProtocol) 400 - ${e.error}`);
      return res.status(400).json(e);
    }

    // validateToken
    // Checks the validity of the authentication token.
    var token = m[1];
    log.log('debug', `extendSession(validateToken) token: ${token}`);

    try {
      var session = await validateRefreshToken(token);
    } catch (err) {
      log.error(`extendSession(validateRefreshToken) 500 - database error: ${err}`);
      return res.status(500).end();
    }
    
    if (session.error) {
      log.info(`extendSession(validateToken) 400 - ${session.error}`);
      return res.status(400).json(session.error);
    }

    // tokenMinValidity
    // Checks period since last session extension.
    var last_refresh = (new Date(session.refreshed)).getTime();
    if (last_refresh + minimum_validity*60000 > Date.now()) {
      log.info(`extendSession(tokenMinValidity) 400 - last refresh ${last_refresh} (min valid ${mininum_validity}')`);
      return res.status(400).json({error: "refresh token minimum validity"});
    }

    // updateSession
    // Update session timestamp.
    var timestamp = new Date();
    try {
      await db.none("UPDATE $1~ SET refreshed=$2 WHERE tokenid=$3",
		    [psql.table_auth_session,
		     timestamp.toISOString(),
		     session.tokenid]);
    } catch (err) {
      log.error(`extendSession(updateSession) 500 - database error: ${err}`);
      return res.status(500).end();
    }

    // generateAccessToken
    // Creates a valid access token.
    var tokens = {
      accessToken: newToken(session.userid, session.tokenid, signature_key_access, timestamp.getTime())
    };
    log.log('debug', `extendSession(generateAccessToken) accessToken: ${tokens.accessToken}`);

    // Status 200
    log.info(`extendSession() 200`);
    return res.status(200).json(tokens);
  };
};


module.exports.logout = () => {
  return async (req,res,next) => {
    // logout
    // Revokes the refreshToken associated with the current accessToken.

    // checkAuthentication
    // Authentication with access token is enough to logout.
    if (!req.auth.valid) {
      let e = {error: "not authenticated"};
      log.info(`logout(checkAuthentication) 401 - ${e.error}`);
      return res.status(401).json(e);
    }

    // revokeSession
    // Deletes the session record from the database. This revokes the refresh token.
    try {
      var uuids = await db.manyOrNone("DELETE FROM $1~\
                                       WHERE userid=$2\
                                       AND tokenid LIKE $3 || '%'\
                                       RETURNING tokenid",
				      [psql.table_auth_session,
				       req.auth.userid,
				       req.auth.token.payload.tokenid]
				     );
    } catch(err) {
      log.error(`logout(revokeSession) 500 - database error: ${err}`);
      return res.status(500).end();
    }

    if (!uuids) {
      let e = {error: "session does not exist"};
      log.info(`logout(revokeSession) 400 - ${e.error}`);
      return res.status(400).json(e);
    }

    uuids.forEach((uuid) => log.info(`logout(revokeSession) revoked session: ${uuid}`));

    // status 200
    log.info('logout() 200');
    return res.status(200).end();
  };
};


module.exports.endSessions = () => {
  return async (req,res,next) => {
    // checkAuthentication
    // Authentication with access token is enough to end all sessions.
    if (!req.auth.valid) {
      let e = {error: "not authenticated"};
      log.info(`endSessions(checkAuthentication) 401 - ${e.error}`);
      return res.status(401).json(e);
    }

    // revokeAllSessions
    // Deletes all session records for userid from the database.
    try {
      await db.none("DELETE FROM $1~\
                     WHERE userid=$1",
		    [psql.table_auth_session,
		     req.auth.userid]
		   );
    } catch(err) {
      log.error(`endSessions(revokeAllSessions) 500 - database error: ${err}`);
      return res.status(500).end();
    }

    log.info(`endSessions(revokeAllSession) revoked all sessions for userid: ${req.auth.userid}`);

    // status 200
    log.info('endSessions() 200');
    return res.status(200).end();
  };
};


/*
** AUTHORIZATION MIDDLEWARE
*/

function authValidation(req, res, next) {

  // checkAuthHeader
  // Check Authorization header.
  var auth_header = req.header('Authentication');
  if (auth_header === undefined) {
  log.info('authValidation() next (auth: false)');
    // Register auth data in request.
    req.auth = {valid: false};
    return next();
  }

  // authProtocol
  // Gets the authentication protocol from the header.
  var m = auth_header.split(' ');
  if (m[0] !== "Bearer") {
    let e = {error: "authentication protocol not supported"};
    log.info(`authValidation(authProtocol) 400 - ${e.error}`);
    return res.status(400).json(e);
  }

  // validateToken
  // Checks the validity of the authentication token.
  var token64 = m[1];
  log.log('debug', `authValidation(validateToken) token: ${token}`);

  var token = validateAccessToken(token64);

  if (token.error) {
    log.info(`authValidation(validateToken) 400 - ${token.error}`);
    return res.status(400).json(token.error);
  }

  // Register auth data in request.
  req.auth = {
    valid: true,
    token: token,
    userid: token.payload.uid
  };

  // Next middleware.
  log.info('authValidation() next (auth: true)');
  return next();
}


/*
** TOKEN FUNCTIONS
*/

function newToken(userId, tokenId, key, time_ms) {
  // Create token parts.
  var headerobj = {
    "alg": "HS256",
    "typ": "JWT"
  };

  var dataobj = {uid: userId};
  if (!time_ms) {
    // This is a refresh token.
    dataobj.tokenid = tokenId;
  } else {
    // This is an access token.
    dataobj.tokenid   = tokenId.split('-')[0];
    dataobj.max_valid = time_ms + token_validity*60000;
    dataobj.min_valid = time_ms + minimum_validity*60000;
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

function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

function validateAccessToken(token64) {
  // Decode token.
  token = decodeToken(token64);
  if (!token) {
    return {"error":"invalid auth token format"};
  }
  
  // Check algorithm and token type.
  // Supported are 'typ': "JWT" and 'alg': "HS256"
  if (token.header.typ !== "JWT" || token.header.alg !== "HS256") {
    return {"error": "auth token type or algorithm not supported"};
  }

  // Check expiration date.
  var validDate = new Date(parseInt(token.payload.max_valid,10));
  if (!isValidDate(validDate)) {
    return {"error": "invalid auth token date format"};
  }
  
  if (Date.now() > validDate.getTime()) {
    return {"error": "auth token expired"};
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
    return {"error":"invalid auth token signature"};
  }
}


async function validateRefreshToken(token64) {
  // Decode token.
  token = decodeToken(token64);
  if (!token) {
    return {"error":"invalid refresh token format"};
  }
  
  // Check algorithm and token type.
  // Supported are 'typ': "JWT" and 'alg': "HS256"
  if (token.header.typ !== "JWT" || token.header.alg !== "HS256") {
    return {"error": "refresh token type or algorithm not supported"};
  }

  // Check payload info.
  if (token.payload.tokenid === undefined || token.payload.uid === undefined) {
    return {"error":"invalid refresh token format"};
  }

  // Check signature.
  var m = token64.split('.');
  const hmac = crypto.createHmac('sha256', signature_key_refresh);
  hmac.update(m[0]+"."+m[1]);

  var computed_signature = hmac.digest('base64');
  var bearer_signature = Buffer.from(token.signature, 'base64');
 
  if (!crypto.timingSafeEqual(computed_signature, bearer_signature)) {
     return {"error":"invalid refresh token signature"};
  }

  // Check if token session is still valid.
  try {
    var data = await db.oneOrNone("SELECT * FROM $1~ WHERE tokenid=$2",
				  [psql.table_auth_session,
				   token.payload.tokenid]
				 );
  } catch (err) {
    throw err;
  }

  if (!data) {
    return {"error":"refresh token expired or revoked"};
  }

  var uid = parseInt(token.payload.uid, 10);
  if (data.userid != uid) {
    return {"error":"refresh token expired or revoked"};
  }

  return data;
}
