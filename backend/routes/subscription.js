const express = require('express');
const {
  getSubscriptionPlans,
  upload,
  upgradeSubscription,
  renewSubscription,
  getSubscriptionStatus,
  checkPlanLimits
} = require('../controllers/subscriptionController');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();
// Apply authentication and activity logging globally for all routes in this router
router.use(authenticateToken); // Ensures req.user exists
router.use(logActivity());     // Logs every request after auth

router.get('/plans', authenticateToken, getSubscriptionPlans);
router.post('/upgrade', authenticateToken, upload.single('receipt'), upgradeSubscription);
router.post('/renew', authenticateToken, upload.single('receipt'), renewSubscription);
router.get('/status', authenticateToken, getSubscriptionStatus);
router.get('/check-limits/:feature', authenticateToken, checkPlanLimits);

module.exports = router;