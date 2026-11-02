// Minimal Devanagari -> Latin transliteration, good enough for name matching.
// It is phonetic (not ISO 15919): "कुमार" -> "kumaar", "शर्मा" -> "sharmaa".
// The matcher collapses vowel length afterwards, so exact romanisation is not required.

const VOW = { 'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऑ': 'o' };
const MAT = { 'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ृ': 'ri', 'ॉ': 'o' };
const CON = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n', 'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n', 'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'f', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
  'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l',
};
const NUKTA_MAP = { 'क': 'q', 'ख': 'kh', 'ग': 'g', 'ज': 'z', 'ड': 'r', 'ढ': 'rh', 'फ': 'f' };
const VIRAMA = '्';
const NUKTA = '़';

export const hasDevanagari = (s) => /[\u0900-\u097F]/.test(s || '');

export function transliterate(input) {
  const str = String(input || '');
  if (!hasDevanagari(str)) return str;
  const chars = [...str.normalize('NFC')];
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (CON[c]) {
      let base = CON[c];
      let j = i + 1;
      if (chars[j] === NUKTA) { base = NUKTA_MAP[c] || base; j++; }
      const nxt = chars[j];
      out += base;
      if (nxt === VIRAMA) { i = j; continue; }
      if (MAT[nxt]) { out += MAT[nxt]; i = j; continue; }
      const wordContinues = nxt && (CON[nxt] || VOW[nxt] || nxt === 'ं' || nxt === 'ँ');
      i = j - 1;
      if (wordContinues) out += 'a'; // inherent vowel, dropped at word end (schwa deletion)
      continue;
    }
    if (VOW[c]) { out += VOW[c]; continue; }
    if (c === 'ं' || c === 'ँ') { out += 'n'; continue; }
    if (c === 'ः') { out += 'h'; continue; }
    if (/[\u0900-\u097F]/.test(c)) continue;
    out += c;
  }
  return out;
}
