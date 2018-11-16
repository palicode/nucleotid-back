var app = require('../src/https_app.js');
var test = require('supertest')(app);
var assert = require('assert');

// New users test
new_users = [
  {
    test: 'missing email',
    status: 400,
    error: 'email',
    user: {
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'missing given_name',
    status: 400,
    error: 'given_name',
    user: {
      email: 'mike@mike.com',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'missing family_name',
    status: 400,
    error: 'family_name',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'missing password',
    status: 400,
    error: 'password',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'email format 1',
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
    test: 'email format 2',
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
    test: 'email format 3',
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
    test: 'email format 4',
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
    test: 'email format 5',
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
    test: 'email format 6',
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
    test: 'email format 7',
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
    test: 'email format 8',
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
    test: 'email format 9',
    status: 400,
    error: 'email',
    user: {
      email: '',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'email format 10',
    status: 400,
    error: 'email',
    user: {
      email: 'mi(k)e@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'email empty',
    status: 400,
    error: 'email',
    user: {
      email: '',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },

  {
    test: 'email max length',
    status: 400,
    error: 'email',
    user: {
      email: 'jdufkgjfheurythgjfkdlskdjfhgytkejdhncjkfkdj@jksajsdjsdsd.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'given_name format 1',
    status: 400,
    error: 'given_name',
    user: {
      email: 'mike@mike.com',
      given_name: 'Michael van Gogh sin',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },

  {
    test: 'given_name format 2',
    status: 400,
    error: 'given_name',
    user: {
      email: 'mike@mike.com',
      given_name: 'M1ke',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
    {
    test: 'given_name format 3',
    status: 400,
    error: 'given_name',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike (God)',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'given_name format 4',
    status: 400,
    error: 'given_name',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike*',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'given_name empty',
    status: 400,
    error: 'given_name',
    user: {
      email: 'mike@mike.com',
      given_name: '',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
    {
    test: 'given_name min length',
    status: 400,
    error: 'given_name',
    user: {
      email: 'mike@mike.com',
      given_name: 'M',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'given_name max length',
    status: 400,
    error: 'given_name',
    user: {
      email: 'mike@mike.com',
      given_name: 'Michaelangelodasouzabatmanbinsupraman',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'family_name format 1',
    status: 400,
    error: 'family_name',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield von Bismarck Deux',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'family_name format 2',
    status: 400,
    error: 'family_name',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield2',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'family_name format 3',
    status: 400,
    error: 'family_name',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield (Genius)',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'family_name format 4',
    status: 400,
    error: 'family_name',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield*von Bismarck',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'family_name min length',
    status: 400,
    error: 'family_name',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'S',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'family_name max length',
    status: 400,
    error: 'family_name',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'SpringfieldVeryLongFamilyNameThisIsMoreThanFiftyCharacters',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'password min length',
    status: 400,
    error: 'password',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'pass',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'password max length',
    status: 400,
    error: 'password',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'ThisIsAVeryLongPasswordThatNoUserWillEverRemember',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'password blacklist',
    status: 400,
    error: 'blacklist',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'password',
      birthdate: '1992-03-21'
    }
  },
  {
    test: 'birthdate format 1',
    status: 400,
    error: 'birthdate',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'thisisagoodpassword',
      birthdate: '1992--03'
    }
  },
  {
    test: 'birthdate format 2',
    status: 400,
    error: 'birthdate',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'thisisagoodpassword',
      birthdate: '31-12-1988'
    }
  },
  {
    test: 'birthdate format 3',
    status: 400,
    error: 'birthdate',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'thisisagoodpassword',
      birthdate: '1988-21-12'
    }
  },
  {
    test: 'birthdate format 4',
    status: 400,
    error: 'birthdate',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'thisisagoodpassword',
      birthdate: 'fkfskfdfs'
    }
  },
  {
    test: 'birthdate format 5',
    status: 400,
    error: 'birthdate',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'thisisagoodpassword',
      birthdate: '1st of May of 1988'
    }
  },
  {
    test: 'birthdate too old',
    status: 400,
    error: 'birthdate',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'thisisagoodpassword',
      birthdate: '1830-05-24'
    }
  },
  {
    test: 'birthdate future',
    status: 400,
    error: 'birthdate',
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'thisisagoodpassword',
      birthdate: '2099-01-12'
    }
  },
  {
    test: 'correct format',
    status: 200,
    user: {
      email: 'mike@mike.com',
      given_name: 'Mike',
      family_name: 'Springfield',
      password: 'notblacklistedpwd',
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
      password: 'anotherOKpassword',
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
