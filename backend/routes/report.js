
const express = require('express');
const router = express.Router();
const { generateReports, exportReport } = require('../controllers/reportController');
const { authenticateToken, logActivity } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');


// Apply authentication and activity logging globally for all routes in this router
router.use(authenticateToken); // Ensures req.user exists
router.use(logActivity());     // Logs every request after auth

router.get('/', checkPermission('view_reports'), generateReports);
router.get('/export', checkPermission('view_reports'), exportReport);

module.exports = router;
