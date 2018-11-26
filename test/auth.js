const app = require('../src/https_app.js');
const itertest = require('./itertest');
const test = require('supertest')(app);

var test_users = [
  {
    test: 'new user authtest@email.com:passw0rd123',
    status: 200,
    data: {
      email: 'authtest@email.com',
      given_name: 'Test',
      family_name: 'Surname',
      password: 'passw0rd123'
    }
  },
  {
    test: 'new user authdummy@email.com:dummyPassword',
    status: 200,
    data: {
      email: 'authdummy@email.com',
      given_name: 'Dummy',
      family_name: 'Surname',
      password: 'dummyPassword'
    }
  },
];

var tests_login = [
  {
    test: 'missing data',
    status: 400,
    error: 'authentication data',
    data: {}
  },
  {
    test: 'missing email',
    status: 400,
    error: 'authentication data',
    data: {
      auth: {
	password: 'notblacklistedpassw0rd'
      }
    }
  },
  {
    test: 'missing password',
    status: 400,
    error: 'authentication data',
    data: {
      auth: {
	email: 'mike@mike.com'
      }
    }
  },
  {
    test: 'no auth object',
    status: 400,
    error: 'authentication data',
    data: {
      email: 'authdummy@email.com',
      password: 'dummyPassword',
    }
  },
  {
    test: 'wrong email',
    status: 401,
    error: 'authentication failed',
    data: {
      auth: {
	email: 'fake@email.com',
	password: 'passw0rd123',
      }
    }
  },
  {
    test: 'wrong password',
    status: 401,
    error: 'authentication failed',
    data: {
      auth: {
	email: 'authdummy@email.com',
	password: 'passw0rd123',
      }
    }
  },
  {
    test: 'successful authdummy@email.com',
    status: 200,
    data: {
      auth: {
	email: 'authdummy@email.com',
	password: 'dummyPassword',
      }
    },
    parse: (res) => {
      if (!res.body.access_token || !res.body.refresh_token) {
	throw new Error("Successful login did not return 'access_token' and 'refresh_token'");
      }
    }
  }
];

var tests_refresh = [
  {
    test: 'missing token',
    status: 400,
    error: 'refresh_token',
  },
  {
    test: 'fake token',
    status: 400,
    error: 'token.+format',
    data: {
      refresh_token: "123"
    }
  },
  {
    test: 'fake token 2',
    status: 400,
    error: 'token.+format',
    data: {
      refresh_token: "uafajhFAfjfdhfsjfsjfsd.ajhajfhJFHJKASFhsajda.AKJSF21931kdaskjAF"
    }
  },
  {
    test: 'token algorithm',
    status: 400,
    error: 'algorithm',
    data: {
      refresh_token: "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.pazba9Pj009HgANP4pTCQAHpXNU7pVbjIGff_plktSzsa9rXTGzFngaawzXGEO6Q0Hx5dtGi-dMDlIadV81o3Q"
    }
  },
  {
    test: 'token type',
    status: 400,
    error: 'type',
    data: {
      refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6Ik9BVVRIIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.6MNnNHSp6cyFCso_NOu7pis7-tO3UX2zcj9DOUDFYj8"
    }
  },
  {
    test: 'token payload (missing uid and tokenid)',
    status: 400,
    error: 'payload',
    data: {
      refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    }
  },
  {
    test: 'token payload (missing uid)',
    status: 400,
    error: 'payload',
    data: {
      refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbmlkIjo5OTg5OTM0Miwid2hhdGV2ZXIiOiJ5ZWFoIn0.34_biw6F2sbZ_t0dK_sp9B7Q-syePjlSrm21R2-Ru_E"
    }
  },
  {
    test: 'token payload (missing tokenid)',
    status: 400,
    error: 'payload',
    data: {
      refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tpZCI6OTk4OTkzNDIsInVpZCI6OTZ9.r4Y7w6d3ymXKQd4o5JXGaRDHKsQE_PrnUDtaBiLg_NA"
    }
  },
  {
    test: 'wrong signature',
    status: 400,
    error: 'signature',
    data: {
      refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbmlkIjo5OTg5OTM0MiwidWlkIjo5Nn0.3XDzIaxU8Y_cP-IEIIqIEL6t-YMiJlaIxhmNkWqI_98"
    }
  },
  {
    test: 'tokenid not UUIDv4',
    status: 400,
    error: 'tokenid',
    data: {
      refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbmlkIjo5OTg5OTM0MiwidWlkIjo5Nn0.dS5dzrBmOZ5Mvoc5MyYK5mJKCTeVAK74cWlug34i1rE"
    }
  },
  {
    test: 'signed but not in DB (revoked)',
    status: 401,
    error: 'revoked',
    data: {
      refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjEyLCJ0b2tlbmlkIjoiM2Q0ZGFhMjAtM2IxNC00NzU2LWJjODItZDk0NGZkMmFkNTg1In0.6gNh72EZeaSU5d1D7KosqUHHPnxe081iUbv1VdReQAk"
    }
  },
  {
    test: 'successful',
    status: 200,
    data: {
      // Token: alg: HS256, typ: JWT, uid: 0, tokenid: 00000000-0000-1000-8000-000000000000, sign-key: AuthSignatureSecret
      refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjAsInRva2VuaWQiOiJmY2NiMzM0Ni03MzQ2LTQ1MDEtYTMzMS0yYTQ5MWRiYzhkNTgifQ.CU8uCJwXMA3to3txxfHMfTZ7t4FLpZjxtIxSWKddVUM'
    }
  }

];

