
/**
 * Heuristic field extraction from raw OCR text of Indian documents.
 *
 * Fields with confidence below 0.75 require human verification.
 * The full Aadhaar number is never returned or stored.
 */

const GOV_WORDS =
  /government|govt|india|unique|identification|authority|भारत|सरकार|आधार|प्राधिकरण|male|female|पुरुष|महिला|address|पता/i;

const NAME_CHARS = /^[A-Za-z\u0900-\u097F.\s]+$/;

function isValidName(value) {
  const name = String(value || '')
    .replace(/[|।,:;]+$/g, '')
    .trim();

  return (
    name.length >= 3 &&
    name.length <= 60 &&
    NAME_CHARS.test(name) &&
    name.split(/\s+/).length >= 2 &&
    !GOV_WORDS.test(name) &&
    !/\d/.test(name)
  );
}

function extractName(lines, text) {
  const normalizedLines = lines
    .map((line) => line.trim())
    .filter(Boolean);

  // Find the DOB line. Aadhaar usually prints the name nearby.
  const dobIndex = normalizedLines.findIndex((line) =>
    /dob|date of birth|year of birth|जन्म/i.test(line)
  );

  if (dobIndex === -1) {
    return { value: '', confidence: 0 };
  }

  // Search only the lines immediately before DOB.
  // This avoids picking up unrelated Aadhaar instructions.
  for (
    let i = dobIndex - 1;
    i >= Math.max(0, dobIndex - 5);
    i -= 1
  ) {
    const candidate = normalizedLines[i]
      .replace(/^[|:;,\s]+|[|:;,\s]+$/g, '')
      .trim();

    if (isValidName(candidate)) {
      return {
        value: candidate,
        confidence: 0.75,
      };
    }
  }

  return { value: '', confidence: 0 };
}

function extractDOB(text) {
  const patterns = [
    /(?:dob|date\s+of\s+birth|d\.o\.b\.|जन्म\s*(?:तिथि|तारीख))\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4})/i,
    /\b(\d{2}[\/.\-]\d{2}[\/.\-]\d{4})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return {
        value: match[1],
        confidence: 0.85,
      };
    }
  }

  const yearMatch = text.match(
    /year\s+of\s+birth\s*[:\-]?\s*(\d{4})/i
  );

  return yearMatch
    ? { value: yearMatch[1], confidence: 0.85 }
    : { value: '', confidence: 0 };
}

function extractAadhaarLast4(text) {
  const match = text.match(
    /\b(\d{4})\s?(\d{4})\s?(\d{4})\b/
  );

  return match
    ? { value: match[3], confidence: 0.9 }
    : { value: '', confidence: 0 };
}

function extractIncome(text) {
  const match = text.match(
    /income[^\d₹]{0,40}(?:rs\.?|₹|inr)?\s*([\d,]{4,10})/i
  );

  return match
    ? {
        value: Number(match[1].replace(/,/g, '')),
        confidence: 0.75,
      }
    : { value: '', confidence: 0 };
}

function extractIssueDate(text) {
  const match = text.match(
    /(?:date|dated|issued(?:\s+on)?)\s*[:\-]?\s*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/i
  );

  return match
    ? {
        value: `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`,
        confidence: 0.7,
      }
    : { value: '', confidence: 0 };
}

export function extractFields(rawText, docType) {
  const text = String(rawText || '');
  const lines = text.split(/\n+/);

  const fields = {};
  const confidence = {};

  const put = (key, result) => {
    if (result.value !== '' && result.value != null) {
      fields[key] = result.value;
      confidence[key] = result.confidence;
    }
  };

  put('name', extractName(lines, text));
  put('dob', extractDOB(text));

  if (docType === 'aadhaar') {
    put('idLast4', extractAadhaarLast4(text));
  }

  if (docType === 'income_certificate') {
    put('income', extractIncome(text));
    put('issueDate', extractIssueDate(text));
  }

  return { fields, confidence };
}
