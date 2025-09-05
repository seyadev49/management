const express = require('express');
const router = express.Router();
const { authenticateToken, authorize, logActivity } = require('../../middleware/auth');
const {
createOrganization,
  getAllOrganizations,
  getOrganizationDetails,
  updateOrganizationStatus,
  deleteOrganization
} = require('../../controllers/admin/organizationController');

console.log('=== ROUTE FILE LOADED ===');

// All admin routes require authentication and authorization
router.use((req, res, next) => {
  console.log('=== ROUTE MIDDLEWARE TRIGGERED ===');
  console.log('Method:', req.method, 'URL:', req.url);
  next();
});

router.use(authenticateToken);
router.use(authorize('super_admin')); // Changed to match your user roles

// Create new organization
console.log('Setting up POST /organizations/create');
router.post('/organizations/create', 
  (req, res, next) => {
    console.log('POST /organizations/create middleware called');
    next();
  },
  logActivity('organization_created'), 
  createOrganization
);

// Get all organizations
console.log('Setting up GET /organizations');
router.get('/organizations', 
  (req, res, next) => {
    console.log('GET /organizations middleware called');
    next();
  },
  logActivity('organizations_listed'), 
  getAllOrganizations
);

// Get organization details
console.log('Setting up GET /organizations/:orgId');
router.get('/organizations/:orgId', 
  (req, res, next) => {
    console.log('GET /organizations/:orgId middleware called');
    next();
  },
  logActivity('organization_viewed'), 
  getOrganizationDetails
);

// Update organization status (suspend/reactivate)
console.log('Setting up PUT /organizations/:orgId/status');
router.put('/:orgId/status', 
  (req, res, next) => {
    console.log('PUT /organizations/:orgId/status middleware called');
    next();
  },
  logActivity('organization_status_updated'), 
  updateOrganizationStatus
);

// Delete organization
console.log('Setting up DELETE /organizations/:orgId');
router.delete('/organizations/:orgId', 
  (req, res, next) => {
    console.log('DELETE /organizations/:orgId middleware called');
    next();
  },
  logActivity('organization_deleted'), 
  deleteOrganization
);

console.log('=== ROUTES SETUP COMPLETE ===');

module.exports = router;