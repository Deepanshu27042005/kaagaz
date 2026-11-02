import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useHousehold } from '../../context/HouseholdContext';

const primaryLinks = [
  { path: '/', label: 'Home & dashboard' },
  { path: '/documents', label: 'Documents & OCR' },
  { path: '/issues', label: 'Mismatches & fixes', badge: true },
  { path: '/schemes', label: 'Schemes & plan' },
  { path: '/operator', label: 'Operator desk & QR' },
];

const toolLinks = [
  { path: '/household', label: 'Household setup' },
  { path: '/plan', label: 'My application plan' },
  { path: '/dossier', label: 'Offline dossier' },
  { path: '/insights', label: 'District insights' },
  { path: '/studio', label: 'Rules Studio' },
  { path: '/benchmark', label: 'Matcher benchmark' },
  { path: '/channels', label: 'WhatsApp / IVR demo' },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { lang, setLang, analysis } = useHousehold();
  const [open, setOpen] = useState(false);
  const toggleLanguage = () => setLang(lang === 'en' ? 'hi' : 'en');

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-topline">
          <Link to="/" className="navbar-brand" onClick={() => setOpen(false)}>
            <span className="navbar-logo" aria-hidden="true">▤</span>
            <span><span className="navbar-title">KaagazSaathi</span><small>Indian household benefits-readiness assistant</small></span>
          </Link>
          <span className="navbar-privacy"><i aria-hidden="true">⌑</i> 100% client-side privacy · no cloud uploads</span>
          <button className="lang-toggle" onClick={toggleLanguage}>{lang === 'en' ? 'हिन्दी' : 'English'}</button>
          <button className="nav-toggle" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>☰</button>
        </div>
        <nav className={`navbar-steps ${open ? 'open' : ''}`} aria-label="Main navigation">
          {primaryLinks.map((item) => {
            const active = pathname === item.path || (item.path === '/schemes' && pathname === '/plan');
            return (
              <Link key={item.path} to={item.path} onClick={() => setOpen(false)} className={`navbar-step ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
                {item.label}{item.badge && analysis.issues.length > 0 && <span className="nav-badge">{analysis.issues.length}</span>}
              </Link>
            );
          })}
          <details className="nav-tools">
            <summary>More tools <span aria-hidden="true">⌄</span></summary>
            <div className="nav-tools-menu">
              {toolLinks.map((item) => <Link key={item.path} to={item.path} onClick={() => setOpen(false)}>{item.label}</Link>)}
            </div>
          </details>
        </nav>
      </div>
    </header>
  );
}
