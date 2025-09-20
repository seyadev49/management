const express = require('express');
const { authenticateToken, logActivity } = require('../middleware/auth');
const { checkPlanLimit } = require('../middleware/planLimits');
const { checkPermission, checkAnyPermission } = require('../middleware/permissions');
const {
  upload,
  uploadDocument,
  getDocuments,
  deleteDocument,
  downloadDocument
} = require('../controllers/documentController');

const router = express.Router();
// Apply authentication and activity logging globally for all routes in this router
router.use(authenticateToken); // Ensures req.user exists
router.use(logActivity());     // Logs every request after auth

router.get('/', checkAnyPermission('view_documents', 'manage_documents'), getDocuments);
router.post('/upload', checkAnyPermission('upload_documents', 'manage_documents'), checkPlanLimit('documents'), upload.single('document'), uploadDocument);
router.get('/download/:id', checkAnyPermission('view_documents', 'manage_documents'), downloadDocument);
router.delete('/:id', checkPermission('manage_documents'), deleteDocument);

module.exports = router;