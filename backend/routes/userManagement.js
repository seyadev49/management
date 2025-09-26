const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, authorize, logActivity } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const {
  createAdminUser,
  getOrganizationUsers,
  updateUserRole,
  deleteUser,
  getRolesAndPermissions
} = require('../controllers/admin/userManagementController');

const router = express.Router();

// Apply authentication and activity logging globally
router.use(authenticateToken);
router.use(logActivity());

const createUserValidation = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'manager', 'staff']).withMessage('Valid role is required'),
];

const updateUserValidation = [
  body('role').optional().isIn(['admin', 'manager', 'staff']).withMessage('Valid role is required'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
];

// Routes (only organization owners can access these)
router.post('/create', checkPermission('manage_users'), createUserValidation, createAdminUser);
router.get('/organization-users', checkPermission('manage_users'), getOrganizationUsers);
router.put('/:userId/role', checkPermission('manage_users'), updateUserValidation, updateUserRole);
router.delete('/:userId', checkPermission('manage_users'), deleteUser);
router.get('/roles-permissions', checkPermission('manage_users'), getRolesAndPermissions);

module.exports = router;

