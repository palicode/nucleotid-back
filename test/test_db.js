const db = require('../src/modules/db');
const q  = db.db;

set_db = async function() {
  await db.wipeDBTables();

  await q.none('INSERT INTO $1~(password) VALUES($2)', [db.tables.password_blacklist, 'password']);
  await q.none('INSERT INTO $1~(password) VALUES($2)', [db.tables.password_blacklist, '123456']);
  var user = await q.one('INSERT INTO $1~(id,given_name,family_name,email,password,web_active,google_active,created) VALUES($2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
			 [db.tables.user,
			  0,
			  'Eduard',
			  'Zorita',
			  'eduard.zorita@nucleotid.com',
			  '1C42BB507BD24CA2450E24A0F1AB1A930CA616A47435B1A5AC87DA5A3AD2CEBB299BDD98D8661CEE384935417C9B5ED084F2C6CF2D57BE1AB6C1937012C61A21', //SHA512('maxmix123')
			  true,
			  false,
			  (new Date()).toISOString()
			 ]);
  await q.none('INSERT INTO $1~(tokenid,userid) VALUES($2,$3)', [db.tables.auth_session, '00000000-0000-1000-8000-000000000000', user.id]);
  await q.none('INSERT INTO $1~(tokenid,userid) VALUES($2,$3)', [db.tables.auth_session, '10000000-0000-1000-8000-000000000000', user.id]);
  await q.none('INSERT INTO $1~(tokenid,userid) VALUES($2,$3)', [db.tables.auth_session, '20000000-0000-1000-8000-000000000000', user.id]);
};

set_db();
