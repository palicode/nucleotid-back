const re     = require('../modules/regexp');
const psql   = require('../modules/db');
const mailer = require('../modules/mailer');
const crypto = require('crypto');
const uuid   = require('uuid/v4');
const config = require('../../config')[process.env.NODE_ENV || 'dev'];
const validator = require('validator');
const db     = psql.db;
const log    = require('../modules/logger').logmodule(module);


// CREATE - POST Routes

// CreateWebUser
// Creates a new user without confirmed e-mail.
module.exports.createWebUser = async (req, res, next) => {
  var user = req.newuser;
  // Checks if user already exists.
  try {
    var exists = await db.oneOrNone("SELECT email FROM $1~ WHERE email=$2",
    				    [psql.table_user,
				     user.email]);
  } catch (err) {
    log.error('createWehUser(checkExists) 500 - database error: ' + err);
    return res.status(500).end();
  }

  if (exists) {
    log.info(`createWebUser(checkExists) 400 - email already in use: ${user.email}`);
    return res.status(400).json({"error": "email already in use"});
  }

  // Hash password.
  const hash = crypto.createHash('SHA512');
  hash.update(user.password);
  const hashpass = hash.digest('hex');
  
  // Adds user info to database.
  try {
    var userid = await db.one(
      "INSERT INTO $1~(given_name,\
               family_name,\
               email,\
               password,\
               birthdate,\
               web_active,\
               google_active,\
               created)\
       VALUES ($2,$3,$4,$5,$6,$7,$8,$9)\
       RETURNING id",
      [psql.table_user,
       user.given_name,
       user.family_name,
       user.email,
       hashpass,
       user.birthdate || null,
       false,
       false,
       (new Date()).toISOString()]
    );
  } catch (err) {
    log.error('createWebUser(AddUserProfile) 500 - database error: ' + err);
    return res.status(500).end();
  }

  log.info(`createWebUser(AddUserProfile) user_profile created: ${user.email}`);
  
  // Creates e-mail confirmation token, stores in db.
  // Token is BASE64(UUIDv4)
  var etoken = Buffer.from(uuid()).toString('base64');
  try {
    await db.query("INSERT INTO $1~(token, user_id, validated, created)\
                    VALUES ($2,$3,$4,$5)",
		   [psql.table_email_token,
		    etoken,
		    userid.id,
		    false,
		    (new Date()).toISOString()]
		  );
  } catch (err) {
    log.error(`createWebUser(createEmailToken) database error (delete user_profile):` + err);
    try {
      await db.query("DELETE FROM $1~ WHERE id=$2",
		     [psql.table_user,
		      userid.id]
		    );
    } catch (err) {
      log.error('createWebUser(deleteUserTokenError) 500 - database error' + err);
      return res.status(500).end();
    }
    log.error('createWebUser(deleteUserTokenError) 500 - user_profile deleted');
    return res.status(500).end();
  }

  log.info(`createWebUser(createEmailToken) email_token created (${user.email}): ${etoken}`);
  
  // Sends welcome e-mail with confirmation link. (Encode token base64)
  mailer.sendWelcomeMail(user, config.backend_url + '/user/validate/' + etoken);

  log.info('createWebUser() 200');
  
  return res.status(200).end();
};


// validateEmail
// Validates user email using eToken, activates account and creates Personal group.
module.exports.validateEmail = async (req, res, next) => {
  var etoken = req.params.eToken;
  
  log.info(`validateEmail(${req.method}) etoken: ${etoken}`);

  // Validate token format (UUIDv4).
  if (!validator.isUUID(Buffer.from(etoken,'base64').toString('ascii'),4)) {
    log.info(`validateEmail(tokenFormat) 400 - invalid token format`);
    return res.status(400).json({"error": "invalid token format"});
  }

  // Check database.
  try {
    var dbtoken = await db.oneOrNone("SELECT user_id, validated FROM $1~ WHERE token=$2",
				   [psql.table_email_token,
				    etoken]);
  } catch (err) {
    log.info(`validateEmail(checkTokenDB) 500 - database error: ${err}`);
    return res.status(500).end();
  }

  if (!dbtoken) {
    log.info(`validateEmail(checkTokenDB) 400 - token does not exist`);
    return res.status(404).end();
  }

  // Return error if token was already used.
  if (dbtoken.validated) {
    log.info(`validateEmail(checkTokenDB) 400 - token already used`);
    return res.status(400).json({"error": "token already used"});
  }

  // Activate user.
  try {
    await db.query("UPDATE $1~ SET web_active=TRUE WHERE id=$2",
		   [psql.table_user,
		    dbtoken.user_id]);
    
  } catch (err) {
    log.info(`validateEmail(activateUser) 500 - database error: ${err}`);
    return res.status(500).end();
  }

  log.info(`validateEmail(activateUser) userid(${dbtoken.user_id}) activated`);

  // Expire token.
  try {
    await db.query("UPDATE $1~ SET validated=$2, modified=$3 WHERE token=$4",
		   [psql.table_email_token,
		    true,
		    (new Date()).toISOString(),
		    etoken]
		  );
  } catch (err) {
    log.info(`validateEmail(expireToken) 500 - database error: ${err}`);
    return res.status(500).end();
  }

    log.info(`validateEmail(expireToken) expired: ${etoken}`);
  

  // Create Personal team.
  try {
    var team = await db.one("INSERT INTO $1~(team_name, ownerId, personal, created)\
                             VALUES($2,$3,$4,$5) RETURNING id",
			    [psql.table_team,
			     "My Projects",
			     dbtoken.user_id,
			     true,
			     (new Date()).toISOString()]
			   );
  } catch (err) {
    log.info(`validateEmail(createPersonalTeam) 500 - database error: ${err}`);
    return res.status(500).end();
  };

  log.info(`validateEmail(createPersonalTeam) team(${team.id}) created`);
  log.info(`validateEmail() 200`);
  
  return res.status(200).end();
};



