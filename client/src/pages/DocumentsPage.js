
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useHousehold } from '../context/HouseholdContext';
import { useOCR } from '../hooks/useOCR';
import { extractFields } from '../utils/ocr/fieldExtractor';
import { DOC_TYPES, docLabel } from '../data/docTypes';
import { docExpiry } from '../engine/applications';
import { EmptyState } from '../components/common/bits';

const LOW = 0.75;

// Reject OCR output that is clearly not a person's name.
function isValidName(value) {
  if (typeof value !== 'string') return false;

  const name = value.trim();

  if (name.length < 3 || name.length > 60) return false;

  if (!/^[A-Za-z\u0900-\u097F.\s]+$/.test(name)) {
    return false;
  }

  const words = name.split(/\s+/);

  if (words.length < 2) return false;

  const invalidWords =
    /\b(government|india|authority|unique|identification|address|male|female|dob|aadhaar)\b/i;

  const invalidHindi =
    /विशिष्ट|पहचान|सुरक्षित|सरकार|आधार|प्राधिकरण|जन्म|पता|पुरुष|महिला/;

  return !invalidWords.test(name) && !invalidHindi.test(name);
}

function getManualFieldShape(docType) {
  const base = { name: '' };

  if (
    docType !== 'ration_card' &&
    docType !== 'land_record' &&
    docType !== 'residence_proof'
  ) {
    base.dob = '';
  }

  if (docType === 'aadhaar') base.idLast4 = '';
  if (docType === 'income_certificate') base.income = '';

  if (DOC_TYPES[docType]?.validityMonths) {
    base.issueDate = '';
  }

  return base;
}

const documentKey = (document) => `${document.memberId}|${document.type}`;

function documentFields(document) {
  const fields = document.fields || {};
  return [
    ['name', 'Name on document', fields.name],
    ['dob', 'Date of birth', fields.dob],
    ['idLast4', 'Aadhaar last 4 digits', fields.idLast4 ? `•••• ${fields.idLast4}` : ''],
    ['income', 'Annual income', fields.income ? `₹${Number(fields.income).toLocaleString('en-IN')} / year` : ''],
    ['issueDate', 'Issue date', fields.issueDate],
  ].filter(([, , value]) => value !== '' && value !== null && value !== undefined);
}

function DocumentListCard({ document, member, selected, issueCount, onSelect, onRemove }) {
  const meta = DOC_TYPES[document.type] || {};
  const exp = docExpiry(document, new Date());
  const review = Object.values(document.confidence || {}).some((confidence) => confidence < LOW);
  const summary = document.fields?.name || (document.fields?.income ? `Income: ₹${Number(document.fields.income).toLocaleString('en-IN')}` : 'Details added');

  return (
    <article className={`scan-document-card ${selected ? 'selected' : ''}`}>
      <button className="scan-document-select" onClick={onSelect}>
        <span className="scan-document-icon">{meta.icon || '▤'}</span>
        <span className="scan-document-copy">
          <strong>{docLabel(document.type)}</strong>
          <small>{member?.name || member?.relation} · {summary}</small>
        </span>
        <span className={`scan-document-status ${issueCount || review ? 'attention' : 'verified'}`}>
          {issueCount ? `${issueCount} issue${issueCount === 1 ? '' : 's'}` : review ? 'Verify' : 'Added'}
        </span>
      </button>
      {exp && <span className={`scan-expiry ${exp.expired ? 'expired' : exp.soon ? 'soon' : ''}`}>{exp.expired ? `Expired ${-exp.daysLeft} days ago` : exp.soon ? `Expires in ${exp.daysLeft} days` : 'Validity recorded'}</span>}
      <button className="scan-document-remove" onClick={onRemove} aria-label={`Remove ${docLabel(document.type)}`}>Remove</button>
    </article>
  );
}

