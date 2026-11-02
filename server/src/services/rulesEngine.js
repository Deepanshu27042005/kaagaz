const { normalizeName, normalizeDate, normalizeAddress } = require('../utils/normalizer');

/**
 * Deterministic Rules Engine
 *
 * Evaluates a set of human-verified rules against extracted document fields.
 * Returns a list of flags and a summary count.
 *
 * Design principles:
 *  - No ML inference here; all decisions are rule-based and explainable.
 *  - Low-confidence extractions are flagged for human review, never silently accepted.
 *  - The engine never determines eligibility — only consistency and completeness.
 */

const CONFIDENCE_THRESHOLD = 0.75;

/**
 * Normalize a field value based on its type.
 */
function normalizeField(field, value) {
  if (!value) return '';
  if (field.includes('name')) return normalizeName(value);
  if (field.includes('date') || field.includes('dob')) return normalizeDate(value);
  if (field.includes('address')) return normalizeAddress(value);
  return value.trim().toLowerCase();
}

/**
 * Check a CONSISTENCY rule — the same field must match across multiple documents.
 */
function evalConsistency(rule, extractedFields) {
  const docs = rule.involvedDocuments;
  const values = docs.map((docType) => {
    const docData = extractedFields[docType];
    return docData ? { docType, raw: docData[rule.field], confidence: docData._confidence?.[rule.field] ?? 1 } : null;
  }).filter(Boolean);

  if (values.length < 2) {
    // Not enough documents present to compare — treat as missing
    return { status: 'missing', evidence: values, description: rule.description };
  }

  const normalized = values.map((v) => ({ ...v, normalized: normalizeField(rule.field, v.raw) }));
  const lowConf = normalized.find((v) => v.confidence < CONFIDENCE_THRESHOLD);
  if (lowConf) {
    return { status: 'review', evidence: normalized, description: `Low confidence in "${rule.field}" from ${lowConf.docType} — please verify manually.` };
  }

  const allMatch = normalized.every((v) => v.normalized === normalized[0].normalized);
  return {
    status: allMatch ? 'matched' : 'mismatch',
    evidence: normalized.map((v) => ({ documentType: v.docType, extractedValue: v.raw, confidence: v.confidence })),
    description: rule.description,
  };
}

/**
 * Check a PRESENCE rule — a required document must be present.
 */
function evalPresence(rule, extractedFields) {
  const present = !!extractedFields[rule.requiredDocument];
  return {
    status: present ? 'matched' : 'missing',
    evidence: [{ documentType: rule.requiredDocument, extractedValue: present ? 'present' : 'not found', confidence: 1 }],
    description: rule.description,
  };
}

/**
 * Check a FORMAT rule — a field must match a regex pattern.
 */
function evalFormat(rule, extractedFields) {
  const docData = extractedFields[rule.requiredDocument || Object.keys(extractedFields)[0]];
  const value = docData?.[rule.field] ?? '';
  const regex = new RegExp(rule.formatPattern);
  const matched = regex.test(value);
  return {
    status: matched ? 'matched' : 'mismatch',
    evidence: [{ documentType: rule.requiredDocument || 'unknown', extractedValue: value, confidence: 1 }],
    description: rule.description,
  };
}

/**
 * Evaluate all rules against the provided extracted fields.
 * @param {Rule[]} rules - Human-verified Mongoose Rule documents
 * @param {Object} extractedFields - { [docType]: { fieldName: value, _confidence: { fieldName: 0–1 } } }
 * @returns {{ flags: FlagObject[], summary: SummaryObject }}
 */
function evaluate(rules, extractedFields) {
  const flags = [];
  const summary = { matched: 0, mismatches: 0, missing: 0, review: 0 };

  for (const rule of rules) {
    let result;
    switch (rule.type) {
      case 'consistency': result = evalConsistency(rule, extractedFields); break;
      case 'presence':    result = evalPresence(rule, extractedFields); break;
      case 'format':      result = evalFormat(rule, extractedFields); break;
      default: continue;
    }

    const flag = {
      ruleId: rule._id,
      type: rule.type,
      status: result.status,
      field: rule.field,
      description: result.description,
      evidence: result.evidence,
      sourceReference: rule.sourceReference,
      severity: rule.severity,
    };

    flags.push(flag);

    if (result.status === 'matched')  summary.matched++;
    else if (result.status === 'mismatch') summary.mismatches++;
    else if (result.status === 'missing')  summary.missing++;
    else if (result.status === 'review')   summary.review++;
  }

  return { flags, summary };
}

module.exports = { evaluate };
