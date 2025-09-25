const express = require('express');
const { body } = require('express-validator');
const {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  deleteTenant,
  getTerminatedTenants,
 renewContract,
 getContractHistory
  getSecurityDeposit
} = require('../controllers/tenantController');
const { authenticateToken, authorize, logActivity } = require('../middleware/auth');
const { checkPlanLimit } = require('../middleware/planLimits');
const { checkPermission, checkAnyPermission } = require('../middleware/permissions');
const { terminateTenant } = require('../controllers/tenantController');

const router = express.Router();

// Apply authentication and activity logging globally for all routes in this router
router.use(authenticateToken); // Ensures req.user exists
router.use(logActivity());     // Logs every request after auth

const tenantValidation = [
  body('tenantId').notEmpty().withMessage('Tenant ID is required'),
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('sex').isIn(['Male', 'Female']).withMessage('Sex must be Male or Female'),
  body('phone').matches(/^(09|07)/).withMessage('Phone must start with 09 or 07'),
  body('city').notEmpty().withMessage('City is required'),
  body('subcity').notEmpty().withMessage('Sub city is required'),
  body('woreda').notEmpty().withMessage('Woreda is required'),
  body('houseNo').notEmpty().withMessage('House number is required'),
];

router.post('/', checkPermission('manage_tenants'), checkPlanLimit('tenants'), tenantValidation, createTenant);
router.get('/', checkAnyPermission('view_tenants', 'manage_tenants'), getTenants);
router.get('/terminated', checkAnyPermission('view_tenants', 'manage_tenants'), getTerminatedTenants);
router.get('/:id', checkAnyPermission('view_tenants', 'manage_tenants'), getTenantById);
router.get('/:id/security-deposit', checkAnyPermission('view_tenants', 'manage_tenants'), getSecurityDeposit);
router.get('/:id/contract-history', checkAnyPermission('view_tenants', 'manage_tenants'), getContractHistory);
router.put('/:id', checkPermission('manage_tenants'), tenantValidation, updateTenant);
router.delete('/:id', checkPermission('manage_tenants'), deleteTenant);
router.post('/:id/terminate', checkPermission('manage_tenants'), terminateTenant);
router.post('/:id/renew', checkPermission('manage_tenants'), renewContract);

module.exports = router;