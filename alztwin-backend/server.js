const express = require('express');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

const logger = require('./config/logger');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const assessmentRoutes = require('./routes/assessmentRoutes');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Performance Middleware
app.use(compression());

const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:8081',
    'http://localhost:19000',
    'http://localhost:19001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate Limiting
app.use('/api/', rateLimiter);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/assessment', assessmentRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error Handler (Must be last)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  logger.info(`✅ Backend server started on port ${PORT}`);
  console.log(`🚀 Voice Assessment Backend Ready`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api`);
});

module.exports = app;
