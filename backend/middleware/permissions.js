const db = require('../db/connection');

// Enhanced permission checking middleware
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // Skip permission check for super_admin and landlord (organization owner)
      if (req.user.role === 'super_admin' || req.user.role === 'landlord') {
        return next();
      }

      // Get user permissions from database
      const [userPermissions] = await db.execute(
        `SELECT up.permissions FROM user_permissions up 
         WHERE up.user_id = ?`,
        [req.user.id]
      );

      let permissions = {};
      
      if (userPermissions.length > 0 && userPermissions[0].permissions) {
        try {
          permissions = JSON.parse(userPermissions[0].permissions);
        } catch (error) {
          console.error('Error parsing user permissions:', error);
          permissions = {};
        }
      }

      // Check if user has the required permission
      if (!permissions[requiredPermission]) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          requiredPermission,
          userPermissions: Object.keys(permissions).filter(p => permissions[p])
        });
      }

      // Add permissions to request object for further use
      req.userPermissions = permissions;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Server error during permission check' });
    }
  };
};

// Check multiple permissions (user needs at least one)
const checkAnyPermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // Skip permission check for super_admin and landlord
      if (req.user.role === 'super_admin' || req.user.role === 'landlord') {
        return next();
      }

      // Get user permissions
      const [userPermissions] = await db.execute(
        `SELECT up.permissions FROM user_permissions up 
         WHERE up.user_id = ?`,
        [req.user.id]
      );

      let permissions = {};
      
      if (userPermissions.length > 0 && userPermissions[0].permissions) {
        try {
          permissions = JSON.parse(userPermissions[0].permissions);
        } catch (error) {
          console.error('Error parsing user permissions:', error);
          permissions = {};
        }
      }

      // Check if user has any of the required permissions
      const hasPermission = requiredPermissions.some(permission => permissions[permission]);
      
      if (!hasPermission) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          requiredPermissions,
          userPermissions: Object.keys(permissions).filter(p => permissions[p])
        });
      }

      req.userPermissions = permissions;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Server error during permission check' });
    }
  };
};

// Check all permissions (user needs all of them)
const checkAllPermissions = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // Skip permission check for super_admin and landlord
      if (req.user.role === 'super_admin' || req.user.role === 'landlord') {
        return next();
      }

      // Get user permissions
      const [userPermissions] = await db.execute(
        `SELECT up.permissions FROM user_permissions up 
         WHERE up.user_id = ?`,
        [req.user.id]
      );

      let permissions = {};
      
      if (userPermissions.length > 0 && userPermissions[0].permissions) {
        try {
          permissions = JSON.parse(userPermissions[0].permissions);
        } catch (error) {
          console.error('Error parsing user permissions:', error);
          permissions = {};
        }
      }

      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every(permission => permissions[permission]);
      
      if (!hasAllPermissions) {
        const missingPermissions = requiredPermissions.filter(permission => !permissions[permission]);
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          requiredPermissions,
          missingPermissions,
          userPermissions: Object.keys(permissions).filter(p => permissions[p])
        });
      }

      req.userPermissions = permissions;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Server error during permission check' });
    }
  };
};

// Get user's effective permissions (combines role-based and custom permissions)
const getUserEffectivePermissions = async (userId) => {
  try {
    // Get user role and custom permissions
    const [userData] = await db.execute(
      `SELECT u.role, up.permissions 
       FROM users u 
       LEFT JOIN user_permissions up ON u.id = up.user_id 
       WHERE u.id = ?`,
      [userId]
    );

    if (userData.length === 0) {
      return {};
    }

    const user = userData[0];
    let effectivePermissions = {};

    // Role-based permissions
    const rolePermissions = {
      super_admin: ['*'], // All permissions
      landlord: ['*'], // All permissions for organization owner
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

    // Start with role-based permissions
    const basePermissions = rolePermissions[user.role] || [];
    if (basePermissions.includes('*')) {
      // User has all permissions
      return { '*': true };
    }

    // Add role-based permissions
    basePermissions.forEach(permission => {
      effectivePermissions[permission] = true;
    });

    // Override with custom permissions if they exist
    if (user.permissions) {
      try {
        const customPermissions = JSON.parse(user.permissions);
        effectivePermissions = { ...effectivePermissions, ...customPermissions };
      } catch (error) {
        console.error('Error parsing custom permissions:', error);
      }
    }

    return effectivePermissions;
  } catch (error) {
    console.error('Error getting effective permissions:', error);
    return {};
  }
};

module.exports = {
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  getUserEffectivePermissions
};