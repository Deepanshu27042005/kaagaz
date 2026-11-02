const express = require('express');
const router = express.Router();
const { runCheck } = require('../controllers/checkController');

// POST /api/check   — receive extracted fields, run rules engine, return flags
router.post('/', runCheck);

module.exports = router;
