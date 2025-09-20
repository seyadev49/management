const express = require('express');
const { body } = require('express-validator');
const {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty
} = require('../controllers/propertyController');
const { authenticateToken, authorize, logActivity } = require('../middleware/auth');
const { checkPlanLimit } = require('../middleware/planLimits');
const { checkPermission, checkAnyPermission } = require('../middleware/permissions');

const router = express.Router();

// Apply authentication and activity logging globally for all routes in this router
router.use(authenticateToken); // Ensures req.user exists
router.use(logActivity());     // Logs every request after auth

const propertyValidation = [
  body('name').notEmpty().withMessage('Property name is required'),
  body('type').isIn(['apartment', 'house', 'shop', 'office']).withMessage('Invalid property type'),
  body('address').notEmpty().withMessage('Address is required'),
  body('city').notEmpty().withMessage('City is required'),
];

// Routes
router.post('/', checkPermission('manage_properties'), checkPlanLimit('properties'), propertyValidation, createProperty);
router.get('/', checkAnyPermission('view_properties', 'manage_properties'), getProperties);
router.get('/:id', checkAnyPermission('view_properties', 'manage_properties'), getPropertyById);
router.put('/:id', checkPermission('manage_properties'), propertyValidation, updateProperty);
router.delete('/:id', checkPermission('manage_properties'), deleteProperty);

module.exports = router;