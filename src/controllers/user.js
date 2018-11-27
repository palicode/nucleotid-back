const re     = require('../modules/regexp');
const psql   = require('../modules/db');
const mailer = require('../modules/mailer');
const crypto = require('crypto');
const uuid   = require('uuid/v4');
const config = require('../../config')[process.env.NODE_ENV || 'dev'];
const validator = require('validator');
const db     = psql.db;
const pgp    = psql.pgp;
const log    = require('../modules/logger').logmodule(module);


// Some parameters
const passwd_opts = {min_len: 6, max_len: 30};
const email_opts  = {max_len: 50};

// CREATE - POST Routes

// CreateWebUser
// Creates a new user without confirmed e-mail.
module.exports.createWebUser = async (req, res, next) => {
  var user = req.newuser;

  // checkExists
  // Checks if user.email already exists in the database.
  try {
    var exists = await db.oneOrNone("SELECT email FROM $1~ WHERE email=$2",
    				    [psql.tables.user,
				     user.email]);
  } catch (err) {
    log.error('createWehUser(checkExists) 500 - database error: ' + err);
    return res.status(500).end();
  }

  if (exists) {
    log.info(`createWebUser(checkExists) 400 - email already in use: ${user.email}`);
    return res.status(400).json({"error": "email exists"});
  }


  var id = undefined, uuid_token = undefined;

  // insertDB
  // Inserts user_profile info to database and creates email token.
  try {
    await db.tx('create-user', async t => {
      id = await t.one("INSERT INTO $1~(given_name,family_name,email,password,birthdate,web_active,google_active)\
                        VALUES ($2,$3,$4,$5,$6,$7,$8)\
                        RETURNING id",
		       [psql.tables.user,
			user.given_name,
			user.family_name,
			user.email,
			user.password,
			user.birthdate || null,
			false,
			false
		       ],
		       x => +x.id
		      );

      uuid_token = await t.one("INSERT INTO $1~(user_id, validated)\
                                VALUES ($2,$3)\
                                RETURNING token",
			       [psql.tables.email_token,
				id,
				false
			       ],
			       x => x.token
			      );
    });
  } catch (err) {
    log.error('createWebUser(insertDB) 500 - database error: ' + err);
    return res.status(500).end();
  }
  
  // createEmailToken
  // Encode UUIDv4 token base 64.
  var etoken = Buffer.from("" + uuid_token).toString('base64');
  log.info(`createWebUser(createEmailToken) user_profile created: {id: ${id}, email: ${user.email}, token: ${etoken}}`);

  // sendWelcomeMail
  // Send an e-mail containing a link to activate the user account.
  if (process.env.NODE_ENV === 'production') {
    // Sends welcome e-mail with confirmation link.
    mailer.sendWelcomeMail(user, config.backend_url + '/user/validate/' + etoken);
  }
  
  log.info('createWebUser() 200');
  
  return res.status(200).end();
};


// validateEmail
// Validates user email using eToken, activates account and creates Personal group.
module.exports.validateEmail = async (req, res, next) => {
  var etoken = req.params.eToken;
  log.info(`validateEmail(${req.method}) etoken: ${etoken}`);

  // tokenFormat
  // Validate token format (UUIDv4).
  var uuid_token = Buffer.from(etoken,'base64').toString('ascii');
  if (!validator.isUUID(uuid_token,4)) {
    log.info(`validateEmail(tokenFormat) 400 - invalid token format`);
    return res.status(400).json({"error": "invalid token format"});
  }
  
  // dbTransaction
  // Expire token from database, set web_user=true, create personal team.
  var ids = undefined, team = undefined;
  try {
    await db.tx('activate-user', async t => {
      // activateUser
      // Expire token and activate web user profile.
      ids = await t.oneOrNone("WITH reg AS (UPDATE $1~ SET validated=TRUE, modified=NOW() \
                                            WHERE token=$2 AND validated=FALSE \
                                            RETURNING user_id) \
                               UPDATE $3~ SET web_active=TRUE \
                               WHERE id in (SELECT user_id FROM reg) \
                               RETURNING id",
			      [psql.tables.email_token,
			       uuid_token,
			       psql.tables.user]);

      // createPersonalTeam
      // Create personal team.
      if (ids) {
	team = await t.one("INSERT INTO $1~(team_name, owner_id, personal)\
                            VALUES($2,$3,$4)\
                            RETURNING id",
			   [psql.tables.team,
			    "My Projects",
			    ids.id,
			    true]
			  );
      }
    });
  } catch (err) {
    log.error(`validateEmail(dbTransaction) 500 - database error: ${err}`);
    return res.status(500).end();
  }

  // Return error if token has expired.
  if (!ids) {
    log.info(`validateEmail(activateUser) 400 - invalid token`);
    return res.status(400).json({"error": "invalid token"});
  }

  if (!team) {
    log.info(`validateEmail(createPersonalTeam) 500 - server error`);
    return res.status(500).json({"error": "error creating personal team"});
  }
  
  log.info(`validateEmail(activateUser) userid(${ids.user_id}) activated with etoken: ${etoken}`);
  log.info(`validateEmail(createPersonalTeam) team(${team.id}) created`);

  // send status 200
  log.info(`validateEmail() 200`);
  
  return res.status(200).end();
};


