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
  "UPDATE organizations SET subscription_status = 'overdue', overdue_since = CURDATE() WHERE id = ?",
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
const logActivity = (customAction) => {
  return async (req, res, next) => {
    // Store original end function
    const originalEnd = res.end;
    
    // Override end to capture when response is sent
    res.end = function(chunk, encoding) {
      // Call original end
      originalEnd.call(this, chunk, encoding);
      
      // Log activity after response is sent
      setImmediate(async () => {
        try {
          let finalAction;
          if (customAction) {
            finalAction = customAction;
          } else if (req.route) {
            const basePath = req.baseUrl || '';
            const routePath = req.route.path.replace(/:/g, '');
            finalAction = `${req.method}_${basePath}${routePath}`.replace(/\/+/g, '/');
          } else {
            finalAction = `${req.method}_UNKNOWN_ROUTE`;
          }

          if (req.user && req.user.id) {
            const details = {
              method: req.method,
              url: req.url,
              statusCode: res.statusCode,
              body: (req.method === 'POST' || req.method === 'PUT') ? req.body : null,
              params: req.params,
              query: req.query
            };

            await db.execute(
              `INSERT INTO activity_logs 
                (user_id, organization_id, action, details, ip_address, user_agent) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                req.user.id,
                req.user.organization_id,
                finalAction,
                JSON.stringify(details),
                req.ip || req.connection?.remoteAddress || null,
                req.get('user-agent') || null
              ]
            );
          }
        } catch (error) {
          console.error('Activity logging error:', error);
        }
      });
    };

    next();
  };
};
module.exports = { authenticateToken, authorize, logActivity };