import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import { analyze } from '../engine/analyze';
import { LIFE_EVENTS, applyLifeEvent } from '../engine/lifeEvents';
import { docLabel } from '../data/docTypes';
import { ACQUIRE } from '../data/docTypes';
import { EmptyState, ScoreRing, StatusChip, DemoBanner, inr } from '../components/common/bits';

function Journey({ app }) {
  const [open, setOpen] = useState(false);
  const b = app.breakdown;
  return (
    <div className="card app">
      <div className="app-top">
        <ScoreRing value={app.readiness} label="ready" />
        <div className="app-main">
          <div className="app-title">{app.scheme.short} <span className="muted">· {app.scheme.appliesTo === 'member' ? app.memberName : 'household'}</span></div>
          <div className="muted">{app.readiness}% ready · {app.issueCount} issue{app.issueCount === 1 ? '' : 's'} · rejection risk {app.riskPct}%</div>
          <div className="chips"><StatusChip state={app.state} />{app.blockers[0] && <span className="doc-chip">Next: {app.blockers[0].label}</span>}</div>
        </div>
        <button className="btn btn-outline" onClick={() => setOpen(!open)}>{open ? 'Hide' : 'Checklist'}</button>
      </div>
      {open && (
        <div className="trace">
          <ul className="checklist">
            {app.requirements.map((r) => (
              <li key={r.type} className={!r.present ? 'bad' : r.expiry?.expired ? 'bad' : 'good'}>
                {!r.present ? '✗' : r.expiry?.expired ? '⚠' : '✓'} {docLabel(r.type)}
                {!r.present && <small> · {ACQUIRE[r.type]?.office}, about {ACQUIRE[r.type]?.days} days, {ACQUIRE[r.type]?.fee}</small>}
                {r.present && r.expiry?.expired && <small> · expired, renew it</small>}
              </li>
            ))}
            {app.blockers.filter((x) => x.kind === 'fix').map((x) => <li key={x.key} className="bad">✗ {x.label} <small>· see Issues</small></li>)}
          </ul>
          <p className="muted small">Score = 100 − {b.missing} (missing documents) − {b.issues} (mismatches) − {b.expiry} (expiry). Apply at: {app.scheme.office}.</p>
        </div>
      )}
    </div>
  );
}

function LifeEvents({ api }) {
  const { state, household, members } = api;
  const [sel, setSel] = useState(null);
  const preview = useMemo(() => {
    if (!sel) return null;
    const r = applyLifeEvent(sel, household, members);
    const after = analyze({ ...state, household: r.household, members: r.members });
    const before = new Set(api.analysis.apps.map((a) => a.key));
    return { r, gained: after.apps.filter((a) => !before.has(a.key)) };
  }, [sel, state, household, members, api.analysis]);
  return (
    <section className="card">
      <h2 className="card-title">Something changed in the family?</h2>
      <p className="muted">Instead of searching for schemes, tell us what happened. We preview what opens up, and you can record the change.</p>
      <div className="event-grid">{LIFE_EVENTS.map((e) => (<button key={e.id} className={`event ${sel === e.id ? 'on' : ''}`} onClick={() => setSel(sel === e.id ? null : e.id)}><span>{e.icon}</span><b>{e.label}</b><small>{e.hint}</small></button>))}</div>
      {preview && (
        <div className="whatif">
          {preview.r.note.length === 0 && <p>This event does not apply to anyone in the current household.</p>}
          {preview.r.note.map((n) => <div key={n} className="muted">• {n}</div>)}
          {preview.gained.length === 0 ? <p>No new schemes open up from this change.</p> : preview.gained.map((a) => <div key={a.key} className="gain">➕ Opens up: <b>{a.scheme.short}</b>{a.scheme.appliesTo === 'member' ? ` (${a.memberName})` : ''} · {a.scheme.benefit.text}</div>)}
          {preview.r.note.length > 0 && <button className="btn btn-primary" onClick={() => { api.replaceProfile(preview.r.household, preview.r.members); setSel(null); }}>Record this change</button>}
        </div>
      )}
    </section>
  );
}

