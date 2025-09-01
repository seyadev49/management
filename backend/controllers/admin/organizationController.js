const db = require('../../db/connection');

// Create new organization with admin user
const createOrganization = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const {
      organizationName,
      email,
      phone,
      address,
      adminName,
      adminEmail,
      adminPassword,
      subscriptionPlan,
      subscriptionStatus
    } = req.body;

    await connection.query('START TRANSACTION');

    // Check if organization email already exists
    const [existingOrgs] = await connection.execute(
      'SELECT id FROM organizations WHERE email = ?',
      [email]
    );

    if (existingOrgs.length > 0) {
      await connection.query('ROLLBACK');
      return res.status(400).json({ 
        success: false,
        message: 'Organization with this email already exists' 
      });
    }

    // Check if admin email already exists
    const [existingUsers] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [adminEmail]
    );

    if (existingUsers.length > 0) {
      await connection.query('ROLLBACK');
      return res.status(400).json({ 
        success: false,
        message: 'Admin user with this email already exists' 
      });
    }

    // Set trial dates
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialStartDate.getDate() + 7);

    // Create organization
    const [orgResult] = await connection.execute(
      `INSERT INTO organizations 
      (name, email, phone, address, trial_start_date, trial_end_date, subscription_status, subscription_plan) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [organizationName, email, phone, address, trialStartDate, trialEndDate, subscriptionStatus, subscriptionPlan]
    );

    const organizationId = orgResult.insertId;

    // Hash admin password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Create admin user with landlord role
    const [userResult] = await connection.execute(
      'INSERT INTO users (organization_id, email, password, full_name, role, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [organizationId, adminEmail, hashedPassword, adminName, 'landlord']
    );

    // Log the action
    await connection.execute(`
      INSERT INTO admin_actions (admin_id, action, target_type, target_id, details)
      VALUES (?, 'organization_created', 'organization', ?, ?)
    `, [req.user.id, organizationId, JSON.stringify({ 
      organization_name: organizationName,
      admin_email: adminEmail,
      subscription_plan: subscriptionPlan
    })]);

    await connection.query('COMMIT');

    // Send welcome email (optional)
    try {
      const { sendWelcomeEmail } = require('../../services/emailService');
      await sendWelcomeEmail(adminEmail, adminName, organizationName);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the creation if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: {
        organization: {
          id: organizationId,
          name: organizationName,
          email: email,
          admin_user_id: userResult.insertId,
          created_at: new Date()
        }
      }
    });

  } catch (error) {
    await connection.query('ROLLBACK');
    console.error('Create organization error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create organization',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

// Get all organizations with details - FIXED RESPONSE STRUCTURE
const getAllOrganizations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const search = req.query.search || '';
    const statusFilter = req.query.status || '';

    let query = `
      SELECT 
        o.id,
        o.name as organization_name,
        o.email,
        o.phone,
        o.address,
        o.created_at,
        o.subscription_plan,
        o.subscription_status,
        o.trial_end_date,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT p.id) as total_properties,
        COUNT(DISTINCT t.id) as total_tenants,
        MAX(u.last_login) as last_activity
      FROM organizations o
      LEFT JOIN users u ON o.id = u.organization_id
      LEFT JOIN properties p ON o.id = p.organization_id
      LEFT JOIN tenants t ON o.id = t.organization_id
    `;
    
    let params = [];

    if (search || statusFilter) {
      query += ' WHERE ';
      const conditions = [];
      
      if (search) {
        conditions.push('(o.name LIKE ? OR o.email LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }
      
      if (statusFilter) {
        conditions.push('o.subscription_status = ?');
        params.push(statusFilter);
      }
      
      query += conditions.join(' AND ');
    }

    query += ' GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [organizations] = await db.execute(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM organizations';
    let countParams = [];
    
    if (search || statusFilter) {
      countQuery += ' WHERE ';
      const conditions = [];
      
      if (search) {
        conditions.push('(name LIKE ? OR email LIKE ?)');
        countParams.push(`%${search}%`, `%${search}%`);
      }
      
      if (statusFilter) {
        conditions.push('subscription_status = ?');
        countParams.push(statusFilter);
      }
      
      countQuery += conditions.join(' AND ');
    }
    
    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    // Return properly formatted response
    res.json({
      organizations, // Direct array without data wrapper
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all organizations error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get detailed organization info with users and activity logs
const getOrganizationDetails = async (req, res) => {
  try {
    const { orgId } = req.params;

    // Get organization info + aggregates
    const [orgData] = await db.execute(`
      SELECT 
        o.*,
        COUNT(DISTINCT u.id) AS total_users,
        COUNT(DISTINCT p.id) AS total_properties,
        COUNT(DISTINCT t.id) AS total_tenants,
        COUNT(DISTINCT c.id) AS total_contracts,
        COALESCE(SUM(py.amount), 0) AS total_payments_received
      FROM organizations o
      LEFT JOIN users u ON o.id = u.organization_id
      LEFT JOIN properties p ON o.id = p.organization_id
      LEFT JOIN tenants t ON o.id = t.organization_id
      LEFT JOIN rental_contracts c ON o.id = c.organization_id
      LEFT JOIN payments py ON o.id = py.organization_id
      WHERE o.id = ?
      GROUP BY o.id
    `, [orgId]);

    if (orgData.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Organization not found' 
      });
    }

    // Get organization users
    const [users] = await db.execute(`
      SELECT 
        id, full_name, email, role, last_login, created_at, is_active
      FROM users 
      WHERE organization_id = ?
      ORDER BY created_at DESC
    `, [orgId]);

    // Get recent activity logs - FIXED: Properly filter by organization
    const [activityLogs] = await db.execute(`
      SELECT 
        al.action, al.details, al.created_at, u.full_name AS user_name
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.organization_id = ?
      ORDER BY al.created_at DESC
      LIMIT 20
    `, [orgId]);

    res.json({
      success: true,
      data: {
        organization: orgData[0],
        users,
        activityLogs: activityLogs || [] // Ensure it's always an array
      }
    });
  } catch (error) {
    console.error('Get organization details error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update organization status (suspend/reactivate)
const updateOrganizationStatus = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { action, reason } = req.body; // action: 'suspend' | 'reactivate'

    const newStatus = action === 'suspend' ? 'suspended' : 'active';

    await db.execute(`
      UPDATE organizations 
      SET subscription_status = ?, 
          suspension_reason = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newStatus, action === 'suspend' ? reason : null, orgId]);

    // Log the action
    await db.execute(`
      INSERT INTO admin_actions (admin_id, action, target_type, target_id, details)
      VALUES (?, ?, 'organization', ?, ?)
    `, [req.user.id, action, orgId, JSON.stringify({ reason })]);

    res.json({ 
      success: true,
      message: `Organization ${action === 'suspend' ? 'suspended' : 'reactivated'} successfully` 
    });
  } catch (error) {
    console.error('Update organization status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete organization
const deleteOrganization = async (req, res) => {
  try {
    const { orgId } = req.params;

    // Check if organization exists
    const [existingOrg] = await db.execute(
      'SELECT id FROM organizations WHERE id = ?',
      [orgId]
    );

    if (existingOrg.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Organization not found' 
      });
    }

    // Delete organization (foreign key constraints will handle cascade deletes)
    await db.execute('DELETE FROM organizations WHERE id = ?', [orgId]);

    // Log the action
    await db.execute(`
      INSERT INTO admin_actions (admin_id, action, target_type, target_id, details)
      VALUES (?, 'organization_deleted', 'organization', ?, ?)
    `, [req.user.id, orgId, JSON.stringify({ organization_id: orgId })]);

    res.json({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export all functions correctly
module.exports = {
  createOrganization,
  getAllOrganizations,
  getOrganizationDetails,
  updateOrganizationStatus,
  deleteOrganization
};