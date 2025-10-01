const db = require('../db/connection');
const { sendAdminNotificationEmail } = require('../services/emailService');

const createTenant = async (req, res) => {
  try {
    const {
      tenantId,
      fullName,
      sex,
      phone,
      city,
      subcity,
      woreda,
      houseNo,
      organization,
      hasAgent,
      agentFullName,
      agentSex,
      agentPhone,
      agentCity,
      agentSubcity,
      agentWoreda,
      agentHouseNo,
      authenticationNo,
      authenticationDate
    } = req.body;

    const [result] = await db.execute(
      `INSERT INTO tenants (
        organization_id, tenant_id, full_name, sex, phone, city, subcity, woreda, house_no, organization,
        has_agent, agent_full_name, agent_sex, agent_phone, agent_city, agent_subcity, agent_woreda,
        agent_house_no, authentication_no, authentication_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.organization_id,
        tenantId,
        fullName,
        sex,
        phone,
        city,
        subcity,
        woreda,
        houseNo,
        organization,
        hasAgent || false,
        agentFullName,
        agentSex,
        agentPhone,
        agentCity,
        agentSubcity,
        agentWoreda,
        agentHouseNo,
        authenticationNo,
        authenticationDate && authenticationDate.trim() !== '' ? authenticationDate : null
      ]
    );

    // Send notification to organization admins about new tenant
    try {
      const [adminUsers] = await db.execute(
        `SELECT u.email, u.full_name, o.name as organization_name
         FROM users u 
         JOIN organizations o ON u.organization_id = o.id 
         WHERE u.organization_id = ? AND u.role IN ('landlord', 'admin') AND u.is_active = TRUE`,
        [req.user.organization_id]
      );

      for (const admin of adminUsers) {
        if (admin.email !== req.user.email) { // Don't send to the user who created the tenant
          await sendAdminNotificationEmail(
            admin.email,
            admin.full_name,
            'New Tenant Added',
            `A new tenant "${fullName}" (ID: ${tenantId}) has been added to the system by ${req.user.full_name}.`,
            admin.organization_name
          );
        }
      }
    } catch (emailError) {
      console.error('Failed to send tenant creation notification:', emailError);
    }

    res.status(201).json({
      message: 'Tenant created successfully',
      tenantId: result.insertId
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
const getTenants = async (req, res) => {
  try {
    // Fetch tenants with essential contract fields
    const [tenants] = await db.execute(
      `SELECT t.*, 
              rc.id as contract_id,
              p.name as property_name,
              pu.unit_number,
              rc.monthly_rent,
              rc.contract_start_date,
              rc.contract_end_date,
              rc.rent_start_date,      -- ✅ Critical for payment cycle
              rc.payment_term,         -- ✅ Critical (1=monthly, 3=quarterly, etc.)
              rc.status as contract_status,
              DATEDIFF(rc.contract_end_date, CURDATE()) as days_until_expiry
       FROM tenants t
       LEFT JOIN rental_contracts rc ON t.id = rc.tenant_id AND rc.status = 'active'
       LEFT JOIN properties p ON rc.property_id = p.id
       LEFT JOIN property_units pu ON rc.unit_id = pu.id
       WHERE t.organization_id = ? AND t.is_active = TRUE
       ORDER BY t.created_at DESC`,
      [req.user.organization_id]
    );

    // ✅ Calculate days_until_next_payment in JavaScript
    const tenantsWithPaymentInfo = tenants.map(tenant => {
      if (
        tenant.contract_status === 'active' &&
        tenant.rent_start_date &&
        tenant.payment_term
      ) {
        const today = new Date();
        const rentStart = new Date(tenant.rent_start_date);
        
        // Clone rentStart to avoid mutation
        let nextDue = new Date(rentStart);
        
        // Keep adding payment terms until nextDue is AFTER today
        while (nextDue <= today) {
          nextDue.setMonth(nextDue.getMonth() + tenant.payment_term);
        }
        
        // Calculate days between today and nextDue
        const diffTime = nextDue.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          ...tenant,
          days_until_next_payment: diffDays
        };
      }
      
      // No active contract or missing data → null
      return {
        ...tenant,
        days_until_next_payment: null
      };
    });

    res.json({ tenants: tenantsWithPaymentInfo });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
const getTenantById = async (req, res) => {
  try {
    const { id } = req.params;

    const [tenants] = await db.execute(
      'SELECT * FROM tenants WHERE id = ? AND organization_id = ?',
      [id, req.user.organization_id]
    );

    if (tenants.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    res.json({ tenant: tenants[0] });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getSecurityDeposit = (req, res) => {
  const tenantId = req.params.id; // this is tenants.id

  const query = `
    SELECT rc.deposit, pu.deposit as unit_deposit
    FROM rental_contracts rc
    JOIN property_units pu ON rc.unit_id = pu.id
    WHERE rc.tenant_id = ? AND rc.status = 'active'
    LIMIT 1
  `;

  db.execute(query, [tenantId])
    .then(([results]) => {
      if (results.length === 0) {
        console.log('[getSecurityDeposit] No deposit found for tenant:', tenantId);
        return res.json({ securityDeposit: null });
      }

      const deposit = results[0].deposit || results[0].unit_deposit;
      console.log('[getSecurityDeposit] Found deposit:', deposit);
      return res.json({ securityDeposit: deposit });
    })
    .catch((err) => {
      console.error('[getSecurityDeposit] DB error:', err);
      return res.status(500).json({ message: 'Database error' });
    });
};


const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      sex,
      phone,
      city,
      subcity,
      woreda,
      houseNo,
      organization,
      hasAgent,
      agentFullName,
      agentSex,
      agentPhone,
      agentCity,
      agentSubcity,
      agentWoreda,
      agentHouseNo,
      authenticationNo,
      authenticationDate
    } = req.body;

    await db.execute(
      `UPDATE tenants SET
        full_name = ?, sex = ?, phone = ?, city = ?, subcity = ?, woreda = ?, house_no = ?, organization = ?,
        has_agent = ?, agent_full_name = ?, agent_sex = ?, agent_phone = ?, agent_city = ?, agent_subcity = ?,
        agent_woreda = ?, agent_house_no = ?, authentication_no = ?, authentication_date = ?
       WHERE id = ? AND organization_id = ?`,
      [
        fullName, sex, phone, city, subcity, woreda, houseNo, organization,
        hasAgent, agentFullName, agentSex, agentPhone, agentCity, agentSubcity,
        agentWoreda, agentHouseNo, authenticationNo, authenticationDate && authenticationDate.trim() !== '' ? authenticationDate : null,
        id, req.user.organization_id
      ]
    );

    res.json({ message: 'Tenant updated successfully' });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      'UPDATE tenants SET is_active = FALSE WHERE id = ? AND organization_id = ?',
      [id, req.user.organization_id]
    );

    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
const renewContract = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params; // tenant ID
    const {
      newEndDate,
      monthlyRent,
      deposit,
      leaseDuration,
      notes
    } = req.body;

    await connection.query('START TRANSACTION');

    // Get current active contract
    const [currentContracts] = await connection.execute(
      `SELECT rc.*, p.name as property_name, pu.unit_number, t.full_name as tenant_name
       FROM rental_contracts rc
       JOIN properties p ON rc.property_id = p.id
       JOIN property_units pu ON rc.unit_id = pu.id
       JOIN tenants t ON rc.tenant_id = t.id
       WHERE rc.tenant_id = ? AND rc.status = 'active' AND rc.organization_id = ?`,
      [id, req.user.organization_id]
    );

    if (currentContracts.length === 0) {
      await connection.query('ROLLBACK');
      return res.status(404).json({ message: 'No active contract found for this tenant' });
    }

    const currentContract = currentContracts[0];

    // Archive current contract
    await connection.execute(
      `UPDATE rental_contracts 
       SET status = 'expired', 
           actual_end_date = CURDATE(),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND organization_id = ?`,
      [currentContract.id, req.user.organization_id]
    );

    // Calculate new contract dates
    const startDate = new Date();
    const endDate = new Date(newEndDate);

    // Create new contract
    const [newContractResult] = await connection.execute(
      `INSERT INTO rental_contracts (
        organization_id, property_id, unit_id, tenant_id, landlord_id,
        lease_duration, contract_start_date, contract_end_date, monthly_rent, deposit,
        payment_term, rent_start_date, rent_end_date, total_amount,
        eeu_payment, water_payment, generator_payment, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        req.user.organization_id,
        currentContract.property_id,
        currentContract.unit_id,
        currentContract.tenant_id,
        req.user.id,
        leaseDuration || 12,
        startDate,
        endDate,
        monthlyRent || currentContract.monthly_rent,
        deposit || currentContract.deposit,
        currentContract.payment_term || 1,
        startDate,
        endDate,
        (monthlyRent || currentContract.monthly_rent) * (leaseDuration || 12),
        currentContract.eeu_payment || 0,
        currentContract.water_payment || 0,
        currentContract.generator_payment || 0
      ]
    );

    // Log the renewal activity
    await connection.execute(
      `INSERT INTO activity_logs (user_id, organization_id, action, details) 
       VALUES (?, ?, 'contract_renewed', ?)`,
      [
        req.user.id,
        req.user.organization_id,
        JSON.stringify({
          tenant_id: id,
          tenant_name: currentContract.tenant_name,
          property: `${currentContract.property_name} Unit ${currentContract.unit_number}`,
          old_contract_id: currentContract.id,
          new_contract_id: newContractResult.insertId,
          old_end_date: currentContract.contract_end_date,
          new_end_date: newEndDate,
          new_monthly_rent: monthlyRent || currentContract.monthly_rent,
          notes: notes
        })
      ]
    );

    // Create notification
    await connection.execute(
      `INSERT INTO notifications (organization_id, user_id, title, message, type) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.organization_id,
        req.user.id,
        'Contract Renewed',
        `Contract for ${currentContract.tenant_name} at ${currentContract.property_name} Unit ${currentContract.unit_number} has been renewed until ${new Date(newEndDate).toLocaleDateString()}. ${notes ? 'Notes: ' + notes : ''}`,
        'general'
      ]
    );

    await connection.query('COMMIT');

    res.json({
      message: 'Contract renewed successfully',
      renewalDetails: {
        tenant_name: currentContract.tenant_name,
        property: `${currentContract.property_name} Unit ${currentContract.unit_number}`,
        old_contract_id: currentContract.id,
        new_contract_id: newContractResult.insertId,
        new_end_date: newEndDate,
        monthly_rent: monthlyRent || currentContract.monthly_rent
      }
    });

  } catch (error) {
    await connection.query('ROLLBACK');
    console.error('Renew contract error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};


const terminateTenant = async (req, res) => {
  const connection = await db.getConnection(); // Get dedicated connection for transaction
  try {
    const { id } = req.params;
    const {
      terminationDate,
      terminationReason,
      securityDepositAction, // 'return_full', 'return_partial', 'keep_full'
      partialReturnAmount,
      deductions,
      notes
    } = req.body;

    // Start transaction
    await connection.query('START TRANSACTION');

    // Verify tenant belongs to organization
    const [tenants] = await connection.execute(
      'SELECT * FROM tenants WHERE id = ? AND organization_id = ?',
      [id, req.user.organization_id]
    );

    if (tenants.length === 0) {
      await connection.query('ROLLBACK');
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const tenant = tenants[0];

    // Get active contract
    const [contracts] = await connection.execute(
      `SELECT rc.*, p.name as property_name, pu.unit_number 
       FROM rental_contracts rc
       JOIN properties p ON rc.property_id = p.id
       JOIN property_units pu ON rc.unit_id = pu.id
       WHERE rc.tenant_id = ? AND rc.status = 'active' AND rc.organization_id = ?`,
      [id, req.user.organization_id]
    );

    if (contracts.length === 0) {
      await connection.query('ROLLBACK');
      return res.status(404).json({ message: 'No active contract found for this tenant' });
    }

    const contract = contracts[0];

    // 1. Terminate the contract
    await connection.execute(
      `UPDATE rental_contracts 
       SET status = 'terminated', 
           actual_end_date = ?,
           termination_reason = ?,
           termination_date = ?
       WHERE id = ? AND organization_id = ?`,
      [terminationDate, terminationReason, terminationDate, contract.id, req.user.organization_id]
    );

    // 2. Handle security deposit
    let depositReturnAmount = 0;
    if (securityDepositAction === 'return_full') {
      depositReturnAmount = contract.security_deposit;
    } else if (securityDepositAction === 'return_partial') {
      depositReturnAmount = partialReturnAmount || 0;
    }

    if (depositReturnAmount > 0) {
      await connection.execute(
        `INSERT INTO payments (organization_id, contract_id, tenant_id, amount, payment_date, due_date, payment_type, payment_method, status, notes) 
         VALUES (?, ?, ?, ?, ?, ?, 'deposit_return', 'cash', 'paid', ?)`,
        [
          req.user.organization_id,
          contract.id,
          id,
          -depositReturnAmount, // Negative for refund
          terminationDate,
          terminationDate,
          `Security deposit return: ${securityDepositAction}`
        ]
      );
    }

    // 3. Record deductions
    if (deductions && deductions.length > 0) {
      for (const deduction of deductions) {
        await connection.execute(
          `INSERT INTO payments (organization_id, contract_id, tenant_id, amount, payment_date, due_date, payment_type, payment_method, status, notes) 
           VALUES (?, ?, ?, ?, ?, ?, 'deduction', 'deduction', 'paid', ?)`,
          [
            req.user.organization_id,
            contract.id,
            id,
            deduction.amount,
            terminationDate,
            terminationDate,
            `Deduction: ${deduction.description}`
          ]
        );
      }
    }

    // 4. Cancel future pending payments
    await connection.execute(
      `UPDATE payments 
       SET status = 'cancelled', notes = CONCAT(IFNULL(notes, ''), ' - Cancelled due to tenant termination')
       WHERE contract_id = ? AND status = 'pending' AND due_date > ?`,
      [contract.id, terminationDate]
    );

    // 5. Update tenant status
await connection.execute(
  `UPDATE tenants 
   SET termination_date = ?, termination_reason = ?, termination_notes = ?, is_active = 0
   WHERE id = ? AND organization_id = ?`,
  [terminationDate, terminationReason, notes, id, req.user.organization_id]
);
    // 6. Free the unit
    await connection.execute(
      `UPDATE property_units 
       SET is_occupied = 0
       WHERE id = ?`,
      [contract.unit_id]
    );

    // 7. Notify landlord
    await connection.execute(
      `INSERT INTO notifications (organization_id, user_id, title, message, type) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.organization_id,
        contract.landlord_id,
        'Tenant Terminated',
        `Tenant ${tenant.full_name} at ${contract.property_name} Unit ${contract.unit_number} has been terminated. Reason: ${terminationReason}`,
        'general'
      ]
    );

    await connection.query('COMMIT');

    // 8. Email notifications
    try {
      const [adminUsers] = await connection.execute(
        `SELECT u.email, u.full_name, o.name as organization_name
         FROM users u 
         JOIN organizations o ON u.organization_id = o.id 
         WHERE u.organization_id = ? AND u.role IN ('landlord', 'admin') AND u.is_active = TRUE`,
        [req.user.organization_id]
      );

      for (const admin of adminUsers) {
        await sendAdminNotificationEmail(
          admin.email,
          admin.full_name,
          'Tenant Terminated',
          `Tenant ${tenant.full_name} at ${contract.property_name} Unit ${contract.unit_number} has been terminated. Reason: ${terminationReason}. Deposit action: ${securityDepositAction}`,
          admin.organization_name
        );
      }
    } catch (emailError) {
      console.error('Failed to send tenant termination notification:', emailError);
    }

    res.json({
      message: 'Tenant terminated successfully',
      terminationDetails: {
        tenant_name: tenant.full_name,
        property: `${contract.property_name} Unit ${contract.unit_number}`,
        termination_date: terminationDate,
        deposit_returned: depositReturnAmount,
        reason: terminationReason
      }
    });

  } catch (error) {
    await connection.query('ROLLBACK');
    console.error('Terminate tenant error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};


const getTerminatedTenants = async (req, res) => {
  try {
    const [tenants] = await db.execute(
      `SELECT t.*,
              rc.id as contract_id,
              p.name as property_name,
              pu.unit_number,
              rc.monthly_rent,
              rc.contract_start_date,
              rc.contract_end_date,
              rc.status as contract_status
       FROM tenants t
       LEFT JOIN rental_contracts rc ON t.id = rc.tenant_id AND rc.status = 'terminated'
       LEFT JOIN properties p ON rc.property_id = p.id
       LEFT JOIN property_units pu ON rc.unit_id = pu.id
       WHERE t.organization_id = ? AND t.is_active = 0 AND t.termination_date IS NOT NULL
       ORDER BY t.termination_date DESC`,
      [req.user.organization_id]
    );

    res.json({ tenants });
  } catch (error) {
    console.error('Get terminated tenants error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getContractHistory = async (req, res) => {
  try {
    const { id } = req.params; // tenant ID

    const [contracts] = await db.execute(
      `SELECT rc.*, p.name as property_name, pu.unit_number,
              CASE 
                WHEN rc.status = 'active' THEN 'Active'
                WHEN rc.status = 'expired' THEN 'Expired'
                WHEN rc.status = 'terminated' THEN 'Terminated'
                ELSE rc.status
              END as status_display
       FROM rental_contracts rc
       JOIN properties p ON rc.property_id = p.id
       JOIN property_units pu ON rc.unit_id = pu.id
       WHERE rc.tenant_id = ? AND rc.organization_id = ?
       ORDER BY rc.created_at DESC`,
      [id, req.user.organization_id]
    );

    res.json({ contracts });
  } catch (error) {
    console.error('Get contract history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
module.exports = {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  deleteTenant,
  terminateTenant,
  getTerminatedTenants,
  getSecurityDeposit,
  renewContract,
  getContractHistory
};
