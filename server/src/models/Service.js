const mongoose = require('mongoose');

/**
 * Service — a government service or scheme that KaagazSaathi can check documents for.
 * Examples: Ration Card Application, PM Awas Yojana, Scholarship Form, etc.
 */
const serviceSchema = new mongoose.Schema(
  {
    // Short slug used in API URLs  e.g. "ration-card"
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },

    // Human-readable name shown in the UI
    name: { type: String, required: true, trim: true },

    // Brief description shown on the service picker card
    description: { type: String, default: '' },

    // Which category / ministry this service belongs to
    category: { type: String, default: 'General' },

    // Official government URL that users can visit for authoritative info
    officialUrl: { type: String, default: '' },

    // List of document types the citizen must upload for this service
    // e.g. ["aadhaar", "ration_card", "income_certificate"]
    requiredDocumentTypes: [{ type: String }],

    // Is this service currently active / selectable in the UI?
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);