export default function DocumentsPage() {
  const api = useHousehold();

  const { members, documents, analysis, hasData } = api;

  const { runOCR, loading, progress, error } = useOCR();

  const head = members.find((member) => member.isHead) || members[0];

  const [memberId, setMemberId] = useState(head?.id);
  const [memberFilter, setMemberFilter] = useState('all');
  const [selectedDocumentKey, setSelectedDocumentKey] = useState('');
  const [type, setType] = useState('aadhaar');
  const [file, setFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [note, setNote] = useState('');

  const [manualFields, setManualFields] = useState(
    () => getManualFieldShape('aadhaar')
  );

  const [showManualForm, setShowManualForm] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    setManualFields(getManualFieldShape(type));
    setShowManualForm(false);
    setNote('');
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [type]);

  if (!hasData) {
    return (
      <div className="container">
        <EmptyState
          title="No household yet"
          cta="Set up your household"
          to="/household"
        >
          Tell us about your family first, or load the demo family
          from the home page.
        </EmptyState>
      </div>
    );
  }

  const scope = DOC_TYPES[type]?.scope;

  const add = async () => {
    const owner =
      scope === 'household'
        ? head.id
        : memberId || head.id;

    // Collect manually entered fields.
    const typed = Object.fromEntries(
      Object.entries(manualFields).filter(
        ([, value]) =>
          value !== '' &&
          value !== null &&
          value !== undefined
      )
    );

    let fields = {};
    let confidence = {};
    let source = 'manual';

    if (file) {
      if (!consent) {
        setNote(
          'Please tick the consent box to scan on this device.'
        );
        return;
      }

      const text = await runOCR(file);

      const result = extractFields(text, type);

      console.log('OCR RAW TEXT:', text);
      console.log('EXTRACTED FIELDS:', result);

      const extracted = { ...result.fields };
      const extractedConfidence = { ...result.confidence };

      // Do not accept an OCR name unless it looks like a name.
      if (
        extracted.name &&
        !isValidName(extracted.name)
      ) {
        delete extracted.name;
        delete extractedConfidence.name;
      }

      // Validate Aadhaar last four digits.
      if (
        extracted.idLast4 &&
        !/^\d{4}$/.test(String(extracted.idLast4))
      ) {
        delete extracted.idLast4;
        delete extractedConfidence.idLast4;
      }

      // Manually entered values take priority over OCR.
      fields = {
        ...extracted,
        ...typed,
      };

      confidence = {
        ...extractedConfidence,
      };

      // Manual fields are verified by the user.
      Object.keys(typed).forEach((key) => {
        confidence[key] = 1;
      });

      source = 'ocr';

      if (!Object.keys(fields).length) {
        setShowManualForm(true);

        setNote(
          text.trim()
            ? 'Text was detected, but we could not identify valid fields. Please enter the details manually.'
            : 'No readable text was detected. Try a clearer scan or enter the details manually.'
        );

        return;
      }

      setNote(
        'Document scanned. Please verify the extracted details before using them.'
      );
    } else {
      if (!Object.keys(typed).length) {
        setNote(
          'Please fill at least one field or upload a scan.'
        );

        return;
      }

      fields = typed;

      setNote(
        `Added ${docLabel(type)}. Please review the details below.`
      );
    }

    // Context handles updating an existing document of the same
    // type for the same household member.
    api.addDocument({
      memberId: owner,
      type,
      fields,
      confidence,
      source,
    });
    setSelectedDocumentKey(`${owner}|${type}`);

    setFile(null);
    setShowManualForm(false);
    setManualFields(getManualFieldShape(type));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const visibleDocuments = memberFilter === 'all'
    ? documents
    : documents.filter((document) => document.memberId === memberFilter);
  const sampleDocuments = documents.filter((document) => document.source === 'demo');
  const selectedDoc = visibleDocuments.find((document) => documentKey(document) === selectedDocumentKey)
    || visibleDocuments[0]
    || null;
  const selectedMember = selectedDoc && members.find((member) => member.id === selectedDoc.memberId);
  const selectedFields = selectedDoc ? documentFields(selectedDoc) : [];
  const selectedIssues = selectedDoc
    ? analysis.issues.filter((issue) => issue.docs.some((item) => item.id === selectedDoc.id))
    : [];
  const relatedDocuments = selectedDoc
    ? documents.filter((document) => document.memberId === selectedDoc.memberId && document.id !== selectedDoc.id)
    : [];
  const selectedExpiry = selectedDoc ? docExpiry(selectedDoc, new Date()) : null;

  const updateSelectedField = (field, value) => {
    api.updateDocument(selectedDoc.id, {
      fields: { [field]: value },
      confidence: { ...(selectedDoc.confidence || {}), [field]: 1 },
    });
  };

  const chooseMember = (nextMemberId) => {
    setMemberFilter(nextMemberId);
    const first = documents.find((document) => nextMemberId === 'all' || document.memberId === nextMemberId);
    setSelectedDocumentKey(first ? documentKey(first) : '');
  };

  const clearSampleDocuments = () => {
    if (!window.confirm('Remove only preloaded demo documents? Documents you added yourself and your household profile will be kept.')) return;
    sampleDocuments.forEach((document) => api.removeDocument(document.id));
    const firstUserDocument = documents.find((document) => document.source !== 'demo');
    setSelectedDocumentKey(firstUserDocument ? documentKey(firstUserDocument) : '');
    setNote('Preloaded demo documents removed. Your household profile and documents you added were kept.');
  };

  return (
    <div className="container documents-page">
      {sampleDocuments.length > 0 && <div className="sample-data-notice"><span><strong>Preloaded sample documents are showing.</strong> Remove them to see only documents you add. Your household profile and any documents you added will be kept.</span><button className="btn btn-outline" onClick={clearSampleDocuments}>Remove sample documents</button></div>}
      <section className="documents-hero">
        <div>
          <div className="eyebrow"><span className="eyebrow-mark">▣</span> 100% CLIENT-SIDE WEBASSEMBLY OCR <span className="privacy-inline">Zero server transmission</span></div>
          <h1 className="page-title">Household Documents &amp; On-Device Scan Center</h1>
          <p className="page-subtitle">Files are analyzed locally in your browser. Review extracted fields before saving; the original document is never uploaded.</p>
        </div>
        <div className="document-stats">
          <div><span className="metric-icon blue">▣</span><small>DOCUMENTS ADDED</small><strong>{documents.length}</strong></div>
          <div><span className={`metric-icon ${analysis.verify.length ? 'pending' : 'positive'}`}>{analysis.verify.length ? '!' : '✓'}</span><small>HUMAN REVIEW</small><strong className={analysis.verify.length ? 'metric-amber' : ''}>{analysis.verify.length} {analysis.verify.length === 1 ? 'field' : 'fields'}</strong></div>
        </div>
      </section>

      <section className="member-filter-bar" aria-label="Filter documents by household member">
        <button className={`member-filter-chip ${memberFilter === 'all' ? 'active' : ''}`} onClick={() => chooseMember('all')}>♧ All household <span>({documents.length})</span></button>
        {members.map((member) => {
          const count = documents.filter((document) => document.memberId === member.id).length;
          const issueCount = analysis.issues.filter((issue) => issue.memberId === member.id && !issue.advisory).length;
          return <button key={member.id} className={`member-filter-chip ${memberFilter === member.id ? 'active' : ''}`} onClick={() => chooseMember(member.id)}>{member.name || member.relation}{count > 0 && <span>{count}</span>}{issueCount > 0 && <i aria-label={`${issueCount} issues`} />}</button>;
        })}
        <Link className="member-filter-add" to="/household">＋ Add member</Link>
      </section>

      <section className="card document-upload-card">
        <div className="upload-card-heading"><span className="upload-symbol">▣</span><div><h2 className="card-title">Camera scan / drag &amp; drop document</h2><p>Choose an Aadhaar, ration card, income certificate, or another supported document. OCR runs locally.</p></div><span className="supported-files">PDF · PNG · JPG · up to 15 MB</span></div>
        <div className="document-upload-controls">
          <label className="upload-control-field">For
            <select value={scope === 'household' ? head.id : memberId} disabled={scope === 'household'} onChange={(event) => setMemberId(event.target.value)}>
              {members.map((member) => <option key={member.id} value={member.id}>{member.name || member.relation}</option>)}
            </select>
          </label>
          <label className="upload-control-field">Document type
            <select value={type} onChange={(event) => setType(event.target.value)}>
              {Object.entries(DOC_TYPES).map(([key, value]) => <option key={key} value={key}>{value.label}{value.scope === 'household' ? ' (household)' : ''}</option>)}
            </select>
          </label>
          <label className="upload-file-field"><span>{file ? file.name : 'Select a document to scan'}</span><input ref={fileInputRef} type="file" accept="image/*,.pdf,application/pdf" onChange={(event) => { setFile(event.target.files[0] || null); setShowManualForm(false); setNote(''); }} /></label>
          {file && <button className="btn btn-primary" onClick={add} disabled={loading}>{loading ? `Reading… ${progress}%` : 'Scan and add'}</button>}
        </div>
        <div className="upload-footer">
          <label className="consent-label"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I consent to local OCR. No original file is uploaded; Aadhaar is reduced to its last 4 digits.</span></label>
          {!file && <button className="text-action" onClick={() => setShowManualForm(!showManualForm)}>{showManualForm ? 'Cancel manual entry' : '＋ Enter details manually'}</button>}
        </div>
        {showManualForm && (
          <div className="manual-entry-panel">
            {scope !== 'household' && <label className="doc-field">Name on document<input value={manualFields.name ?? ''} onChange={(event) => setManualFields((previous) => ({ ...previous, name: event.target.value }))} placeholder="e.g. Krishna Agarwal" /></label>}
            {type !== 'ration_card' && type !== 'land_record' && type !== 'residence_proof' && <label className="doc-field">Date of birth<input value={manualFields.dob ?? ''} onChange={(event) => setManualFields((previous) => ({ ...previous, dob: event.target.value }))} placeholder="DD/MM/YYYY or year" /></label>}
            {type === 'aadhaar' && <label className="doc-field">Aadhaar last 4 digits<input value={manualFields.idLast4 ?? ''} onChange={(event) => setManualFields((previous) => ({ ...previous, idLast4: event.target.value }))} maxLength={4} inputMode="numeric" placeholder="1234" /></label>}
            {type === 'income_certificate' && <label className="doc-field">Income stated (₹)<input type="number" value={manualFields.income ?? ''} onChange={(event) => setManualFields((previous) => ({ ...previous, income: event.target.value }))} placeholder="25000" /></label>}
            {DOC_TYPES[type]?.validityMonths && <label className="doc-field">Issue date<input type="date" value={manualFields.issueDate ?? ''} onChange={(event) => setManualFields((previous) => ({ ...previous, issueDate: event.target.value }))} /></label>}
            <button className="btn btn-primary" onClick={add}>Add document</button>
          </div>
        )}
        {error && <p className="error-msg" role="alert">OCR problem: {error}. You can still enter the details manually.</p>}
        {note && <p className="upload-note" role="status">{note}</p>}
      </section>

      <div className="document-workspace">
        <aside className="document-inventory">
          <div className="inventory-heading"><div><span className="section-kicker">HOUSEHOLD RECORDS</span><h2>Registered documents <span>{visibleDocuments.length}</span></h2></div><button className="text-action" onClick={() => setSelectedDocumentKey(visibleDocuments[0] ? documentKey(visibleDocuments[0]) : '')}>↻ Re-verify list</button></div>
          {visibleDocuments.length ? visibleDocuments.map((document) => {
            const member = members.find((item) => item.id === document.memberId);
            const issueCount = analysis.issues.filter((issue) => !issue.advisory && issue.docs.some((item) => item.id === document.id)).length;
            return <DocumentListCard key={document.id} document={document} member={member} selected={selectedDoc?.id === document.id} issueCount={issueCount} onSelect={() => setSelectedDocumentKey(documentKey(document))} onRemove={() => { api.removeDocument(document.id); if (selectedDoc?.id === document.id) setSelectedDocumentKey(''); }} />;
          }) : <div className="inventory-empty"><span>▤</span><strong>No documents in this view</strong><p>Choose a family member above or add a scan.</p></div>}
        </aside>

        <section className="card document-verification-panel">
          {selectedDoc ? (
            <>
              <div className="verification-header">
                <div><span className="section-kicker">FIELD RESOLUTION</span><h2>{docLabel(selectedDoc.type)} · Field verification</h2><p>{selectedMember?.name || selectedMember?.relation} · Values below are stored locally, not the original document.</p></div>
                <div className="verification-header-actions"><span className={`scan-document-status ${selectedIssues.length || analysis.verify.some((field) => field.docId === selectedDoc.id) ? 'attention' : 'verified'}`}>{selectedIssues.length ? `${selectedIssues.length} mismatch${selectedIssues.length === 1 ? '' : 'es'}` : analysis.verify.some((field) => field.docId === selectedDoc.id) ? 'Needs review' : 'Review fields'}</span><button className="icon-btn" onClick={() => api.removeDocument(selectedDoc.id)} aria-label={`Remove ${docLabel(selectedDoc.type)}`}>✕</button></div>
              </div>

              <div className="document-field-preview">
                <div className="preview-toolbar"><span>FIELD SUMMARY · ORIGINAL SCAN NOT STORED</span><span>{selectedDoc.source === 'ocr' ? 'Read with browser OCR' : selectedDoc.source === 'demo' ? 'Fictional demo record' : 'Entered on this device'}</span></div>
                <div className="preview-paper">
                  <div className="preview-paper-heading"><span className="preview-emblem">▤</span><span><strong>{docLabel(selectedDoc.type)}</strong><small>Private household record · details kept on this device</small></span><span className="preview-id">{selectedDoc.fields?.idLast4 ? `•••• ${selectedDoc.fields.idLast4}` : 'FIELD SUMMARY'}</span></div>
                  {selectedFields.length ? <div className="preview-paper-fields">{selectedFields.slice(0, 4).map(([key, label, value]) => <div key={key}><small>{label}</small><strong>{value}</strong></div>)}</div> : <p className="preview-no-fields">No readable fields have been added to this record yet.</p>}
                  <div className="preview-paper-foot"><span>KaagazSaathi field summary</span><span>{selectedDoc.source === 'ocr' ? 'OCR extracted' : 'User-provided values'}</span></div>
                </div>
              </div>

              <div className="reconciliation-heading"><div><span className="section-kicker">REVIEW BEFORE USE</span><h3>Field-by-field reconciliation</h3></div><span>Check each value against another record when available</span></div>
              {selectedFields.length ? (
                <div className="reconciliation-list">
                  {selectedFields.map(([key, label, value]) => {
                    const confidence = selectedDoc.confidence?.[key];
                    const issue = selectedIssues.find((item) => item.field === key);
                    const issueValue = issue?.docs.find((item) => item.id !== selectedDoc.id)?.value;
                    const otherDocument = relatedDocuments.find((document) => document.fields?.[key]);
                    const comparison = issueValue || otherDocument?.fields?.[key];
                    const needsReview = (confidence !== undefined && confidence < LOW) || Boolean(issue);
                    return (
                      <article className={`reconciliation-row ${needsReview ? 'needs-review' : ''}`} key={key}>
                        <div className="reconciliation-row-heading"><strong>{label}</strong><span className={`confidence-pill ${needsReview ? 'low' : 'high'}`}>{confidence !== undefined ? `${Math.round(confidence * 100)}% confidence` : 'User entered'}{needsReview ? ' · Review' : ''}</span></div>
                        <label className="verified-field"><span>Value on this document</span><input value={key === 'idLast4' ? selectedDoc.fields?.[key] || '' : selectedDoc.fields?.[key] || ''} onChange={(event) => updateSelectedField(key, event.target.value)} aria-label={`${label} on ${docLabel(selectedDoc.type)}`} /></label>
                        <div className={`comparison-value ${issue ? 'comparison-warning' : ''}`}><span>{otherDocument ? docLabel(otherDocument.type) : 'Cross-check'}</span><strong>{comparison || 'No second record to compare yet'}</strong>{issue && <small>{issue.reasons[0]}</small>}</div>
                      </article>
                    );
                  })}
                </div>
              ) : <div className="inventory-empty compact"><strong>No extracted fields yet</strong><p>Choose a file to scan or enter details manually. The original scan is not retained.</p></div>}

              {selectedExpiry && <p className={`document-expiry-note ${selectedExpiry.expired ? 'expired' : selectedExpiry.soon ? 'soon' : ''}`}>◷ {selectedExpiry.expired ? `This certificate expired ${-selectedExpiry.daysLeft} days ago.` : selectedExpiry.soon ? `This certificate expires in ${selectedExpiry.daysLeft} days.` : 'Certificate validity is recorded for readiness checks.'}</p>}
              <div className="verification-actions"><button className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>↻ Replace / scan a clearer copy</button><Link to="/issues" className="btn btn-soft">Compare all documents →</Link><button className="btn btn-primary" onClick={() => { api.updateDocument(selectedDoc.id, { confidence: Object.fromEntries(selectedFields.map(([key]) => [key, 1])) }); setNote('Fields marked as reviewed. You can continue to mismatch checks.'); }}>✓ Mark fields reviewed</button></div>
              <div className="privacy-note">⌑ <span><strong>On-device privacy:</strong> Confirmations are saved in this browser. Original scans are not kept; official source documents are unchanged.</span></div>
            </>
          ) : (
            <div className="verification-empty"><span className="upload-symbol">▣</span><h2>Select a document to review</h2><p>Add a scan or choose a record from the household list to inspect extracted fields and compare them with other documents.</p><button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>Choose a document <span>→</span></button></div>
          )}
        </section>
      </div>

      <div className="upload-actions"><Link to="/issues" className="btn btn-primary">Check for mismatches →</Link></div>
    </div>
  );
}
