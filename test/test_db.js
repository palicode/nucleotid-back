const db = require('../src/modules/db');
const q  = db.db;

set_db = async function() {
  await db.wipeDBTables();

  await q.none('INSERT INTO $1~(password) VALUES($2)', [db.tables.password_blacklist, 'password']);
  await q.none('INSERT INTO $1~(password) VALUES($2)', [db.tables.password_blacklist, '123456']);
};

set_db();
