const mongoose = require('mongoose');

/**
 * Rule — a single deterministic check that the rules engine applies.
 *
 * Rules are human-verified before being stored.  The engine never makes
 * eligibility decisions; it only flags inconsistencies and missing items.
 */
const ruleSchema = new mongoose.Schema(
  {
    // Which service this rule belongs to
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },

    // Machine-readable rule type
    // "consistency"  — same field must match across multiple documents
    // "presence"     — a specific document / field must be present
    // "format"       — a field must match a pattern (e.g. date format)
    type: {
      type: String,
      enum: ['consistency', 'presence', 'format'],
      required: true,
    },

    // Human-readable description of what this rule checks
    description: { type: String, required: true },

    // The field or concept being checked (e.g. "name", "date_of_birth", "address_proof")
    field: { type: String, required: true },

    // For "consistency" rules: which document types must agree on this field
    involvedDocuments: [{ type: String }],

    // For "presence" rules: which document type is required
    requiredDocument: { type: String, default: '' },

    // For "format" rules: regex pattern as string
    formatPattern: { type: String, default: '' },

    // Official source that backs this rule (link or citation)
    sourceReference: { type: String, default: '' },

    // Severity when the rule fires
    severity: { type: String, enum: ['error', 'warning', 'info'], default: 'error' },

    // Has this rule been reviewed and approved by a human?
    humanVerified: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Rule', ruleSchema);
