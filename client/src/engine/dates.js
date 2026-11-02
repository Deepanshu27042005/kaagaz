// Date-of-birth parsing and comparison. Indian documents are DD-MM-YYYY by convention,
// but OCR output, bank records and portals mix formats, so we detect likely DD/MM swaps.

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

export function parseDate(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  let m;
  if ((m = s.match(/^(\d{4})$/))) return { y: +m[1], partial: true };
  if ((m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/))) return full(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/))) {
    let y = +m[3]; if (m[3].length === 2) y += y > 30 ? 1900 : 2000;
    return full(y, +m[2], +m[1]);
  }
  if ((m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4})$/))) return MONTHS[m[2].toLowerCase()] ? full(+m[3], MONTHS[m[2].toLowerCase()], +m[1]) : null;
  if ((m = s.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/))) return MONTHS[m[1].toLowerCase()] ? full(+m[3], MONTHS[m[1].toLowerCase()], +m[2]) : null;
  return null;
}

function isValidCalendarDate(y, mo, d) {
  if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(d)) return false;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return d <= daysInMonth;
}

function full(y, mo, d) {
  if (!isValidCalendarDate(y, mo, d)) return null;
  return { y, mo, d, iso: `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
}

export function formatDate(p) {
  if (!p) return '';
  if (p.partial) return String(p.y);
  return `${String(p.d).padStart(2, '0')}/${String(p.mo).padStart(2, '0')}/${p.y}`;
}

const hamming = (a, b) => [...a].reduce((n, c, i) => n + (c !== b[i] ? 1 : 0), 0);

/** kind: same | year_only | swapped | typo | conflict | unreadable */
export function compareDates(rawA, rawB) {
  const a = parseDate(rawA), b = parseDate(rawB);
  if (!a || !b) return { kind: 'unreadable', level: 'major', sameEntity: false, reasons: ['A date of birth could not be read; please verify it manually.'] };
  if (a.partial || b.partial) {
    return a.y === b.y
      ? { kind: 'year_only', level: 'minor', sameEntity: true, reasons: ['One document shows only the year of birth; the full date cannot be cross-checked.'] }
      : { kind: 'conflict', level: 'conflict', sameEntity: false, reasons: [`Years differ: ${a.y} vs ${b.y}`] };
  }
  if (a.iso === b.iso) return { kind: 'same', level: 'ok', sameEntity: true, reasons: [] };
  if (a.y === b.y && a.d === b.mo && a.mo === b.d) {
    return { kind: 'swapped', level: 'major', sameEntity: true, reasons: [`Day and month look swapped (${formatDate(a)} vs ${formatDate(b)}), a classic DD/MM vs MM/DD error.`] };
  }
  if (hamming(a.iso.replace(/-/g, ''), b.iso.replace(/-/g, '')) === 1) {
    return { kind: 'typo', level: 'major', sameEntity: true, reasons: [`Dates differ by a single digit (${formatDate(a)} vs ${formatDate(b)}): likely a typing or OCR slip.`] };
  }
  return { kind: 'conflict', level: 'conflict', sameEntity: false, reasons: [`Dates of birth differ: ${formatDate(a)} vs ${formatDate(b)}`] };
}

export const monthsBetween = (from, to) => (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
export const daysBetween = (from, to) => Math.round((to - from) / 86400000);
