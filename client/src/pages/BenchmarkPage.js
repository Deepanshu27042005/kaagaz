import React, { useMemo, useState } from 'react';
import bench from '../data/benchmark.json';
import { compareNames, levenshteinSim } from '../engine/names';
import { compareDates } from '../engine/dates';
import { Level } from '../components/common/bits';

function metrics(fn) {
  let tp = 0, fp = 0, fneg = 0, tn = 0;
  for (const p of bench.pairs) { const r = fn(p.a, p.b); if (r && p.same) tp++; else if (r && !p.same) fp++; else if (!r && p.same) fneg++; else tn++; }
  const precision = tp / (tp + fp || 1), recall = tp / (tp + fneg || 1);
  return { precision, recall, f1: (2 * precision * recall) / (precision + recall || 1), tp, fp, fn: fneg, tn };
}
const pct = (x) => `${(x * 100).toFixed(1)}%`;

export default function BenchmarkPage() {
  const rows = useMemo(() => [
    ['Exact string match', metrics((a, b) => a.trim().toLowerCase() === b.trim().toLowerCase())],
    ['Plain Levenshtein ≥ 0.85', metrics((a, b) => levenshteinSim(a, b) >= 0.85)],
    ['KaagazSaathi matcher', metrics((a, b) => compareNames(a, b).sameEntity)],
  ], []);
  const cats = useMemo(() => {
    const c = {};
    for (const p of bench.pairs) { const k = (c[p.cat] ||= { n: 0, ours: 0, lev: 0, same: p.same }); k.n++; if (compareNames(p.a, p.b).sameEntity === p.same) k.ours++; if ((levenshteinSim(p.a, p.b) >= 0.85) === p.same) k.lev++; }
    return Object.entries(c);
  }, []);
  const [a, setA] = useState('Mohd Rafiq'), [b, setB] = useState('Mohammad Rafique');
  const [d1, setD1] = useState('04/12/2005'), [d2, setD2] = useState('12/04/2005');
  const nr = compareNames(a, b), dr = compareDates(d1, d2);

  return (
    <div className="container">
      <h1 className="page-title">Benchmark</h1>
      <p className="page-subtitle">The mismatch detector is measured, not just claimed. {bench.count} labelled name pairs, compared against naive approaches. Computed live in your browser.</p>
      <section className="card">
        <h2 className="card-title">Try it</h2>
        <div className="form-grid"><label>Name A<input value={a} onChange={(e) => setA(e.target.value)} /></label><label>Name B<input value={b} onChange={(e) => setB(e.target.value)} /></label></div>
        <p><Level level={nr.level} /> <b>{nr.kind}</b> · same person: <b>{nr.sameEntity ? 'yes' : 'no'}</b> · score {nr.score}</p>
        <ul className="reasons">{nr.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
        <div className="form-grid"><label>Date A<input value={d1} onChange={(e) => setD1(e.target.value)} /></label><label>Date B<input value={d2} onChange={(e) => setD2(e.target.value)} /></label></div>
        <p><Level level={dr.level} /> <b>{dr.kind}</b></p><ul className="reasons">{dr.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
        <p className="muted small">Try: "राहुल कुमार शर्मा" vs "Rahul Kumar Sharma", or "Sunil Kumar" vs "Anil Kumar".</p>
      </section>

      <h2 className="results-section-title">Results: is it the same person?</h2>
      <section className="card"><div className="table-wrap"><table className="data-table">
        <thead><tr><th>Method</th><th>Precision</th><th>Recall</th><th>F1</th><th>False positives</th><th>Misses</th></tr></thead>
        <tbody>{rows.map(([n, m], i) => (<tr key={n} className={i === 2 ? 'hl' : ''}><td><b>{n}</b></td><td>{pct(m.precision)}</td><td>{pct(m.recall)}</td><td><b>{pct(m.f1)}</b></td><td>{m.fp}</td><td>{m.fn}</td></tr>))}</tbody>
      </table></div></section>

      <h2 className="results-section-title">By type of difference</h2>
      <section className="card"><div className="table-wrap"><table className="data-table">
        <thead><tr><th>Category</th><th>Truth</th><th>Pairs</th><th>Levenshtein correct</th><th>Ours correct</th></tr></thead>
        <tbody>{cats.map(([k, v]) => (<tr key={k}><td>{k.replace(/_/g, ' ')}</td><td>{v.same ? 'same person' : 'different'}</td><td>{v.n}</td><td>{v.lev}/{v.n}</td><td><b>{v.ours}/{v.n}</b></td></tr>))}</tbody>
      </table></div></section>

      <section className="card" style={{ marginTop: 16 }}>
        <h3>Honest limits</h3>
        <ul className="reasons">
          <li>Pairs are synthetic transformations of realistic Indian names (seeded generator in <code>src/tools</code>), not real government records. Next step: validate on real scans with consent.</li>
          <li>This held-out set was never used for tuning; a separate dev set was. Spelling-variant lists are hand-written, so independence is partial.</li>
          <li>Random single-letter typos in short names are the main weakness. Near-names such as Patel/Patil are flagged "needs fix" for a human, not silently accepted.</li>
        </ul>
      </section>
    </div>
  );
}
