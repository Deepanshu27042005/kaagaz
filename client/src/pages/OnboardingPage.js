import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHousehold, uid } from '../context/HouseholdContext';
import { useVoice } from '../hooks/useVoice';
import { parseNumber, parseYesNo, parseCategory, parseOccupation, parseArea } from '../utils/voiceParse';

const Q = [
  { id: 'name', en: 'What is your full name?', hi: 'आपका पूरा नाम क्या है?', parse: (t) => t.trim() || null, apply: (v, api) => api.upsertHead({ name: v }), show: (v) => v },
  { id: 'age', en: 'How old are you?', hi: 'आपकी उम्र कितनी है?', parse: parseNumber, apply: (v, api) => api.upsertHead({ age: Math.round(v) }), show: (v) => `${Math.round(v)} years` },
  { id: 'area', en: 'Do you live in a village or a city?', hi: 'आप गाँव में रहते हैं या शहर में?', parse: parseArea, apply: (v, api) => api.setHousehold({ area: v }), show: (v) => v },
  { id: 'job', en: 'What work do you do?', hi: 'आप क्या काम करते हैं?', parse: parseOccupation, apply: (v, api) => api.upsertHead({ occupation: v }), show: (v) => v },
  { id: 'income', en: 'What is your family\'s total income in a year?', hi: 'आपके परिवार की सालाना कुल आमदनी कितनी है?', parse: parseNumber, apply: (v, api) => api.setHousehold({ income: Math.round(v) }), show: (v) => `₹${Math.round(v).toLocaleString('en-IN')}` },
  { id: 'land', en: 'How many acres of farm land does the family own? Say zero if none.', hi: 'परिवार के पास कितने एकड़ खेती की ज़मीन है? नहीं है तो शून्य कहें।', parse: (t) => (/zero|shunya|शून्य|नहीं|nahi/i.test(t) ? 0 : parseNumber(t)), apply: (v, api) => api.setHousehold({ landAcres: v }), show: (v) => `${v} acres` },
  { id: 'cat', en: 'Which category: General, OBC, SC or ST?', hi: 'आपकी श्रेणी क्या है: सामान्य, ओबीसी, एससी या एसटी?', parse: parseCategory, apply: (v, api) => api.setHousehold({ category: v }), show: (v) => v },
  { id: 'bpl', en: 'Do you have a BPL or Antyodaya ration card?', hi: 'क्या आपके पास बीपीएल या अंत्योदय राशन कार्ड है?', parse: parseYesNo, apply: (v, api) => api.setHousehold({ bpl: v }), show: (v) => (v ? 'Yes' : 'No') },
  { id: 'spouse', en: 'Is your husband or wife part of the household?', hi: 'क्या आपके पति या पत्नी परिवार में हैं?', parse: parseYesNo, apply: (v, api) => v && api.addIfMissing('Spouse', { relation: 'Spouse', age: 35, maritalStatus: 'married' }), show: (v) => (v ? 'Yes, added' : 'No') },
  { id: 'kids', en: 'How many children?', hi: 'कितने बच्चे हैं?', parse: parseNumber, apply: (v, api) => api.addKids(Math.min(8, Math.round(v))), show: (v) => `${Math.round(v)}` },
  { id: 'elder', en: 'Does anyone aged 60 or more live with you?', hi: 'क्या घर में कोई 60 साल या उससे बड़ा है?', parse: parseYesNo, apply: (v, api) => v && api.addIfMissing('Parent', { relation: 'Parent', age: 65 }), show: (v) => (v ? 'Yes, added' : 'No') },
];

const cats = ['General', 'OBC', 'SC', 'ST'];

