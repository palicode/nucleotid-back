const nodemailer = require('nodemailer');
const log        = require('./logger').logmodule(module);

var email;
var password;

var transporter;

module.exports.initialize = (options) => {
  
  if (!options.email || !options.password) {
    throw new Error("mailer: Error initializing module - options not defined.");
  }

  email = options.email;
  
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: email,
      pass: options.password
    }
  });
};


module.exports.sendWelcomeMail = (user, token_url) => {
  var message = {
    from: email,
    to: user.email,
    subject: 'Confirm your e-mail address',
    text: `Hi ${user.given_name},\nWelcome to Nucleotid!\n\nPlease open the following address with your browser to confirm your e-mail address:\n\n${token_url}`,
    html: `<p>Hi, ${user.given_name}!</p>Click <a href=${token_url}> here</a> to confirm your e-mail address.`
  };

  // TODO: Define callback or convert function to promise.
  transporter.sendMail(message, (err, info) => {
    log.info(`sendWelcomeMail(sent) to: ${user.email}`);
  });
};


