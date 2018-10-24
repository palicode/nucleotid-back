const router = require('express').Router();
const passport = require('passport');
const oauth = require('../modules/oauth');
const userController = require('../controllers/user');
const cors = require('../modules/cors').cors;

// CORS middleware
router.all('/login', cors({methods: ["POST"]}));
router.all('/refresh', cors({methods: ["POST"]}));
router.all('/logout', cors());
router.all('/terminate', cors());

// POST Routes.
router.post('/login', userController.validateCredentials, oauth.newSession);
router.post('/refresh', oauth.extendSession);

// GET Routes.
router.get('/logout', oauth.logout);
router.get('/terminate', oauth.endSessions);


// GOOGLE OAUTH2:
// Implementar manualment la segona part de l'autenticacio amb google OAUTH2.
// Primer des de React es fara la redireccio a https://accounts.google.com/o/oauth2/v2/auth
// amb els parametres adequats.
// Quan google redirigeixi l'usuari ho fara directament a l'API.
// El server (API) rep de l'usuari el codi generat per google a redirect_uri,
// El server fa un POST al token endpoint de google amb el codi rebut.
// Google verifica el codi i envia la informacio de l'usuari logejat.

module.exports = router;
