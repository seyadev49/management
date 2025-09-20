const express = require('express');
const { body } = require('express-validator');
const { checkPlanLimit } = require('../middleware/planLimits');
const { checkPermission, checkAnyPermission } = require('../middleware/permissions');
const {
  createMaintenanceRequest,
  getMaintenanceRequests,
  getMaintenanceRequestById,
  updateMaintenanceRequest,
  deleteMaintenanceRequest
} = require('../controllers/maintenanceController');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();
// Apply authentication and activity logging globally for all routes in this router
router.use(authenticateToken); // Ensures req.user exists
router.use(logActivity());     // Logs every request after auth

const maintenanceValidation = [
  body('propertyId').isInt().withMessage('Valid property ID is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Valid priority is required'),
];

router.post('/', checkAnyPermission('create_maintenance', 'manage_maintenance'), checkPlanLimit('maintenance_requests'), maintenanceValidation, createMaintenanceRequest);
router.get('/', checkAnyPermission('view_maintenance', 'manage_maintenance', 'create_maintenance'), getMaintenanceRequests);
router.get('/:id', checkAnyPermission('view_maintenance', 'manage_maintenance'), getMaintenanceRequestById);
router.put('/:id', checkPermission('manage_maintenance'), updateMaintenanceRequest);
router.delete('/:id', checkPermission('manage_maintenance'), deleteMaintenanceRequest);

module.exports = router;