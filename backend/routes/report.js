
const express = require('express');
const router = express.Router();
const { generateReports, exportReport } = require('../controllers/reportController');
const { authenticateToken, logActivity } = require('../middleware/auth');


// Apply authentication and activity logging globally for all routes in this router
router.use(authenticateToken); // Ensures req.user exists
router.use(logActivity());     // Logs every request after auth

router.get('/', authenticateToken, generateReports);
router.get('/export', authenticateToken, exportReport);

module.exports = router;