var tests_logout = [
  {
    test: 'no Authentication header',
    status: 401,
    error: 'not authenticated'
  },
  {
    test: 'wrong authentication protocol',
    headers: [['Authentication', 'k1k3123k421k1941u210.1ij124o128121k1jf12.1j12i312310312']],
    status: 400,
    error: 'authentication protocol not supported'
  },
  {
    test: 'fake authentication token',
    headers: [['Authentication', 'Bearer k1k3123k421k1941u210.1ij124o128121k1jf12.1j12i312310312']],
    status: 400,
    error: 'token format'
  },
    {
    test: 'authentication token expired',
    // Token: alg: HS256, typ: JWT, uid: 21313, tokenid: fccb3346, max_valid: 978307200000 (2001-01-01), min_valid: 946684800000 (2000-01-01), sign-key: AuthSignatureSecret
    headers: [['Authentication', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjIxMzEzLCJ0b2tlbmlkIjoiZmNjYjMzNDYiLCJtYXhfdmFsaWQiOjk3ODMwNzIwMDAwMCwibWluX3ZhbGlkIjo5NDY2ODQ4MDAwMDB9.kSNZ2a9Q6izl1YyNYt63Gx95af3uBTxVzvD_a2O9MjY']],
    status: 400,
    error: 'expired'
  },
  {
    test: 'golden token: worng uid',
    // Token: alg: HS256, typ: JWT, uid: 21313, tokenid: fccb3346, max_valid: 4102358400000 (2099-12-31), min_valid: 946684800000 (2000-01-01), sign-key: AuthSignatureSecret
    headers: [['Authentication', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjIxMzEzLCJ0b2tlbmlkIjoiZmNjYjMzNDYiLCJtYXhfdmFsaWQiOjQxMDIzNTg0MDAwMDAsIm1pbl92YWxpZCI6OTQ2Njg0ODAwMDAwfQ.R_5qqC7BHURDY5cMhtXANdl2BckrLco-2VKwyhrwaoI']],
    status: 401,
    error: 'session does not exist'
  },
  {
    test: 'golden token: worng tokenid',
    // Token: alg: HS256, typ: JWT, uid: 0, tokenid: dccb3346, max_valid: 4102358400000 (2099-12-31), min_valid: 946684800000 (2000-01-01), sign-key: AuthSignatureSecret
    headers: [['Authentication', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjIxMzEzLCJ0b2tlbmlkIjoiZGNjYjMzNDYiLCJtYXhfdmFsaWQiOjQxMDIzNTg0MDAwMDAsIm1pbl92YWxpZCI6OTQ2Njg0ODAwMDAwfQ.-jMwv7sKWuPxyrJsr0QuX0sJusRK9ihuDCQ_YHc8wj0']],
    status: 401,
    error: 'session does not exist'
  },
  {
    test: 'logout success: session 00000000',
    // Token: alg: HS256, typ: JWT, uid: 0, tokenid: fccb3346, max_valid: 4102358400000 (2099-12-31), min_valid: 946684800000 (2000-01-01), sign-key: AuthSignatureSecret
    headers: [['Authentication', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjAsInRva2VuaWQiOiJmY2NiMzM0NiIsIm1heF92YWxpZCI6NDEwMjM1ODQwMDAwMCwibWluX3ZhbGlkIjo5NDY2ODQ4MDAwMDB9.MYBsW7Y9oHyFX0T2dLoJRDrp_gP1m_pmgvItTSYC1zg']],
    status: 200
  }
];


var tests_terminate = [
    {
    test: 'no Authentication header',
    status: 401,
    error: 'not authenticated'
  },
  {
    test: 'wrong authentication protocol',
    headers: [['Authentication', 'k1k3123k421k1941u210.1ij124o128121k1jf12.1j12i312310312']],
    status: 400,
    error: 'authentication protocol not supported'
  },
  {
    test: 'fake authentication token',
    headers: [['Authentication', 'Bearer k1k3123k421k1941u210.1ij124o128121k1jf12.1j12i312310312']],
    status: 400,
    error: 'token format'
  },
    {
    test: 'authentication token expired',
    // Token: alg: HS256, typ: JWT, uid: 21313, tokenid: 00000000, max_valid: 978307200000 (2001-01-01), min_valid: 946684800000 (2000-01-01), sign-key: AuthSignatureSecret
    headers: [['Authentication', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjIxMzEzLCJ0b2tlbmlkIjoiZmNjYjMzNDYiLCJtYXhfdmFsaWQiOjk3ODMwNzIwMDAwMCwibWluX3ZhbGlkIjo5NDY2ODQ4MDAwMDB9.kSNZ2a9Q6izl1YyNYt63Gx95af3uBTxVzvD_a2O9MjY']],
    status: 400,
    error: 'expired'
  },
  {
    test: 'golden token: worng uid',
    // Token: alg: HS256, typ: JWT, uid: 21313, tokenid: 00000000, max_valid: 4102358400000 (2099-12-31), min_valid: 946684800000 (2000-01-01), sign-key: AuthSignatureSecret
    headers: [['Authentication', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjIxMzEzLCJ0b2tlbmlkIjoiZmNjYjMzNDYiLCJtYXhfdmFsaWQiOjQxMDIzNTg0MDAwMDAsIm1pbl92YWxpZCI6OTQ2Njg0ODAwMDAwfQ.R_5qqC7BHURDY5cMhtXANdl2BckrLco-2VKwyhrwaoI']],
    status: 401,
    error: 'session does not exist'
  },
  {
    test: 'golden token: worng tokenid',
    // Token: alg: HS256, typ: JWT, uid: 0, tokenid: 0000000f, max_valid: 4102358400000 (2099-12-31), min_valid: 946684800000 (2000-01-01), sign-key: AuthSignatureSecret
    headers: [['Authentication', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjIxMzEzLCJ0b2tlbmlkIjoiZGNjYjMzNDYiLCJtYXhfdmFsaWQiOjQxMDIzNTg0MDAwMDAsIm1pbl92YWxpZCI6OTQ2Njg0ODAwMDAwfQ.-jMwv7sKWuPxyrJsr0QuX0sJusRK9ihuDCQ_YHc8wj0']],
    status: 401,
    error: 'session does not exist'
  },
  {
    test: 'golden token: session 00000000 does not exist',
    // Token: alg: HS256, typ: JWT, uid: 0, tokenid: 00000000, max_valid: 4102358400000 (2099-12-31), min_valid: 946684800000 (2000-01-01), sign-key: AuthSignatureSecret
    headers: [['Authentication', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjAsInRva2VuaWQiOiJmY2NiMzM0NiIsIm1heF92YWxpZCI6NDEwMjM1ODQwMDAwMCwibWluX3ZhbGlkIjo5NDY2ODQ4MDAwMDB9.MYBsW7Y9oHyFX0T2dLoJRDrp_gP1m_pmgvItTSYC1zg']],
    status: 401,
    error: 'session does not exist'
  },
  {
    test: 'terminate success: session 10000000',
    // Token: alg: HS256, typ: JWT, uid: 0, tokenid: bccb3346, max_valid: 4102358400000 (2099-12-31), min_valid: 946684800000 (2000-01-01), sign-key: AuthSignatureSecret
    headers: [['Authentication', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjAsInRva2VuaWQiOiJiY2NiMzM0NiIsIm1heF92YWxpZCI6NDEwMjM1ODQwMDAwMCwibWluX3ZhbGlkIjo5NDY2ODQ4MDAwMDB9.bkXiInn0O4QXeBWHJkwOR7dHO0v5X8vl4ImM7vEeMVE']],
    status: 200
  }
];

describe('API /auth', () => {
  describe ('Create test users', () => {
    itertest(test, test_users, '/user/', 'post');
  }); 
  describe ('POST /login', () => {
    itertest(test, tests_login, '/auth/login', 'post');
  });
  describe ('POST /refresh', () => {
    itertest(test, tests_refresh, '/auth/refresh', 'post');
  });
  describe ('GET /logout', () => {
    itertest(test, tests_logout, '/auth/logout', 'get');
  });
  describe ('GET /terminate', () => {
    itertest(test, tests_terminate, '/auth/terminate', 'get');
  });

});
