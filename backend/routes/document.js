const express = require('express');
const { authenticateToken, logActivity } = require('../middleware/auth');
const { checkPlanLimit } = require('../middleware/planLimits');
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

router.get('/', authenticateToken, getDocuments);
router.post('/upload', authenticateToken, checkPlanLimit('documents'), upload.single('document'), uploadDocument);
router.get('/download/:id', authenticateToken, downloadDocument);
router.delete('/:id', authenticateToken, deleteDocument);

module.exports = router;