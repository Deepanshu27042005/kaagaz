import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useHousehold } from '../context/HouseholdContext';
import { buildDossier, encodeDossier } from '../engine/dossier';
import { EmptyState } from '../components/common/bits';

export default function DossierPage() {
  const { household, members, documents, analysis, hasData } = useHousehold();
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => (hasData ? encodeDossier(buildDossier({ household, members, documents, analysis })) : ''), [hasData, household, members, documents, analysis]);
  if (!hasData) return <div className="container"><EmptyState title="No dossier yet" cta="Set up your household" to="/household">Add your household first.</EmptyState></div>;
  const tooBig = code.length > 2300;
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } };
  return (
    <div className="container">
      <h1 className="page-title">Offline dossier</h1>
      <p className="page-subtitle">Show this QR at a CSC / e-Mitra counter. The operator scans it and gets a pre-filled, organised case file, with nothing to re-type. No internet needed.</p>
      <div className="two-col">
        <section className="card qr-card">
          {tooBig ? <p className="error-msg">This household is too large for one QR ({code.length} characters). Copy the code instead.</p> : <QRCodeSVG value={code} size={260} level="L" includeMargin />}
          <div className="upload-actions">
            <button className="btn btn-primary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy dossier code'}</button>
            <Link className="btn btn-outline" to="/operator">Open operator desk →</Link>
          </div>
          <p className="muted small">{code.length} characters · integrity checksum included (detects damage, not tampering).</p>
        </section>
        <section className="card">
          <h2 className="card-title">What is inside</h2>
          <ul className="reasons">
            <li>Household profile: state, area, category, income, land</li>
            <li>{members.length} member(s) with names, ages and document fields</li>
            <li>Aadhaar shown only as XXXX XXXX + last 4 digits</li>
            <li>{analysis.apps.filter((a) => !a.alternativeTo).length} application(s) with readiness and what is still blocking each</li>
            <li>{analysis.issues.length} known mismatch(es), so the operator is not surprised</li>
          </ul>
          <p className="muted small">Document images are not included. Share it only with the operator you choose; anyone who scans it sees these fields.</p>
        </section>
      </div>
    </div>
  );
}