// READ - GET Routes

// GetUser
// Returns user information.
module.exports.getUserProfile = async (req, res, next) => {
  log.info(`getUserProfile(GET) userId: ${req.params.userId}`);
  // defineTargetUser
  // Target user is self when no user id is provided and user is logged.
  var uid = req.params.userId;
  if (!uid) {
    if (req.auth.valid) {
      uid = req.auth.userid;
    } else {
      log.info('getUserProfile(defineTargetUser) 401 - not logged in and no uid provided');
      return res.status(401).json({error: "unauthenticated"});
    }
  }
  log.info(`getUserProfile(defineTargetUser) userId: ${uid}`);

  // selectInfo
  // Select public or private profile
  if (uid === req.auth.userid) {
    info = '(given_name, family_name, email, birthdate, photo, web_active, google_active, created)';
  } else {
    info = '(given_name, family_name, photo)';
  }
  log.info(`getUserProfile(selectInfo): ${info}`);

  // getDBInfo
  // Query user info in db.
  try {
    var user = await db.oneOrNone(`SELECT ${info} FROM $1~ WHERE id=$2`,
				  [psql.tables.user, uid]);
  } catch (err) {
    log.error(`getUserProfile(getDBInfo) 500 - database error: ${err}`);
    return res.status(500).end();
  }

  if (!user) {
    log.info('getUserProfile(getDBInfo) 404 - user not found');
    return res.status(404).json({error: "user not found"});
  }

  // parseDBRow
  // Converts DB row into object.
  user = psql.rowToObject(info, user.row);
  log.info(`getUserProfile(parseDBRow) object: ${JSON.stringify(user)}`);

  log.info('getUserProfile() 200');

  return res.status(200).json(user);
};


// GetUserTeams
// Returns all Teams where the user has read+ access.
module.exports.getUserTeams = async (req, res, next) => {
  // Check credentials.
  // If not logged in, return 403.
  // Otherwise return teams where user has, at least, read access.
  res.send(404);
};


// GetUserProjects
// Returns projects owned by userId.
module.exports.getUserProjects = async (req, res, next) => {
  // Check credentials.
  // If userId != credentials or no credentials, return public projects.
  // Otherwise return all projects where userId is the owner.
  res.send(404);
};

// GetUserSharedProjects
// Returns public Projects where the user has write+ access and private Projects where the user has read+ access.
module.exports.getUserSharedProjects = async (req, res, next) => {
  // Check credentials if userId != credentials, return 403.
  // Return all projects shared with userId.
  res.send(404);
};


// GetUserNotebooks
// Returns notebooks owned by userId.
module.exports.getUserNotebooks = async (req, res, next) => {
  // Check credentials.
  // If not match, return public notebooks.
  // Otherwise return all notebooks owned by user.
  res.send(404);
};


// UPDATE Routes

