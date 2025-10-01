const db = require('../db/connection');

const getDashboardStats = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    // Get property stats
    const [propertyStats] = await db.execute(
      `SELECT 
        COUNT(*) as total_properties,
        SUM(total_units) as total_units
       FROM properties 
       WHERE organization_id = ? AND is_active = TRUE`,
      [organizationId]
    );

    // Get tenant stats (exclude terminated tenants)
    const [tenantStats] = await db.execute(
      `SELECT COUNT(*) as total_tenants FROM tenants WHERE organization_id = ? AND is_active = 1 AND termination_date IS NULL`,
      [organizationId]
    );

    // Get active contracts
    const [contractStats] = await db.execute(
      `SELECT COUNT(*) as active_contracts FROM rental_contracts WHERE organization_id = ? AND status = 'active'`,
      [organizationId]
    );

    // Get payment stats for current month
    const [paymentStats] = await db.execute(
      `SELECT 
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as collected_amount,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END) as overdue_amount,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count
       FROM payments 
       WHERE organization_id = ? AND MONTH(due_date) = MONTH(CURRENT_DATE()) AND YEAR(due_date) = YEAR(CURRENT_DATE())`,
      [organizationId]
    );

    // Get maintenance requests stats
    const [maintenanceStats] = await db.execute(
      `SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_requests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_requests
       FROM maintenance_requests 
       WHERE organization_id = ?`,
      [organizationId]
    );

    // Get recent payments
    const [recentPayments] = await db.execute(
      `SELECT p.*, t.full_name as tenant_name, prop.name as property_name, pu.unit_number
       FROM payments p
       JOIN tenants t ON p.tenant_id = t.id
       JOIN rental_contracts rc ON p.contract_id = rc.id
       JOIN properties prop ON rc.property_id = prop.id
       JOIN property_units pu ON rc.unit_id = pu.id
       WHERE p.organization_id = ?
       ORDER BY p.created_at DESC
       LIMIT 5`,
      [organizationId]
    );

    // Get expiring contracts (within next 30 days, exclude terminated tenants)
    const [expiringContracts] = await db.execute(
      `SELECT rc.*, t.full_name as tenant_name, p.name as property_name, pu.unit_number
       FROM rental_contracts rc
       JOIN tenants t ON rc.tenant_id = t.id
       JOIN properties p ON rc.property_id = p.id
       JOIN property_units pu ON rc.unit_id = pu.id
       WHERE rc.organization_id = ? AND rc.status = 'active'
       AND t.is_active = 1 AND t.termination_date IS NULL
       AND DATEDIFF(rc.contract_end_date, CURDATE()) <= 30 AND DATEDIFF(rc.contract_end_date, CURDATE()) >= 0
       ORDER BY rc.contract_end_date ASC`,
      [organizationId]
    );

    res.json({
      stats: {
        properties: propertyStats[0],
        tenants: tenantStats[0],
        contracts: contractStats[0],
        payments: paymentStats[0],
        maintenance: maintenanceStats[0]
      },
      recentPayments,
      expiringContracts
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getDashboardStats
};