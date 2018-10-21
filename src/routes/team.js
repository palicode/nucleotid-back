var router = require('express').Router();
var cors = require('../modules/cors');
var teamController = require('../controllers/team.js');


// CORS middleware
router.all('/', cors({methods: ["POST"]}));
router.all('/:teamId', cors({methods: ["GET", "UPDATE", "DELETE"]}));
router.all('/:teamId/projects',cors({methods: ["GET"]}));
router.all('/:teamId/users',cors({methods: ["GET", "POST"]}));
router.all('/:teamId/users/:userId',cors({methods: ["UPDATE", "DELETE"]}));

// CREATE - POST Routes
router.post('/', teamController.createTeam);
router.post('/:teamId/users', teamController.addTeamUser);

// READ - GET Routes
router.get('/:teamId', teamController.getTeam);
router.get('/:teamId/users', teamController.getTeamUsers);
router.get('/:teamId/projects', teamController.getTeamProjects);

// UPDATE Routes
router.update('/:teamId', teamController.updateTeam);
router.update('/:teamId/users/:userId', teamController.updateTeamUser);

// DELETE Routes
router.delete('/:teamId', teamController.deleteTeam);
router.delete('/:teamId/users/:userId', teamController.deleteTeamUser);
