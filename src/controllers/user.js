const re     = require('../modules/regexp');
const psql   = require('../modules/db');
const mailer = require('../modules/mailer');
const crypto = require('crypto');
const uuid   = require('uuid/v4');
const config = require('../../config')[process.env.NODE_ENV || 'dev'];
const validator = require('validator');
const db     = psql.db;
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

  // hashPassword.
  const hash = crypto.createHash('SHA512');
  hash.update(user.password);
  const hashpass = hash.digest('hex');

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
			hashpass,
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
  // Check credentials.
  // If not match, return 403.
  // Otherwise update received fields in user profile. (Require login (no OAUTH) to update password).
  // How to handle e-mail updates?
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

  if (user.password !== hashpass) {
    let e = {error: "authentication failed"};
    log.info(`validateCredentials(validatePassword) 401 - ${e.error}`);
    return res.status(401).json(e);
  }

  req.user = user;

  // Authentication successful. Next middleware.
  return next();
};


/*
** Validation Middleware
*/

function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

// validateNewUser
// Validates data for newUser requests.
module.exports.validateNewUser = async (req, res, next) => {
  log.log('debug', `validateNewUser(POST): ${JSON.stringify(req.body)}`);

  if (!req.body.email)
    return res.status(400).json({"error": "email required"});
  if (!req.body.given_name)
    return res.status(400).json({"error": "given_name required"});
  if (!req.body.family_name)
    return res.status(400).json({"error": "family_name required"});
  if (!req.body.password)
    return res.status(400).json({"error": "password required"});

  // validateEmail
  // email: email format
  if (!validator.isLength(req.body.email, {max: email_opts.max_len}) || !validator.isEmail(req.body.email)) {
    log.info(`validateNewUser(validateEmail) 400 - invalid email format: ${req.body.email}`);
    return res.status(400).json({"error": "invalid email format"});
  }

  // validateGivenName
  // given_name: unicode max two words, min 2 char and max 25 char
  if (!validator.isLength(req.body.given_name, {min:2, max:25}) ||
      req.body.given_name.split(' ').length > 2 ||
      !re.unicodeWords(req.body.given_name)) {
    log.info(`validateNewUser(validateGivenName) 400 - invalid given_name format: ${req.body.given_name}`);
    return res.status(400).json({"error": "invalid given_name format"});
  }

  // validateFamilyName
  // family_name: unicode multiple words, max 50 char, max 3 words
  if (!re.unicodeWords(req.body.family_name, '-') ||
      !validator.isLength(req.body.family_name, {min:2, max:50}) ||
      req.body.family_name.split(' ').length > 3) {
    log.info(`validateNewUser(validateFamilyName) 400 - invalid family_name format: ${req.body.family_name}`);
    return res.status(400).json({"error": "invalid family_name format"});
  }

  // validatePassword
  // password: min len 6
  if (!validator.isLength(req.body.password, {min: passwd_opts.min_len, max: passwd_opts.max_len})) {
    log.info(`validateNewUser(validatePassword) 400 - invalid password format: ${req.body.password}`);
    return res.status(400).json({"error": "invalid password format"});
  }

  // validatePasswordBlacklist
  // password must not be in blacklisted database.
  try {
    var blacklist = await db.oneOrNone('SELECT password FROM $1~ WHERE password=$2',
				       [psql.tables.password_blacklist,
					req.body.password]);
  } catch (err) {
    log.error(`validateNewUser(validatePasswordBlacklist) 500 - database error: ${err}`);
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

  // validateBirthdate
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

