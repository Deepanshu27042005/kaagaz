const CheckSession = require('../models/CheckSession');
const Rule = require('../models/Rule');
const Service = require('../models/Service');
const rulesEngine = require('../services/rulesEngine');

/**
 * POST /api/check
 *
 * Body (sent by the browser after on-device OCR):
 * {
 *   serviceId: string,
 *   consentGiven: true,
 *   extractedFields: {
 *     [documentType]: {
 *       name?: string,
 *       date_of_birth?: string,
 *       address?: string,
 *       ...
 *     }
 *   }
 * }
 *
 * NOTE: Sensitive IDs (Aadhaar numbers, etc.) should be masked by the client
 * before sending.  The server must NOT log raw field values.
 */
const runCheck = async (req, res, next) => {
  try {
    const { serviceId, consentGiven, extractedFields } = req.body;

    if (!consentGiven) {
      return res.status(400).json({ success: false, error: 'Consent is required to process documents.' });
    }
    if (!serviceId || !extractedFields) {
      return res.status(400).json({ success: false, error: 'serviceId and extractedFields are required.' });
    }

    // Load service
    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ success: false, error: 'Service not found.' });

    // Load verified rules for this service
    const rules = await Rule.find({ serviceId, isActive: true, humanVerified: true });

    // Run deterministic rules engine
    const { flags, summary } = rulesEngine.evaluate(rules, extractedFields, service);

    // Determine overall readiness
    let readinessStatus = 'ready';
    if (summary.missing > 0 || summary.mismatches > 0) readinessStatus = 'needs_attention';
    if (summary.missing >= service.requiredDocumentTypes.length) readinessStatus = 'incomplete';

    // Persist session metadata (no raw document data)
    const session = await CheckSession.create({
      serviceId,
      documentTypes: Object.keys(extractedFields),
      flags,
      summary,
      readinessStatus,
      consentGiven,
    });

    res.json({ success: true, sessionId: session._id, readinessStatus, summary, flags });
  } catch (err) {
    next(err);
  }
};

module.exports = { runCheck };
