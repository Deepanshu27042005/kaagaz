import React, { useEffect, useRef, useState } from 'react';
import { useHousehold } from '../context/HouseholdContext';
import { buildDossier, encodeDossier, decodeDossier } from '../engine/dossier';
import { schemeById } from '../data/schemes';
import { docLabel } from '../data/docTypes';
import { ScoreRing, inr } from '../components/common/bits';

const QKEY = 'kaagazsaathi.queue.v1';
const loadQ = () => { try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch { return []; } };

function CaseView({ d, onProcessed }) {
  const [sel, setSel] = useState(0);
  const head = d.m[0];
  const app = d.p[sel];
  const scheme = app && schemeById(app[0]);
  const person = app && (d.m.find((x) => x.i === app[1]) || head);
  const doc = (t) => person?.d.find((x) => x[0] === t) || head?.d.find((x) => x[0] === t);
  const aad = doc('aadhaar'), bank = doc('bank_passbook');
  const rows = person ? [
    ['Applicant name', aad?.[1] || person.n], ['Date of birth', aad?.[2] || bank?.[2] || ''], ['Age / sex', `${person.a} / ${person.g}`],
    ['Aadhaar (masked)', aad?.[3] || ''], ['Name on bank account', bank?.[1] || ''], ['Category', d.h.c], ['Annual income', inr(d.h.i)], ['Area', `${d.h.a}, ${d.h.d || ''} ${d.h.s || ''}`],
  ] : [];
  return (
    <div className="card">
      <div className="row-between"><h2 className="card-title">Case file · {head?.n}</h2><span className="muted small">{new Date(d.t).toLocaleString()}</span></div>
      <p className="muted">{d.m.length} member(s) · {d.p.length} application(s) · {d.x} known mismatch(es)</p>
      <div className="op-apps">
        {d.p.map((a, i) => { const s = schemeById(a[0]); return (
          <button key={i} className={`op-app ${sel === i ? 'on' : ''}`} onClick={() => setSel(i)}>
            <ScoreRing value={a[2]} size={52} /><span><b>{s?.short || a[0]}</b><small>{d.m.find((x) => x.i === a[1])?.n || 'Household'}</small></span>
          </button>); })}
      </div>
      {app && (
        <>
          <h3>Pre-filled form: {scheme?.name}</h3>
          <table className="data-table"><tbody>{rows.map(([k, v]) => (<tr key={k}><td className="muted">{k}</td><td><b>{v || '—'}</b></td></tr>))}</tbody></table>
          <h3>Documents on file</h3>
          <div className="chips">{(scheme?.docs || []).map((t) => (<span key={t} className={`doc-chip ${doc(t) ? 'ok' : 'miss'}`}>{doc(t) ? '✓' : '✗'} {docLabel(t)}</span>))}</div>
          {app[3] ? <div className="card warn-card">⚠️ Still blocking: {app[3]}. Ask the citizen to fix these before submitting.</div> : <div className="card ok-card">✅ Ready to submit.</div>}
        </>
      )}
      <div className="upload-actions"><button className="btn btn-primary" onClick={onProcessed}>Mark processed and add to queue</button></div>
    </div>
  );
}

export default function OperatorPage() {
  const api = useHousehold();
  const [tab, setTab] = useState('scan');
  const [text, setText] = useState('');
  const [res, setRes] = useState(null);
  const [queue, setQueue] = useState(loadQ);
  const [cam, setCam] = useState(false);
  const [camErr, setCamErr] = useState('');
  const video = useRef(null);
  const canScan = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => { try { localStorage.setItem(QKEY, JSON.stringify(queue)); } catch { /* ignore */ } }, [queue]);
  useEffect(() => {
    if (!cam) return undefined;
    let stream, raf, stopped = false;
    (async () => {
      try {
        const det = new window.BarcodeDetector({ formats: ['qr_code'] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.current.srcObject = stream; await video.current.play();
        const tick = async () => {
          if (stopped) return;
          try { const r = await det.detect(video.current); if (r[0]) { setText(r[0].rawValue); setRes(decodeDossier(r[0].rawValue)); setCam(false); return; } } catch { /* keep scanning */ }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) { setCamErr('Camera not available: ' + e.message); setCam(false); }
    })();
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [cam]);

  const useMine = () => { const c = encodeDossier(buildDossier({ household: api.household, members: api.members, documents: api.documents, analysis: api.analysis })); setText(c); setRes(decodeDossier(c)); };
  const processed = () => { setQueue([{ id: Date.now(), at: Date.now(), d: res.data }, ...queue]); setRes(null); setText(''); setTab('queue'); };

  return (
    <div className="container">
      <h1 className="page-title">Operator desk (CSC / e-Mitra)</h1>
      <p className="page-subtitle">Scan a citizen's dossier, review a pre-filled case file, and keep a queue. Runs offline; nothing is sent anywhere.</p>
      <div className="seg big"><button className={tab === 'scan' ? 'on' : ''} onClick={() => setTab('scan')}>Scan</button><button className={tab === 'queue' ? 'on' : ''} onClick={() => setTab('queue')}>Queue ({queue.length})</button></div>

      {tab === 'scan' && (
        <>
          <section className="card">
            <div className="row-gap">
              {canScan ? <button className="btn btn-primary" onClick={() => { setCamErr(''); setCam(!cam); }}>{cam ? 'Stop camera' : '📷 Scan QR with camera'}</button> : <span className="muted">Camera QR scanning needs Chrome on Android or desktop. Paste the code instead.</span>}
              <button className="btn btn-outline" onClick={useMine}>Use my own dossier (demo)</button>
            </div>
            {cam && <video ref={video} className="cam" muted playsInline />}
            {camErr && <p className="error-msg">{camErr}</p>}
            <label className="doc-field">Or paste the dossier code<textarea rows="3" value={text} onChange={(e) => setText(e.target.value)} placeholder="KS1.…" /></label>
            <button className="btn btn-outline" onClick={() => setRes(decodeDossier(text))} disabled={!text.trim()}>Read code</button>
            {res && !res.ok && <p className="error-msg">{res.error}</p>}
          </section>
          {res?.ok && <CaseView d={res.data} onProcessed={processed} />}
        </>
      )}

      {tab === 'queue' && (
        <section className="card">
          {queue.length === 0 ? <p className="muted">No processed cases yet.</p> : (
            <table className="data-table"><thead><tr><th>Time</th><th>Head of household</th><th>Applications</th><th>Ready</th><th>Mismatches</th></tr></thead>
              <tbody>{queue.map((q) => (<tr key={q.id}><td>{new Date(q.at).toLocaleTimeString()}</td><td>{q.d.m[0]?.n}</td><td>{q.d.p.length}</td><td>{q.d.p.filter((a) => !a[3]).length}</td><td>{q.d.x}</td></tr>))}</tbody></table>
          )}
          {queue.length > 0 && <button className="btn btn-outline" onClick={() => setQueue([])}>Clear queue</button>}
        </section>
      )}
    </div>
  );
}
