const promise = require('bluebird');

// Initialization options
const initOptions = {
  promiseLib: promise
};

// Set up DB connection.
const connectionOptions = {
  host: process.env.NUCLEOTID_DB_HOST,
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
};

// Require Database
const pgp = require('pg-promise')(initOptions);
const db = pgp(connectionOptions);

// Test connection.
db.connect()
  .then(obj => {
    console.log('Connection to DB: SUCCESS.');
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

module.exports.db = db;

/*
** DATABASE QUERIES
*/

module.exports.updateModifiedById = async (table, id) => {
  try {
    await db.none("UPDATE $1 SET modified = GETDATE() WHERE id=$2",
		  [table, id]);
  } catch (err) {
    throw err;
  }
};

/*
** DATABASE TABLES
*/
module.exports.table_password_blacklist = 'password_blacklist';
module.exports.table_email_token = 'email_token';
module.exports.table_user = 'user_profile';
module.exports.table_team = 'team_profile';
module.exports.table_team_member = 'team_member';
module.exports.table_team_permissions = 'team_permissions';
module.exports.table_project = 'project';
module.exports.table_project_permissions = 'project_permissions';
module.exports.table_notebook = 'notebook';
module.exports.table_notebook_step = 'notebook_step';

var tables = [
  "CREATE TABLE IF NOT EXISTS password_blacklist (\
       text                varchar(30)  PRIMARY KEY\
  );",
  "CREATE TABLE IF NOT EXISTS email_token (\
       token               varchar(256) PRIMARY KEY,\
       user_id             bigint       NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,\
       validated           boolean      NOT NULL,\
       created             timestamptz  NOT NULL,\
       modified            timestamptz\
  );",
  "CREATE TABLE IF NOT EXISTS user_profile (\
       id    	    	   bigserial	PRIMARY KEY,\
       given_name    	   varchar(50) 	NOT NULL,\
       family_name	   varchar(100) NOT NULL,\
       email		   varchar(100) NOT NULL,\
       password		   varchar(256),\
       birthdate	   date,\
       photo		   varchar(512),\
       web_active	   boolean	NOT NULL,\
       google_active	   boolean 	NOT NULL,\
       google_id	   varchar(100),\
       google_accesstoken  varchar(100),\
       created 		   timestamptz 	NOT NULL,\
       UNIQUE(email)\
   );",
  "CREATE TABLE IF NOT EXISTS team_profile (\
       id    	    bigserial    PRIMARY KEY,\
       team_name    varchar(100) NOT NULL,\
       ownerId	    bigint 	 NOT NULL REFERENCES user_profile(id) ON DELETE SET NULL,\
       personal     boolean      NOT NULL,\
       created	    timestamptz  NOT NULL,\
       UNIQUE (ownerId, personal) WHERE personal=TRUE\
   );",
  "CREATE UNIQUE INDEX ON team_profile (ownerId, personal) WHERE personal = TRUE;",
  "CREATE TABLE IF NOT EXISTS team_permissions (\
       userId	    bigint       NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,\
       teamId	    bigint 	 NOT NULL REFERENCES team_profile(id) ON DELETE CASCADE,\
       read         boolean      NOT NULL DEFAULT FALSE,\
       write        boolean      NOT NULL DEFAULT FALSE,\
       create       boolean      NOT NULL DEFAULT FALSE,\
       delete       boolean      NOT NULL DEFAULT FALSE,\
       admin        boolean      NOT NULL DEFAULT FALSE,\
       created	    timtestamptz NOT NULL,\
       UNIQUE (userId, teamId)\
   );",
  "CREATE TABLE IF NOT EXISTS project (\
       id           bigserial    PRIMARY KEY,\
       title        varchar(250) NOT NULL,\
       description  text         NOT NULL,\
       ownerId      bigint       NOT NULL REFERENCES user_profile(id) ON DELETE SET NULL,\
       teamId       bigint       NOT NULL REFERENCES team_profile(id) ON DELETE CASCADE,\
       public       boolean      NOT NULL DEFAULT TRUE,\
       created      timestamptz  NOT NULL,\
       modified     timestamptz  NOT NULL\
   );",
    "CREATE TABLE IF NOT EXISTS project_permissions (\
       userId	    bigint       NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,\
       projectId    bigint 	 NOT NULL REFERENCES project(id) ON DELETE CASCADE,\
       read         boolean      NOT NULL DEFAULT FALSE,\
       write        boolean      NOT NULL DEFAULT FALSE,\
       admin        boolean      NOT NULL DEFAULT FALSE,\
       created	    timtestamptz NOT NULL,\
       UNIQUE (userId, projectId)\
   );",
  "CREATE TABLE IF NOT EXISTS notebook (\
       id    	    bigserial   PRIMARY KEY,\
       title 	    vachar(250) NOT NULL,\
       description  text,\
       ownerId 	    bigint 	NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,\
       projectId    bigint      NOT NULL REFERENCES project(id) ON DELETE CASCADE,\
       public       boolean     NOT NULL DEFAULT TRUE,\
       created 	    timestamptz NOT NULL,\
       modified     timestamptz NOT NULL\
   );",
  "CREATE TABLE IF NOT EXISTS notebook_step (\
       notebookId   bigint 	 NOT NULL REFERENCES notebook(id) ON DELETE CASCADE,\
       order        int          NOT NULL,\
       title 	    varchar(250) NOT NULL,\
       description  text 	 NOT NULL,\
       format 	    varchar(50),\
       body	    text\
       created 	    timestamptz NOT NULL,\
       modified     timestamptz NOT NULL,\
       PRIMARY KEY (notebookId, order)\
   );"
];

module.exports.createDBTables = async () => {
  try {
    for (var i = 0; i < tables.length; i++) {
      await db.none(tables[i]);
    }
  } catch(err) {
    console.log(err);
  }
};
