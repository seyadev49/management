const db = require('../db/connection');

// Role-based permissions map
const rolePermissions = {
  super_admin: ['*'], // all permissions
  landlord: ['*'],    // all permissions for organization owner
  admin: [
    'manage_properties', 'manage_tenants', 'manage_contracts',
    'manage_payments', 'manage_maintenance', 'manage_documents',
    'view_reports', 'manage_users'
  ],
  manager: [
    'manage_properties', 'manage_tenants', 'manage_contracts',
    'view_payments', 'manage_maintenance', 'view_documents', 'view_reports'
  ],
  staff: [
    'view_properties', 'view_tenants', 'view_contracts',
    'record_payments', 'create_maintenance', 'view_documents'
  ]
};

// ----- Get user effective permissions -----
const getUserEffectivePermissions = async (userId) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.role, up.permissions 
       FROM users u 
       LEFT JOIN user_permissions up ON u.id = up.user_id 
       WHERE u.id = ?`,
      [userId]
    );

    if (rows.length === 0) return {};

    const user = rows[0];
    let effectivePermissions = {};

    // Add role-based permissions
    const basePermissions = rolePermissions[user.role] || [];
    if (basePermissions.includes('*')) return { '*': true };
    basePermissions.forEach(p => { effectivePermissions[p] = true; });

    // Merge custom permissions
    if (user.permissions) {
      try {
        let customPermissions = user.permissions;

        // parse string if returned as string
        if (typeof customPermissions === 'string') {
          customPermissions = JSON.parse(customPermissions);
        }

        if (typeof customPermissions === 'object' && customPermissions !== null) {
          effectivePermissions = { ...effectivePermissions, ...customPermissions };
        }
      } catch (err) {
        console.error('Error parsing custom permissions:', user.permissions, err);
      }
    }

    return effectivePermissions;

  } catch (error) {
    console.error('Error getting effective permissions:', error);
    return {};
  }
};

// ----- Middleware for single permission -----
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'super_admin' || req.user.role === 'landlord') return next();

      const effectivePermissions = await getUserEffectivePermissions(req.user.id);

      if (effectivePermissions['*'] === true) return next();

      if (effectivePermissions[requiredPermission] !== true) {
        return res.status(403).json({
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          requiredPermission,
          userPermissions: Object.keys(effectivePermissions).filter(p => effectivePermissions[p] === true)
        });
      }

      req.userPermissions = effectivePermissions;
      next();
    } catch (err) {
      console.error('Permission check error:', err);
      res.status(500).json({ message: 'Server error during permission check' });
    }
  };
};

// ----- Middleware for any permission -----
const checkAnyPermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'super_admin' || req.user.role === 'landlord') return next();

      const effectivePermissions = await getUserEffectivePermissions(req.user.id);

      if (effectivePermissions['*'] === true) return next();

      const hasPermission = requiredPermissions.some(p => effectivePermissions[p] === true);

      if (!hasPermission) {
        return res.status(403).json({
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          requiredPermissions,
          userPermissions: Object.keys(effectivePermissions).filter(p => effectivePermissions[p] === true)
        });
      }

      req.userPermissions = effectivePermissions;
      next();
    } catch (err) {
      console.error('Permission check error:', err);
      res.status(500).json({ message: 'Server error during permission check' });
    }
  };
};

// ----- Middleware for all permissions -----
const checkAllPermissions = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'super_admin' || req.user.role === 'landlord') return next();

      const effectivePermissions = await getUserEffectivePermissions(req.user.id);

      if (effectivePermissions['*'] === true) return next();

      const missing = requiredPermissions.filter(p => effectivePermissions[p] !== true);
      if (missing.length > 0) {
        return res.status(403).json({
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          requiredPermissions,
          missingPermissions: missing,
          userPermissions: Object.keys(effectivePermissions).filter(p => effectivePermissions[p] === true)
        });
      }

      req.userPermissions = effectivePermissions;
      next();
    } catch (err) {
      console.error('Permission check error:', err);
      res.status(500).json({ message: 'Server error during permission check' });
    }
  };
};

module.exports = {
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  getUserEffectivePermissions
};
