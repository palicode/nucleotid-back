var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema (
  {
    givenName: {type: String, max: 50, required: true},
    familyName: {type: String, max: 100, required: true},
    email: {type: String, max: 100, lowercase: true, required: true},
    username: {type: String, max: 20, required: false},
    type: {
      web: {
	active: {type: Boolean, required: true}
      },
      google: {
	active: {type: Boolean, required: true},
	providerId: {type: String, required: false},
	accessToken: {type: String, required: false}
      }
    },
    password: {type: String, max: 256, required: false},
    birthdate: {type: Date, required: false},
    photo: {type: String, max:1000, required: false},
    verified: {type: Boolean, required: true},
    creationDate: {type: Date, required: true}
  }
);


// Export model
module.exports = mongoose.model('User', UserSchema);
