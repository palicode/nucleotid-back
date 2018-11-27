const app = require('../src/https_app.js');
const test = require('supertest')(app);
const itertest = require('./itertest');
const assert = require('assert');

// New users test
tests_new_user = [
  {
    test: 'missing email',
    status: 400,
    error: 'email',
    data: {
      user: {
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'missing given_name',
    status: 400,
    error: 'given_name',
    data: {
      user: {
	email: 'mike@mike.com',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'missing family_name',
    status: 400,
    error: 'family_name',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'missing password',
    status: 400,
    error: 'password',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	family_name: 'Springfield',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'email format 1',
    status: 400,
    error: 'email',
    data: {
      user: {
	email: 'mike@mikecom',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'email format 2',
    status: 400,
    error: 'email',
    data: {
      user: {
	email: 'mikemikecom',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'email format 3',
    status: 400,
    error: 'email',
    data: {
      user: {
	email: '@domain.com',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'email format 4',
    status: 400,
    error: 'email',
    data: {
      user: {
	email: 'mike@,com',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'email format 5',
    status: 400,
    error: 'email',
    data: {
      user: {
	email: 'mike@domain,com',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'email format 6',
    status: 400,
    error: 'email',
    data: {
      user: {
	email: 'mike@domain.',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'email format 7',
    status: 400,
    error: 'email',
    data: {
      user: {
	email: '@.com',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'email format 8',
    status: 400,
    error: 'email',
    data: {
      user: {
	email: '@',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'email format 9',
    status: 400,
    error: 'email',
    data: {
      user: {
	email: '',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'email format 10',
    status: 400,
    error: 'email',
    data: {
      user: {
	email: 'mi(k)e@mike.com',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'email empty',
    status: 400,
    error: 'email',
    data: {
      user: {
	email: '',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },

  {
    test: 'email max length',
    status: 400,
    error: 'email',
    data: {
      user: {
	email: 'jdufkgjfheurythgjfkdlskdjfhgytkejdhncjkfkdj@jksajsdjsdsd.com',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'given_name format 1',
    status: 400,
    error: 'given_name',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Michael van Gogh sin',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },

  {
    test: 'given_name format 2',
    status: 400,
    error: 'given_name',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'M1ke',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
    {
    test: 'given_name format 3',
    status: 400,
    error: 'given_name',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike (God)',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'given_name format 4',
    status: 400,
    error: 'given_name',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike*',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'given_name empty',
    status: 400,
    error: 'given_name',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: '',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
    {
    test: 'given_name min length',
    status: 400,
    error: 'given_name',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'M',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'given_name max length',
    status: 400,
    error: 'given_name',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Michaelangelodasouzabatmanbinsupraman',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'family_name format 1',
    status: 400,
    error: 'family_name',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	family_name: 'Springfield von Bismarck Deux Marcus Orbit',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'family_name format 2',
    status: 400,
    error: 'family_name',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	family_name: 'Springfield2',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'family_name format 3',
    status: 400,
    error: 'family_name',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	family_name: 'Springfield (Genius)',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'family_name format 4',
    status: 400,
    error: 'family_name',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	family_name: 'Springfield*von Bismarck',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'family_name min length',
    status: 400,
    error: 'family_name',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	family_name: 'S',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'family_name max length',
    status: 400,
    error: 'family_name',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	family_name: 'SpringfieldVeryLongFamilyNameThisIsMoreThanFiftyCharacters',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'password min length',
    status: 400,
    error: 'password',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'pass',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'password max length',
    status: 400,
    error: 'password',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'ThisIsAVeryLongPasswordThatNoUserWillEverRemember',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'password blacklist',
    status: 400,
    error: 'blacklist',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'password',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'birthdate format 1',
    status: 400,
    error: 'birthdate',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'thisisagoodpassword',
	birthdate: '1992--03'
      }
    }
  },
  {
    test: 'birthdate format 2',
    status: 400,
    error: 'birthdate',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'thisisagoodpassword',
	birthdate: '31-12-1988'
      }
    }
  },
  {
    test: 'birthdate format 3',
    status: 400,
    error: 'birthdate',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'thisisagoodpassword',
	birthdate: '1988-21-12'
      }
    }
  },
  {
    test: 'birthdate format 4',
    status: 400,
    error: 'birthdate',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'thisisagoodpassword',
	birthdate: 'fkfskfdfs'
      }
    }
  },
  {
    test: 'birthdate format 5',
    status: 400,
    error: 'birthdate',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'thisisagoodpassword',
	birthdate: '1st of May of 1988'
      }
    }
  },
  {
    test: 'birthdate too old',
    status: 400,
    error: 'birthdate',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'thisisagoodpassword',
	birthdate: '1830-05-24'
      }
    }
  },
  {
    test: 'birthdate future',
    status: 400,
    error: 'birthdate',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'thisisagoodpassword',
	birthdate: '2099-01-12'
      }
    }
  },
  {
    test: 'correct format',
    status: 200,
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'Mike',
	family_name: 'Springfield',
	password: 'notblacklistedpassw0rd',
	birthdate: '1992-03-21'
      }
    }
  },
  {
    test: 'email exists',
    status: 400,
    error: 'exists',
    data: {
      user: {
	email: 'mike@mike.com',
	given_name: 'John',
	family_name: 'Simpson',
	password: 'anotherOKpassword',
	birthdate: '1981-09-20'
      }
    }
  }
];


tests_validate_email = [
  {
    test: 'missing eToken',
    status: 404
  },
  {
    test: 'eToken format',
    pathparams: 'aud8adaf8af8y4411313nnfaf',
    status: 400,
    error: 'token format'
  },
  {
    test: 'success',
    pathparams: 'M2Y0ZWMxMTAtN2VhZi00ZTI4LWE5YWYtMzk1OWE5NmNhMTAw',
    status: 200,
  },
];

tests_getUserProfile = [
  {
    test: 'no auth - no userid',
    status: 401,
    error: 'unauthenticated',
  },
  {
    test: 'no auth - invalid userid (3491)',
    pathparams: '3491',
    status: 404,
    error: 'user not found',
  },
  {
    test: 'no auth - correct userid (0)',
    pathparams: 0,
    status: 200,
    func: (data) => {
      user = JSON.parse(data.text);
      assert(user.given_name === 'Eduard');
      assert(user.family_name === 'Zorita');
      assert(user.photo === 'https://i1.rgstatic.net/ii/profile.image/315640353624067-1452265932482_Q512/Eduard_Valera_Zorita.jpg');
      assert(user.email === undefined);
      assert(user.password === undefined);
      assert(user.birthdate === undefined);
      assert(user.web_active === undefined);
      assert(user.google_active === undefined);
      assert(user.created === undefined);
    }
  },
  {
    test: 'auth - invalid userid (3491)',
    headers: [['Authentication', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjAsInRva2VuaWQiOiJmY2NiMzM0NiIsIm1heF92YWxpZCI6NDEwMjM1ODQwMDAwMCwibWluX3ZhbGlkIjo5NDY2ODQ4MDAwMDB9.MYBsW7Y9oHyFX0T2dLoJRDrp_gP1m_pmgvItTSYC1zg']],
    pathparams: 3491,
    status: 404,
    error: 'user not found',
  },
  {
    test: 'auth - no userid (self)',
    headers: [['Authentication', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjAsInRva2VuaWQiOiJmY2NiMzM0NiIsIm1heF92YWxpZCI6NDEwMjM1ODQwMDAwMCwibWluX3ZhbGlkIjo5NDY2ODQ4MDAwMDB9.MYBsW7Y9oHyFX0T2dLoJRDrp_gP1m_pmgvItTSYC1zg']],
    status: 200,
    func: (data) => {
      user = JSON.parse(data.text);
      assert(user.given_name === 'Eduard');
      assert(user.family_name === 'Zorita');
      assert(user.photo === 'https://i1.rgstatic.net/ii/profile.image/315640353624067-1452265932482_Q512/Eduard_Valera_Zorita.jpg');
      assert(user.email === 'eduard.zorita@nucleotid.com');
      assert(user.password === undefined);
      assert(user.birthdate ==='1988-01-01');
      assert(user.web_active === 't');
      assert(user.google_active === 'f');
      assert(user.created != undefined);
      
    }
  },
  {
    test: 'auth - correct userid (1)',
    headers: [['Authentication', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjAsInRva2VuaWQiOiJmY2NiMzM0NiIsIm1heF92YWxpZCI6NDEwMjM1ODQwMDAwMCwibWluX3ZhbGlkIjo5NDY2ODQ4MDAwMDB9.MYBsW7Y9oHyFX0T2dLoJRDrp_gP1m_pmgvItTSYC1zg']],
    pathparams: 1,
    status: 200,
    func: (data) => {
      user = JSON.parse(data.text);
      assert(user.given_name === 'Michael');
      assert(user.family_name === 'Douglas');
      assert(user.photo);
      assert(user.email === undefined);
      assert(user.password === undefined);
      assert(user.birthdate === undefined);
      assert(user.web_active === undefined);
      assert(user.google_active === undefined);
      assert(user.created === undefined);
    }
  },
  
];

tests_updateUser = [
  {
    test: 'no auth data',
    pathparams: 0,
    status: 400,
    error: 'insufficient authentication data',
    data: {
      user: {
	given_name: "Edward"
      }
    }
  },
  {
    test: 'missing auth data 1',
    pathparams: 0,
    status: 400,
    error: 'insufficient authentication data',
    data: {
      auth: {
	password: '1231fjk12h31'
      },
      user: {
	given_name: "Edward"
      }
    }
  },
  {
    test: 'missing auth data 2',
    pathparams: 0,
    status: 400,
    error: 'insufficient authentication data',
    data: {
      auth: {
	email: 'eduard.zorita@nucleotid.com'
      },
      user: {
	given_name: "Edward"
      }
    }
  },
  {
    test: 'invalid auth data 1',
    pathparams: 0,
    status: 401,
    error: 'authentication failed',
    data: {
      auth: {
	email: 'eduard.zorita@nucleotid.com',
	password: '1231fjk12h31'
      },
      user: {
	given_name: "Edward"
      }
    }
  },
  {
    test: 'invalid auth data 2',
    pathparams: 0,
    status: 401,
    error: 'authentication failed',
    data: {
      auth: {
	email: 'eduard.zorita@nucleotid.net',
	password: 'maxmix123'
      },
      user: {
	given_name: "Edward"
      }
    }
  },
  {
    test: 'no update data',
    pathparams: 0,
    status: 400,
    error: 'user data required',
    data: {
      auth: {
	email: 'eduard.zorita@nucleotid.com',
	password: 'maxmix123'
      },
    }
  },
  {
    test: 'update data invalid field',
    pathparams: 0,
    status: 400,
    error: 'invalid field',
    data: {
      auth: {
	email: 'eduard.zorita@nucleotid.com',
	password: 'maxmix123'
      },
      user: {
	stuff: "Hello",
	given_name: "Edward"
      }
    }
  },
  {
    test: 'update data invalid format 1',
    pathparams: 0,
    status: 400,
    error: 'invalid data format',
    data: {
      auth: {
	email: 'eduard.zorita@nucleotid.com',
	password: 'maxmix123'
      },
      user: 12
    }
  },
  {
    test: 'update data invalid format 2',
    pathparams: 0,
    status: 400,
    error: 'invalid field',
    data: {
      auth: {
	email: 'eduard.zorita@nucleotid.com',
	password: 'maxmix123'
      },
      user: "string"
    }
  },
  {
    test: 'update data invalid format 3',
    pathparams: 0,
    status: 400,
    error: 'invalid field',
    data: {
      auth: {
	email: 'eduard.zorita@nucleotid.com',
	password: 'maxmix123'
      },
      user: ["array", "of", "strings"]
    }
  },
  {
    test: 'user id mismatch',
    pathparams: 123,
    status: 401,
    error: 'unauthorized',
    data: {
      auth: {
	email: 'eduard.zorita@nucleotid.com',
	password: 'maxmix123'
      },
      user: {
	given_name: "Edward"
      }
    }
  },
  {
    test: 'invalid given_name format',
    pathparams: 0,
    status: 400,
    error: 'given_name',
    data: {
      auth: {
	email: 'eduard.zorita@nucleotid.com',
	password: 'maxmix123'
      },
      user: {
	given_name: 1231341
      }
    }
  },
  {
    test: 'invalid family_name format',
    pathparams: 0,
    status: 400,
    error: 'family_name',
    data: {
      auth: {
	email: 'eduard.zorita@nucleotid.com',
	password: 'maxmix123'
      },
      user: {
	given_name: "Edward",
	family_name: "12901skadja"
      }
    }
  },
  {
    test: 'invalid birthdate format',
    pathparams: 0,
    status: 400,
    error: 'birthdate',
    data: {
      auth: {
	email: 'eduard.zorita@nucleotid.com',
	password: 'maxmix123'
      },
      user: {
	given_name: "Edward",
	family_name: "Zoris",
	birthdate: "13-23"
      }
    }
  },
  {
    test: 'birthdate out of bounds 1',
    pathparams: 0,
    status: 400,
    error: 'birthdate',
    data: {
      auth: {
	email: 'eduard.zorita@nucleotid.com',
	password: 'maxmix123'
      },
      user: {
	given_name: "Edward",
	family_name: "Zoris",
	birthdate: "2999-02-01"
      }
    }
  },
  {
    test: 'birthdate out of bounds 2',
    pathparams: 0,
    status: 400,
    error: 'birthdate',
    data: {
      auth: {
	email: 'eduard.zorita@nucleotid.com',
	password: 'maxmix123'
      },
      user: {
	given_name: "Edward",
	family_name: "Zoris",
	birthdate: "1204-02-01"
      }
    }
  },
  {
    test: 'invalid photo',
    pathparams: 0,
    status: 400,
    error: 'photo',
    data: {
      auth: {
	email: 'eduard.zorita@nucleotid.com',
	password: 'maxmix123'
      },
      user: {
	given_name: "Edward",
	family_name: "Zoris",
	birthdate: "1988-02-01",
	photo: "ksdjsad"
      }
    }
  },
  {
    test: 'blacklisted password',
    pathparams: 0,
    status: 400,
    error: 'blacklist',
    data: {
      auth: {
	email: 'eduard.zorita@nucleotid.com',
	password: 'maxmix123'
      },
      user: {
	given_name: "Edward",
	family_name: "Zoris",
	birthdate: "1988-02-01",
	photo: "https://somefakeurl.com/picture10",
	password: "password"
      }
    }
  },
  {
    test: 'invalid password format',
    pathparams: 0,
    status: 400,
    error: 'password',
    data: {
      auth: {
	email: 'eduard.zorita@nucleotid.com',
	password: 'maxmix123'
      },
      user: {
	given_name: "Edward",
	family_name: "Zoris",
	birthdate: "1988-02-01",
	photo: "https://somefakeurl.com/picture10",
	password: "sjf"
      }
    }
  },
  {
    test: 'success',
    pathparams: 0,
    status: 200,
    data: {
      auth: {
	email: 'eduard.zorita@nucleotid.com',
	password: 'maxmix123'
      },
      user: {
	given_name: "Edward",
	family_name: "Zoris",
	birthdate: "1988-02-01",
	photo: "https://somefakeurl.com/picture10",
	password: "ANewPassword1234"
      }
    },
    func: (data) => {
      user = JSON.parse(data.text);
      assert(user.id == 0);
    }
  },
];

tests_getUpdatedUserProfile = [
  {
    test: 'no auth - userid (0)',
    pathparams: 0,
    status: 200,
    func: (data) => {
      user = JSON.parse(data.text);
      assert(user.given_name === 'Edward');
      assert(user.family_name === 'Zoris');
      assert(user.photo === 'https://somefakeurl.com/picture10');
      assert(user.email === undefined);
      assert(user.password === undefined);
      assert(user.birthdate === undefined);
      assert(user.web_active === undefined);
      assert(user.google_active === undefined);
      assert(user.created === undefined);
    }
  },

];

describe('API /user', () => {
  describe ('POST /user', () => {
    itertest(test, tests_new_user, '/user/', 'post');
  });
  describe ('POST /user/validate', () => {
    itertest(test, tests_validate_email, '/user/validate/', 'post');
  });
  describe ('GET /user/', () => {
    itertest(test, tests_getUserProfile, '/user/', 'get');
  });
  describe ('PATCH /user/', () => {
    itertest(test, tests_updateUser, '/user/', 'patch');
  });
  describe ('GET /user/ (updated)', () => {
    itertest(test, tests_getUpdatedUserProfile, '/user/', 'get');
  });
  
});
