const express = require('express');
const { body } = require('express-validator');
const { register, login, getProfile, forgotPassword, resetPassword, validateResetToken, updateProfile, getOrganization, updateOrganization } = require('../controllers/authController');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();


// Validation middleware
const registerValidation = [
  body('organizationName').notEmpty().withMessage('Organization name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').notEmpty().withMessage('Full name is required'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const updateProfileValidation = [
  body('fullName').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('newPassword').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const updateOrganizationValidation = [
  body('organizationName').optional().notEmpty().withMessage('Organization name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
];

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/profile', authenticateToken, getProfile);
router.get('/organization', authenticateToken, getOrganization);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);
router.get('/validate-reset-token/:token', validateResetToken);
router.put('/update-profile', authenticateToken, updateProfileValidation, updateProfile);
router.put('/update-organization', authenticateToken, updateOrganizationValidation, updateOrganization);

module.exports = router;