const db = require('../db/connection');

const checkPlanLimit = (feature) => {
  return async (req, res, next) => {
    try {
      // Get current subscription
      const [organizations] = await db.execute(
        `SELECT subscription_plan, subscription_status FROM organizations WHERE id = ?`,
        [req.user.organization_id]
      );

      if (organizations.length === 0) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      const org = organizations[0];

      // Allow access for active, trial, expired_trial, and overdue subscriptions
      // Only block for suspended or cancelled
      if (org.subscription_status === 'suspended' || org.subscription_status === 'cancelled') {
        return res.status(403).json({ 
          message: 'Subscription required',
          canAccess: false,
          reason: 'inactive_subscription'
        });
      }

      // For expired trial or overdue, use basic plan limits
      let currentPlan = org.subscription_plan || 'basic';
      if (org.subscription_status === 'expired_trial' || org.subscription_status === 'overdue') {
        currentPlan = 'basic';
      }

      // Get plan limits
      const planLimits = {
        basic: { properties: 3, tenants: 25, documents: 100, maintenance_requests: 50 },
        professional: { properties: 10, tenants: 100, documents: 500, maintenance_requests: 200 },
        enterprise: { properties: -1, tenants: -1, documents: -1, maintenance_requests: -1 }
      };

      const limit = planLimits[currentPlan][feature];

      // If unlimited (-1), allow access
      if (limit === -1) {
        return next();
      }

      // Get current usage based on feature
      let countQuery;
      switch (feature) {
        case 'properties':
          countQuery = 'SELECT COUNT(*) as count FROM properties WHERE organization_id = ? AND is_active = TRUE';
          break;
        case 'tenants':
          countQuery = 'SELECT COUNT(*) as count FROM tenants WHERE organization_id = ? AND is_active = TRUE';
          break;
        case 'documents':
          countQuery = 'SELECT COUNT(*) as count FROM documents WHERE organization_id = ? AND is_active = TRUE';
          break;
        case 'maintenance_requests':
          countQuery = 'SELECT COUNT(*) as count FROM maintenance_requests WHERE organization_id = ?';
          break;
        default:
          return next(); // Unknown feature, allow access
      }

      const [result] = await db.execute(countQuery, [req.user.organization_id]);
      const currentUsage = result[0].count;

      if (currentUsage >= limit) {
        return res.status(403).json({
          message: `You have reached the limit for ${feature} on your current plan`,
          code: 'PLAN_LIMIT_EXCEEDED',
          currentUsage,
          limit,
          plan: org.subscription_plan,
          feature
        });
      }

      next();
    } catch (error) {
      console.error('Plan limit check error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
};

module.exports = { checkPlanLimit };