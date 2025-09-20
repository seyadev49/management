const db = require('../db/connection');
const { sendAdminNotificationEmail } = require('../services/emailService');

const createNotification = async (req, res) => {
  try {
    const { userId, title, message, type, scheduledDate } = req.body;

    const [result] = await db.execute(
      `INSERT INTO notifications (organization_id, user_id, title, message, type, scheduled_date) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.organization_id, userId, title, message, type, scheduledDate]
    );

    // Send email notification to admin users for important notifications
    if (type === 'system' || type === 'urgent' || type === 'maintenance') {
      try {
        const [adminUsers] = await db.execute(
          `SELECT u.email, u.full_name, o.name as organization_name
           FROM users u 
           JOIN organizations o ON u.organization_id = o.id 
           WHERE u.id = ? AND u.is_active = TRUE`,
          [userId]
        );

        if (adminUsers.length > 0) {
          const admin = adminUsers[0];
          await sendAdminNotificationEmail(
            admin.email,
            admin.full_name,
            title,
            message,
            admin.organization_name
          );
        }
      } catch (emailError) {
        console.error('Failed to send admin notification email:', emailError);
        // Don't fail notification creation if email fails
      }
    }

    res.status(201).json({
      message: 'Notification created successfully',
      notificationId: result.insertId
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getNotifications = async (req, res) => {
  try {
    const [notifications] = await db.execute(
      `SELECT * FROM notifications 
       WHERE user_id = ? AND organization_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id, req.user.organization_id]
    );

    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ? AND organization_id = ?',
      [id, req.user.id, req.user.organization_id]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await db.execute(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND organization_id = ?',
      [req.user.id, req.user.organization_id]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const [result] = await db.execute(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND organization_id = ? AND is_read = FALSE',
      [req.user.id, req.user.organization_id]
    );

    res.json({ unreadCount: result[0].unread_count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Enhanced auto-generate notifications for system events
const generateSystemNotifications = async () => {
  try {
    console.log('Starting notification generation...');

    // 1. Generate monthly rent payments for active contracts
    await generateMonthlyRentPayments();

    // 2. Check for subscription renewals (7, 3, and 1 days before expiry)
    const [subscriptionsExpiring] = await db.execute(`
      SELECT o.*, u.id as user_id, u.full_name as user_name,
             DATEDIFF(o.next_renewal_date, CURDATE()) as days_left
      FROM organizations o
      JOIN users u ON o.id = u.organization_id AND u.role = 'landlord'
      WHERE o.subscription_status = 'active' 
      AND DATEDIFF(o.next_renewal_date, CURDATE()) IN (7, 3, 1)
    `);

    for (const subscription of subscriptionsExpiring) {
      let notificationType, title;
      if (subscription.days_left === 7) {
        notificationType = 'subscription_renewal_7';
        title = 'Subscription Renewal Due Soon (7 days)';
      } else if (subscription.days_left === 3) {
        notificationType = 'subscription_renewal_3';
        title = 'Subscription Expires in 3 Days';
      } else if (subscription.days_left === 1) {
        notificationType = 'subscription_renewal_1';
        title = 'URGENT: Subscription Expires Tomorrow';
      }

      const [existing] = await db.execute(
        'SELECT id FROM notifications WHERE type = ? AND user_id = ? AND DATE(created_at) = CURDATE()',
        [notificationType, subscription.user_id]
      );

      if (existing.length === 0) {
        await db.execute(
          `INSERT INTO notifications (organization_id, user_id, title, message, type) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            subscription.id,
            subscription.user_id,
            title,
            `Your ${subscription.subscription_plan} subscription expires in ${subscription.days_left} day(s). Please renew to continue using RentFlow.`,
            notificationType
          ]
        );

        // Send email notification for subscription renewals
        try {
          const [userEmail] = await db.execute(
            'SELECT email FROM users WHERE id = ?',
            [subscription.user_id]
          );
          
          if (userEmail.length > 0) {
            await sendAdminNotificationEmail(
              userEmail[0].email,
              subscription.user_name,
              title,
              `Your ${subscription.subscription_plan} subscription expires in ${subscription.days_left} day(s). Please renew to continue using RentFlow.`,
              subscription.name
            );
          }
        } catch (emailError) {
          console.error('Failed to send subscription renewal email:', emailError);
        }

        console.log(`Created subscription renewal notification for ${subscription.user_name} (${subscription.days_left} days)`);
      }
    }

    // 3. Check for overdue subscriptions
    const [overdueSubscriptions] = await db.execute(`
      SELECT o.*, u.id as user_id, u.full_name as user_name,
             DATEDIFF(CURDATE(), o.next_renewal_date) as days_overdue
      FROM organizations o
      JOIN users u ON o.id = u.organization_id AND u.role = 'landlord'
      WHERE o.subscription_status = 'active' 
      AND o.next_renewal_date < CURDATE()
    `);

    for (const subscription of overdueSubscriptions) {
      // Mark subscription as overdue
      await db.execute(
  'UPDATE organizations SET subscription_status = ?, overdue_since = CURDATE() WHERE id = ?',
  ['overdue', subscription.id]
);


      // Only send overdue notification once per day
      const [existing] = await db.execute(
        'SELECT id FROM notifications WHERE type = ? AND user_id = ? AND DATE(created_at) = CURDATE()',
        ['subscription_overdue', subscription.user_id]
      );

      if (existing.length === 0) {
        await db.execute(
          `INSERT INTO notifications (organization_id, user_id, title, message, type) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            subscription.id,
            subscription.user_id,
            'Subscription Payment Overdue',
            `Your subscription payment is ${subscription.days_overdue} day(s) overdue. Please renew immediately to regain access to your account.`,
            'subscription_overdue'
          ]
        );

        // Send urgent email for overdue subscriptions
        try {
          const [userEmail] = await db.execute(
            'SELECT email FROM users WHERE id = ?',
            [subscription.user_id]
          );
          
          if (userEmail.length > 0) {
            await sendAdminNotificationEmail(
              userEmail[0].email,
              subscription.user_name,
              'URGENT: Subscription Payment Overdue',
              `Your subscription payment is ${subscription.days_overdue} day(s) overdue. Please renew immediately to regain access to your account.`,
              subscription.name
            );
          }
        } catch (emailError) {
          console.error('Failed to send overdue subscription email:', emailError);
        }

        console.log(`Created overdue subscription notification for ${subscription.user_name} (${subscription.days_overdue} days overdue)`);
      }
    }

    // 2. Check for lease renewals (60 and 30 days before expiry)
    const [contractsExpiring] = await db.execute(`
      SELECT rc.*, u.id as landlord_id, t.full_name as tenant_name, p.name as property_name,
             DATEDIFF(rc.contract_end_date, CURDATE()) as days_left
      FROM rental_contracts rc
      JOIN users u ON rc.landlord_id = u.id
      JOIN tenants t ON rc.tenant_id = t.id
      JOIN properties p ON rc.property_id = p.id
      WHERE rc.status = 'active' 
      AND DATEDIFF(rc.contract_end_date, CURDATE()) IN (60, 30, 7)
    `);

    for (const contract of contractsExpiring) {
      let notificationType, title;
      if (contract.days_left === 60) {
        notificationType = 'lease_renewal_60';
        title = 'Lease Renewal Due Soon (60 days)';
      } else if (contract.days_left === 30) {
        notificationType = 'lease_renewal_30';
        title = 'Lease Expires in 30 Days';
      } else if (contract.days_left === 7) {
        notificationType = 'lease_expiry';
        title = 'URGENT: Lease Expires in 7 Days';
      }

      const [existing] = await db.execute(
        'SELECT id FROM notifications WHERE type = ? AND message LIKE ? AND user_id = ? AND DATE(created_at) = CURDATE()',
        [notificationType, `%${contract.tenant_name}%`, contract.landlord_id]
      );

      if (existing.length === 0) {
        await db.execute(
          `INSERT INTO notifications (organization_id, user_id, title, message, type) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            contract.organization_id,
            contract.landlord_id,
            title,
            `Contract for ${contract.tenant_name} at ${contract.property_name} expires in ${contract.days_left} days. Consider initiating renewal process.`,
            notificationType
          ]
        );
        console.log(`Created lease expiry notification for ${contract.tenant_name} (${contract.days_left} days)`);
      }
    }

    // 3. Check for payments due in 7, 3, and 1 days
    const [paymentsDueSoon] = await db.execute(`
      SELECT p.*, rc.landlord_id, t.full_name as tenant_name, prop.name as property_name,
             DATEDIFF(p.due_date, CURDATE()) as days_left
      FROM payments p
      JOIN rental_contracts rc ON p.contract_id = rc.id
      JOIN tenants t ON p.tenant_id = t.id
      JOIN properties prop ON rc.property_id = prop.id
      WHERE p.status = 'pending' 
      AND DATEDIFF(p.due_date, CURDATE()) IN (7, 3, 1)
    `);

    for (const payment of paymentsDueSoon) {
      let notificationType, title;
      if (payment.days_left === 7) {
        notificationType = 'payment_reminder_7';
        title = 'Payment Due in 7 Days';
      } else if (payment.days_left === 3) {
        notificationType = 'payment_reminder';
        title = 'Payment Due Soon (3 days)';
      } else if (payment.days_left === 1) {
        notificationType = 'payment_due_tomorrow';
        title = 'Payment Due Tomorrow';
      }

      const [existing] = await db.execute(
        'SELECT id FROM notifications WHERE type = ? AND message LIKE ? AND user_id = ? AND DATE(created_at) = CURDATE()',
        [notificationType, `%${payment.tenant_name}%`, payment.landlord_id]
      );

      if (existing.length === 0) {
        await db.execute(
          `INSERT INTO notifications (organization_id, user_id, title, message, type) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            payment.organization_id,
            payment.landlord_id,
            title,
            `Payment of $${payment.amount} from ${payment.tenant_name} at ${payment.property_name} is due in ${payment.days_left} day(s) (${new Date(payment.due_date).toLocaleDateString()})`,
            notificationType
          ]
        );
        console.log(`Created payment reminder for ${payment.tenant_name} (${payment.days_left} days)`);
      }
    }

    // 4. Check for payments due today
    const [paymentsDueToday] = await db.execute(`
      SELECT p.*, rc.landlord_id, t.full_name as tenant_name, prop.name as property_name
      FROM payments p
      JOIN rental_contracts rc ON p.contract_id = rc.id
      JOIN tenants t ON p.tenant_id = t.id
      JOIN properties prop ON rc.property_id = prop.id
      WHERE p.status = 'pending' 
      AND DATE(p.due_date) = CURDATE()
    `);

    for (const payment of paymentsDueToday) {
      const [existing] = await db.execute(
        'SELECT id FROM notifications WHERE type = ? AND message LIKE ? AND user_id = ? AND DATE(created_at) = CURDATE()',
        ['payment_due_today', `%${payment.tenant_name}%`, payment.landlord_id]
      );

      if (existing.length === 0) {
        await db.execute(
          `INSERT INTO notifications (organization_id, user_id, title, message, type) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            payment.organization_id,
            payment.landlord_id,
            'Payment Due Today',
            `Payment of $${payment.amount} from ${payment.tenant_name} at ${payment.property_name} is due today`,
            'payment_due_today'
          ]
        );
        console.log(`Created payment due today notification for ${payment.tenant_name}`);
      }
    }

    // 5. Check for overdue payments and automatically mark them
    const [overduePayments] = await db.execute(`
      SELECT p.*, rc.landlord_id, t.full_name as tenant_name, prop.name as property_name,
             DATEDIFF(CURDATE(), p.due_date) as days_overdue
      FROM payments p
      JOIN rental_contracts rc ON p.contract_id = rc.id
      JOIN tenants t ON p.tenant_id = t.id
      JOIN properties prop ON rc.property_id = prop.id
      WHERE p.status = 'pending' 
      AND p.due_date < CURDATE()
    `);

    for (const payment of overduePayments) {
      // Mark payment as overdue
await db.execute(
  'UPDATE payments SET status = ? WHERE id = ?',
  ['overdue', payment.id]
);


      // Only send overdue notification once per day
      const [existing] = await db.execute(
        'SELECT id FROM notifications WHERE type = ? AND message LIKE ? AND user_id = ? AND DATE(created_at) = CURDATE()',
        ['rent_overdue', `%${payment.tenant_name}%`, payment.landlord_id]
      );

      if (existing.length === 0) {
        await db.execute(
          `INSERT INTO notifications (organization_id, user_id, title, message, type) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            payment.organization_id,
            payment.landlord_id,
            'Payment Overdue',
            `Payment of $${payment.amount} from ${payment.tenant_name} at ${payment.property_name} is ${payment.days_overdue} day(s) overdue`,
            'rent_overdue'
          ]
        );
        console.log(`Created overdue payment notification for ${payment.tenant_name} (${payment.days_overdue} days overdue)`);
      }
    }

    console.log('Notification generation completed successfully');
  } catch (error) {
    console.error('Generate system notifications error:', error);
  }
};

// Generate monthly rent payments automatically
const generateMonthlyRentPayments = async () => {
  try {
    console.log('Generating monthly rent payments...');

    // Get all active contracts
    const [contracts] = await db.execute(`
      SELECT rc.*, t.id AS tenant_id, t.full_name AS tenant_name
      FROM rental_contracts rc
      JOIN tenants t ON rc.tenant_id = t.id
      WHERE rc.status = 'active'
    `);

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    for (const contract of contracts) {
      // Check if payment already exists for this month
      const [existingPayments] = await db.execute(
        `SELECT id FROM payments
         WHERE contract_id = ? AND MONTH(due_date) = ? AND YEAR(due_date) = ?`,
        [contract.id, currentMonth, currentYear]
      );

      if (existingPayments.length > 0) {
        continue; // Skip if already exists
      }

      // Determine due date
      const dueDay = contract.payment_due_day || 1;
      const dueDate = new Date(currentYear, currentMonth - 1, dueDay);

      // Ensure within contract period
      const contractStart = new Date(contract.contract_start_date);
      const contractEnd = new Date(contract.contract_end_date);

      if (dueDate >= contractStart && dueDate <= contractEnd) {
        // For NOT NULL payment_date, set it to dueDate initially
        await db.execute(
          `INSERT INTO payments (
            organization_id, contract_id, tenant_id, amount, payment_date, due_date,
            payment_type, status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, 'rent', 'pending', 'Auto-generated monthly rent payment')`,
          [
            contract.organization_id,
            contract.id,
            contract.tenant_id,
            contract.monthly_rent,
            dueDate,
            dueDate
          ]
        );

        console.log(`Generated monthly payment for ${contract.tenant_name} - $${contract.monthly_rent} due ${dueDate.toDateString()}`);
      }
    }

    console.log('Monthly rent payment generation completed');
  } catch (error) {
    console.error('Generate monthly rent payments error:', error);
  }
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  generateSystemNotifications,
  generateMonthlyRentPayments
};