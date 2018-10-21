var router = require('express').Router();
var userController = require('../controllers/user');
var cors = require('../modules/cors').cors;

// CORS middleware
router.all('/', cors({methods: ["POST"]}));
router.all('/:userId([0-9]+)', cors({methods: ["GET","UPDATE","DELETE"]}));
router.all('/:userId([0-9]+)/teams', cors());
router.all('/:userId([0-9]+)/projects', cors());
router.all('/:userId([0-9]+)/projects/shared', cors());
router.all('/:userId([0-9]+)/notebooks', cors());


// CREATE - POST Routes
router.post('/', userController.validateNewUser, userController.createWebUser);
router.post('/validate/:eToken', userController.validateEmail);

// READ - GET Routes
router.get('/:userId([0-9]+)', userController.getUser);
router.get('/:userId([0-9]+)/teams', userController.getUserTeams);
router.get('/:userId([0-9]+)/projects', userController.getUserProjects);
router.get('/:userId([0-9]+)/projects/shared', userController.getUserSharedProjects);
router.get('/:userId([0-9]+)/notebooks', userController.getUserNotebooks);

// UPDATE Routes
router.update('/:userId([0-9]+)', userController.updateUser);

// DELETE Routes
router.delete('/:userId([0-9]+)', userController.deleteUser);
