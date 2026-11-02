// Generates a labelled name-pair benchmark: node src/tools/generateBenchmark.mjs <seed> <out.json>
// label=true  -> both strings refer to the same person
// label=false -> different people (includes deliberately hard near-miss names)
// The pairs are synthetic transformations of realistic Indian names. They are NOT real government
// records; validating on real scans (with consent) is the next step.
import { writeFileSync } from 'node:fs';

const seed = Number(process.argv[2] || 1);
const out = process.argv[3] || 'benchmark.json';
function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(seed);
const pick = (arr) => arr[Math.floor(R() * arr.length)];
const shuffle = (arr) => arr.map((x) => [R(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

const M = ['Rahul', 'Rohit', 'Amit', 'Sunil', 'Anil', 'Ramesh', 'Suresh', 'Mukesh', 'Rakesh', 'Rajesh', 'Vijay', 'Deepak', 'Manoj', 'Sanjay', 'Ajay', 'Mohan', 'Rohan', 'Ashok', 'Dinesh', 'Naresh', 'Pankaj', 'Vikram', 'Gopal', 'Arun', 'Kamal', 'Sachin', 'Harish', 'Lalit'];
const F = ['Sunita', 'Anita', 'Kavita', 'Savita', 'Sita', 'Gita', 'Priya', 'Riya', 'Pooja', 'Neha', 'Rekha', 'Meena', 'Seema', 'Kamla', 'Laxmi', 'Radha', 'Shanti', 'Asha', 'Usha', 'Sarita', 'Manju', 'Poonam', 'Babita'];
const MU = ['Rafiq', 'Salim', 'Imran', 'Irfan', 'Farhan', 'Aslam', 'Nasir', 'Javed', 'Shabana', 'Rukhsana', 'Zoya', 'Nasreen', 'Shahida', 'Parveen', 'Asif', 'Arif'];
const S = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Yadav', 'Mishra', 'Pandey', 'Tiwari', 'Chauhan', 'Patel', 'Khan', 'Ansari', 'Qureshi', 'Siddiqui', 'Rathore', 'Joshi', 'Saxena', 'Agarwal', 'Jain', 'Kapoor'];
const MID = ['Kumar', 'Prasad', 'Lal', 'Chand', 'Devi'];

const VARIANTS = [['Rafiq', 'Rafique'], ['Rafiq', 'Rafeeq'], ['Kumar', 'Kumaar'], ['Pooja', 'Puja'], ['Deepak', 'Dipak'], ['Laxmi', 'Lakshmi'], ['Vijay', 'Vijai'], ['Sunita', 'Suneeta'], ['Geeta', 'Gita'], ['Rukhsana', 'Rukhsaana'], ['Shabana', 'Shabaana'], ['Qureshi', 'Kureshi'], ['Parveen', 'Parvin'], ['Nasreen', 'Nasrin'], ['Salim', 'Saleem'], ['Imran', 'Imraan'], ['Mishra', 'Misra'], ['Tiwari', 'Tewari'], ['Yadav', 'Yadaw'], ['Pandey', 'Pandy'], ['Siddiqui', 'Siddiqi'], ['Ansari', 'Ansaari'], ['Sharma', 'Sharmaa'], ['Shanti', 'Shaanti'], ['Aslam', 'Asalam'], ['Krishna', 'Krishnaa'], ['Singh', 'Sing'], ['Jain', 'Jaine']];
const MOHD = ['Mohd', 'Md', 'Md.', 'Mohammed', 'Muhammad', 'Mohamad'];
const HARD = [['Mohan', 'Rohan'], ['Sunil', 'Anil'], ['Ramesh', 'Rakesh'], ['Suresh', 'Mukesh'], ['Rajesh', 'Rakesh'], ['Sita', 'Gita'], ['Priya', 'Riya'], ['Kavita', 'Savita'], ['Rohit', 'Rahul'], ['Vijay', 'Ajay'], ['Manoj', 'Sanjay'], ['Neha', 'Nisha'], ['Usha', 'Asha'], ['Rekha', 'Reena'], ['Dinesh', 'Naresh'], ['Salim', 'Aslam'], ['Imran', 'Irfan'], ['Farhan', 'Faraz'], ['Arun', 'Varun'], ['Kamal', 'Komal']];
const SUR_HARD = [['Sharma', 'Verma'], ['Singh', 'Sinha'], ['Yadav', 'Jadhav'], ['Patel', 'Patil'], ['Gupta', 'Kapoor'], ['Mishra', 'Mehra'], ['Joshi', 'Johri'], ['Khan', 'Kapoor'], ['Saxena', 'Sethi'], ['Tiwari', 'Trivedi'], ['Jain', 'Jha'], ['Agarwal', 'Aggarwal2']].filter((p) => !p[1].endsWith('2'));

const DEVA_F = { Rahul: 'राहुल', Rohit: 'रोहित', Amit: 'अमित', Sunil: 'सुनील', Anil: 'अनिल', Ramesh: 'रमेश', Suresh: 'सुरेश', Mukesh: 'मुकेश', Rakesh: 'राकेश', Rajesh: 'राजेश', Vijay: 'विजय', Deepak: 'दीपक', Manoj: 'मनोज', Sanjay: 'संजय', Ajay: 'अजय', Mohan: 'मोहन', Ashok: 'अशोक', Dinesh: 'दिनेश', Sunita: 'सुनीता', Anita: 'अनीता', Kavita: 'कविता', Savita: 'सविता', Sita: 'सीता', Priya: 'प्रिया', Pooja: 'पूजा', Neha: 'नेहा', Rekha: 'रेखा', Meena: 'मीना', Kamla: 'कमला', Laxmi: 'लक्ष्मी', Radha: 'राधा', Asha: 'आशा', Usha: 'उषा' };
const DEVA_S = { Sharma: 'शर्मा', Verma: 'वर्मा', Gupta: 'गुप्ता', Singh: 'सिंह', Yadav: 'यादव', Mishra: 'मिश्रा', Pandey: 'पांडेय', Tiwari: 'तिवारी', Chauhan: 'चौहान', Patel: 'पटेल', Khan: 'खान', Ansari: 'अंसारी', Joshi: 'जोशी', Kumar: 'कुमार', Devi: 'देवी', Prasad: 'प्रसाद' };

const base = (withMid = true) => {
  const first = pick([...M, ...F, ...MU]);
  const mid = withMid && R() < 0.7 ? pick(MID) : null;
  return { first, mid, sur: pick(S) };
};
const join = (b, o = {}) => [o.first ?? b.first, o.mid === undefined ? b.mid : o.mid, o.sur ?? b.sur].filter(Boolean).join(' ');

const pairs = [];
const add = (cat, a, b, same) => pairs.push({ cat, a, b, same });
const times = (n, fn) => { for (let i = 0; i < n; i++) fn(); };

// ---- positives ----
times(20, () => { const b = base(); const n = join(b); add('case_punct', n, pick([n.toUpperCase(), n.toLowerCase(), n.replace(/ /g, '  '), n.replace(/ /g, '. ').replace(/\. /, ' ')]), true); });
times(25, () => { const b = { first: pick(MU), mid: null, sur: pick(S) }; add('abbreviation', `Mohammad ${join(b)}`, `${pick(MOHD)} ${join(b)}`, true); });
times(30, () => { const [x, y] = pick(VARIANTS); const b = base(); let n = join(b); if (!n.split(' ').includes(x)) { const b2 = { ...b }; if (S.includes(x)) b2.sur = x; else if (x === 'Kumar') b2.mid = 'Kumar'; else b2.first = x; n = join(b2); } add('spelling_variant', n, n.split(' ').map((w) => (w === x ? y : w)).join(' '), true); });
times(20, () => { const b = { first: pick([...M, ...F]), mid: pick(MID), sur: pick(S) }; add('missing_part', join(b), join(b, { mid: null }), true); });
times(20, () => { const b = { first: pick([...M, ...F]), mid: pick(MID), sur: pick(S) }; const t = pick([0, 1, 2]); add('initial', join(b), t === 0 ? `${b.first[0]} ${b.mid} ${b.sur}` : t === 1 ? `${b.first} ${b.mid[0]} ${b.sur}` : `${b.first[0]}. ${b.mid[0]}. ${b.sur}`, true); });
times(20, () => { const b = { first: pick([...M, ...F]), mid: pick(MID), sur: pick(S) }; add('reordered', join(b), R() < 0.5 ? `${b.sur} ${b.first} ${b.mid}` : `${b.sur}, ${b.first} ${b.mid}`, true); });
times(15, () => { const b = base(); const n = join(b); add('honorific', pick(['Shri', 'Smt.', 'Mr.', 'Late']) + ' ' + n, n, true); });
const CONF = { l: 'i', i: 'l', u: 'v', v: 'u', e: 'c', c: 'e' };
times(25, () => { for (;;) { const b = base(); const n = join(b); const idx = [...n].map((c, i) => (CONF[c] && i > 0 && n[i - 1] !== ' ' ? i : -1)).filter((i) => i >= 0); if (!idx.length) continue; const i = pick(idx); add('ocr_confusable', n, n.slice(0, i) + CONF[n[i]] + n.slice(i + 1), true); break; } });
times(25, () => { for (;;) { const b = base(); const n = join(b); const words = n.split(' '); const wi = Math.floor(R() * words.length); const w = words[wi]; if (w.length < 5) continue; const i = 1 + Math.floor(R() * (w.length - 2)); const nw = R() < 0.5 ? w.slice(0, i) + w.slice(i + 1) : w.slice(0, i) + pick('abdgkmnprst'.split('')) + w.slice(i + 1); if (nw === w) continue; const o = [...words]; o[wi] = nw; add('random_typo', n, o.join(' '), true); break; } });
const FK = Object.keys(DEVA_F), SK = Object.keys(DEVA_S);
times(25, () => { const first = pick(FK), mid = R() < 0.5 ? pick(['Kumar', 'Prasad', 'Devi']) : null, sur = pick(['Sharma', 'Verma', 'Gupta', 'Singh', 'Yadav', 'Mishra', 'Pandey', 'Tiwari', 'Chauhan', 'Patel', 'Khan', 'Ansari', 'Joshi']); const dv = [DEVA_F[first], mid && DEVA_S[mid], DEVA_S[sur]].filter(Boolean).join(' '); add('devanagari', dv, [first, mid, sur].filter(Boolean).join(' '), true); });

// ---- negatives ----
times(50, () => { const b = base(); let f2; do { f2 = pick([...M, ...F, ...MU]); } while (f2 === b.first); add('different_first', join(b), join(b, { first: f2 }), false); });
times(40, () => { const [x, y] = pick(HARD); const b = base(); add('near_first_name', join(b, { first: x }), join(b, { first: y }), false); });
times(40, () => { const [x, y] = pick(SUR_HARD); const b = base(); add('near_surname', join(b, { sur: x }), join(b, { sur: y }), false); });
times(55, () => { const a = base(), b = base(); if (join(a) === join(b)) return; add('unrelated', join(a), join(b), false); });
times(30, () => { const f1 = pick(FK); let f2; do { f2 = pick(FK); } while (f2 === f1); const s = pick(['Sharma', 'Verma', 'Gupta', 'Singh', 'Yadav']); add('devanagari_diff', `${DEVA_F[f1]} ${DEVA_S[s]}`, `${f2} ${s}`, false); });

writeFileSync(out, JSON.stringify({ seed, count: pairs.length, pairs: shuffle(pairs) }, null, 1));
console.log(`seed ${seed}: ${pairs.length} pairs -> ${out}`);
