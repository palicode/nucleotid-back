const re     = require('../modules/regexp');
const psql   = require('../modules/db');
const mailer = require('../modules/mailer');
const crypto = require('crypto');
const uuid   = require('uuid/v4');
const config = require('../../config')[process.env.NODE_ENV || 'dev'];
const validator = require('validator');
const db     = psql.db;


// CREATE - POST Routes

// CreateWebUser
// Creates a new user without confirmed e-mail.
module.exports.createWebUser = async (req, res, next) => {
  var user = req.newuser;
  // Checks if user already exists.
  try {
    var exists = await db.oneOrNone("SELECT email FROM $1 WHERE email=$2",
    				    [db.table_user,
				     user.email]);
  } catch (err) {
    return res.status(500).end();
  }

  if (exists) {
    return res.json(400, {"error": "email already in use"});
  }

  // Hash password.
  const hash = crypto.createHash('sha3-256');
  hash.update(user.password);
  const hashpass = hash.digest('hex');
  
  // Adds user info to database.
  try {
    var userid = await db.one(
      "INSERT (given_name,\
               family_name,\
               email,\
               password,\
               birthdate,\
               web_active,\
               google_active,\
               created)\
       INTO $1 VALUES ($2,$3,$4,$5,$6,$7,$8,$9)\
       RETURNING id",
      [db.table_user,
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
    return res.status(500).end();
  }
  
  // Creates e-mail confirmation token, stores in db.
  var etoken = uuid();
  try {
    await db.query("INSERT (token, user_id, validated, created)\
                    INTO $1 VALUES ($2,$3,$4,$5)",
		   [db.table_email_token,
		    etoken,
		    userid.id,
		    false,
		    (new Date()).toISOString()]
		  );
  } catch (err) {
    try {
      await db.query("DELETE FROM $1 WHERE id=$2",
		     [db.table_user,
		      userid.id]
		    );
    } catch (err) {
      return res.status(500).end();
    }
    return res.status(500).end();
  }
  
  // Sends welcome e-mail with confirmation link.
  mailer.sendWelcomeMail(user, config.backend_url + 'user/validate/' + etoken);

  return res.status(200).end();
};


// validateEmail
// Validates user email using eToken, activates account and creates Personal group.
module.exports.validateEmail = async (req, res, next) => {
  var etoken = req.params.eToken;

  // Validate token format (UUIDv4).
  if (!validator.isUUID(etoken,4)) {
    return res.json(400, {"error": "invalid token format"});
  }

  // Check database.
  try {
    var dbtoken = await db.oneOrNone("SELECT user_id, validated FROM $1 WHERE token=$2",
				   [db.table_email_token,
				    etoken]);
  } catch (err) {
    return res.status(500).end();
  }

  if (!dbotken) {
    return res.status(404).end();
  }

  // Return error if token was already used.
  if (dbtoken.validated) {
    return res.json(400, {"error": "token already used"});
  }

  // Activate user.
  try {
    await db.query("UPDATE $1 SET web_active=TRUE WHERE id=$2",
		   [db.table_user,
		    dbtoken.user_id]);
    
  } catch (err) {
    return res.status(500).end();
  }

  // Expire token.
  try {
    await db.query("UPDATE $1 SET validated=$2, modified=$3 WHERE token=$4",
		   [db.table_email_token,
		    true,
		    (new Date()).toISOString(),
		    etoken]
		  );
  } catch (err) {
    return res.status(500).end();
  }

  // Create Personal group.
  try {
    await db.query("INSERT (team_name, ownerId, personal, created)\
                    INTO $1\
                    VALUES($2,$3,$4,$5)",
		   [db.table_team,
		    "My Projects",
		    dbtoken.user_id,
		    true,
		    (new Date()).toISOString()]
		  );
  } catch (err) {
    return res.status(500).end();
  };
  
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
  // email: email
  if (!validator.isLength(req.body.email, {max:50}) || !validator.isEmail(req.body.email)) {
    return res.json(400, {"error": "invalid email format"});
  }
  
  // given_name: unicode single word, max 20 char
  if (!validator.isLength(req.body.given_name, {max:20}) ||
      !re.unicodeWord(req.body.given_name)) {
    return res.json(400, {"error": "invalid given_name format"});
  }

  // Add fields to newuser.
  req.newuser.email = validator.normalizeEmail(req.body.email);
  req.newuser.given_name = req.body.given_name;
  req.newuser.family_name = req.body.family_name.replace(/\s+/g, ' ');
  
  // family_name: unicode multiple words, max 50 char, max 3 words
  if (!re.unicodeWords(req.newuser.family_name, '-') ||
      !validator.isLength(req.newuser.family_name, {max:50}) ||
      req.newuser.family_name.split(' ').length > 3) {
    return res.json(400, {"error": "invalid family_name format"});
  }

  // password: min len 6, not blacklisted
  if (!validator.isLength(req.body.password, {min:6})) {
    return res.json(400, {"error": "invalid password format"});
  }

  try {
  var blacklist = await db.oneOrNone("SELECT text FROM $1 WHERE text=$2",
			       [db.table_password_blacklist,
				req.body.password]);
  } catch (err) {
    return res.status(500).end();
  }

  if (blacklist) {
    return res.json(400, {"error": "password blacklisted"});
  }

  // birthdate: any format accepted by Date, no later than today, not before 150 years ago.
  if (req.body.birthdate) {
    var bd = new Date(req.body.birthdate);
    if (!isValidDate(bd)) {
      return res.json(400, {"error": "invalid birthdate format"});
    }

    var now = new Date(Date.now());
    var mindate = new Date(Date.now());
    mindate.setFullYear(mindate.getFullYear()-150);
    if (bd >= now || bd < mindate) {
      return res.json(400, {"error": "invalid birthdate"});
    }
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
    var notebooks = await db.manyOrNone("SELECT * FROM $1 WHERE ownerId=$2", [psql.table_notebook, user_id]);
  } catch (err) {
    // DB error, return '500 Internal server error'.
    return res.status(500).end();
  }

  // Return user notebooks.
  res.status(200);
  res.json(notebooks);
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
      "SELECT * FROM $1\
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
  res.status(200);
  res.json(notebooks);
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
    var notebooks = await db.manyOrNone("SELECT * FROM $1 WHERE ownerId=$2 AND public=TRUE", [psql.table_notebook, target_id]);
  } catch (err) {
    // DB error, return '500 Internal server error'.
    res.status(500);
    res.end();
    return;
  }

  // Return notebooks.
  res.status(200);
  res.json(notebooks);
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
      "SELECT * FROM $1\
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
  res.status(200);
  res.json(notebooks);
};

