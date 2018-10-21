var router = require('express').Router();
var cors = require('../modules/cors');
var notebookController = require('../controllers/notebook.js');


// CORS middleware
router.all('/', cors({methods: ["POST"]}));
router.all('/:notebookId', cors({methods: ["GET", "UPDATE", "DELETE"]}));
router.all('/:notebookId/step',cors({methods: ["GET", "POST"]}));
router.all('/:notebookId/step/:stepId',cors({methods: ["GET", "UPDATE", "DELETE"]}));

// CREATE - POST Routes
router.post('/', notebookController.createNotebook);
router.post('/:notebookId/step', notebookController.createNotebookStep);

// READ - GET Routes (Notebook data)
router.get('/:notebookId', notebookController.getNotebook);
router.get('/:notebookId/step',notebookController.getNotebookStepHeaders);
router.get('/:notebookId/step/:stepId',notebookController.getNotebookStep);

// UPDATE Routes
router.update('/:notebookId', notebookController.updateNotebook);
router.update('/:notebookId/step/:stepId', notebookController.updateNotebookStep);

// DELETE Routes
router.delete('/:notebookId', notebookController.deleteNotebook);
router.delete('/:notebookId/step/:stepId', notebookController.deleteNotebookStep);
