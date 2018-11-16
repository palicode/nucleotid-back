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
      password: 'notblacklistedpassw0rd'
    }
  },
  {
    test: 'missing password',
    status: 400,
    error: 'authentication data',
    data: {
      email: 'mike@mike.com'
    }
  },
  {
    test: 'wrong email',
    status: 401,
    error: 'authentication failed',
    data: {
      email: 'fake@email.com',
      password: 'passw0rd123',
    }
  },
  {
    test: 'wrong password',
    status: 401,
    error: 'authentication failed',
    data: {
      email: 'authdummy@email.com',
      password: 'passw0rd123',
    }
  },
  {
    test: 'successful authdummy@email.com',
    status: 200,
    data: {
      email: 'authdummy@email.com',
      password: 'dummyPassword',
    },
    parse: (res) => {
      if (!res.body.access_token || !res.body.refresh_token) {
	throw new Error("Successful login did not return 'access_token' and 'refresh_token'");
      }
    }
  }
];


describe('API /auth', () => {
  describe ('Create test users', () => {
    itertest(test, test_users, '/user/', 'post');
  }); 
  describe ('POST /login', () => {
    itertest(test, tests_login, '/auth/login', 'post');
  });
});
