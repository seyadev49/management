const jwt = require('jsonwebtoken');
const db = require('../db/connection');

const authenticateToken = async (req, res, next) => {
  console.log('=== AUTHENTICATION MIDDLEWARE CALLED ===');
  console.log('Request headers:', req.headers);
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Token found:', !!token);
  
  if (!token) {
    console.log('No token found');
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully:', decoded);

    // Get user details
    const [users] = await db.execute(
      'SELECT u.*, o.subscription_status, o.trial_end_date, o.next_renewal_date, o.overdue_since FROM users u JOIN organizations o ON u.organization_id = o.id WHERE u.id = ? AND u.is_active = TRUE',
      [decoded.userId]
    );

    console.log('User query result:', users.length);
    
    if (users.length === 0) {
      console.log('Invalid user');
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = users[0];
    console.log('User found:', user.full_name, user.organization_id);
    
    const today = new Date();

    // Check if trial has expired - allow basic access but mark as expired
    if (user.subscription_status === 'trial' && today > new Date(user.trial_end_date)) {
      user.subscription_status = 'expired_trial';
    }

    // Check if subscription is overdue - allow access but mark as overdue
    if (user.subscription_status === 'active' && user.next_renewal_date && today > new Date(user.next_renewal_date)) {
      // Mark as overdue if not already marked
      if (!user.overdue_since) {
        await db.execute(
          'UPDATE organizations SET subscription_status = "overdue", overdue_since = CURDATE() WHERE id = ?',
          [user.organization_id]
        );
      }
      user.subscription_status = 'overdue';
    }

    // Only block access for suspended or cancelled subscriptions
    if (user.subscription_status === 'suspended' || user.subscription_status === 'cancelled') {
      console.log('Subscription blocked');
      return res.status(403).json({ message: 'Subscription is not active' });
    }

    req.user = user;
    console.log('Authentication successful, passing to next middleware');
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ message: 'Invalid token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('=== AUTHORIZE MIDDLEWARE CALLED ===');
    console.log('Required roles:', roles);
    console.log('User role:', req.user?.role);
    
    if (!roles.includes(req.user.role)) {
      console.log('Access denied - role mismatch');
      return res.status(403).json({ message: 'Access denied' });
    }
    console.log('Authorization successful');
    next();
  };
};

const logActivity = (action) => {
  return async (req, res, next) => {
    console.log(`=== LOG ACTIVITY MIDDLEWARE CALLED FOR ACTION: ${action} ===`);
    try {
      if (req.user && req.user.id) {
        const details = {
          method: req.method,
          url: req.url,
          body: (req.method === 'POST' || req.method === 'PUT') ? req.body : null,
          params: req.params,
          query: req.query
        };

        console.log('Attempting to insert activity log...');

        await db.execute(
          `INSERT INTO activity_logs 
            (user_id, organization_id, action, details, ip_address, user_agent) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            req.user.id,
            req.user.organization_id,
            action,
            JSON.stringify(details),
            req.ip || req.connection.remoteAddress,
            req.get('user-agent')
          ]
        );

        console.log('Activity log inserted successfully!');

        await db.execute(
          'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
          [req.user.id]
        );

        console.log('User last_login updated');
      } else {
        console.log('No user found for activity logging');
      }
    } catch (error) {
      console.error('Activity logging error:', error); // <-- full error
    }
  };
};

module.exports = { authenticateToken, authorize, logActivity };