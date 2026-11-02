const express = require('express');
const router = express.Router();
const { getRulesByService } = require('../controllers/ruleController');

// GET /api/rules/:serviceId   — fetch verified rules for a service
router.get('/:serviceId', getRulesByService);

module.exports = router;
