import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import { docLabel } from '../data/docTypes';
import { buildLetter } from '../engine/letters';
import { EmptyState, Level } from '../components/common/bits';

const KIND = { variant: 'Spelling variant', typo: 'Typo or OCR slip', partial: 'Name part missing', initial: 'Initial vs full name', reordered: 'Order differs', review: 'Looks like a different name', conflict: 'Different name', swapped: 'Day/month swapped', year_only: 'Year only', unreadable: 'Unreadable' };

function Letter({ issue, member, household }) {
  const [lang, setLang] = useState('en');
  const l = buildLetter(issue, member, household, lang);
  return (
    <div className="letter-wrap">
      <div className="row-between no-print">
        <b>Draft letter</b>
        <div className="seg"><button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>English</button><button className={lang === 'hi' ? 'on' : ''} onClick={() => setLang('hi')}>हिन्दी</button></div>
      </div>
      <div className="letter"><h3>{l.title}</h3><pre>{l.body}</pre></div>
      <div className="upload-actions no-print">
        <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print</button>
        <button className="btn btn-outline" onClick={() => navigator.clipboard?.writeText(`${l.title}\n\n${l.body}`)}>Copy text</button>
      </div>
      <p className="muted small no-print">Draft only. Some offices need this on stamp paper or notarised, and wording differs by state.</p>
    </div>
  );
}

function IssueCard({ issue, member, household }) {
  const [open, setOpen] = useState(false);
  const [showLetter, setShowLetter] = useState(false);
  const fix = issue.fix;
  const target = issue.docs.find((d) => d.id === issue.targetDocId);
  return (
    <div className={`card issue lvl-${issue.level}`}>
      <div className="issue-head">
        <div>
          <div className="issue-title">{issue.field === 'dob' ? 'Date of birth' : 'Name'} differs · <span className="muted">{issue.memberName}</span></div>
          <div className="chips"><span className="doc-chip">{KIND[issue.kind] || issue.kind}</span><Level level={issue.level} />{issue.score != null && <span className="muted small">match score {issue.score}</span>}</div>
        </div>
      </div>
      <div className="compare">
        {issue.docs.map((d) => (
          <div key={d.id} className={`compare-cell ${d.id === issue.targetDocId ? 'target' : ''}`}>
            <small>{docLabel(d.type)}{d.id === issue.targetDocId ? ' · fix this one' : ''}</small>
            <b>{d.value}</b>
          </div>
        ))}
      </div>
      <ul className="reasons">{issue.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
      <button className="btn btn-outline" onClick={() => setOpen(!open)}>{open ? 'Hide' : 'How to fix this'}</button>
      {open && (
        <div className="fix">
          <h3>{fix.action}</h3>
          <dl>
            <dt>Form</dt><dd>{fix.form}</dd>
            <dt>Where</dt><dd>{fix.office}</dd>
            <dt>Bring</dt><dd>{fix.proof.join('; ')}</dd>
            <dt>Time</dt><dd>about {fix.days} days</dd>
          </dl>
          <div className="scam"><b>🛡️ Scam shield</b> Indicative official fee: <b>{fix.fee}</b>. If someone asks for more than about ₹{fix.scamAbove}, stop and ask for a receipt or check with the office directly.</div>
          {fix.note && <p className="muted">{fix.note}</p>}
          {fix.verify && <p className="muted small">Fees, forms and timelines vary by state. Confirm locally before paying.</p>}
          <button className="btn btn-primary" onClick={() => setShowLetter(!showLetter)}>{showLetter ? 'Hide letter' : `✍️ Generate letter for the ${docLabel(target?.type)}`}</button>
          {showLetter && <Letter issue={issue} member={member} household={household} />}
        </div>
      )}
    </div>
  );
}

export default function IssuesPage() {
  const { analysis, members, household, hasData } = useHousehold();
  const { issues, verify } = analysis;
  if (!hasData) return <div className="container"><EmptyState title="Nothing to check yet" cta="Set up your household" to="/household">Add your family and documents first, or load the demo family from the home page.</EmptyState></div>;
  const real = issues.filter((i) => !i.advisory);
  const adv = issues.filter((i) => i.advisory);
  const by = (arr) => members.map((m) => ({ m, list: arr.filter((i) => i.memberId === m.id) })).filter((g) => g.list.length);
  return (
    <div className="container">
      <h1 className="page-title">Document mismatches &amp; practical corrections</h1>
      <p className="page-subtitle">Compare records side by side, understand what the mismatch could affect, and get a clear correction path with the supporting documents to bring.</p>

      <div className="summary-banner banner-warning">
        <div className="summary-status"><span className="summary-icon">{real.length ? '⚠️' : '✅'}</span><span className="summary-label">{real.length ? `${real.length} issue${real.length > 1 ? 's' : ''} to fix` : 'No mismatches found'}</span></div>
        <div className="summary-counts">
          <div className="summary-count"><span className="count-num">{real.filter((i) => i.level === 'minor').length}</span><span className="count-label">Minor</span></div>
          <div className="summary-count"><span className="count-num">{real.filter((i) => i.level === 'major').length}</span><span className="count-label">Needs fix</span></div>
          <div className="summary-count"><span className="count-num">{real.filter((i) => i.level === 'conflict').length}</span><span className="count-label">Conflict</span></div>
          <div className="summary-count"><span className="count-num">{verify.length}</span><span className="count-label">Verify</span></div>
        </div>
      </div>

      {by(real).map(({ m, list }) => (
        <section key={m.id} style={{ marginTop: 20 }}>
          <h2 className="results-section-title">{m.name || m.relation}</h2>
          {list.map((i) => <IssueCard key={i.id} issue={i} member={m} household={household} />)}
        </section>
      ))}
      {real.length === 0 && <div className="card empty"><h2>🎉 All compared documents agree</h2><p>Keep adding documents; every new one is checked against the others.</p></div>}

      {adv.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h2 className="results-section-title">Could not be cross-checked</h2>
          {adv.map((i) => (<div key={i.id} className="card"><b>{i.memberName}: </b>{i.reasons.join(' ')} <span className="muted">({i.docs.map((d) => `${docLabel(d.type)}: ${d.value}`).join(' · ')})</span></div>))}
        </section>
      )}

      {verify.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h2 className="results-section-title">Human verify</h2>
          <div className="card">Low-confidence reads are never silently accepted. Please confirm these on the <Link to="/documents">Documents</Link> page:
            <ul className="reasons">{verify.map((v) => (<li key={v.docId + v.field}>{docLabel(v.type)} · {v.field}: "{v.value}" ({Math.round(v.confidence * 100)}% confidence)</li>))}</ul>
          </div>
        </section>
      )}
      <div className="upload-actions"><Link to="/schemes" className="btn btn-primary">See what you qualify for →</Link></div>
    </div>
  );
}
