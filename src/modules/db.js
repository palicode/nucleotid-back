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

module.exports = db;
