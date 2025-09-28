// document.routes.js
const express = require('express');
const { authenticateToken, logActivity } = require('../middleware/auth');
const { checkPlanLimit } = require('../middleware/planLimits');
const { checkPermission, checkAnyPermission } = require('../middleware/permissions');
const {
  upload,
  uploadDocument,
  getDocuments,
  deleteDocument,
  downloadDocument,
  getCategories,      // ✅ Add this
  createCategory      // ✅ Add this
} = require('../controllers/documentController');

const router = express.Router();

// Apply authentication and activity logging globally
router.use(authenticateToken);
router.use(logActivity());

// ✅ NEW: Category routes
router.get('/categories', checkAnyPermission('view_documents', 'manage_documents'), getCategories);
router.post('/categories', checkPermission('manage_documents'), createCategory);

// Existing document routes
router.get('/', checkAnyPermission('view_documents', 'manage_documents'), getDocuments);
router.post('/upload', 
  checkAnyPermission('upload_documents', 'manage_documents'), 
  checkPlanLimit('documents'), 
  upload.single('document'), 
  uploadDocument
);
router.get('/download/:id', checkAnyPermission('view_documents', 'manage_documents'), downloadDocument);
router.delete('/:id', checkPermission('manage_documents'), deleteDocument);

module.exports = router;