const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const serviceRoutes = require('./routes/serviceRoutes');
const checkRoutes = require('./routes/checkRoutes');
const ruleRoutes = require('./routes/ruleRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/services', serviceRoutes);
app.use('/api/check', checkRoutes);
app.use('/api/rules', ruleRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'KaagazSaathi API' }));

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
