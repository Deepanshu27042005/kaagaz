// Fuzzy, transliteration-aware name comparison.
// Pipeline: transliterate -> tokenise -> phonetic reduce -> weighted edit distance -> token alignment.
// Deterministic and explainable: every verdict carries human-readable reasons.
import { transliterate } from './transliterate.js';

const HONORIFICS = new Set(['shri', 'sri', 'shree', 'smt', 'shrimati', 'mr', 'mrs', 'ms', 'miss', 'dr', 'late', 'mst', 'km']);

// Raw token -> canonical phonetic form (abbreviations and well-known spelling families)
const MUHAMMAD = ['mohd', 'md', 'mohammed', 'muhammed', 'muhammad', 'mohammad', 'mohamad', 'mohamed', 'muhamad', 'mahammad', 'mohmmad', 'mohmad', 'mhd', 'mohamud'];
const ALIAS = { kr: 'kumar', bi: 'bibi', beebi: 'bibi', bibi: 'bibi' };
MUHAMMAD.forEach((m) => { ALIAS[m] = 'muhamad'; });

const VOWELS = new Set('aeiou'.split(''));
// Visually confusable letters (OCR) get a cheaper substitution cost
const OCR_PAIRS = new Set(['li', 'il', 'ij', 'ji', 'uv', 'vu', 'ce', 'ec', 'nh', 'hn']);

const TOKEN_MATCH = 0.85;

export function tokens(raw) {
  let s = transliterate(String(raw || '')).toLowerCase();
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/\b[sdwc]\/o\b/g, ' ').replace(/[^a-z\s]/g, ' ');
  let t = s.split(/\s+/).filter(Boolean);
  if (t.length > 1) t = t.filter((w) => !HONORIFICS.has(w));
  if (t.length > 2 && t[0] === 'sh') t.shift();
  return t;
}

export function phon(word) {
  if (ALIAS[word]) return ALIAS[word];
  let w = word;
  w = w.replace(/nh$/, 'ngh'); // anusvara + ha, as in सिंह -> "singh"
  w = w.replace(/ksh/g, 'ks').replace(/x/g, 'ks');
  w = w.replace(/que$/, 'k').replace(/q/g, 'k').replace(/ck/g, 'k').replace(/ph/g, 'f');
  w = w.replace(/sh|ss/g, 's').replace(/w/g, 'v').replace(/z/g, 'j');
  w = w.replace(/(kh|gh|th|dh|bh|jh)/g, (m) => m[0]);
  w = w.replace(/aa+/g, 'a').replace(/ee+|ii+/g, 'i').replace(/oo+|uu+/g, 'u');
  w = w.replace(/(.)\1+/g, '$1');
  w = w.replace(/ey$/, 'i').replace(/y$/, 'i');
  return ALIAS[w] || w;
}

function subCost(a, b) {
  if (a === b) return 0;
  if (VOWELS.has(a) && VOWELS.has(b)) return 0.5;
  if (OCR_PAIRS.has(a + b)) return 0.3;
  return 1;
}
const indel = (c) => (VOWELS.has(c) ? 0.5 : 1);

export function weightedDistance(a, b) {
  const m = a.length, n = b.length;
  let prev = [0];
  for (let j = 1; j <= n; j++) prev[j] = prev[j - 1] + indel(b[j - 1]);
  for (let i = 1; i <= m; i++) {
    const cur = [prev[0] + indel(a[i - 1])];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + indel(a[i - 1]), cur[j - 1] + indel(b[j - 1]), prev[j - 1] + subCost(a[i - 1], b[j - 1]));
    }
    prev = cur;
  }
  return prev[n];
}

function tokenSim(a, b, pa, pb) {
  if (a.length === 1 || b.length === 1) return a[0] === b[0] ? (a === b ? 1 : 0.9) : 0;
  if (pa === pb) return 1;
  return 1 - weightedDistance(pa, pb) / Math.max(pa.length, pb.length);
}

