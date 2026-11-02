const mongoose = require('mongoose');

/**
 * CheckSession — stores the *metadata* of a document check session.
 *
 * PRIVACY NOTE: Raw document images/text are processed in the citizen's
 * browser.  Only extracted field values (with sensitive IDs masked) are
 * sent to the server for the consistency check.  This model never stores
 * raw document files.
 */
const flagSchema = new mongoose.Schema(
  {
    ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rule' },
    type: { type: String, enum: ['consistency', 'presence', 'format'] },
    status: { type: String, enum: ['matched', 'mismatch', 'missing', 'review'], required: true },
    field: String,
    description: String,
    // Evidence: what was extracted and from which documents
    evidence: [
      {
        documentType: String,
        extractedValue: String, // sensitive values should already be masked
        confidence: Number,     // 0–1
      },
    ],
    sourceReference: String,
    severity: { type: String, enum: ['error', 'warning', 'info'], default: 'error' },
  },
  { _id: false }
);

const checkSessionSchema = new mongoose.Schema(
  {
    // Which service was selected
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },

    // Which document types were uploaded (NOT the contents)
    documentTypes: [{ type: String }],

    // Results produced by the rules engine
    flags: [flagSchema],

    // Summary counts
    summary: {
      matched: { type: Number, default: 0 },
      mismatches: { type: Number, default: 0 },
      missing: { type: Number, default: 0 },
      review: { type: Number, default: 0 },
    },

    // Overall readiness verdict
    readinessStatus: {
      type: String,
      enum: ['ready', 'needs_attention', 'incomplete'],
      default: 'incomplete',
    },

    // Consent flag — session must not exist without consent
    consentGiven: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CheckSession', checkSessionSchema);
