// Cross-document mismatch detector (the core of KaagazSaathi).
// For each person, every document is compared against a reference (Aadhaar if present)
// on name and date of birth. Each issue carries the evidence, a plain-language reason,
// the document that should be corrected, and the fix path.
import { compareNames } from './names.js';
import { compareDates } from './dates.js';
import { fixFor } from '../data/docTypes.js';

const FIELDS = [
  { key: 'name', cmp: compareNames },
  { key: 'dob', cmp: compareDates },
];

export const LEVEL_WEIGHT = { ok: 0, minor: 6, major: 15, conflict: 25 };

export function detectIssues(members, documents) {
  const issues = [];
  for (const m of members) {
    const docs = documents.filter((d) => d.memberId === m.id);
    for (const F of FIELDS) {
      const withField = docs.filter((d) => String(d.fields?.[F.key] || '').trim());
      if (withField.length < 2) continue;
      const ref = withField.find((d) => d.type === 'aadhaar') || withField[0];
      const others = withField.filter((d) => d !== ref);
      const results = others.map((o) => ({ o, r: F.cmp(ref.fields[F.key], o.fields[F.key]) })).filter((x) => x.r.level !== 'ok');

      // If two or more other documents agree with each other but all disagree with the reference,
      // the reference is the odd one out, so it is the one to correct.
      let referenceIsOdd = false;
      if (others.length >= 2 && results.length === others.length) {
        referenceIsOdd = others.slice(1).every((o) => F.cmp(others[0].fields[F.key], o.fields[F.key]).level === 'ok');
      }

      for (const { o, r } of results) {
        const target = referenceIsOdd ? ref : o;
        const fix = fixFor(target.type, F.key);
        issues.push({
          id: `${m.id}:${F.key}:${ref.id}:${o.id}`,
          memberId: m.id, memberName: m.name, field: F.key,
          kind: r.kind, level: r.level, score: r.score ?? null, advisory: r.kind === 'year_only',
          reasons: r.reasons,
          docs: [
            { id: ref.id, type: ref.type, value: ref.fields[F.key] },
            { id: o.id, type: o.type, value: o.fields[F.key] },
          ],
          targetDocId: target.id, targetType: target.type,
          fix,
        });
      }
    }
  }
  return issues;
}

// Fields extracted with low confidence get a "human verify" label instead of silent acceptance
export function lowConfidenceFields(documents, threshold = 0.75) {
  const out = [];
  for (const d of documents) {
    for (const [k, c] of Object.entries(d.confidence || {})) {
      if (c < threshold && d.fields?.[k]) out.push({ docId: d.id, type: d.type, field: k, confidence: c, value: d.fields[k] });
    }
  }
  return out;
}
