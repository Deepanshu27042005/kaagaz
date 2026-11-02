import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import { analyze } from '../engine/analyze';
import { EmptyState, ScoreRing, StatusChip, DemoBanner, inr } from '../components/common/bits';

const fmtVal = (c) => (typeof c.value === 'number' && c.field.includes('income') ? inr(c.value) : Array.isArray(c.value) ? c.value.join('/') : String(c.value));
const fmtAct = (c) => (typeof c.actual === 'number' && c.field.includes('income') ? inr(c.actual) : typeof c.actual === 'boolean' ? (c.actual ? 'yes' : 'no') : String(c.actual ?? 'unknown'));

function AppCard({ app, setClaim }) {
  const [open, setOpen] = useState(false);
  const s = app.scheme;
  return (
    <div className={`card app ${app.alternativeTo ? 'alt' : ''}`}>
      <div className="app-top">
        <ScoreRing value={app.readiness} label="ready" />
        <div className="app-main">
          <div className="app-title">{s.name}</div>
          <div className="muted">For <b>{app.scheme.appliesTo === 'member' ? app.memberName : 'the household'}</b> · {s.benefit.text}</div>
          <div className="chips"><StatusChip state={app.state} />{app.alternativeTo && <span className="doc-chip">Alternative to {app.alternativeTo} (one pension per person)</span>}<span className="doc-chip">{app.issueCount} issue{app.issueCount === 1 ? '' : 's'}</span></div>
        </div>
        <div className="app-value">{s.benefit.kind === 'cover' ? '₹5L cover' : inr(s.benefit.amount)}<small>{s.benefit.period === 'once' ? 'one time' : 'per year'}</small></div>
      </div>
      <div className="row-gap">
        <button className="btn btn-outline" onClick={() => setOpen(!open)}>{open ? 'Hide reasoning' : 'Why do I match?'}</button>
        <label className="claim"><input type="checkbox" checked={app.state === 'receiving'} onChange={(e) => setClaim(app.key, e.target.checked ? 'receiving' : null)} /> I already receive this</label>
      </div>
      {open && (
        <div className="trace">
          <table className="data-table"><tbody>
            {app.conditions.map((c) => (<tr key={c.id}><td>{c.pass ? '✅' : '❌'}</td><td>{c.label}</td><td className="muted">your value: {fmtAct(c)}</td></tr>))}
          </tbody></table>
          <p className="muted small">Rule v{s.version} · {s.status} · decided by fixed rules, not AI · <a href={s.source} target="_blank" rel="noopener noreferrer">official source ↗</a></p>
          <p className="muted small">Where to apply: {s.office}</p>
        </div>
      )}
    </div>
  );
}

