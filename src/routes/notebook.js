var router = require('express').Router();
var cors = require('../modules/cors');
var notebookController = require('../controllers/notebook.js');


// CORS middleware
router.all('/', cors({methods: ["GET", "POST"]}));
router.all('/shared', cors());
router.all('/user/:userId/public', cors());
router.all('/user/:userId/shared', cors());
router.all('/group/:groupId', cors());
router.all('/:notebookId', cors({methods: ["GET", "UPDATE", "DELETE"]}));
router.all('/:notebookId/step',cors({methods: ["GET", "POST"]}));
router.all('/:notebookId/step/:stepId',cors({methods: ["GET", "DELETE"]}));
router.all('/:notebookId/step/:stepId',cors({methods: ["GET", "DELETE"]}));
router.all('/:notebookId/step/:stepId/header',cors({methods: ["UPDATE"]}));
router.all('/:notebookId/step/:stepId/body',cors({methods: ["UPDATE"]}));

// CREATE - POST Routes
router.post('/', notebookController.createNotebook());
router.post('/:notebookId/step', notebookController.createNotebookStep());

// READ - GET Routes (Notebook lists)
router.get('/', notebookController.getUserNotebooks());
router.get('/shared', notebookController.getAllSharedNotebooks());
router.get('/user/:userId/public', notebookController.getPublicNotebooks());
router.get('/user/:userId/shared', notebookController.getSharedNotebooks());
router.get('/group/:groupId', notebookController.getGroupNotebooks());

// READ - GET Routes (Notebook data)
router.get('/:notebookId', notebookController.getNotebook());
router.get('/:notebookId/step',notebookController.getNotebookStepHeaders());
router.get('/:notebookId/step/:stepId',notebookController.getNotebookStepData());

// UPDATE Routes
router.update('/:notebookId', notebookController.updateNotebook());
router.update('/:notebookId/step/:stepId/header', notebookController.updateNotebookStepHeader());
router.update('/:notebookId/step/:stepId/body', notebookController.updateNotebookStepBody());

// DELETE Routes
router.delete('/:notebookId', notebookController.deleteNotebook());
router.delete('/:notebookId/step/:stepId', notebookController.deleteNotebookStep());


