var app = require('../src/https_app.js');
var test = require('supertest')(app);
var assert = require('assert');

// New users
new_users = [
  {
    test: 'bad email 1',
    user: {
      email: 'mike@mikecom',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }, status: 400
  },
  {
    test: 'bad email 2',
    user: {
      email: 'mikemikecom',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }, status: 400
  },
  {
    test: 'bad email 3',
    user: {
      email: '@domain.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }, status: 400
  },
  {
    test: 'bad email 4',
    user: {
      email: 'mike@,com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }, status: 400
  },
  {
    test: 'bad email 5',
    user: {
      email: 'mike@domain,com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }, status: 400
  },
  {
    test: 'bad email 6',
    user: {
      email: 'mike@domain.',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }, status: 400
  },
  {
    test: 'bad email 7',
    user: {
      email: '@.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }, status: 400
  },
  {
    test: 'bad email 8',
    user: {
      email: '@',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }, status: 400
  },

  {
    test: 'format ok',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }, status: 200
  }
  
];

describe('API /user', () => {
  describe ('POST /user', () => {
    new_users.forEach((new_user) => {
      it(new_user.test, (done) => {
	test.post('/user/')
	  .send(new_user.user)
	  .expect(new_user.status)
	  .end(done);
      });
    });
  });
  it('GET /user/1', function(done) {
    test.get('/user/1')
      .expect(404)
      .end(done);
  });

});
