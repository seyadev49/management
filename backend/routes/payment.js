const express = require('express');
const { body } = require('express-validator');
const {
  createPayment,
  getPayments,
  updatePaymentStatus,
  deletePayment,
  generateOverduePayments,
  getPaymentSummary
} = require('../controllers/paymentController');
const { authenticateToken, logActivity } = require('../middleware/auth');
const { checkPermission, checkAnyPermission } = require('../middleware/permissions');

const router = express.Router();

// Apply authentication and activity logging globally for all routes in this router
router.use(authenticateToken); // Ensures req.user exists
router.use(logActivity());     // Logs every request after auth

const paymentValidation = [
  body('contractId').isInt().withMessage('Valid contract ID is required'),
  body('tenantId').isInt().withMessage('Valid tenant ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
  body('paymentDate').isISO8601().withMessage('Valid payment date is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
];

router.post('/', checkAnyPermission('record_payments', 'manage_payments'), paymentValidation, createPayment);
router.get('/', checkAnyPermission('view_payments', 'manage_payments', 'record_payments'), getPayments);
router.get('/summary', checkAnyPermission('view_payments', 'manage_payments'), getPaymentSummary);
router.put('/:id/status', checkAnyPermission('manage_payments', 'record_payments'), updatePaymentStatus);
router.delete('/:id', checkPermission('manage_payments'), deletePayment);
router.post('/generate-overdue', checkPermission('manage_payments'), generateOverduePayments);

module.exports = router;