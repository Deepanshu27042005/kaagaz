import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useHousehold } from '../../context/HouseholdContext';
import { useT } from '../../i18n';

export default function Navbar() {
  const { pathname } = useLocation();
  const { lang, setLang, analysis, hasData } = useHousehold();
  const [open, setOpen] = useState(false);
  const t = useT(lang);
  const steps = [
    { path: '/household', label: t('household') },
    { path: '/documents', label: t('documents') },
    { path: '/issues', label: t('issues'), badge: hasData ? analysis.issues.length : 0 },
    { path: '/schemes', label: t('schemes') },
    { path: '/plan', label: t('plan') },
    { path: '/dossier', label: t('dossier') },
  ];
  const platform = [
    { path: '/operator', label: 'Operator desk' }, { path: '/insights', label: 'District insights' },
    { path: '/studio', label: 'Rules Studio' }, { path: '/benchmark', label: 'Benchmark' }, { path: '/channels', label: 'WhatsApp / IVR' },
  ];
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" onClick={() => setOpen(false)}>
          <span className="navbar-logo">📄</span><span className="navbar-title">KaagazSaathi</span>
        </Link>
        <button className="nav-toggle" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>☰</button>
        <nav className={`navbar-steps ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
          {steps.map((s) => (
            <Link key={s.path} to={s.path} className={`navbar-step ${pathname === s.path ? 'active' : ''}`}>
              {s.label}{s.badge > 0 && <span className="nav-badge">{s.badge}</span>}
            </Link>
          ))}
          <span className="nav-sep" />
          {platform.map((s) => (
            <Link key={s.path} to={s.path} className={`navbar-step platform ${pathname === s.path ? 'active' : ''}`}>{s.label}</Link>
          ))}
          <button className="lang-toggle" onClick={(e) => { e.stopPropagation(); setLang(lang === 'en' ? 'hi' : 'en'); }}>{lang === 'en' ? 'हिन्दी' : 'English'}</button>
        </nav>
      </div>
    </header>
  );
}
