const promise = require('bluebird');
const log     = require('./logger').logmodule(module);
const config  = require('../../config')[process.env.NODE_ENV || 'dev'];

// Initialization options
const initOptions = {
  promiseLib: promise
};

// Set up DB connection.
const conn = {
  host: config.database_host,
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
};

log.info(`database options (host: ${conn.host}:${conn.port}, database: ${conn.database})`);

// Require Database
const pgp = require('pg-promise')(initOptions);
const db = pgp(conn);

module.exports.db = db;
module.exports.pgp = pgp;

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

const tables = {
  password_blacklist : 'password_blacklist',
  email_token : 'email_token',
  user : 'user_profile',
  team : 'team_profile',
//  team_member : 'team_member',
  team_permissions : 'team_permissions',
  project : 'project',
  project_permissions : 'project_permissions',
  notebook : 'notebook',
  notebook_step : 'notebook_step',
  auth_session : 'auth_session',
};

module.exports.tables = tables;

const create_tables = [
  "CREATE TABLE IF NOT EXISTS password_blacklist (\
       password            varchar(30)  PRIMARY KEY\
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
    "CREATE TABLE IF NOT EXISTS email_token (\
       token               varchar(256) PRIMARY KEY,\
       user_id             bigint       NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,\
       validated           boolean      NOT NULL,\
       created             timestamptz  NOT NULL,\
       modified            timestamptz\
  );",
  "CREATE TABLE IF NOT EXISTS team_profile (\
       id    	    bigserial    PRIMARY KEY,\
       team_name    varchar(100) NOT NULL,\
       ownerId	    bigint 	 NOT NULL REFERENCES user_profile(id) ON DELETE SET NULL,\
       personal     boolean      NOT NULL,\
       created	    timestamptz  NOT NULL\
   );",
  "CREATE UNIQUE INDEX IF NOT EXISTS personal_team_index ON team_profile (ownerId, personal) WHERE personal = TRUE;",
  "CREATE TABLE IF NOT EXISTS team_permissions (\
       userId	    bigint       NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,\
       teamId	    bigint 	 NOT NULL REFERENCES team_profile(id) ON DELETE CASCADE,\
       read         boolean      NOT NULL DEFAULT FALSE,\
       write        boolean      NOT NULL DEFAULT FALSE,\
       admin        boolean      NOT NULL DEFAULT FALSE,\
       created	    timestamptz  NOT NULL,\
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
       created	    timestamptz  NOT NULL,\
       UNIQUE (userId, projectId)\
   );",
  "CREATE TABLE IF NOT EXISTS notebook (\
       id    	    bigserial    PRIMARY KEY,\
       title 	    varchar(250) NOT NULL,\
       description  text,\
       ownerId 	    bigint 	NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,\
       projectId    bigint      NOT NULL REFERENCES project(id) ON DELETE CASCADE,\
       public       boolean     NOT NULL DEFAULT TRUE,\
       created 	    timestamptz NOT NULL,\
       modified     timestamptz NOT NULL\
   );",
  "CREATE TABLE IF NOT EXISTS notebook_step (\
       notebookId   bigint 	 NOT NULL REFERENCES notebook(id) ON DELETE CASCADE,\
       location     int          NOT NULL,\
       title 	    varchar(250) NOT NULL,\
       description  text 	 NOT NULL,\
       format 	    varchar(50),\
       body	    text,\
       created 	    timestamptz NOT NULL,\
       modified     timestamptz NOT NULL,\
       PRIMARY KEY (notebookId, location)\
   );",
  "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";",
  "CREATE TABLE IF NOT EXISTS auth_session (\
       tokenid      uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),\
       userid       bigint        NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,\
       issued       timestamptz   NOT NULL DEFAULT NOW(),\
       refreshed    timestamptz   NOT NULL DEFAULT NOW()\
   );",
  "CREATE UNIQUE INDEX IF NOT EXISTS token_userid ON auth_session(tokenid, userid);",
  "CREATE INDEX IF NOT EXISTS token_userid ON auth_session(userid);"
  
];

const createDBTables = async () => {
  try {
    for (var i = 0; i < create_tables.length; i++) {
      await db.none(create_tables[i]);
    }
  } catch (err) {
    throw err;
  }
};

module.exports.createDBTables = createDBTables;

module.exports.wipeDBTables = async () => {

  // Create tables.
  try {
    await createDBTables();
  } catch(err) {
    throw err;
  }

  // Clear table contents.
  try {
    for (tn in tables) {
      await db.none("DELETE FROM $1~", tables[tn]);
    }
  } catch (err) {
    throw err;
  }
};
