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
** DATABASE TABLES
*/
module.exports.table_user = 'user_profile';
module.exports.table_group = 'group_profile';
module.exports.table_group_member = 'group_member';
module.exports.table_group_permissions = 'group_permissions';
module.exports.table_project = 'project';
module.exports.table_project_permissions = 'project_permissions';
module.exports.table_notebook = 'notebook';
module.exports.table_notebook_step_header = 'notebook_step_header';
module.exports.table_notebook_step_body = 'notebook_step_body';

var tables = [
  "CREATE TABLE IF NOT EXISTS user_profile (\
       id    	    	   bigserial	PRIMARY KEY,\
       given_name    	   varchar(50) 	NOT NULL,\
       family_name	   varchar(100) NOT NULL,\
       email		   varchar(100) NOT NULL,\
       username		   varchar(20),\
       password		   varchar(256),\
       birthdate	   date,\
       photo		   varchar(512),\
       web_active	   boolean	NOT NULL,\
       google_active	   boolean 	NOT NULL,\
       google_id	   varchar(100),\
       google_accesstoken  varchar(100),\
       created 		   timestamptz 	NOT NULL\
   );",
  "CREATE TABLE IF NOT EXISTS group_profile (\
       id    	    bigserial    PRIMARY KEY,\
       group_name   varchar(100) NOT NULL,\
       ownerId	    bigint 	 NOT NULL REFERENCES user_profile(id) ON DELETE SET NULL,\
       created	    timestamptz  NOT NULL\
   );",
  "CREATE TABLE IF NOT EXISTS group_permissions (\
       userId	    bigint       NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,\
       groupId	    bigint 	 NOT NULL REFERENCES group_profile(id) ON DELETE CASCADE,\
       read         boolean      NOT NULL DEFAULT FALSE,\
       write        boolean      NOT NULL DEFAULT FALSE,\
       create       boolean      NOT NULL DEFAULT FALSE,\
       delete       boolean      NOT NULL DEFAULT FALSE,\
       admin        boolean      NOT NULL DEFAULT FALSE,\
       created	    timtestamptz NOT NULL,\
       UNIQUE (userId, groupId)\
   );",
  "CREATE TABLE IF NOT EXISTS project (\
       id           bigserial    PRIMARY KEY,\
       title        varchar(250) NOT NULL,\
       description  text         NOT NULL,\
       ownerId      bigint       NOT NULL REFERENCES user_profile(id) ON DELETE SET NULL,\
       groupId      bigint       NOT NULL REFERENCES group_profile(id) ON DELETE CASCADE,\
       created      timestamptz  NOT NULL,\
       modified     timestamptz  NOT NULL\
   );",
    "CREATE TABLE IF NOT EXISTS project_permissions (\
       userId	    bigint       NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,\
       projectId    bigint 	 NOT NULL REFERENCES project(id) ON DELETE CASCADE,\
       read         boolean      NOT NULL DEFAULT FALSE,\
       write        boolean      NOT NULL DEFAULT FALSE,\
       create       boolean      NOT NULL DEFAULT FALSE,\
       delete       boolean      NOT NULL DEFAULT FALSE,\
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
       created 	    timestamptz NOT NULL,\
       modified     timestamptz NOT NULL\
   );",
  "CREATE TABLE IF NOT EXISTS notebook_step_header (\
       id    	    bigserial	 PRIMARY KEY,\
       notebookId   bigint 	 NOT NULL REFERENCES notebook(id) ON DELETE CASCADE,\
       title 	    varchar(250) NOT NULL,\
       description  text 	 NOT NULL,\
       format 	    varchar(50)  NOT NULL,\
   );",
  "CREATE TABLE IF NOT EXISTS notebook_step_body {\
       headerId	bigint NOT NULL UNIQUE REFERENCES notebook_step_header(id) ON DELETE CASCADE,\
       body	text\
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
