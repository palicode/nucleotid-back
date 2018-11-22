const db = require('../src/modules/db');
const q  = db.db;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function connect_retry(db, n, t) {
  // Await for connection -- postgres takes time to start-up in docker-compose
  // n attempts, one every t seconds.
  var err = 0;
  while (err < n) {
    try {
      await q.proc('version');
      return true;
    } catch (e) {
      err += 1;
      await sleep(t*1000);
    }
  }
  return false;
}

async function set_db() {
  // Await DB connection.
  var connected = await connect_retry(q, 15, 2);
  if (!connected) {
    process.exit(1);
  }
  // Initialize database
  await db.wipeDBTables();

  // blacklisted passwords
  await q.none('INSERT INTO $1~(password) VALUES($2)', [db.tables.password_blacklist, 'password']);
  await q.none('INSERT INTO $1~(password) VALUES($2)', [db.tables.password_blacklist, '123456']);

  // user profiles
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

  // email validation token (UUID:3f4ec110-7eaf-4e28-a9af-3959a96ca100, etoken: M2Y0ZWMxMTAtN2VhZi00ZTI4LWE5YWYtMzk1OWE5NmNhMTAw)
  await q.none('INSERT INTO $1~(token, user_id, validated) VALUES($2,$3,$4)', [db.tables.email_token, '3f4ec110-7eaf-4e28-a9af-3959a96ca100', user.id, false]);

  // active sessions
  await q.none('INSERT INTO $1~(tokenid,userid) VALUES($2,$3)', [db.tables.auth_session, 'fccb3346-7346-4501-a331-2a491dbc8d58', user.id]);
  await q.none('INSERT INTO $1~(tokenid,userid) VALUES($2,$3)', [db.tables.auth_session, 'accb3346-7346-4501-a331-2a491dbc8d58', user.id]);
  await q.none('INSERT INTO $1~(tokenid,userid) VALUES($2,$3)', [db.tables.auth_session, 'bccb3346-7346-4501-a331-2a491dbc8d58', user.id]);
};

set_db();
