var pqsl = require('../modules/db');
var   db = psql.db;
var  pgp = db.$config.pgp;


// Column Definition

const userCols = new pgp.helpers.ColumnSet(
  ['?id',
   'given_name',
   'family_name',
   'email',
   'username',
   'password',
   'birthdate',
   'photo',
   'web_active',
   'google_active',
   'google_id',
   'google_accesstoken',
   'created'],
  {table: psql.table_user}
);


/*
** USER CLASS
*/

class User {
  constructor(userobj) {
    this._data = this._parseKeys(userobj);
  }

  _parseKeys(obj) {
    // Get keys matching db columns.
    var data = {
      id:                   obj['id'],
      given_name:           obj['given_name'],
      family_name:          obj['family_name'],
      email:                obj['email'],
      username:             obj['username'],
      password:             obj['password'],
      photo:                obj['photo'],
      web_active:           obj['web_active'],
      google_active:        obj['google_active'],
      google_id:            obj['google_id'],
      google_accesstoken:   obj['google_accesstoken'],
      created:              obj['created']
    };
    
    return data;
  }

  // Update user data.
  async update(data) {
    // Remove keys not matching DB columns.
    var updates = this._parseKeys(data);
    
    // Delete undefined keys and unchanged values.
    Object.keys(updates).forEach(key => {(updates[key] === undefined || updates[key] === this._data[key]) && delete updates[key];});

    if (Object.keys(updates).length === 0)
      return;

    try {
      var sql = pgp.helpers.update(updates, userCols) + ' WHERE id=$1';
      console.log(sql);
      await db.none(sql, [this._data.id]);
    } catch (e) {
      throw e;
    }

    // Update user data.
    Object.keys(updates).forEach(key => {this._data[key] = updates[key];});
  }


  /*
  ** Google methods.
  */

  // Activate Google profile.
  async activateGoogleProfile(profile) {
    var updates = {
      google_active: true,
      google_providerId: profile.id
    };
    try {
      await this.update(updates);
    } catch(e) {
      throw e;
    }
  }
 
}

/*
** ADD FUNCTIONS
*/

// Create new user.
async function newUser(userInfo) {
  try {
    // Insert data.
    userInfo.id = 0;
    var sql = pgp.helpers.insert(userInfo, userCols) + ' RETURNING id';
    console.log(sql);
    var data = await db.one(sql);
    console.log(data);
    // Store generated ID.
    userInfo.id = data.id;

    // Return User object.
    return new User(userInfo);
    
  } catch (e) {
    throw e;
  }
}
module.exports.newUser = newUser;


/*
** FIND FUNCTIONS
*/

// Find user by user ID.
async function findById(userId) {
  try {
    // Find by 'id'.
    var user = await db.oneOrNone("SELECT * FROM $1 where id = $2", [psql.table_user, userId]);

    // Return User object.
    return (user ? new User(user) : null);
    
  } catch(e) {
    throw e;
  }
}
module.exports.findById = findById;


// Find user by email.
async function findByEmail(email) {
  try {
    // Find by 'email'.
    var user = await db.oneOrNone("SELECT * FROM $1 where email = $2", [psql.table_user, email]);

    // Return User object.
    return (user ? new User(user) : null);
    
  } catch(e) {
    throw e;
  }
}
module.exports.findByEmail = findByEmail;


// Find user by Google ID.
async function findByGoogleId(providerId) {
  try {
    // Find by 'google_providerId'.
    var user = await db.oneOrNone("SELECT * FROM $1 where google_id = $2", [psql.table_user, providerId]);

    // Return User object.
    return (user ? new User(user) : null);
    
  } catch(e) {
    throw e;
  }
}
module.exports.findByGoogleId = findByGoogleId;


/*
** HELPER FUNCTIONS
*/

// Parse email from Google profile.
function emailFromGoogleProfile(profile) {
  var email = null;
  for (var i = 0; i < profile.emails.length; i++) {
    if (profile.emails[i].type == "account") {
      email = profile.emails[i].value;
      break;
    }
  }
  return email;
}
module.exports.emailFromGoogleProfile = emailFromGoogleProfile;


// Create new user info object parsing data from Google profile.
function userFromGoogleProfile(profile) {
  email = emailFromGoogleProfile(profile);
  var userobj = {
    id: null,
    given_name: profile.name.givenName,
    family_name: profile.name.familyName,
    email: email,
    username: null,
    password: null,
    birthdate: profile["birthday"],
    photo: profile["photos"] ? profile["photos"][0]["value"] : null,    
    web_active: false,
    google_active: true,
    google_id: profile.id,
    google_accesstoken: null,
    creation_date: (new Date()).toISOString()
  };

  // Return new User object.
  return userobj;
}
module.exports.userFromGoogleProfile = userFromGoogleProfile;
