const express = require('express');
const { body } = require('express-validator');
const {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  deleteTenant,
  getTerminatedTenants,
  getSecurityDeposit
} = require('../controllers/tenantController');
const { authenticateToken, authorize, logActivity } = require('../middleware/auth');
const { checkPlanLimit } = require('../middleware/planLimits');
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

router.post('/', authenticateToken, authorize('landlord', 'admin'), checkPlanLimit('tenants'), tenantValidation, createTenant);
router.get('/', authenticateToken, getTenants);
router.get('/terminated', authenticateToken, getTerminatedTenants);
router.get('/:id', authenticateToken, getTenantById);
router.get('/:id/security-deposit', authenticateToken, getSecurityDeposit);
router.put('/:id', authenticateToken, authorize('landlord', 'admin'), tenantValidation, updateTenant);
router.delete('/:id', authenticateToken, authorize('landlord', 'admin'), deleteTenant);
router.post('/:id/terminate', authenticateToken, authorize('landlord', 'admin'), terminateTenant);

module.exports = router;