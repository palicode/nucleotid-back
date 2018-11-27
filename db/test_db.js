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
  console.log("[test_db] awaiting DB to connect...");
  var connected = await connect_retry(q, 15, 2);
  if (!connected) {
    process.exit(1);
  }

  // Initialize database
  console.log("[test_db] wiping DB tables...");
  await db.wipeDBTables();

  console.log("[test_db] inserting test data...");

  // blacklisted passwords
  await q.none('INSERT INTO $1~(password) VALUES($2)', [db.tables.password_blacklist, 'password']);
  await q.none('INSERT INTO $1~(password) VALUES($2)', [db.tables.password_blacklist, '123456']);

  // user profiles
  var user = await q.one('INSERT INTO $1~(id,given_name,family_name,email,password,birthdate,photo,web_active,google_active) VALUES($2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
			 [db.tables.user,
			  0,
			  'Eduard',
			  'Zorita',
			  'eduard.zorita@nucleotid.com',
			  '1C42BB507BD24CA2450E24A0F1AB1A930CA616A47435B1A5AC87DA5A3AD2CEBB299BDD98D8661CEE384935417C9B5ED084F2C6CF2D57BE1AB6C1937012C61A21', //SHA512('maxmix123')
			  new Date('1988-01-01').toISOString(),
			  'https://i1.rgstatic.net/ii/profile.image/315640353624067-1452265932482_Q512/Eduard_Valera_Zorita.jpg',
			  false,
			  false
			 ]);
  await q.one('INSERT INTO $1~(id,given_name,family_name,email,password,birthdate,photo,web_active,google_active) VALUES($2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
	      [db.tables.user,
	       1,
	       'Michael',
	       'Douglas',
	       'mike.dougly@nucleotid.com',
	       '9511393558AC7202E61EB7BA9A2D3FC1FA9CA151AFF4271C1475BD11A7BE5DC72DC8E0B2E8EA3D44DA476DB43728E1A2A4BCB08A63B2E724603B9EEBD268CE5A', // SHA512('dougly123')
	       new Date('1978-01-01').toISOString(),
	       'https://somefakewebsite.com/dougly.jpg',
	       false,
	       false
	      ]);


  // email validation token (UUID:3f4ec110-7eaf-4e28-a9af-3959a96ca100, etoken: M2Y0ZWMxMTAtN2VhZi00ZTI4LWE5YWYtMzk1OWE5NmNhMTAw)
  await q.none('INSERT INTO $1~(token, user_id, validated) VALUES($2,$3,$4)', [db.tables.email_token, '3f4ec110-7eaf-4e28-a9af-3959a96ca100', user.id, false]);

  // active sessions
  await q.none('INSERT INTO $1~(tokenid,userid) VALUES($2,$3)', [db.tables.auth_session, 'fccb3346-7346-4501-a331-2a491dbc8d58', user.id]);
  await q.none('INSERT INTO $1~(tokenid,userid) VALUES($2,$3)', [db.tables.auth_session, 'accb3346-7346-4501-a331-2a491dbc8d58', user.id]);
  await q.none('INSERT INTO $1~(tokenid,userid) VALUES($2,$3)', [db.tables.auth_session, 'bccb3346-7346-4501-a331-2a491dbc8d58', user.id]);

  console.log("[test_db] done.");
};

set_db();
