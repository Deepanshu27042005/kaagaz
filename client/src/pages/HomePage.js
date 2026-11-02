import React from 'react';
import { Link } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import { docLabel } from '../data/docTypes';
import { inr, ScoreRing } from '../components/common/bits';

const STEPS = [
  ['01', 'Family profile', 'Add household members and the details needed for a first benefits check.', '♧'],
  ['02', 'Scan / upload', 'Read identity and supporting documents locally in your browser.', '▣'],
  ['03', 'Mismatch radar', 'Review name, date-of-birth and expiry issues before you apply.', '⌁'],
  ['04', 'Operator dossier', 'Prepare a useful case summary and QR handoff for an assisted visit.', '▦'],
];

export default function HomePage() {
  const { state, hasData, analysis } = useHousehold();
  const household = state;
  const head = household.members.find((member) => member.isHead) || household.members[0];
  const activeIssues = analysis.issues.filter((issue) => !issue.advisory);
  const ready = analysis.apps.filter((app) => app.state === 'ready' && !app.alternativeTo);
  const blocked = analysis.apps.filter((app) => app.state === 'blocked' && !app.alternativeTo);
  const readiness = analysis.apps.length
    ? Math.round(analysis.apps.reduce((total, app) => total + app.readiness, 0) / analysis.apps.length)
    : 0;
  const firstIssue = activeIssues[0];
  const location = [household.household.district, household.household.state].filter(Boolean).join(', ');
  const memberCount = hasData ? household.members.length : 0;

  return (
    <div className="home-page dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-copy">
          <div className="eyebrow"><span className="eyebrow-mark">✳</span> CIVIC READINESS ENGINE <span className="privacy-inline">100% local · No cloud uploads</span></div>
          <h1>Prepare your family’s documents before visiting the counter</h1>
          <p>Catch paperwork issues early, understand which benefits may fit, and see exactly what to do next.</p>
          <div className="dashboard-actions">
            {hasData
              ? <Link to="/documents" className="btn btn-primary">Review documents <span>→</span></Link>
              : <Link to="/household" className="btn btn-primary">Set up my household <span>→</span></Link>}
            <Link to={hasData ? '/household' : '/documents'} className="btn btn-soft">{hasData ? 'Edit household profile' : 'Add a document'} <span>↗</span></Link>
          </div>
        </div>
        <aside className="security-audit">
          <div className="security-audit-top"><span className="security-seal">✓</span><span className="status-dot" /> DEVICE SECURITY</div>
          <strong>Privacy shield active</strong>
          <p>Document reading runs on this device. Original scans are not uploaded to a server.</p>
          <span className="security-foot">On-device OCR · Offline-ready</span>
        </aside>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div><span className="section-kicker">YOUR PREPARATION FLOW</span><h2>How KaagazSaathi pre-screens your case</h2></div>
          <span className="section-caption">4 simple preparation steps</span>
        </div>
        <div className="step-grid">
          {STEPS.map(([number, title, description, icon]) => (
            <article className="step-card" key={number}>
              <div className="step-card-top"><span>{number}</span><i aria-hidden="true">{icon}</i></div>
              <h3>{title}</h3>
              <p>{description}</p>
              <span className="step-card-state">{number === '03' && activeIssues.length ? `${activeIssues.length} review item${activeIssues.length === 1 ? '' : 's'}` : 'Ready when you are'}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading assessment-heading">
          <div><span className="section-kicker">ACTIVE ASSESSMENT</span><h2>{head?.name ? `${head.name.split(' ')[0]} household readiness` : 'Household benefits readiness'}</h2><p>{location || 'Add your district and state'} · {memberCount} registered member{memberCount === 1 ? '' : 's'}</p></div>
        </div>

        <div className="assessment-grid">
          <article className="metric-card"><div className="metric-label"><span>Ready schemes</span><i className="metric-icon positive">✓</i></div><strong>{ready.length} active</strong><small>{inr(analysis.money.perYearReady)} / year ready to apply</small><div className="metric-track"><span style={{ width: `${analysis.apps.length ? Math.max(8, Math.round((ready.length / analysis.apps.length) * 100)) : 0}%` }} /></div></article>
          <article className="metric-card"><div className="metric-label"><span>Blocked schemes</span><i className="metric-icon pending">⌁</i></div><strong className="metric-amber">{blocked.length} need a fix</strong><small>{inr(analysis.money.perYearBlocked)} / year pending paperwork</small><div className="metric-track amber"><span style={{ width: `${analysis.apps.length ? Math.max(8, Math.round((blocked.length / analysis.apps.length) * 100)) : 0}%` }} /></div></article>
          <article className="metric-card"><div className="metric-label"><span>Document issues</span><i className="metric-icon alert">!</i></div><strong className="metric-red">{activeIssues.length} to review</strong><small>Name or date differences to check</small><div className="metric-track red"><span style={{ width: `${activeIssues.length ? Math.min(100, activeIssues.length * 22) : 0}%` }} /></div></article>
          <article className="metric-card readiness-card"><div className="metric-label"><span>Readiness gauge</span><i className="metric-icon blue">◌</i></div><div className="readiness-value"><strong>{readiness}%</strong><ScoreRing value={readiness} size={58} /></div><small>Based on the current rule set</small><span className="metric-note">Transparent checklist · no AI decisions</span></article>
        </div>

        {firstIssue ? (
          <article className="priority-card">
            <span className="priority-icon">!</span>
            <div className="priority-copy"><span className="priority-tag">HIGH-IMPACT REVIEW</span><h3>{firstIssue.memberName}’s {firstIssue.field === 'dob' ? 'date of birth' : 'name'} needs a document check</h3><p>{firstIssue.reasons[0]} Review the comparison and suggested correction steps before applying.</p></div>
            <Link to="/issues" className="btn btn-primary">Review mismatches <span>→</span></Link>
          </article>
        ) : (
          <article className="priority-card priority-clear">
            <span className="priority-icon">✓</span>
            <div className="priority-copy"><span className="priority-tag">DOCUMENT CHECK</span><h3>No high-priority mismatches found</h3><p>Keep adding household documents to check more fields against each other.</p></div>
            <Link to="/documents" className="btn btn-primary">Open documents <span>→</span></Link>
          </article>
        )}
      </section>

      {hasData ? <section className="dashboard-section inventory-section">
        <div className="section-heading">
          <div><span className="section-kicker">HOUSEHOLD DOCUMENT INVENTORY</span><h2>Family members & document health</h2><p>{household.members.length} enrolled members · {household.documents.length} documents added</p></div>
          <Link to="/dossier" className="btn btn-soft">Prepare operator dossier <span>↗</span></Link>
        </div>
        <div className="member-grid">
          {household.members.map((member) => {
            const memberDocs = household.documents.filter((document) => document.memberId === member.id);
            const memberIssues = activeIssues.filter((issue) => issue.memberId === member.id).length;
            return (
              <article className="member-card" key={member.id}>
                <div className="member-card-heading"><span className="member-avatar">{(member.name || member.relation || '?').slice(0, 1)}</span><div><strong>{member.name || member.relation}</strong><small>{member.relation}{member.age ? ` · ${member.age} yrs` : ''}</small></div><span className={`member-state ${memberIssues || !memberDocs.length ? 'needs-review' : 'verified'}`}>{memberIssues ? `${memberIssues} to review` : memberDocs.length ? 'No mismatch' : 'No docs yet'}</span></div>
                <div className="member-doc-list">
                  {memberDocs.length ? memberDocs.slice(0, 4).map((document) => (
                    <span className={`member-doc-chip ${analysis.verify.some((field) => field.docId === document.id) ? 'verify-chip' : ''}`} key={document.id}><i>{analysis.verify.some((field) => field.docId === document.id) ? '!' : '✓'}</i>{docLabel(document.type)}</span>
                  )) : <span className="muted small">No documents added yet</span>}
                </div>
                <div className="member-card-footer"><span>{memberDocs.length} document{memberDocs.length === 1 ? '' : 's'}</span><Link to="/documents">Review files →</Link></div>
              </article>
            );
          })}
        </div>
      </section> : <section className="dashboard-section empty-household-card"><span className="section-kicker">GET STARTED</span><h2>No household documents have been added</h2><p>Set up a household, then add documents yourself. The document list stays empty until you add a scan or enter details.</p><div className="dashboard-actions"><Link to="/household" className="btn btn-primary">Set up household <span>→</span></Link><Link to="/documents" className="btn btn-soft">Open document scan</Link></div></section>}

      <section className="local-scan-banner">
        <div><span className="section-kicker">ON-DEVICE OCR</span><h2>Verify a document privately</h2><p>Choose an image or PDF. OCR runs locally in your browser; you review the extracted fields before saving.</p><span className="local-scan-points">✓ No cloud upload <span>·</span> ✓ Human review for uncertain reads <span>·</span> ✓ Aadhaar reduced to last 4 digits</span></div>
        <Link to="/documents" className="btn btn-primary">Go to document scan <span>→</span></Link>
      </section>
    </div>
  );
}
