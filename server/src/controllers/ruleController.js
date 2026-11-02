const Rule = require('../models/Rule');

/**
 * GET /api/rules/:serviceId
 * Returns all human-verified, active rules for a given service.
 */
const getRulesByService = async (req, res, next) => {
  try {
    const rules = await Rule.find({
      serviceId: req.params.serviceId,
      isActive: true,
      humanVerified: true,
    }).select('-__v');
    res.json({ success: true, count: rules.length, data: rules });
  } catch (err) {
    next(err);
  }
};

module.exports = { getRulesByService };
