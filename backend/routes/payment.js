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

router.post('/', authenticateToken, paymentValidation, createPayment);
router.get('/', authenticateToken, getPayments);
router.get('/summary', authenticateToken, getPaymentSummary);
router.put('/:id/status', authenticateToken, updatePaymentStatus);
router.delete('/:id', authenticateToken, deletePayment);
router.post('/generate-overdue', authenticateToken, generateOverduePayments);

module.exports = router;