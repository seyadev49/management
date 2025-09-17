const db = require('../../db/connection');
const bcrypt = require('bcryptjs');

// Create admin user (only for organization owners)
const createAdminUser = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const {
      fullName,
      email,
      password,
      role,
      permissions
    } = req.body;

    // Verify that the requesting user is the organization owner
    const [orgOwner] = await connection.execute(
      `SELECT u.id, u.role FROM users u 
       WHERE u.id = ? AND u.organization_id = ? AND u.role = 'landlord'
       ORDER BY u.created_at ASC LIMIT 1`,
      [req.user.id, req.user.organization_id]
    );

    if (orgOwner.length === 0) {
      return res.status(403).json({ 
        message: 'Only organization owners can create admin users',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    await connection.query('START TRANSACTION');

    // Check if email already exists
    const [existingUsers] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      await connection.query('ROLLBACK');
      return res.status(400).json({ 
        message: 'User with this email already exists',
        code: 'EMAIL_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const [userResult] = await connection.execute(
      `INSERT INTO users (organization_id, email, password, full_name, role, is_active, created_by) 
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [req.user.organization_id, email, hashedPassword, fullName, role, req.user.id]
    );

    const userId = userResult.insertId;

    // Create user permissions record
    await connection.execute(
      `INSERT INTO user_permissions (user_id, permissions, created_by) 
       VALUES (?, ?, ?)`,
      [userId, JSON.stringify(permissions || {}), req.user.id]
    );

    // Log the action
    await connection.execute(
      `INSERT INTO activity_logs (user_id, organization_id, action, details) 
       VALUES (?, ?, 'admin_user_created', ?)`,
      [
        req.user.id,
        req.user.organization_id,
        JSON.stringify({
          created_user_id: userId,
          created_user_email: email,
          created_user_role: role,
          permissions: permissions
        })
      ]
    );

    await connection.query('COMMIT');

    res.status(201).json({
      message: 'Admin user created successfully',
      user: {
        id: userId,
        email,
        fullName,
        role,
        permissions
      }
    });

  } catch (error) {
    await connection.query('ROLLBACK');
    console.error('Create admin user error:', error);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  } finally {
    connection.release();
  }
};

// Get organization users (only for organization owners)
const getOrganizationUsers = async (req, res) => {
  try {
    // Verify that the requesting user is the organization owner
    const [orgOwner] = await db.execute(
      `SELECT u.id FROM users u 
       WHERE u.id = ? AND u.organization_id = ? AND u.role = 'landlord'
       ORDER BY u.created_at ASC LIMIT 1`,
      [req.user.id, req.user.organization_id]
    );

    if (orgOwner.length === 0) {
      return res.status(403).json({ 
        message: 'Only organization owners can view organization users',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    // Get all users in the organization
    const [users] = await db.execute(
      `SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.created_at, u.last_login,
              up.permissions, creator.full_name as created_by_name
       FROM users u
       LEFT JOIN user_permissions up ON u.id = up.user_id
       LEFT JOIN users creator ON u.created_by = creator.id
       WHERE u.organization_id = ?
       ORDER BY u.created_at DESC`,
      [req.user.organization_id]
    );

    res.json({ users });
  } catch (error) {
    console.error('Get organization users error:', error);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Update user role and permissions (only for organization owners)
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, permissions, isActive } = req.body;

    // Verify that the requesting user is the organization owner
    const [orgOwner] = await db.execute(
      `SELECT u.id FROM users u 
       WHERE u.id = ? AND u.organization_id = ? AND u.role = 'landlord'
       ORDER BY u.created_at ASC LIMIT 1`,
      [req.user.id, req.user.organization_id]
    );

    if (orgOwner.length === 0) {
      return res.status(403).json({ 
        message: 'Only organization owners can update user roles',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    // Verify the target user belongs to the same organization
    const [targetUser] = await db.execute(
      'SELECT id, role FROM users WHERE id = ? AND organization_id = ?',
      [userId, req.user.organization_id]
    );

    if (targetUser.length === 0) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Prevent changing the organization owner's role
    if (targetUser[0].role === 'landlord' && userId != req.user.id) {
      return res.status(403).json({ 
        message: 'Cannot modify organization owner role',
        code: 'CANNOT_MODIFY_OWNER'
      });
    }

    // Update user role and status
    const updateFields = [];
    const updateParams = [];

    if (role) {
      updateFields.push('role = ?');
      updateParams.push(role);
    }

    if (isActive !== undefined) {
      updateFields.push('is_active = ?');
      updateParams.push(isActive);
    }

    if (updateFields.length > 0) {
      updateParams.push(userId);
      await db.execute(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateParams
      );
    }

    // Update permissions
    if (permissions) {
      await db.execute(
        `INSERT INTO user_permissions (user_id, permissions, updated_by) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE permissions = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP`,
        [userId, JSON.stringify(permissions), req.user.id, JSON.stringify(permissions), req.user.id]
      );
    }

    // Log the action
    await db.execute(
      `INSERT INTO activity_logs (user_id, organization_id, action, details) 
       VALUES (?, ?, 'user_role_updated', ?)`,
      [
        req.user.id,
        req.user.organization_id,
        JSON.stringify({
          target_user_id: userId,
          new_role: role,
          new_permissions: permissions,
          is_active: isActive
        })
      ]
    );

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Delete user (only for organization owners)
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify that the requesting user is the organization owner
    const [orgOwner] = await db.execute(
      `SELECT u.id FROM users u 
       WHERE u.id = ? AND u.organization_id = ? AND u.role = 'landlord'
       ORDER BY u.created_at ASC LIMIT 1`,
      [req.user.id, req.user.organization_id]
    );

    if (orgOwner.length === 0) {
      return res.status(403).json({ 
        message: 'Only organization owners can delete users',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    // Verify the target user belongs to the same organization
    const [targetUser] = await db.execute(
      'SELECT id, role, email FROM users WHERE id = ? AND organization_id = ?',
      [userId, req.user.organization_id]
    );

    if (targetUser.length === 0) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Prevent deleting the organization owner
    if (targetUser[0].role === 'landlord') {
      return res.status(403).json({ 
        message: 'Cannot delete organization owner',
        code: 'CANNOT_DELETE_OWNER'
      });
    }

    // Soft delete the user
    await db.execute(
      'UPDATE users SET is_active = FALSE WHERE id = ?',
      [userId]
    );

    // Log the action
    await db.execute(
      `INSERT INTO activity_logs (user_id, organization_id, action, details) 
       VALUES (?, ?, 'user_deleted', ?)`,
      [
        req.user.id,
        req.user.organization_id,
        JSON.stringify({
          deleted_user_id: userId,
          deleted_user_email: targetUser[0].email,
          deleted_user_role: targetUser[0].role
        })
      ]
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Get available roles and permissions
const getRolesAndPermissions = async (req, res) => {
  try {
    const roles = [
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Full access to organization features',
        permissions: [
          'manage_properties',
          'manage_tenants',
          'manage_contracts',
          'manage_payments',
          'manage_maintenance',
          'manage_documents',
          'view_reports',
          'manage_users'
        ]
      },
      {
        id: 'manager',
        name: 'Property Manager',
        description: 'Manage properties and tenants',
        permissions: [
          'manage_properties',
          'manage_tenants',
          'manage_contracts',
          'view_payments',
          'manage_maintenance',
          'view_documents',
          'view_reports'
        ]
      },
      {
        id: 'staff',
        name: 'Staff Member',
        description: 'Limited access to daily operations',
        permissions: [
          'view_properties',
          'view_tenants',
          'view_contracts',
          'record_payments',
          'create_maintenance',
          'view_documents'
        ]
      }
    ];

    const availablePermissions = [
      { id: 'manage_properties', name: 'Manage Properties', description: 'Create, edit, and delete properties' },
      { id: 'manage_tenants', name: 'Manage Tenants', description: 'Create, edit, and delete tenants' },
      { id: 'manage_contracts', name: 'Manage Contracts', description: 'Create, edit, and delete contracts' },
      { id: 'manage_payments', name: 'Manage Payments', description: 'Full payment management access' },
      { id: 'view_payments', name: 'View Payments', description: 'View payment records only' },
      { id: 'record_payments', name: 'Record Payments', description: 'Record new payments only' },
      { id: 'manage_maintenance', name: 'Manage Maintenance', description: 'Full maintenance request management' },
      { id: 'create_maintenance', name: 'Create Maintenance', description: 'Create maintenance requests only' },
      { id: 'manage_documents', name: 'Manage Documents', description: 'Upload, view, and delete documents' },
      { id: 'view_documents', name: 'View Documents', description: 'View and download documents only' },
      { id: 'view_reports', name: 'View Reports', description: 'Access to reports and analytics' },
      { id: 'manage_users', name: 'Manage Users', description: 'Create and manage organization users' },
      { id: 'view_properties', name: 'View Properties', description: 'View property information only' },
      { id: 'view_tenants', name: 'View Tenants', description: 'View tenant information only' },
      { id: 'view_contracts', name: 'View Contracts', description: 'View contract information only' }
    ];

    res.json({ roles, permissions: availablePermissions });
  } catch (error) {
    console.error('Get roles and permissions error:', error);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

module.exports = {
  createAdminUser,
  getOrganizationUsers,
  updateUserRole,
  deleteUser,
  getRolesAndPermissions
};