// UpdateUser
// Updates user information.
module.exports.updateUser = async (req, res, next) => {
  // TODO:
  // - How to handle e-mail updates? New e-mails must be verified as well!
  
  // Define updatable columns
  const updatable = ['given_name', 'family_name', 'email', 'password', 'birthdate', 'photo'];

  // This function is called from validateCredentials. There is no need to double-check authentication or user id.
  var credentials = req.credentials;
  var user = req.body.user;

  // checkBodyData
  // Check if provided data is correct.
  if (!user) {
    log.info('updateUser(checkBodyData) 400 - user data not provided');
    return res.status(400).json({error: "user data required"});
  }


  // checkUserId
  // Checks if authenticated user and target user for update match.
  if (req.params.userId !== credentials.id) {
    log.info('updateUser(checkUserId) 401 - unauthorized: logged user and target user differ');
    return res.status(403).json({error: "unauthorized"});
  }

  // checkDataKeys
  // Check length.
  var klen = Object.keys(user).length;
  if (klen == 0 || klen > updatable.length) {
    log.info(`updateUser(checkDataKeys) 400 - invalid data format`);
    return res.status(400).json({error: `invalid data format`});
  }
  // Check data keys.
  var field_err = undefined;
  Object.keys(user).forEach(k => {
    if(updatable.indexOf(k) === -1) {
      field_err = k;
    }
  });

  if (field_err) {
    log.info(`updateUser(checkDataKeys) 400 - invalid field: ${field_err}`);
    return res.status(400).json({error: `invalid field - ${field_err}`});
  }

  // parseUserData
  // Parses user data types and format.
  var valid_data = await parseUserData(user);

  if (valid_data.error) {
    log.info(`updateUser(parseUserData) 400 - ${valid_data.error}`);
    return res.status(400).json(valid_data);
  }

  // updateDB
  // Writes information to database.
  try {
    var upd = await db.oneOrNone(pgp.helpers.update(valid_data, null, psql.tables.user) + ' WHERE id=$1 RETURNING id',
				 [credentials.id]);
  } catch (err) {
    log.error(`updateUser(updateDB) 500 - database error: ${err}`);
    return res.status(500).end();
  }

  // Return status 200
  log.error(`updateUser() 200`);
  return res.status(200).json(upd);
};


// DELETE Routes

// DeleteUser
// Deletes user profile.
module.exports.deleteUser = async (req, res, next) => {
  // Get credentials.
  var uid = req.credentials.id;

  // checkUserId
  // Checks if authenticated user and target user match.
  if (req.params.userId !== uid) {
    log.info('deleteUser(checkUserId) 401 - unauthorized: logged user and target user differ');
    return res.status(403).json({error: "unauthorized"});
  }

  // deleteDB
  // Deletes user from DB.
  try {
    var del = await db.oneOrNone("DELETE FROM $1~ WHERE id=$2 RETURNING id",
				 [psql.tables.user,
				  uid]);
  } catch (err) {
    log.error(`deleteUser(deleteDB) 500 - database error: ${err}`);
    return res.status(500).end();
  }

  // Otherwise delete user profile.
  return res.status(200).json(del);
};

/*
** Aux Middleware
*/

// validateCredentials
// Validates email and password.
module.exports.validateCredentials = async (req, res, next) => {
  log.log('debug', `validateCredentials(${req.method}) credentials: ${JSON.stringify(req.body)}`);

  // checkBodyData
  // Checks the body data.
  if (!req.body.auth || !req.body.auth.email || !req.body.auth.password) {
    let e = {error: "insufficient authentication data"};
    log.info(`validateCredentials(checkBodyData) 400 - ${e.error}`);
    return res.status(400).json(e);
  }

  // checkEmailFormat
  // If the email format is wrong, it is guaranteed to fail.
  if(!validator.isLength(req.body.auth.email, {max: passwd_opts.max_len}) || !validator.isEmail(req.body.auth.email)) {
    let e = {error: "authentication failed"};
    log.info(`validateCredentials(checkEmailFormat) 401 - ${e.error}`);
    return res.status(401).json(e);
  }

  // checkPasswordFormat
  // If the password does not satisfy the requirements it is guaranteed to fail.
  if (!validator.isLength(req.body.auth.password, {min: passwd_opts.min_len, max: passwd_opts.max_len})) {
    let e = {error: "authentication failed"};
    log.info(`validateCredentials(checkPasswordFormat) 401 - ${e.error}`);
    return res.status(401).json(e);
  }

  // findUser
  // Get user from database.
  try {
    var user = await db.oneOrNone("SELECT id, email, password FROM $1~ WHERE email=$2",
				  [psql.tables.user,
				  req.body.auth.email]);
  } catch (err) {
    log.error(`validateCredentials(findUser) 500 - database error: ${err}`);
    return res.status(500).end();
  }

  if (!user) {
    let e = {error: "authentication failed"};
    log.info(`validateCredentials(findUser) 401 - ${e.error}`);
    return res.status(401).json(e);
  }

  // validatePassword
  // Hashes provided password and compares with user_profile(pasword).
  const hash = crypto.createHash('SHA512');
  hash.update(req.body.auth.password);
  const hashpass = hash.digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(user.password, 'hex'), Buffer.from(hashpass, 'hex'))) {
    let e = {error: "authentication failed"};
    log.info(`validateCredentials(validatePassword) 401 - ${e.error}`);
    return res.status(401).json(e);
  }

  req.credentials = user;

  // Authentication successful. Next middleware.
  return next();
};


