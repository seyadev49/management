const db = require('../../db/connection');
const bcrypt = require('bcryptjs');
const { getUserEffectivePermissions } = require('../../middleware/permissions');
const { sendUserCreatedEmail, sendPermissionChangedEmail } = require('../../services/emailService');

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

    // Get organization name for email
    const [orgData] = await connection.execute(
      'SELECT name FROM organizations WHERE id = ?',
      [req.user.organization_id]
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

    // Send welcome email to new user
    try {
      const organizationName = orgData[0]?.name || 'Your Organization';
      await sendUserCreatedEmail(email, fullName, req.user.full_name, organizationName, password);
    } catch (emailError) {
      console.error('Failed to send welcome email to new user:', emailError);
      // Don't fail the user creation if email fails
    }

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

    // Add effective permissions to each user
    for (let user of users) {
      user.effectivePermissions = await getUserEffectivePermissions(user.id);
    }

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

    // Get updated user info for email notification
    const [updatedUser] = await db.execute(
      `SELECT u.email, u.full_name, o.name as organization_name
       FROM users u 
       JOIN organizations o ON u.organization_id = o.id 
       WHERE u.id = ?`,
      [userId]
    );

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

    // Send email notification to user about permission changes
    if (updatedUser.length > 0 && (role || permissions)) {
      try {
        const user = updatedUser[0];
        await sendPermissionChangedEmail(
          user.email,
          user.full_name,
          user.organization_name,
          req.user.full_name,
          role || targetUser[0].role,
          permissions || {}
        );
      } catch (emailError) {
        console.error('Failed to send permission change email:', emailError);
        // Don't fail the update if email fails
      }
    }

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
      { id: 'view_properties', name: 'View Properties', description: 'View property information only' },
      { id: 'manage_tenants', name: 'Manage Tenants', description: 'Create, edit, and delete tenants' },
      { id: 'view_tenants', name: 'View Tenants', description: 'View tenant information only' },
      { id: 'manage_contracts', name: 'Manage Contracts', description: 'Create, edit, and delete contracts' },
      { id: 'view_contracts', name: 'View Contracts', description: 'View contract information only' },
      { id: 'manage_payments', name: 'Manage Payments', description: 'Full payment management access' },
      { id: 'view_payments', name: 'View Payments', description: 'View payment records only' },
      { id: 'record_payments', name: 'Record Payments', description: 'Record new payments only' },
      { id: 'manage_maintenance', name: 'Manage Maintenance', description: 'Full maintenance request management' },
      { id: 'view_maintenance', name: 'View Maintenance', description: 'View maintenance requests only' },
      { id: 'create_maintenance', name: 'Create Maintenance', description: 'Create maintenance requests only' },
      { id: 'manage_documents', name: 'Manage Documents', description: 'Upload, view, and delete documents' },
      { id: 'view_documents', name: 'View Documents', description: 'View and download documents only' },
      { id: 'upload_documents', name: 'Upload Documents', description: 'Upload new documents' },
      { id: 'view_reports', name: 'View Reports', description: 'Access to reports and analytics' },
      { id: 'manage_users', name: 'Manage Users', description: 'Create and manage organization users' },
      { id: 'system_settings', name: 'System Settings', description: 'Access to system configuration' }
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