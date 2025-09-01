const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cron = require('node-cron');
const { generateSystemNotifications } = require('./controllers/notificationController');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/property');
const unitRoutes = require('./routes/unit');
const tenantRoutes = require('./routes/tenant');
const contractRoutes = require('./routes/contract');
const paymentRoutes = require('./routes/payment');
const maintenanceRoutes = require('./routes/maintenance');
const dashboardRoutes = require('./routes/dashboard');
const documentRoutes = require('./routes/document');
const notificationRoutes = require('./routes/notification');
const subscriptionRoutes = require('./routes/subscription');
const reportRoutes = require('./routes/report');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/reports', reportRoutes);

// Admin routes - Fixed the path
app.use('/api/admin/users', require('./routes/admin/adminUser'));
app.use('/api/admin/billing', require('./routes/admin/adminBilling'));
app.use('/api/admin/analytics', require('./routes/admin/adminAnalytics'));
app.use('/api/admin/users/organizations', require('./routes/admin/organizationRoutes')); // Fixed this line

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Schedule notification generation to run every hour for comprehensive coverage
cron.schedule('0 * * * *', () => {
  console.log('Running scheduled notification generation...');
  generateSystemNotifications();
});

const { generateMonthlyRentPayments } = require('./controllers/notificationController');
// Schedule monthly payment generation to run daily at 6 AM
cron.schedule('0 6 * * *', () => {
  console.log('Running monthly payment generation...');
  generateMonthlyRentPayments();
});

// Also run on startup
setTimeout(() => {
  generateSystemNotifications();
  generateMonthlyRentPayments();
}, 5000);