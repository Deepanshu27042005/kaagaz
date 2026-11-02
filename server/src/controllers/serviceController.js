const Service = require('../models/Service');

/**
 * GET /api/services
 * Returns all active services (picker list for the frontend).
 */
const getAllServices = async (_req, res, next) => {
  try {
    const services = await Service.find({ isActive: true }).select('-__v').sort('name');
    res.json({ success: true, count: services.length, data: services });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/services/:slug
 * Returns a single service and its required document types.
 */
const getServiceBySlug = async (req, res, next) => {
  try {
    const service = await Service.findOne({ slug: req.params.slug, isActive: true });
    if (!service) return res.status(404).json({ success: false, error: 'Service not found' });
    res.json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllServices, getServiceBySlug };
