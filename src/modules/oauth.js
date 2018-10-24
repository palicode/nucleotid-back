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

// newSession
// Creates a new session. Registers a refresh token and returns both refresh and access tokens.
module.exports.newSession =  async (req, res, next) => {
  // Get user identifier from request body.
  var userId = req.user.id;
  
  // createSession
  //  refresh token id in auth_session.
  try {
    var session = await db.one(`INSERT INTO $1~(userid)
			        VALUES($2)
                                RETURNING tokenid,issued;`,
			       [psql.table_auth_session,
				userId]
			      );
  } catch(err) {
    log.error(`newSession(createSession) 500 - database error: ${err}`);
    return res.status(500).end();
  }
  log.info(`newSession(createSession) token registered successfully`);
  log.log('debug',`newSession(createSession) token: ${session.tokenid} (issued ${session.issued})`);

  // generateTokens
  // Creates a new pair of valid tokens for authorization and refresh.
  var tokens = {
    access_token: newToken(userId, session.tokenid, signature_key_access, (new Date(session.issued)).getTime()),
    refresh_token: newToken(userId, session.tokenid, signature_key_refresh)
  };

  log.log('debug', `newSession(generateTokens) access_token: ${tokens.access_token}`);
  log.log('debug', `newSession(generateTokens) refresh_token: ${tokens.refresh_token}`);

  // Status 200
  log.info(`newSession() 200`);
  return res.status(200).json(tokens);
};
  

// extendSession
// Creates a new auth token from a valid refresh token. The refresh token must be passed in
// the request body, in JSON format {refresh_token: ''}.
module.exports.extendSession = async (req, res, next) => {

  // checkBodyData
  // Get token from request body.
  var token64 = req.body.refresh_token;

  if (!token64) {
    let e = {error: "refresh_token required"};
    log.info(`extendSession(checkBodyData) 400 - ${e.error}`);
    return res.status(400).json(e);
  }
  
  // validateToken
  // Checks the validity of the authentication token.
  var token = validateRefreshToken(token64);

  if (token.error) {
    log.info(`extendSession(validateToken) 400 - ${token.error}`);
    return res.status(400).json(token);
  }

  // refreshSession
  // Updates the refresh timestamp of the session if minimum_validity minutes have passed.
  try {
    var session = await db.oneOrNone(`UPDATE $1~
                                        SET refreshed=NOW()
                                        WHERE tokenid=$2
                                        AND userid=$3
                                        AND refreshed<$4
                                        RETURNING userid,tokenid,refreshed`,
				     [psql.table_auth_session,
				      token.payload.tokenid,
				      token.payload.uid,
				      new Date(Date.now()-minimum_validity*60000).toISOString()]
				    );
  } catch (err) {
    log.error(`extendSession(refreshSession) 500 - database error: ${err}`);
  }

  if (!session) {
    // findSession
    // Try to find session to report issue to the user.
    try {
      session = await db.oneOrNone(`SELECT refreshed FROM $1~
                                    WHERE tokenid=$2
                                    AND userid=$3`,
				   [psql.table_auth_session,
				    token.payload.tokenid,
				    token.payload.uid]);
    } catch (err) {
      log.error(`extendSession(findSession) 500 - database error: ${err}`);
    }

    if (!session) {
      let e = {error: "token revoked"};
      log.info(`extendSession(findSession) 401 - ${e.error}`);
      return res.status(401).json(e);
    } else {
      let e = {error: `auth token minimum validity is ${minimum_validity} minutes (last refresh ${session.refreshed})`};
      log.info(`extendSession(findSession) 400 - ${e.error}`);
      return res.status(400).json(e);
    }
  }

  // generateAccessToken
  // Creates a valid access token.
  var tokens = {
    access_token: newToken(session.userid, session.tokenid, signature_key_access, (new Date(session.refreshed)).getTime())
  };
  
  log.info(`extendSession() session extended: ${token.payload.tokenid.split('-')[0]}`);
  log.log('debug',`extendSession() auth token: ${tokens.access_token}`);
  
  // Status 200
  log.info(`extendSession() 200`);
  return res.status(200).json(tokens);
};


// logout
// Terminates the current session. Revokes the refresh token associated with the auth
// token used for authentication.
module.exports.logout = async (req,res,next) => {

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
                                     AND CAST(tokenid AS text) LIKE $3 || '%'\
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

  uuids.forEach((uuid) => log.info(`logout(revokeSession) revoked session: ${req.auth.token.payload.tokenid}`));

  // status 200
  log.info('logout() 200');
  return res.status(200).end();
};


// endSessions
// Revokes all refresh tokens for the authenticated user.
module.exports.endSessions = async (req,res,next) => {
  // checkAuthentication
  // Authentication with access token is enough to end all sessions.
  if (!req.auth.valid) {
    let e = {error: "not authenticated"};
    log.info(`endSessions(checkAuthentication) 401 - ${e.error}`);
    return res.status(401).json(e);
  }

  // revokeAllSessions
  // Deletes all session records for userid from the sessions database.
  try {
    await db.none("DELETE FROM $1~\
                     WHERE userid=$",
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
  log.log('debug', `authValidation(validateToken) token: ${token64}`);

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
  var header = Buffer.from(JSON.stringify(headerobj),'ascii').toString('base64');
  var data = Buffer.from(JSON.stringify(dataobj),'ascii').toString('base64');

  // Sign token.
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(header+"."+data);
  var signature = hmac.digest('base64');

  return header + "." + data + "." + signature;
}



function decodeToken(token) {
  // JWT must contain 3 parts separated by '.'
  var parts = token.split('.');
  if (parts.length != 3) {
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

  var computed_signature = Buffer.from(hmac.digest('base64'), 'base64');
  var bearer_signature = Buffer.from(token.signature, 'base64');
 
  if (crypto.timingSafeEqual(computed_signature, bearer_signature)) {
    return token;
  } else {
    return {"error":"invalid auth token signature"};
  }
}


function validateRefreshToken(token64) {
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

  var computed_signature = Buffer.from(hmac.digest('base64'), 'base64');
  var bearer_signature = Buffer.from(token.signature, 'base64');
 
  if (!crypto.timingSafeEqual(computed_signature, bearer_signature)) {
     return {"error":"invalid refresh token signature"};
  }

  return token;
}
