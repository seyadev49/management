const express = require('express');
const { body } = require('express-validator');
const {
  createContract,
  getContracts,
  getContractById,
  updateContract,
  deleteContract,
  renewContract
} = require('../controllers/contractController');
const { authenticateToken, authorize, logActivity } = require('../middleware/auth');
const { checkPermission, checkAnyPermission } = require('../middleware/permissions');

const router = express.Router();

// Apply authentication and activity logging globally for all routes in this router
router.use(authenticateToken); // Ensures req.user exists
router.use(logActivity());     // Logs every request after auth

const contractValidation = [
  body('propertyId').isInt().withMessage('Valid property ID is required'),
  body('unitId').isInt().withMessage('Valid unit ID is required'),
  body('tenantId').isInt().withMessage('Valid tenant ID is required'),
  body('leaseDuration').isInt({ min: 1 }).withMessage('Valid lease duration is required'),
  body('contractStartDate').isISO8601().withMessage('Valid start date is required'),
  body('contractEndDate').isISO8601().withMessage('Valid end date is required'),
  body('monthlyRent').isFloat({ min: 0 }).withMessage('Valid monthly rent is required'),
  body('deposit').isFloat({ min: 0 }).withMessage('Valid deposit is required'),
];

router.post('/', checkPermission('manage_contracts'), contractValidation, createContract);
router.get('/', checkAnyPermission('view_contracts', 'manage_contracts'), getContracts);
router.get('/:id', checkAnyPermission('view_contracts', 'manage_contracts'), getContractById);
router.put('/:id', checkPermission('manage_contracts'), updateContract);
router.delete('/:id', checkPermission('manage_contracts'), deleteContract);
router.post('/:id/renew', checkPermission('manage_contracts'), renewContract);

module.exports = router;