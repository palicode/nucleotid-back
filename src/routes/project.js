var router = require('express').Router();
var cors = require('../modules/cors');
var projectController = require('../controllers/project.js');


// CORS middleware
router.all('/', cors({methods: ["POST"]}));
router.all('/:projectId', cors({methods: ["GET", "UPDATE", "DELETE"]}));
router.all('/:projectId/notebooks',cors({methods: ["GET"]}));
router.all('/:projectId/users',cors({methods: ["GET", "POST"]}));
router.all('/:projectId/users/:userId',cors({methods: ["UPDATE", "DELETE"]}));

// CREATE - POST Routes
router.post('/', projectController.createProject);
router.post('/:projectId/users', projectController.addProjectUser);

// READ - GET Routes
router.get('/:projectId', projectController.getProject);
router.get('/:projectId/users', projectController.getProjectUsers);
router.get('/:projectId/notebooks', projectController.getProjectNotebooks);

// UPDATE Routes
router.update('/:projectId', projectController.updateProject);
router.update('/:projectId/users/:userId', projectController.updateProjectUser);

// DELETE Routes
router.delete('/:projectId', projectController.deleteProject);
router.delete('/:projectId/users/:userId', projectController.deleteProjectUser);
