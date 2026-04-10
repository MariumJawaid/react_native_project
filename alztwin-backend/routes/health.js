const express = require('express');
const router = express.Router();
const logger = require('../config/logger');

router.get('/', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Voice Assessment Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
