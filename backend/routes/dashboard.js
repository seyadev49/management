const express = require('express');
const { getDashboardStats } = require('../controllers/dashboardController');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();
// Apply authentication and activity logging globally for all routes in this router
router.use(authenticateToken); // Ensures req.user exists
router.use(logActivity());     // Logs every request after auth

router.get('/stats', authenticateToken, getDashboardStats);

module.exports = router;