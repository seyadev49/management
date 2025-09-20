const express = require('express');
const { body } = require('express-validator');
const {
  createUnit,
  getUnits,
  getUnitById,
  updateUnit,
  deleteUnit
} = require('../controllers/unitController');
const { authenticateToken, authorize, logActivity } = require('../middleware/auth');
const { checkPermission, checkAnyPermission } = require('../middleware/permissions');

const router = express.Router();
// Apply authentication and activity logging globally for all routes in this router
router.use(authenticateToken); // Ensures req.user exists
router.use(logActivity());     // Logs every request after auth

const unitValidation = [
  body('propertyId').isInt().withMessage('Valid property ID is required'),
  body('unitNumber').notEmpty().withMessage('Unit number is required'),
  body('monthlyRent').isFloat({ min: 0 }).withMessage('Valid monthly rent is required'),
  body('deposit').isFloat({ min: 0 }).withMessage('Valid deposit is required'),
];

router.post('/', checkPermission('manage_properties'), unitValidation, createUnit);
router.get('/', checkAnyPermission('view_properties', 'manage_properties'), getUnits);
router.get('/:id', checkAnyPermission('view_properties', 'manage_properties'), getUnitById);
router.put('/:id', checkPermission('manage_properties'), updateUnit);
router.delete('/:id', checkPermission('manage_properties'), deleteUnit);

module.exports = router;