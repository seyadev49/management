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

router.post('/', authenticateToken, authorize('landlord', 'admin'), unitValidation, createUnit);
router.get('/', authenticateToken, getUnits);
router.get('/:id', authenticateToken, getUnitById);
router.put('/:id', authenticateToken, authorize('landlord', 'admin'), updateUnit);
router.delete('/:id', authenticateToken, authorize('landlord', 'admin'), deleteUnit);

module.exports = router;