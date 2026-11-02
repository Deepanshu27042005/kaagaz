import React from 'react';
import { Link } from 'react-router-dom';

export const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');

export function ScoreRing({ value, size = 72, label }) {
  const r = (size - 10) / 2, c = 2 * Math.PI * r, off = c * (1 - value / 100);
  const color = value >= 85 ? 'var(--color-success)' : value >= 55 ? 'var(--color-warning)' : 'var(--color-error)';
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${value}% ready`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth="7" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="ring-text"><b>{value}%</b>{label && <small>{label}</small>}</div>
    </div>
  );
}

export function Level({ level }) {
  const map = { ok: ['matched', 'Match'], minor: ['review', 'Minor'], major: ['missing', 'Needs fix'], conflict: ['mismatch', 'Conflict'] };
  const [cls, text] = map[level] || map.minor;
  return <span className={`badge badge-${cls}`}>{text}</span>;
}

export function EmptyState({ title, children, cta, to }) {
  return (
    <div className="card empty">
      <h2>{title}</h2>
      <p>{children}</p>
      {cta && <Link to={to} className="btn btn-primary">{cta}</Link>}
    </div>
  );
}

export function Bar({ pct, color = 'var(--color-primary)', label, value }) {
  return (
    <div className="bar-row">
      <div className="bar-label">{label}</div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(2, pct)}%`, background: color }} /></div>
      <div className="bar-value">{value}</div>
    </div>
  );
}

export const StatusChip = ({ state }) => {
  const map = { ready: ['matched', 'Ready to apply'], blocked: ['missing', 'Fix first'], receiving: ['review', 'Already receiving'] };
  const [cls, t] = map[state] || ['review', state];
  return <span className={`badge badge-${cls}`}>{t}</span>;
};

export const DemoBanner = () => (
  <div className="demo-banner">Demo rule set: thresholds and benefit amounts are placeholders until a human reviewer approves them in the Rules Studio.</div>
);