/*
** Validation Middleware
*/

function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

async function parseUserData(user) {
  var newuser = {};

  try {
    if (user.email) {
      // validateEmail
      // email: email format
      if (!validator.isLength(user.email, {max: email_opts.max_len}) || !validator.isEmail(user.email)) {
	throw new Error();
      }
      
      newuser.email = validator.normalizeEmail(user.email);
    }
  } catch (err) {
    return {"error": "invalid email format"};
  }

  try {
    if (user.given_name) {
      // validateGivenName
      // given_name: unicode max two words, min 2 char and max 25 char
      if (!validator.isLength(user.given_name, {min:2, max:25}) ||
	  user.given_name.split(' ').length > 2 ||
	  !re.unicodeWords(user.given_name)) {
	throw new Error();
      } 

      newuser.given_name = user.given_name;
    }
  } catch (err) {
    return {"error": "invalid given_name format"};
  }

  try {
    if (user.family_name) {
      // validateFamilyName
      // family_name: unicode multiple words, max 50 char, max 5 words

      if (!re.unicodeWords(user.family_name, '-') ||
	  !validator.isLength(user.family_name, {min:2, max:50}) ||
	  user.family_name.split(' ').length > 5) {
	throw new Error();
      }
      
      newuser.family_name = user.family_name.replace(/\s+/g, ' ');
    }
  } catch (err) {
    return {"error": "invalid family_name format"};    
  }
  
  if (user.password) {
    // validatePassword
    // password: min len 6
    try {
      if (!validator.isLength(user.password, {min: passwd_opts.min_len, max: passwd_opts.max_len})) {
	throw new Error();
      }
    } catch (err) {
      return {"error": "invalid password format"};
    }

    // validatePasswordBlacklist
    // password must not be in blacklisted database.
    try {
      var blacklist = await db.oneOrNone('SELECT password FROM $1~ WHERE password=$2',
					 [psql.tables.password_blacklist,
					  user.password]);
    } catch (err) {
      throw err;
    }

    if (blacklist) {
      return {"error": "password blacklisted"};
    }

    // hashPassword.
    const hash = crypto.createHash('SHA512');
    hash.update(user.password);
    const hashpass = hash.digest('hex');

    newuser.password = hashpass;

  }

  // validateBirthdate
  // birthdate: any format accepted by Date, no later than today, not before 150 years ago.
  try {
    if (user.birthdate) {
      var bd = new Date(user.birthdate);
      if (!isValidDate(bd)) {
	throw new Error();
      }

      var now = new Date(Date.now());
      var mindate = new Date(Date.now());
      mindate.setFullYear(mindate.getFullYear()-150);
      if (bd >= now || bd < mindate) {
	return {"error": "birthdate out of bounds"};
      }
      
      newuser.birthdate = bd;
    }
  } catch (err) {
    return {"error": "invalid birthdate format"};
  }

  // validatePhoto
  try {
    if (user.photo) {
      if (!validator.isURL(user.photo)) {
	throw new Error();
      }

      newuser.photo = user.photo;
    }
  } catch (err) {
    return {"error": "invalid photo format"};
  }

  // Return valid data.
  return newuser;
}

// validateNewUser
// Validates data for newUser requests.
module.exports.validateNewUser = async (req, res, next) => {
  log.log('debug', `validateNewUser(POST): ${JSON.stringify(req.body)}`);

  if (!req.body.user)
    return res.status(400).json({"error": "user object required"});

  var user = req.body.user;
  
  if (!user.email)
    return res.status(400).json({"error": "email required"});
  if (!user.given_name)
    return res.status(400).json({"error": "given_name required"});
  if (!user.family_name)
    return res.status(400).json({"error": "family_name required"});
  if (!user.password)
    return res.status(400).json({"error": "password required"});

  // parseUserData
  // Check all fields have correct format
  var newuser = await parseUserData(user);

  if (newuser.error) {
    log.info(`validateNewUser(validateUserData) 400 - ${newuser.error}`);
    return res.status(400).json(newuser);
  }

  // Add fields to newuser.
  req.newuser = newuser;

  // Next middleware.
  log.info(`validateNewUser() next`);
  return next();
};

