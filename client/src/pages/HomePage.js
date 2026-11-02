import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import { demoState } from '../data/demo';
import { analyze } from '../engine/analyze';
import { inr } from '../components/common/bits';

const STEPS = [
  ['🎙️', 'Speak', 'Answer a few questions in Hindi or English. We build a profile of the whole household.'],
  ['📷', 'Scan', 'Photograph documents or upload PDFs. Text is read on the phone; only extracted fields are kept.'],
  ['🔎', 'Catch mismatches', 'Fuzzy, transliteration-aware matching finds "Mohd Rafiq" vs "Mohammad Rafique" before the counter does.'],
  ['⚖️', 'Check eligibility', 'A transparent rules engine matches each person to schemes and shows why, with the official source.'],
  ['🧩', 'Unlock the most', 'The optimizer finds the fewest fixes that unlock the most benefit.'],
  ['📲', 'Hand off', 'A QR dossier lets the CSC operator pre-fill forms. Works offline.'],
];
const NOT_CHATGPT = [
  ['Remembers the household', 'Profiles, documents and deadlines persist on the device.'],
  ['Deterministic and auditable', 'Rules are versioned JSON with sources. No confident guessing.'],
  ['Reads real scans privately', 'OCR runs in the browser. Documents are never uploaded.'],
  ['Works offline, by voice', 'Built as an installable PWA for low connectivity and low literacy.'],
  ['Produces something an operator can use', 'A verifiable QR dossier, fix letters and a checklist.'],
];

export default function HomePage() {
  const { loadDemo } = useHousehold();
  const navigate = useNavigate();
  const preview = useMemo(() => { const T = new Date(); const s = demoState(T); return { a: analyze(s, T), s }; }, []);
  const { a } = preview;
  const best = a.plan.plans.find((p) => p.k === 2) || a.plan.plans[a.plan.plans.length - 1];
  const start = () => { loadDemo(); navigate('/plan'); };

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-badge">📄 KaagazSaathi · Build for Bharat 2026</div>
        <h1 className="hero-headline">We stop benefit claims from failing<br /><span className="hero-highlight">before the citizen reaches the counter.</span></h1>
        <p className="hero-sub">
          Most families do not miss benefits because they cannot find the scheme. They miss them because one name is spelled two ways, a date is swapped, or a certificate expired.
          KaagazSaathi finds those problems first, and tells you exactly how to fix them.
        </p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={start}>▶ Try the demo family</button>
          <Link to="/household" className="btn btn-outline">Start with my household →</Link>
        </div>

        <div className="hero-demo-card card" aria-label="Live example from the engine">
          <div className="demo-card-title">Live output for the demo family (fictional data)</div>
          <div className="demo-row"><span className="demo-label">Aadhaar vs passbook</span><span className="demo-value">"Mohd Rafiq" vs "Mohammad Rafique"</span><span className="badge badge-review">Spelling variant</span></div>
          <div className="demo-row"><span className="demo-label">Zoya's date of birth</span><span className="demo-value">04/12/2005 vs 12/04/2005</span><span className="badge badge-missing">DD/MM swapped</span></div>
          <div className="demo-row"><span className="demo-label">Income certificate</span><span className="demo-value">Issued 14 months ago</span><span className="badge badge-mismatch">Expired</span></div>
          <div className="hero-kpis">
            <div><b>{inr(a.money.perYearLeft)}</b><small>per year unclaimed</small></div>
            <div><b>{inr(a.money.oneTimeLeft)}</b><small>one-time unclaimed</small></div>
            {best && <div><b>Fix {best.k} things</b><small>unlock {best.count} schemes · {inr(best.value)}</small></div>}
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">How it works</h2>
        <div className="how-grid">
          {STEPS.map(([icon, title, desc], i) => (
            <div key={title} className="how-card card"><div className="how-icon">{icon}</div><div className="how-num">Step {i + 1}</div><div className="how-title">{title}</div><p className="how-desc">{desc}</p></div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Why a chatbot cannot do this</h2>
        <div className="why-grid">
          {NOT_CHATGPT.map(([t, d]) => (<div key={t} className="card why-card"><b>✔ {t}</b><p>{d}</p></div>))}
        </div>
      </section>

      <section className="section principles-section">
        <h2 className="section-title">Responsible by design</h2>
        <div className="principles-row">
          {['🔒 Consent first', '🕶️ Aadhaar reduced to last 4 digits', '📵 Documents never uploaded', '👤 "Human verify" on low-confidence reads', '🔗 Every verdict cites a source', '⚖️ AI never decides eligibility'].map((p) => (<div key={p} className="principle-chip">{p}</div>))}
        </div>
        <p className="principles-note">Honest limits: browser speech recognition may send audio to the browser vendor (offline Vosk/Whisper is the production plan), and the bundled scheme rules are demo values pending human verification.</p>
      </section>
    </div>
  );
}
