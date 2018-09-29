var psql = require('../modules/db');
var db = psql.db;


// CREATE Notebooks
// Creates a Notebook into a Project from a POST request. POST info: (title, description*, projectId)
module.exports.createNotebook = async (req, res, next) => {
  // Check authentication.
  if (!req.auth || !req.auth.validToken || !req.auth.token || !req.auth.token.payload) {
    // Return '401 Unauthenticated' status.
    res.status(401);
    res.end();
    return;
  }

  // Get user ID from auth.
  var user_id = req.auth.token.payload.uid;

  // Get post data.
  if (!req.body.title || !req.body.projectId) {
    res.status(400);
    res.end();
    return;
  }

  // Check if user has permission to 'create' notebooks in the requested project.
  try {
    var allowed = await db.oneOrNone("SELECT create FROM $1 WHERE userId=$2 AND groupId=$3",
				     [psql.table_project_permissions, user_id, req.body.projectId]);
  } catch(err) {
    res.status(500);
    res.end();
    return;
  }

  if (!allowed) {
    // Return '403 Forbidden'.
    res.status(403);
    res.end();
    return;
  }

  // Parse values (title and description).

  // Create Notebook in Project.
  try {
    await db.none("INSERT INTO $1 (id,title,description,ownerId,projectId,created,modified)\
 VALUES ($2,$3,$4,$5,$6,$7,$8)",
		  [psql.table_notebook,
		   null,
		   req.body.title,
		   req.body.description || null,
		   user_id,
		   req.body.projectId,
		   (new Date()).toISOString(),
		   (new Date()).toISOString()]
		 );
  } catch(err) {
    res.status(500);
    res.end();
    return;
  }

  res.status(200);
  res.end();
};

// GET Notebook lists

// GetUserNotebooks
// Returns a list of notebooks owned by the current user.
module.exports.getUserNotebooks = async (req, res, next) => {
  // Check authentication.
  if (!req.auth || !req.auth.validToken || !req.auth.token || !req.auth.token.payload) {
    // Return '401 Unauthenticated' status.
    res.status(401);
    res.end();
    return;
  }

  // Get logged user ID from auth token.
  var user_id = req.auth.token.payload.uid;

  // Get all user notebooks.
  try {
    var notebooks = await db.manyOrNone("SELECT * FROM $1 WHERE ownerId=$2", [psql.table_notebook, user_id]);
  } catch (err) {
    // DB error, return '500 Internal server error'.
    res.status(500);
    res.end();
    return;
  }

  // Return user notebooks.
  res.status(200);
  res.json(notebooks);
};
  