export default function PlanPage() {
  const api = useHousehold();
  const { analysis, hasData } = api;
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  if (!hasData) return <div className="container"><EmptyState title="No plan yet" cta="Set up your household" to="/household">Add your household and documents, or load the demo family from the home page.</EmptyState></div>;
  const { money, plan, apps, reminders } = analysis;
  const ready = apps.filter((a) => a.state === 'ready' && !a.alternativeTo);
  const notify = async () => {
    if (typeof Notification === 'undefined') return;
    const p = await Notification.requestPermission(); setPerm(p);
    if (p === 'granted') reminders.slice(0, 3).forEach((r) => new Notification('KaagazSaathi', { body: r.text }));
  };
  const top = plan.plans[1] || plan.plans[0];

  return (
    <div className="container">
      <h1 className="page-title">My plan</h1>
      <DemoBanner />
      <section className="hero-money card">
        <small>Money left on the table</small>
        <div className="big">{inr(money.perYearLeft)}<span> per year</span></div>
        <div className="big sm">+ {inr(money.oneTimeLeft)}<span> one-time</span></div>
        <div className="chips">
          <span className="doc-chip">{inr(money.perYearReady)} per year ready to apply now</span>
          <span className="doc-chip">{inr(money.perYearBlocked)} per year blocked by paperwork</span>
          {money.covers.map((c) => <span key={c.key} className="doc-chip">{c.scheme.benefit.text}</span>)}
        </div>
        <p className="muted small">Indicative values from the demo rule set. Cash transfers and pensions per year; asset grants counted once; insurance cover shown separately.</p>
      </section>

      <h2 className="results-section-title">Fewest fixes, most benefit</h2>
      {plan.plans.length === 0 ? <div className="card">Nothing is blocked right now. {ready.length ? 'You can apply to the schemes below today.' : ''}</div> : (
        <>
          {top && <div className="card headline">Fix <b>{top.k} thing{top.k > 1 ? 's' : ''}</b> → unlock <b>{top.count} application{top.count > 1 ? 's' : ''}</b> worth <b>{inr(top.value)}</b>.</div>}
          <div className="plan-grid">
            {plan.plans.map((p) => (
              <div key={p.k} className="card plan">
                <div className="plan-k">{p.k} action{p.k > 1 ? 's' : ''}</div>
                <ul>{p.actions.map((a) => <li key={a.key}>{a.label} <small className="muted">· {a.who}</small></li>)}</ul>
                <div className="plan-arrow">unlocks</div>
                <ul>{p.unlocks.map((u) => <li key={u.key}><b>{u.scheme.short}</b> <small className="muted">· {u.scheme.appliesTo === 'member' ? u.memberName : 'household'}</small></li>)}</ul>
                <div className="plan-value">{inr(p.value)}</div>
              </div>
            ))}
          </div>
          <p className="muted small">Found by exact search over every combination of fixes (a small set-cover), so you can see why this order is best. <Link to="/issues">Open the fixes →</Link></p>
        </>
      )}

      {ready.length > 0 && (<><h2 className="results-section-title">Apply today</h2>{ready.map((a) => <Journey key={a.key} app={a} />)}</>)}
      <h2 className="results-section-title">Application journeys</h2>
      {apps.filter((a) => a.state === 'blocked' && !a.alternativeTo).map((a) => <Journey key={a.key} app={a} />)}

      <h2 className="results-section-title">Reminders</h2>
      <section className="card">
        {reminders.length === 0 ? <p className="muted">Nothing expiring soon.</p> : <ul className="reasons">{reminders.map((r) => <li key={r.id} className={r.kind === 'expired' ? 'bad-text' : ''}>{r.kind === 'expired' ? '⛔' : '⏰'} {r.text}</li>)}</ul>}
        {perm !== 'unsupported' && perm !== 'granted' && <button className="btn btn-outline" onClick={notify}>🔔 Enable reminders on this device</button>}
        {perm === 'granted' && <p className="muted small">Reminders enabled. Background push needs the installed app; this demo notifies when you open it.</p>}
      </section>

      <LifeEvents api={api} />
      <div className="upload-actions"><Link to="/dossier" className="btn btn-primary">Create the QR dossier →</Link></div>
    </div>
  );
}
