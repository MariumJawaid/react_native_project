const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Request error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      maxSize: process.env.MAX_AUDIO_FILE_SIZE,
      received: err.limit
    });
  }

  if (err.code === 'LIMIT_PART_COUNT') {
    return res.status(400).json({ error: 'Too many form fields' });
  }

  if (err.message && err.message.includes('File too large')) {
    return res.status(413).json({
      error: 'Audio file exceeds maximum size (25MB)',
      maxSize: '26214400 bytes'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.message
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString(),
    requestId: Math.random().toString(36).substr(2, 9)
  });
};

module.exports = errorHandler;
