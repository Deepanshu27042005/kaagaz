import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import { useOCR } from '../hooks/useOCR';
import { extractFields } from '../utils/ocr/fieldExtractor';
import { DOC_TYPES, docLabel } from '../data/docTypes';
import { docExpiry } from '../engine/applications';
import { EmptyState } from '../components/common/bits';

const LOW = 0.75;

function getManualFieldShape(docType) {
  const base = { name: '' };
  if (docType !== 'ration_card' && docType !== 'land_record' && docType !== 'residence_proof') base.dob = '';
  if (docType === 'aadhaar') base.idLast4 = '';
  if (docType === 'income_certificate') base.income = '';
  if (DOC_TYPES[docType]?.validityMonths) base.issueDate = '';
  return base;
}

function DocRow({ doc, api }) {
  const meta = DOC_TYPES[doc.type] || {};
  const exp = docExpiry(doc, new Date());
  const f = doc.fields || {};
  const conf = doc.confidence || {};
  const set = (k) => (e) => api.updateDocument(doc.id, { fields: { [k]: e.target.value }, confidence: { ...conf, [k]: 1 } });
  const field = (k, label, props = {}) => (
    <label className="doc-field">{label}
      <input value={f[k] ?? ''} onChange={set(k)} {...props} />
      {conf[k] !== undefined && conf[k] < LOW && <span className="badge badge-review" title={`Read with ${Math.round(conf[k] * 100)}% confidence`}>Human verify</span>}
    </label>
  );
  return (
    <div className="doc-row">
      <div className="doc-head">
        <b>{meta.icon} {docLabel(doc.type)}</b>
        {exp && (exp.expired ? <span className="badge badge-mismatch">Expired {-exp.daysLeft}d ago</span> : exp.soon ? <span className="badge badge-missing">Expires in {exp.daysLeft}d</span> : <span className="badge badge-matched">Valid</span>)}
        <button className="icon-btn" onClick={() => api.removeDocument(doc.id)} aria-label={`Remove ${docLabel(doc.type)}`}>✕</button>
      </div>
      <div className="doc-fields">
        {field('name', 'Name on document')}
        {doc.type !== 'ration_card' && doc.type !== 'land_record' && doc.type !== 'residence_proof' && field('dob', 'Date of birth', { placeholder: 'DD/MM/YYYY or year' })}
        {doc.type === 'aadhaar' && field('idLast4', 'Aadhaar last 4 digits', { maxLength: 4, inputMode: 'numeric' })}
        {doc.type === 'income_certificate' && field('income', 'Income stated (₹)', { type: 'number' })}
        {meta.validityMonths && field('issueDate', 'Issue date', { type: 'date' })}
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const api = useHousehold();
  const { members, documents, analysis, hasData } = api;
  const { runOCR, loading, progress, error } = useOCR();
  const head = members.find((m) => m.isHead) || members[0];
  const [memberId, setMemberId] = useState(head?.id);
  const [type, setType] = useState('aadhaar');
  const [file, setFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [note, setNote] = useState('');
  const [manualFields, setManualFields] = useState(() => getManualFieldShape('aadhaar'));
  const [showManualForm, setShowManualForm] = useState(false);

  useEffect(() => {
    setManualFields(getManualFieldShape(type));
    setShowManualForm(false);
  }, [type]);

  if (!hasData) return <div className="container"><EmptyState title="No household yet" cta="Set up your household" to="/household">Tell us about your family first, or load the demo family from the home page.</EmptyState></div>;

  const scope = DOC_TYPES[type]?.scope;
  const add = async () => {
    const owner = scope === 'household' ? head.id : memberId || head.id;
    let fields = {}, confidence = {}, source = 'manual';
    if (file) {
      if (!consent) { setNote('Please tick the consent box to scan on this device.'); return; }
      const text = await runOCR(file);
      const r = extractFields(text, type);
      if (!Object.keys(r.fields).length) {
        setShowManualForm(true);
        setNote(text.trim()
          ? 'Text was detected, but we could not confidently identify supported fields. You can type them in below.'
          : 'No readable text was detected in this file. Try a clearer image or type the details below.');
        return;
      }
      fields = r.fields; confidence = r.confidence; source = 'ocr';
      setNote(Object.keys(fields).length
        ? 'Fields read from the document. Please check them below, especially anything marked "Human verify".'
        : 'No readable text was detected in this file. Try a clearer image or type the details below.');
    } else {
      const typed = Object.fromEntries(Object.entries(manualFields).filter(([, value]) => value !== '' && value !== null && value !== undefined));
      if (!Object.keys(typed).length) {
        setNote('Please fill at least one field for this document, or upload a scan.');
        return;
      }
      fields = typed;
      setNote(`Added ${docLabel(type)}. Please review the filled details below.`);
    }
    api.addDocument({ memberId: owner, type, fields, confidence, source });
    setFile(null);
    setShowManualForm(false);
    setManualFields(getManualFieldShape(type));
  };

  const missing = analysis.apps.flatMap((a) => a.requirements.filter((r) => !r.present).map((r) => ({ type: r.type, who: r.scope === 'person' ? a.subject.name : 'Household', scheme: a.scheme.short })));
  const missingUniq = [...new Map(missing.map((m) => [`${m.type}|${m.who}`, m])).values()];

  return (
    <div className="container">
      <h1 className="page-title">Documents</h1>
      <p className="page-subtitle">Photograph, upload a PDF, or type each document. Reading happens on this device; only the extracted fields are kept, never the original document.</p>

      <section className="card">
        <h2 className="card-title">Add a document</h2>
        <div className="form-grid">
          <label>For<select value={scope === 'household' ? head.id : memberId} disabled={scope === 'household'} onChange={(e) => setMemberId(e.target.value)}>{members.map((m) => <option key={m.id} value={m.id}>{m.name || m.relation}</option>)}</select></label>
          <label>Type<select value={type} onChange={(e) => setType(e.target.value)}>{Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}{v.scope === 'household' ? ' (household)' : ''}</option>)}</select></label>
          <label>Photo or scan (optional)<input type="file" accept="image/*,.pdf,application/pdf" onChange={(e) => { setFile(e.target.files[0] || null); setShowManualForm(false); }} /></label>
        </div>
        <label className="consent-label"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>I consent to reading this document on this device. It is not uploaded; only the extracted fields are stored here, and Aadhaar is reduced to its last 4 digits.</span></label>
        <div className="upload-actions"><button className="btn btn-primary" onClick={add} disabled={loading}>{loading ? `Reading… ${progress}%` : file ? 'Scan and add' : 'Add manually'}</button></div>
        {(!file || showManualForm) && (
          <div className="doc-fields" style={{ marginTop: 16 }}>
            {(!DOC_TYPES[type]?.scope || DOC_TYPES[type].scope !== 'household') && (
              <label className="doc-field">Name on document
                <input value={manualFields.name ?? ''} onChange={(e) => setManualFields((v) => ({ ...v, name: e.target.value }))} placeholder="e.g. Deepanshu Kumar" />
              </label>
            )}
            {type !== 'ration_card' && type !== 'land_record' && type !== 'residence_proof' && (
              <label className="doc-field">Date of birth
                <input value={manualFields.dob ?? ''} onChange={(e) => setManualFields((v) => ({ ...v, dob: e.target.value }))} placeholder="DD/MM/YYYY or year" />
              </label>
            )}
            {type === 'aadhaar' && (
              <label className="doc-field">Aadhaar last 4 digits
                <input value={manualFields.idLast4 ?? ''} onChange={(e) => setManualFields((v) => ({ ...v, idLast4: e.target.value }))} maxLength={4} inputMode="numeric" placeholder="1234" />
              </label>
            )}
            {type === 'income_certificate' && (
              <label className="doc-field">Income stated (₹)
                <input type="number" value={manualFields.income ?? ''} onChange={(e) => setManualFields((v) => ({ ...v, income: e.target.value }))} placeholder="25000" />
              </label>
            )}
            {DOC_TYPES[type]?.validityMonths && (
              <label className="doc-field">Issue date
                <input type="date" value={manualFields.issueDate ?? ''} onChange={(e) => setManualFields((v) => ({ ...v, issueDate: e.target.value }))} />
              </label>
            )}
          </div>
        )}
        {error && <p className="error-msg">OCR problem: {error}. You can still type the details.</p>}
        {note && <p className="muted">{note}</p>}
      </section>

      {missingUniq.length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <h2 className="card-title">Still needed for schemes you match</h2>
          <div className="chips">{missingUniq.map((m) => (<span key={m.type + m.who} className="doc-chip">{docLabel(m.type)} · {m.who} <small>({m.scheme})</small></span>))}</div>
        </section>
      )}

      {members.map((m) => {
        const docs = documents.filter((d) => d.memberId === m.id);
        return (
          <section key={m.id} className="card" style={{ marginTop: 16 }}>
            <h2 className="card-title">{m.name || m.relation} <span className="muted">· {m.relation}, {m.age}</span></h2>
            {docs.length === 0 ? <p className="muted">No documents yet.</p> : docs.map((d) => <DocRow key={d.id} doc={d} api={api} />)}
          </section>
        );
      })}
      <div className="upload-actions"><Link to="/issues" className="btn btn-primary">Check for mismatches →</Link></div>
    </div>
  );
}
