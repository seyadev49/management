const express = require('express');
const router = express.Router();

// Health check endpoint for network quality testing
router.head('/health-check', (req, res) => {
  res.status(200).end();
});

router.get('/health-check', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    server: 'RentFlow API'
  });
});

module.exports = router;