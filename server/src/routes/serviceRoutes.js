const express = require('express');
const router = express.Router();
const { getAllServices, getServiceBySlug } = require('../controllers/serviceController');

// GET /api/services          — list all active services
router.get('/', getAllServices);

// GET /api/services/:slug    — get a specific service with its rules
router.get('/:slug', getServiceBySlug);

module.exports = router;