export default function OnboardingPage() {
  const api = useHousehold();
  const { household, members, lang } = api;
  const navigate = useNavigate();
  const voice = useVoice();
  const [qi, setQi] = useState(0);
  const [typed, setTyped] = useState('');
  const [msg, setMsg] = useState('');
  const [started, setStarted] = useState(false);
  const q = Q[qi];
  const vlang = lang === 'hi' ? 'hi-IN' : 'en-IN';

  const head = members.find((m) => m.isHead) || members[0];
  const helpers = {
    setHousehold: api.setHousehold,
    upsertHead: (p) => api.upsertMember({ ...head, ...p }),
    addIfMissing: (rel, base) => { if (!members.some((m) => m.relation === rel)) api.upsertMember({ id: uid('m'), name: '', gender: rel === 'Spouse' ? (head?.gender === 'M' ? 'F' : 'M') : 'F', occupation: '', isStudent: false, level: 'none', isPregnant: false, ...base }); },
    addKids: (n) => { const have = members.filter((m) => m.relation === 'Child').length; for (let i = have; i < n; i++) api.upsertMember({ id: uid('m'), name: '', relation: 'Child', age: 10, gender: 'F', maritalStatus: 'single', occupation: '', isStudent: true, level: 'school', isPregnant: false }); },
  };

  const ask = (i) => { setMsg(''); setTyped(''); if (started) voice.speak(lang === 'hi' ? Q[i].hi : Q[i].en, vlang); };
  const accept = (text) => {
    const v = q.parse(text);
    if (v === null || v === undefined || Number.isNaN(v)) { setMsg(`I could not understand "${text}". Please try again or type it.`); return; }
    q.apply(v, helpers);
    setMsg(`Understood: ${q.show(v)}`);
    if (qi < Q.length - 1) { setQi(qi + 1); setTimeout(() => ask(qi + 1), 400); } else setMsg('All questions done. Review the household below.');
  };
  const mic = async () => {
    setStarted(true);
    try { const t = await voice.listen(vlang); setTyped(t); accept(t); } catch (e) { setMsg(e.message); }
  };

  const upd = (m, p) => api.upsertMember({ ...m, ...p });
  const addMember = () => api.upsertMember({ id: uid('m'), name: '', relation: 'Other', age: 20, gender: 'F', maritalStatus: 'single', occupation: '', isStudent: false, level: 'none', isPregnant: false });

  return (
    <div className="container">
      <h1 className="page-title">{lang === 'hi' ? 'आपका परिवार' : 'Your household'}</h1>
      <p className="page-subtitle">Answer by voice or type. Everything is editable below. Data stays on this device.</p>

      <div className="two-col">
        <section className="card voice-card">
          <div className="voice-top"><b>🎙️ Voice assistant</b><span className="muted">Question {qi + 1} of {Q.length}</span></div>
          <div className="progress"><div style={{ width: `${((qi + (msg.startsWith('All') ? 1 : 0)) / Q.length) * 100}%` }} /></div>
          <p className="voice-q">{lang === 'hi' ? q.hi : q.en}</p>
          <div className="voice-actions">
            <button className={`btn btn-primary mic ${voice.listening ? 'on' : ''}`} onClick={voice.listening ? voice.stop : mic} disabled={!voice.supported}>
              {voice.listening ? '● Listening…' : '🎤 Tap and speak'}
            </button>
            <button className="btn btn-outline" onClick={() => voice.speak(lang === 'hi' ? q.hi : q.en, vlang)}>🔊 Read aloud</button>
          </div>
          {!voice.supported && <p className="muted small">This browser has no speech recognition (Chrome and Edge do). Type your answer instead.</p>}
          <form className="type-row" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) accept(typed); }}>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="…or type your answer" aria-label="Type your answer" />
            <button className="btn btn-outline" type="submit">Submit</button>
          </form>
          {msg && <p className={`voice-msg ${msg.startsWith('Understood') || msg.startsWith('All') ? 'ok' : 'warn'}`}>{msg}</p>}
          <div className="voice-nav">
            <button className="btn btn-outline" disabled={qi === 0} onClick={() => { setQi(qi - 1); setMsg(''); }}>← Back</button>
            <button className="btn btn-outline" disabled={qi === Q.length - 1} onClick={() => { setQi(qi + 1); setMsg(''); }}>Skip →</button>
          </div>
          <p className="muted small">Privacy: browser speech recognition may send audio to the browser vendor. Production plan: offline Vosk / Whisper-small.</p>
        </section>

        <section className="card">
          <h2 className="card-title">Household details</h2>
          <div className="form-grid">
            <label>State<input value={household.state} onChange={(e) => api.setHousehold({ state: e.target.value })} placeholder="Uttar Pradesh" /></label>
            <label>District<input value={household.district} onChange={(e) => api.setHousehold({ district: e.target.value })} placeholder="Lucknow" /></label>
            <label>Area<select value={household.area} onChange={(e) => api.setHousehold({ area: e.target.value })}><option value="rural">Rural</option><option value="urban">Urban</option></select></label>
            <label>Category<select value={household.category} onChange={(e) => api.setHousehold({ category: e.target.value })}>{cats.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>Family income per year (₹)<input type="number" min="0" value={household.income} onChange={(e) => api.setHousehold({ income: Number(e.target.value) })} /></label>
            <label>Farm land (acres)<input type="number" min="0" step="0.1" value={household.landAcres} onChange={(e) => api.setHousehold({ landAcres: Number(e.target.value) })} /></label>
          </div>
          <div className="check-row">
            <label><input type="checkbox" checked={household.bpl} onChange={(e) => api.setHousehold({ bpl: e.target.checked })} /> BPL / Antyodaya ration card</label>
            <label><input type="checkbox" checked={household.hasPuccaHouse} onChange={(e) => api.setHousehold({ hasPuccaHouse: e.target.checked })} /> Has a pucca house</label>
            <label><input type="checkbox" checked={household.hasLPG} onChange={(e) => api.setHousehold({ hasLPG: e.target.checked })} /> Has an LPG connection</label>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="row-between"><h2 className="card-title">Family members</h2><button className="btn btn-outline" onClick={addMember}>+ Add member</button></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Relation</th><th>Age</th><th>Sex</th><th>Marital</th><th>Student</th><th>Pregnant</th><th /></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td><input value={m.name} onChange={(e) => upd(m, { name: e.target.value })} placeholder="Full name" aria-label="Name" /></td>
                  <td><input value={m.relation} onChange={(e) => upd(m, { relation: e.target.value })} aria-label="Relation" /></td>
                  <td><input className="narrow" type="number" min="0" max="110" value={m.age} onChange={(e) => upd(m, { age: Number(e.target.value) })} aria-label="Age" /></td>
                  <td><select value={m.gender} onChange={(e) => upd(m, { gender: e.target.value })} aria-label="Sex"><option value="F">F</option><option value="M">M</option></select></td>
                  <td><select value={m.maritalStatus} onChange={(e) => upd(m, { maritalStatus: e.target.value })} aria-label="Marital status"><option value="single">Single</option><option value="married">Married</option><option value="widowed">Widowed</option></select></td>
                  <td><input type="checkbox" checked={m.isStudent} onChange={(e) => upd(m, { isStudent: e.target.checked, level: e.target.checked ? (m.age >= 17 ? 'post_matric' : 'school') : 'none' })} aria-label="Student" /></td>
                  <td><input type="checkbox" checked={m.isPregnant} disabled={m.gender !== 'F'} onChange={(e) => upd(m, { isPregnant: e.target.checked })} aria-label="Pregnant" /></td>
                  <td>{!m.isHead && <button className="icon-btn" onClick={() => api.removeMember(m.id)} aria-label={`Remove ${m.name || 'member'}`}>✕</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="upload-actions"><button className="btn btn-primary" onClick={() => navigate('/documents')}>Next: add documents →</button></div>
      </section>
    </div>
  );
}
