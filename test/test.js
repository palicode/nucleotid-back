var app = require('../src/https_app.js');
var test = require('supertest')(app);
var assert = require('assert');

// New users test
new_users = [
  {
    test: 'bad email 1',
    status: 400,
    error: 'email',
    user: {
      email: 'mike@mikecom',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'bad email 2',
    status: 400,
    error: 'email',
    user: {
      email: 'mikemikecom',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'bad email 3',
    status: 400,
    error: 'email',
    user: {
      email: '@domain.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'bad email 4',
    status: 400,
    error: 'email',
    user: {
      email: 'mike@,com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'bad email 5',
    status: 400,
    error: 'email',
    user: {
      email: 'mike@domain,com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'bad email 6',
    status: 400,
    error: 'email',
    user: {
      email: 'mike@domain.',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'bad email 7',
    status: 400,
    error: 'email',
    user: {
      email: '@.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'bad email 8',
    status: 400,
    error: 'email',
    user: {
      email: '@',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'correct format',
    status: 200,
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'email exists',
    status: 400,
    error: 'exists',
    user: {
      email: 'mike@mike.com',
      given_name: 'John',
      family_name: 'Simpson',
      password: 'password',
      birthdate: '1981-09-20'
    }
  }

  
];

describe('API /user', () => {
  describe ('POST /user', () => {
    new_users.forEach((new_user) => {
      it(new_user.test, (done) => {
	var out = test.post('/user/')
	    .send(new_user.user)
	    .expect(new_user.status);
	if (new_user.error) {
	  out.expect((res) => {
	    if (!(new RegExp(new_user.error)).test(res.body.error))
	      throw new Error(`Error message did not match provided RE (${new_user.error}): ${res.body.error}`);
	  }).end(done);;
	} else {
	  out.end(done);
	}
      });
    });
  });
});
