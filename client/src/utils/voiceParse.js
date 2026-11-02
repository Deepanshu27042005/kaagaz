// Parsing of spoken answers (Hindi / Hinglish / English). Deliberately small and transparent:
// the person always sees and can edit what was understood before it is used.

const NUM = { ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, che: 6, saat: 7, sat: 7, aath: 8, nau: 9, das: 10, bees: 20, tees: 30, chalis: 40, pachas: 50, sath: 60, dedh: 1.5, dhai: 2.5,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5, 'छह': 6, 'छः': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10, 'बीस': 20, 'तीस': 30, 'चालीस': 40, 'पचास': 50, 'डेढ़': 1.5, 'ढाई': 2.5 };
const MULT = { lakh: 1e5, lac: 1e5, lakhs: 1e5, 'लाख': 1e5, hazaar: 1e3, hazar: 1e3, hajar: 1e3, thousand: 1e3, 'हज़ार': 1e3, 'हजार': 1e3, crore: 1e7, 'करोड़': 1e7 };

export function parseNumber(text) {
  const t = String(text || '').toLowerCase().replace(/,/g, '').replace(/₹|rs\.?|rupees?|रुपये|रुपए/g, ' ');
  const words = t.split(/\s+/).filter(Boolean);
  let total = 0, cur = 0, found = false;
  for (const w of words) {
    const d = w.match(/^(\d+(?:\.\d+)?)(.*)$/);
    if (d) { cur = parseFloat(d[1]); found = true; const suffix = d[2]; if (MULT[suffix]) { total += cur * MULT[suffix]; cur = 0; } continue; }
    if (NUM[w] !== undefined) { cur += NUM[w]; found = true; continue; }
    if (MULT[w]) { total += (cur || 1) * MULT[w]; cur = 0; found = true; }
  }
  return found ? total + cur : null;
}

export function parseYesNo(text) {
  const t = String(text || '').toLowerCase();
  if (/\b(no|nope|nahi|nahin|na)\b|नहीं|नही|ना\b/.test(t)) return false;
  if (/\b(yes|yeah|yep|haan|han|ha|ji|hai)\b|हाँ|हां|जी|है/.test(t)) return true;
  return null;
}

export function parseCategory(text) {
  const t = String(text || '').toLowerCase();
  if (/\bobc\b|other backward|पिछड़ा|ओबीसी/.test(t)) return 'OBC';
  if (/\bsc\b|scheduled caste|अनुसूचित जाति|एससी/.test(t)) return 'SC';
  if (/\bst\b|scheduled tribe|जनजाति|एसटी/.test(t)) return 'ST';
  if (/general|सामान्य|जनरल/.test(t)) return 'General';
  return null;
}

export function parseOccupation(text) {
  const t = String(text || '').toLowerCase();
  if (/kheti|kisan|farm|खेती|किसान/.test(t)) return 'farmer';
  if (/mazdoor|majdoor|labou?r|मजदूर|मज़दूर/.test(t)) return 'labourer';
  if (/naukri|job|service|salar|नौकरी/.test(t)) return 'salaried';
  if (/dukan|business|vyapar|shop|दुकान|व्यापार/.test(t)) return 'business';
  return t.trim() || null;
}

export function parseArea(text) {
  const t = String(text || '').toLowerCase();
  if (/gaon|gaanv|village|rural|गाँव|गांव|ग्राम/.test(t)) return 'rural';
  if (/shehar|sheher|city|town|urban|शहर/.test(t)) return 'urban';
  return null;
}
