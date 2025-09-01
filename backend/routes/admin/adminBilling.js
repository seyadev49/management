
const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../../middleware/auth');
const {
  getBillingOverview,
  getAllSubscriptions,
  getOrganizationBilling,
  updateOrganizationSubscription,
  generateBillingReport,
  verifySubscription,
  downloadReceipt
} = require('../../controllers/admin/adminBillingController');

// All admin routes require super admin authentication
router.use(authenticateToken);
router.use(authorize('super_admin'));

// Get billing overview
router.get('/overview', getBillingOverview);

// Get all subscriptions
router.get('/subscriptions', getAllSubscriptions);

// Get organization billing details
router.get('/organizations/:orgId/billing', getOrganizationBilling);

// Update organization subscription
router.post('/organizations/:orgId/subscription', updateOrganizationSubscription);

// Generate billing report
router.get('/reports', generateBillingReport);

// Verify subscription
router.post('/subscriptions/:subscriptionId/verify', verifySubscription);

// Download receipt
router.get('/receipts/download', downloadReceipt);

module.exports = router;
