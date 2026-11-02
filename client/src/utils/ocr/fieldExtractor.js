/**
 * Heuristic field extraction from raw OCR text of Indian documents.
 * Every field gets a confidence score; anything under 0.75 is shown with a "human verify" label.
 * The full Aadhaar number is never kept: only the last four digits are returned.
 */
const GOV_WORDS = /government|govt|india|unique|identification|authority|भारत|सरकार|आधार|प्राधिकरण|male|female|पुरुष|महिला|address|पता/i;
const NAME_CHARS = /^[A-Za-z\u0900-\u097F.\s]{3,60}$/;
const NAME_LABEL = /^(?:(?:student|candidate|applicant|beneficiary|holder)(?:'s)?\s+name|name(?:\s+of\s+(?:the\s+)?(?:student|candidate|applicant|beneficiary|holder))?|(?:विद्यार्थी|छात्र|छात्रा)\s+का\s+नाम|नाम)\s*[:\-–]?\s*(.*)$/i;

function extractName(lines, text) {
  const normalizedLines = lines.map((line) => line.trim()).filter(Boolean);
  for (let i = 0; i < normalizedLines.length; i += 1) {
    const labelled = normalizedLines[i].match(NAME_LABEL);
    if (!labelled) continue;
    const inlineValue = labelled[1].split(/\s+\|\s+|\s+(?:dob|date of birth)\b/i)[0].trim();
    const value = inlineValue || normalizedLines[i + 1] || '';
    if (NAME_CHARS.test(value) && !GOV_WORDS.test(value)) return { value, confidence: 0.85 };
  }
  const dobIdx = lines.findIndex((l) => /dob|date of birth|year of birth|जन्म/i.test(l));
  for (let i = dobIdx - 1; dobIdx > 0 && i >= Math.max(0, dobIdx - 3); i--) {
    const l = lines[i].trim();
    if (NAME_CHARS.test(l) && l.split(/\s+/).length >= 2 && !GOV_WORDS.test(l)) return { value: l, confidence: 0.7 };
  }
  return { value: '', confidence: 0 };
}

function extractDOB(text) {
  const m = text.match(/(?:dob|date of birth|d\.o\.b|जन्म\s*(?:तिथि|तारीख))\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/i) || text.match(/\b(\d{2}[\/\-.]\d{2}[\/\-.]\d{4})\b/);
  if (m) return { value: m[1], confidence: 0.85 };
  const y = text.match(/year of birth\s*[:\-]?\s*(\d{4})/i);
  return y ? { value: y[1], confidence: 0.85 } : { value: '', confidence: 0 };
}

function extractAadhaarLast4(text) {
  const m = text.match(/\b(\d{4})\s?(\d{4})\s?(\d{4})\b/);
  return m ? { value: m[3], confidence: 0.9 } : { value: '', confidence: 0 };
}

function extractIncome(text) {
  const m = text.match(/income[^\d₹]{0,40}(?:rs\.?|₹|inr)?\s*([\d,]{4,10})/i);
  return m ? { value: Number(m[1].replace(/,/g, '')), confidence: 0.75 } : { value: '', confidence: 0 };
}

function extractIssueDate(text) {
  const m = text.match(/(?:date|dated|issued(?:\s+on)?)\s*[:\-]?\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/i);
  return m ? { value: `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`, confidence: 0.7 } : { value: '', confidence: 0 };
}

export function extractFields(rawText, docType) {
  const text = String(rawText || '');
  const lines = text.split(/\n+/);
  const fields = {}, confidence = {};
  const put = (k, r) => { if (r.value !== '' && r.value != null) { fields[k] = r.value; confidence[k] = r.confidence; } };
  put('name', extractName(lines, text));
  put('dob', extractDOB(text));
  if (docType === 'aadhaar') put('idLast4', extractAadhaarLast4(text));
  if (docType === 'income_certificate') { put('income', extractIncome(text)); put('issueDate', extractIssueDate(text)); }
  return { fields, confidence };
}
