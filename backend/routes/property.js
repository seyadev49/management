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

const router = express.Router();

// Apply authentication and activity logging globally for all routes in this router
router.use(authenticateToken); // Ensures req.user exists
router.use(logActivity());     // Logs every request after auth

// Optional: Add role-based authorization where needed
const propertyValidation = [
  body('name').notEmpty().withMessage('Property name is required'),
  body('type').isIn(['apartment', 'house', 'shop', 'office']).withMessage('Invalid property type'),
  body('address').notEmpty().withMessage('Address is required'),
  body('city').notEmpty().withMessage('City is required'),
];

// Routes
router.post('/', authorize('landlord', 'admin'), checkPlanLimit('properties'), propertyValidation, createProperty);
router.get('/', getProperties);
router.get('/:id', getPropertyById);
router.put('/:id', authorize('landlord', 'admin'), propertyValidation, updateProperty);
router.delete('/:id', authorize('landlord', 'admin'), deleteProperty);

module.exports = router;