// READ - GET Routes

// GetUser
// Returns user information.
module.exports.getUser = async (req, res, next) => {
  // Check credentials.
  // If not logged in, return public info.
  // Otherwise return full profile (exclude passwords and so).
  res.send(404);
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
  // Check credentials.
  // If not match, return 403.
  // Otherwise update received fields in user profile. (Require login (no OAUTH) to update password).
  res.send(404);
};


// DELETE Routes

// DeleteUser
// Deletes user profile.
module.exports.deleteUser = async (req, res, next) => {
  // Check credentials. (Require login, no OAUTH)
  // If not match, return 403.
  // Otherwise delete user profile.
  res.send(404);
};

// VALIDATOR MIDDLEWARE
function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

module.exports.validateNewUser = async (req, res, next) => {
  log.log('debug', `validateNewUser(POST): ${JSON.stringify(req.body)}`);
  // email: email
  if (!validator.isLength(req.body.email, {max:50}) || !validator.isEmail(req.body.email)) {
    log.info(`validateNewUser(validateEmail) 400 - invalid email format: ${req.body.email}`);
    return res.status(400).json({"error": "invalid email format"});
  }
  
  // given_name: unicode single word, max 20 char
  if (!validator.isLength(req.body.given_name, {max:20}) ||
      !re.unicodeWord(req.body.given_name)) {
    log.info(`validateNewUser(validateGivenName) 400 - invalid given_name format: ${req.body.given_name}`);
    return res.status(400).json({"error": "invalid given_name format"});
  }

  // family_name: unicode multiple words, max 50 char, max 3 words
  if (!re.unicodeWords(req.body.family_name, '-') ||
      !validator.isLength(req.body.family_name, {max:50}) ||
      req.body.family_name.split(' ').length > 3) {
    log.info(`validateNewUser(validateFamilyName) 400 - invalid family_name format: ${req.body.family_name}`);
    return res.status(400).json({"error": "invalid family_name format"});
  }

    // password: min len 6, not blacklisted
  if (!validator.isLength(req.body.password, {min:6})) {
    log.info(`validateNewUser(validatePassword) 400 - invalid password format: ${req.body.password}`);
    return res.status(400).json({"error": "invalid password format"});
  }

  try {
    var blacklist = await db.oneOrNone('SELECT password FROM $1~ WHERE password=$2',
				       [psql.table_password_blacklist,
					req.body.password]);
  } catch (err) {
    log.info(`validateNewUser(validatePasswordBlacklist) 500 - database error: ${err}`);
    return res.status(500).end();
  }

  if (blacklist) {
    log.info(`validateNewUser(validatePasswordBlacklist) 400 - password blacklisted: ${req.body.password}`);
    return res.status(400).json({"error": "password blacklisted"});
  }

  // Add fields to newuser.
  req.newuser = {
    email: validator.normalizeEmail(req.body.email),
    given_name: req.body.given_name,
    family_name: req.body.family_name.replace(/\s+/g, ' '),
    password: req.body.password
  };

  // birthdate: any format accepted by Date, no later than today, not before 150 years ago.
  if (req.body.birthdate) {
    var bd = new Date(req.body.birthdate);
    if (!isValidDate(bd)) {
      log.info(`validateNewUser(validateBirthdate) 400 - invalid birthdate format: ${req.body.birthdate}`);
      return res.status(400).json({"error": "invalid birthdate format"});
    }

    var now = new Date(Date.now());
    var mindate = new Date(Date.now());
    mindate.setFullYear(mindate.getFullYear()-150);
    if (bd >= now || bd < mindate) {
      log.info(`validateNewUser(validateBirthdate) 400 - birthdate out of bounds: ${req.body.birthdate}`);
      return res.status(400).json({"error": "birthdate out of bounds"});
    }

    req.newuser.birthdate = bd;
  }

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
    var notebooks = await db.manyOrNone("SELECT * FROM $1~ WHERE ownerId=$2", [psql.table_notebook, user_id]);
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
      , [psql.table_notebook, psql.table_project_permissions, user_id]);
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
    var notebooks = await db.manyOrNone("SELECT * FROM $1~ WHERE ownerId=$2 AND public=TRUE", [psql.table_notebook, target_id]);
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
      , [psql.table_notebook, psql.table_project_permissions, target_id, user_id]);
  } catch (err) {
    // DB error, return '500 Internal server error'.
    res.status(500);
    res.end();
    return;
  }

  // Return user notebooks.
  res.status(200).json(notebooks);
};