// OTHER MIDDLEWARE FUNCTIONS

// CreateGoogleUser
// This middleware is to be used in the return route of Passport Google OAUTH 2.
// Creates a new user with confirmed e-mail.
module.exports.createGoogleUser = async (req, res, next) => {
  // Parses user info.
  // Adds user info to database.
  // Sends welcome e-mail.
};


// GetMyNotebooks
// Returns a list of notebooks owned by the current user.
module.exports.getMyNotebooks = async (req, res, next) => {
  // Check authentication.
  if (!req.auth || !req.auth.validToken || !req.auth.token || !req.auth.token.payload) {
    // Return '401 Unauthenticated' status.
    res.status(401);
    res.end();
    return;
  }

  // Get logged user ID from auth token.
  var user_id = req.auth.token.payload.uid;

  // Get all user notebooks.
  try {
    var notebooks = await db.manyOrNone("SELECT * FROM $1~ WHERE ownerId=$2", [psql.tables.notebook, user_id]);
  } catch (err) {
    // DB error, return '500 Internal server error'.
    return res.status(500).end();
  }

  // Return user notebooks.
  res.status(200).json(notebooks);
};


// GetMySharedNotebooks
// Returns a list of all notebooks shared with the current user.
module.exports.getMySharedNotebooks = async (req, res, next) => {
  // Check authentication.
  if (!req.auth || !req.auth.validToken || !req.auth.token || !req.auth.token.payload) {
    // Return '401 Unauthenticated' status.
    res.status(401);
    res.end();
    return;
  }

  // Get logged user ID from auth token.
  var user_id = req.auth.token.payload.uid;

  // Get notebooks not owned by user(user_id) where user(user_id) has write access.
  try {
    var notebooks = await db.manyOrNone(
      "SELECT * FROM $1~\
       WHERE ownerId != $3\
       AND projectId IN (SELECT projectId FROM $2\
                         WHERE userId=$3\
                         AND write=true)"
      , [psql.tables.notebook, psql.tables.project_permissions, user_id]);
  } catch (err) {
    // DB error, return '500 Internal server error'.
    res.status(500);
    res.end();
    return;
  }

  // Return user notebooks.
  res.status(200).json(notebooks);
};


// GetPublicNotebooks
// Returns the list of public notebooks of userId.
module.exports.getPublicNotebooks = async (req, res, next) => {
  // No login is required.
  // Get logged user ID from params.
  var target_id = req.params.userId;
  if (!target_id) {
    res.status(400);
    res.end();
    return;
  }

  // Get all public notebooks owned by target_id.
  try {
    var notebooks = await db.manyOrNone("SELECT * FROM $1~ WHERE ownerId=$2 AND public=TRUE", [psql.tables.notebook, target_id]);
  } catch (err) {
    // DB error, return '500 Internal server error'.
    res.status(500);
    res.end();
    return;
  }

  // Return notebooks.
  res.status(200).json(notebooks);
};


// GetSharedNotebooks
// Returns notebooks of userId shared with current user.
module.exports.getSharedNotebooks = async (req, res, next) => {
  // Check authentication.
  if (!req.auth || !req.auth.validToken || !req.auth.token || !req.auth.token.payload) {
    // Return '401 Unauthenticated' status.
    res.status(401);
    res.end();
    return;
  }

  // Get logged user ID from auth token and target user from params.
  var user_id = req.auth.token.payload.uid;
  var target_id = req.params.userId;
  if (!target_id) {
    res.status(400);
    res.end();
    return;
  }

  // Get notebooks owned by user(target_id) and shared with user(user_id).
  try {
    var notebooks = await db.manyOrNone(
      "SELECT * FROM $1~\
       WHERE ownerId=$3\
       AND projectId IN (SELECT projectId FROM $2 WHERE userId=$4 AND write=TRUE)"
      , [psql.tables.notebook, psql.tables.project_permissions, target_id, user_id]);
  } catch (err) {
    // DB error, return '500 Internal server error'.
    res.status(500);
    res.end();
    return;
  }

  // Return user notebooks.
  res.status(200).json(notebooks);
};

