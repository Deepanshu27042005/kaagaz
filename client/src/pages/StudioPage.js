import React, { useMemo, useState } from 'react';
import { useHousehold } from '../context/HouseholdContext';
import { SCHEMES } from '../data/schemes';
import { analyze } from '../engine/analyze';
import { DemoBanner, inr } from '../components/common/bits';

// Heuristic stand-in for the LLM step. In production an LLM drafts rules from the guideline PDF,
// and a human must approve them. Here a few regexes show the same human-in-the-loop flow.
function draftFromText(text) {
  const out = [];
  const t = text.toLowerCase();
  let m = t.match(/(?:income|annual income)[^.]{0,60}?(?:not exceed(?:ing)?|up to|below|less than|within)[^\d]{0,15}(?:rs\.?|₹)?\s*([\d.,]+)\s*(lakh|lakhs|lac)?/);
  if (m) { const n = parseFloat(m[1].replace(/,/g, '')) * (m[2] ? 100000 : 1); out.push({ id: 'income', field: 'household.income', op: 'lte', value: n, label: `Family income is ${inr(n)} a year or less` }); }
  m = t.match(/(?:age|aged)[^.]{0,30}?(\d{2})\s*(?:years)?\s*(?:or above|and above|or more|\+)/);
  if (m) out.push({ id: 'age_min', field: 'member.age', op: 'gte', value: +m[1], label: `Age is ${m[1]} or above` });
  if (/widow/.test(t)) out.push({ id: 'widow', field: 'member.maritalStatus', op: 'eq', value: 'widowed', label: 'Applicant is widowed' });
  if (/below poverty|\bbpl\b/.test(t)) out.push({ id: 'bpl', field: 'household.bpl', op: 'truthy', value: true, label: 'Household is below the poverty line' });
  return out;
}

export default function StudioPage() {
  const api = useHousehold();
  const { overrides, state } = api;
  const [id, setId] = useState(SCHEMES[0].id);
  const [edits, setEdits] = useState({});
  const [guide, setGuide] = useState('Eligible: widows aged 40 years or above whose household is below poverty line and annual income not exceeding Rs 1.5 lakh.');
  const [draft, setDraft] = useState([]);
  const scheme = api.analysis.schemes.find((s) => s.id === id);
  const nums = scheme.conditions.filter((c) => typeof c.value === 'number' && c.field !== 'household.landAcres');
  const before = api.analysis;
  const after = useMemo(() => {
    const th = { ...(overrides[id]?.thresholds || {}), ...edits };
    const o = { ...overrides, [id]: { thresholds: th, version: scheme.version, status: scheme.status } };
    return analyze({ ...state, overrides: o });
  }, [edits, overrides, id, state, scheme]);
  const bk = new Set(before.apps.map((a) => a.key)), ak = new Set(after.apps.map((a) => a.key));
  const gained = after.apps.filter((a) => !bk.has(a.key)), lost = before.apps.filter((a) => !ak.has(a.key));
  const dirty = Object.keys(edits).length > 0;
  const approve = () => {
    const th = { ...(overrides[id]?.thresholds || {}), ...edits };
    api.setOverride(id, { thresholds: th, version: (scheme.version || 1) + 1, status: 'human-verified (this device)' });
    setEdits({});
  };
  return (
    <div className="container">
      <h1 className="page-title">Rules Studio</h1>
      <p className="page-subtitle">Rules are versioned JSON, never hidden in code. When a guideline changes, edit the rule, approve it, and every household is re-evaluated automatically.</p>
      <DemoBanner />
      <div className="two-col">
        <section className="card">
          <label className="doc-field">Scheme<select value={id} onChange={(e) => { setId(e.target.value); setEdits({}); }}>{SCHEMES.map((s) => <option key={s.id} value={s.id}>{s.short}</option>)}</select></label>
          <div className="chips"><span className="doc-chip">v{scheme.version}</span><span className={`doc-chip ${scheme.status.startsWith('human') ? 'ok' : 'miss'}`}>{scheme.status}</span><a href={scheme.source} target="_blank" rel="noopener noreferrer" className="doc-chip">source ↗</a></div>
          <h3>Thresholds</h3>
          {nums.length === 0 && <p className="muted">This rule has no numeric thresholds.</p>}
          {nums.map((c) => (
            <label key={c.id} className="doc-field">{c.label}<input type="number" value={edits[c.id] ?? c.value} onChange={(e) => setEdits({ ...edits, [c.id]: Number(e.target.value) })} /></label>
          ))}
          <div className="row-gap">
            <button className="btn btn-primary" disabled={!dirty} onClick={approve}>Approve as new version</button>
            <button className="btn btn-outline" onClick={() => { setEdits({}); api.clearOverrides(); }}>Reset all</button>
          </div>
          {dirty && (
            <div className="whatif">
              <b>Impact on this household</b>
              {gained.length === 0 && lost.length === 0 && <p>No change in eligibility.</p>}
              {gained.map((a) => <div key={a.key} className="gain">➕ {a.scheme.short} {a.scheme.appliesTo === 'member' ? `(${a.memberName})` : ''}</div>)}
              {lost.map((a) => <div key={a.key} className="loss">➖ {a.scheme.short} {a.scheme.appliesTo === 'member' ? `(${a.memberName})` : ''}</div>)}
            </div>
          )}
        </section>
        <section className="card">
          <h3>Rule as code</h3>
          <pre className="json">{JSON.stringify({ id: scheme.id, version: scheme.version, status: scheme.status, appliesTo: scheme.appliesTo, conditions: scheme.conditions, docs: scheme.docs, source: scheme.source }, null, 2)}</pre>
        </section>
      </div>
      <section className="card" style={{ marginTop: 16 }}>
        <h2 className="card-title">Draft rules from guideline text</h2>
        <p className="muted">Production: an LLM extracts rules from the official PDF. This demo uses simple pattern matching to show the same flow. Output is always a draft that a human must approve.</p>
        <textarea rows="3" value={guide} onChange={(e) => setGuide(e.target.value)} aria-label="Guideline text" />
        <button className="btn btn-outline" onClick={() => setDraft(draftFromText(guide))}>Extract draft rules</button>
        {draft.length > 0 && <pre className="json">{JSON.stringify(draft, null, 2)}</pre>}
        {draft.length === 0 && <p className="muted small">No drafts yet.</p>}
      </section>
    </div>
  );
}
