import React from 'react';
import { Bar } from '../components/common/bits';

// SIMULATED illustration of what an anonymised block/district view would show. Not real data.
const CAUSES = [
  ['Name mismatch (Aadhaar vs bank)', 38, 'var(--color-error)'], ['Expired income certificate', 21, 'var(--color-warning)'], ['Missing caste certificate', 14, 'var(--color-primary)'],
  ['Date of birth format / swap', 11, '#7c3aed'], ['Wrong office or form', 9, '#0e7490'], ['Other', 7, '#64748b'],
];
const BLOCKS = [['Block A', 412, 31], ['Block B', 366, 27], ['Block C', 298, 44], ['Block D', 254, 22], ['Block E', 187, 36]];

export default function InsightsPage() {
  let queue = [];
  try { queue = JSON.parse(localStorage.getItem('kaagazsaathi.queue.v1') || '[]'); } catch { /* none */ }
  const live = queue.reduce((s, q) => s + (q.d.x || 0), 0);
  return (
    <div className="container">
      <h1 className="page-title">District insights</h1>
      <div className="demo-banner">Simulated data for illustration. With citizen consent, only anonymised counts (never names or documents) would be aggregated to show administrators where applications fail.</div>
      <div className="two-col">
        <section className="card">
          <h2 className="card-title">Why applications were held back (share of cases)</h2>
          {CAUSES.map(([l, v, c]) => <Bar key={l} label={l} pct={v * 2} value={`${v}%`} color={c} />)}
          <p className="muted small">Insight: 38% of holds trace to one fixable cause, so a bank-KYC name-correction camp would remove more rejections than any outreach campaign.</p>
        </section>
        <section className="card">
          <h2 className="card-title">Cases screened by block</h2>
          <table className="data-table"><thead><tr><th>Block</th><th>Cases</th><th>Held back</th></tr></thead>
            <tbody>{BLOCKS.map(([b, n, p]) => (<tr key={b}><td>{b}</td><td>{n}</td><td><Bar pct={p * 2} value={`${p}%`} label="" color={p > 40 ? 'var(--color-error)' : 'var(--color-primary)'} /></td></tr>))}</tbody></table>
        </section>
      </div>
      <section className="card" style={{ marginTop: 16 }}>
        <h2 className="card-title">From this device's operator queue (real, local)</h2>
        <p>{queue.length} case(s) processed, {live} known mismatch(es) caught before submission.</p>
      </section>
    </div>
  );
}