export default function SchemesPage() {
  const api = useHousehold();
  const { analysis, household, state, hasData, setClaim } = api;
  const [wi, setWi] = useState({ income: household.income, category: household.category });
  const sim = useMemo(() => analyze({ ...state, household: { ...household, income: wi.income, category: wi.category } }), [state, household, wi]);

  if (!hasData) return <div className="container"><EmptyState title="No household yet" cta="Set up your household" to="/household">We need your household details to check schemes.</EmptyState></div>;
  const { apps, money, nearMisses, eligibility, schemes } = analysis;
  const recommendedPlan = analysis.plan.plans[0];
  const keys = (a) => new Set(a.apps.map((x) => x.key));
  const base = keys(analysis), simk = keys(sim);
  const gained = sim.apps.filter((a) => !base.has(a.key)), lost = analysis.apps.filter((a) => !simk.has(a.key));
  const changed = wi.income !== household.income || wi.category !== household.category;

  const notEligible = schemes.filter((s) => !eligibility.some((e) => e.schemeId === s.id && e.eligible)).map((s) => {
    const entries = eligibility.filter((e) => e.schemeId === s.id);
    const best = entries.sort((a, b) => a.failed.length - b.failed.length)[0];
    return { s, reasons: best ? best.failed.map((f) => `${f.label} (yours: ${fmtAct(f)})`) : [] };
  });

  return (
    <div className="container">
      <h1 className="page-title">Scheme eligibility &amp; prioritized benefit plan</h1>
      <p className="page-subtitle">See which schemes may fit, why the rules matched, and which paperwork to fix first. AI reads documents; fixed rules evaluate eligibility.</p>
      <DemoBanner />
      <div className="money-strip">
        <div><b>{inr(money.perYearLeft)}</b><small>per year you could be claiming</small></div>
        <div><b>{inr(money.oneTimeLeft)}</b><small>one-time benefits</small></div>
        <div><b>{money.readyCount}</b><small>ready to apply</small></div>
        <div><b>{money.blockedCount}</b><small>need a fix first</small></div>
      </div>
      <section className="scheme-optimizer">
        <div className="scheme-optimizer-heading">
          <div><span className="section-kicker">DOCUMENT-UNLOCK OPTIMIZER</span><h2>Fix the most important things first</h2><p>Prioritized by the exact set of fixes that unlocks the greatest benefit in the current rule set.</p></div>
          <Link to="/plan" className="btn btn-soft">Full readiness plan <span>→</span></Link>
        </div>
        {recommendedPlan ? (
          <>
            <div className="scheme-optimizer-summary">Fix <strong>{recommendedPlan.k} thing{recommendedPlan.k === 1 ? '' : 's'}</strong> to unlock <strong>{recommendedPlan.count} application{recommendedPlan.count === 1 ? '' : 's'}</strong> worth <strong>{inr(recommendedPlan.value)}</strong>.</div>
            <div className="scheme-action-grid">
              {recommendedPlan.actions.slice(0, 3).map((action, index) => <div className="scheme-action" key={action.key}><span>STEP {index + 1}</span><strong>{action.label}</strong><small>{action.who}</small></div>)}
            </div>
          </>
        ) : <p className="scheme-optimizer-clear">No paperwork blockers found in the current eligible applications. Review the scheme rules and documents below before applying.</p>}
      </section>
      {analysis.incomeNote && <div className="card warn-card">⚠️ {analysis.incomeNote}</div>}

      <h2 className="results-section-title">Eligible ({apps.length})</h2>
      {apps.length === 0 && <div className="card empty"><p>No scheme matches the current profile yet. Check the household details, or try the what-if tool below.</p></div>}
      {apps.map((a) => <AppCard key={a.key} app={a} setClaim={setClaim} />)}

      {nearMisses.length > 0 && (
        <>
          <h2 className="results-section-title">So close</h2>
          {nearMisses.map((n) => {
            const s = schemes.find((x) => x.id === n.schemeId); const m = n.nearMiss[0];
            return (<div key={n.key} className="card near"><b>{s.short}</b> {s.appliesTo === 'member' ? `for ${n.memberName}` : ''}: {m.field.includes('income') ? `you miss the limit by ${inr(m.delta)}. If a fresh income certificate shows ${inr(m.limit)} or less, you would qualify.` : `eligible in about ${Math.ceil(m.delta)} year(s).`}</div>);
          })}
        </>
      )}

      <h2 className="results-section-title">What if…?</h2>
      <section className="card">
        <p className="muted">Change the numbers to see what changes. This does not alter your saved profile.</p>
        <div className="form-grid">
          <label>Family income per year: <b>{inr(wi.income)}</b><input type="range" min="0" max="600000" step="5000" value={wi.income} onChange={(e) => setWi({ ...wi, income: Number(e.target.value) })} /></label>
          <label>Category<select value={wi.category} onChange={(e) => setWi({ ...wi, category: e.target.value })}>{['General', 'OBC', 'SC', 'ST'].map((c) => <option key={c}>{c}</option>)}</select></label>
        </div>
        {changed ? (
          <div className="whatif">
            {gained.length === 0 && lost.length === 0 && <p>No change in eligibility.</p>}
            {gained.map((a) => <div key={a.key} className="gain">➕ You would gain <b>{a.scheme.short}</b>{a.scheme.appliesTo === 'member' ? ` (${a.memberName})` : ''}</div>)}
            {lost.map((a) => <div key={a.key} className="loss">➖ You would lose <b>{a.scheme.short}</b>{a.scheme.appliesTo === 'member' ? ` (${a.memberName})` : ''}</div>)}
            <button className="btn btn-outline" onClick={() => setWi({ income: household.income, category: household.category })}>Reset</button>
          </div>
        ) : <p className="muted">Move the slider to explore.</p>}
      </section>

      <h2 className="results-section-title">Not eligible, and why</h2>
      <section className="card">
        {notEligible.length === 0 ? <p className="muted">You match every scheme in the rule set.</p> : notEligible.map(({ s, reasons }) => (
          <details key={s.id}><summary>{s.short}</summary><ul className="reasons">{reasons.map((r, i) => <li key={i}>{r}</li>)}</ul></details>
        ))}
      </section>
      <div className="upload-actions"><Link to="/plan" className="btn btn-primary">See my plan →</Link></div>
    </div>
  );
}