const out = (kind, score, sameEntity, level, reasons) => ({ kind, score: Math.round(score * 100) / 100, sameEntity, level, reasons });

/**
 * Compare two names.
 * kind:   exact | variant | reordered | initial | partial | typo | review | conflict | missing
 * level:  ok | minor | major | conflict   (how much rejection risk the difference carries)
 */
export function compareNames(rawA, rawB) {
  const A = tokens(rawA), B = tokens(rawB);
  if (!A.length || !B.length) return out('missing', 0, false, 'conflict', ['One of the names is empty.']);
  if (A.join(' ') === B.join(' ')) return out('exact', 1, true, 'ok', []);

  const PA = A.map(phon), PB = B.map(phon);
  const cand = [];
  A.forEach((a, i) => B.forEach((b, j) => cand.push({ i, j, s: tokenSim(a, b, PA[i], PB[j]) })));
  cand.sort((x, y) => y.s - x.s);
  const usedA = new Set(), usedB = new Set(), pairs = [];
  for (const c of cand) {
    if (c.s >= TOKEN_MATCH && !usedA.has(c.i) && !usedB.has(c.j)) { usedA.add(c.i); usedB.add(c.j); pairs.push(c); }
  }
  const unA = A.map((_, i) => i).filter((i) => !usedA.has(i));
  const unB = B.map((_, j) => j).filter((j) => !usedB.has(j));

  const reasons = [];
  let hasInitial = false, hasTypo = false;
  for (const p of pairs) {
    const a = A[p.i], b = B[p.j];
    if (a === b) continue;
    if (a.length === 1 || b.length === 1) { hasInitial = true; reasons.push(`"${a.length === 1 ? a : b}" is an initial of "${a.length === 1 ? b : a}"`); }
    else if (PA[p.i] === PB[p.j]) reasons.push(`"${a}" and "${b}" are spelling variants of the same name`);
    else { hasTypo = true; reasons.push(`"${a}" vs "${b}" differ by a character (typo or OCR slip)`); }
  }
  const avg = pairs.length ? pairs.reduce((s, p) => s + p.s, 0) / pairs.length : 0;

  if (!unA.length && !unB.length) {
    const sameOrder = pairs.every((p) => p.i === p.j);
    if (!sameOrder) reasons.push('Name parts appear in a different order');
    if (hasTypo) return out('typo', Math.min(0.8, avg), true, 'major', reasons);
    if (hasInitial) return out('initial', 0.9, true, 'minor', reasons);
    if (!reasons.length || (!sameOrder && reasons.length === 1)) return out('reordered', 0.94, true, 'minor', reasons);
    return out('variant', 0.96, true, 'minor', reasons);
  }

  if (!unA.length || !unB.length) {
    const extra = (unA.length ? unA.map((i) => A[i]) : unB.map((j) => B[j])).join(' ');
    const side = unA.length ? 'first' : 'second';
    reasons.push(`The ${side} record has an extra name part: "${extra}"`);
    const shorterMatched = pairs.length;
    return out('partial', shorterMatched >= 2 ? 0.86 : 0.7, true, shorterMatched >= 2 ? 'minor' : 'major', reasons);
  }

  let best = 0, bp = null;
  for (const i of unA) for (const j of unB) {
    const s = tokenSim(A[i], B[j], PA[i], PB[j]);
    if (s > best) { best = s; bp = [A[i], B[j]]; }
  }
  if (pairs.length && best >= 0.7) {
    reasons.push(`"${bp[0]}" vs "${bp[1]}" look similar but are not the same name`);
    return out('review', 0.6, false, 'major', reasons);
  }
  reasons.push('The names share too little to be the same person');
  return out('conflict', avg * 0.4, false, 'conflict', reasons);
}

// Naive baseline used by the benchmark page
export function levenshteinSim(a, b) {
  a = String(a).trim().toLowerCase(); b = String(b).trim().toLowerCase();
  if (!a && !b) return 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length);
}
