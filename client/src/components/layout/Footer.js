import React from 'react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <p><strong>KaagazSaathi</strong> — we stop benefit claims from failing before the citizen reaches the counter.</p>
        <p className="footer-disclaimer">
          KaagazSaathi checks paperwork consistency and rule-based eligibility. It does not guarantee approval; the issuing office decides.
          AI is used for reading documents and matching names. It never decides eligibility.
        </p>
        <p className="footer-team">Build for Bharat 2026 · KIET Deemed to be University</p>
      </div>
    </footer>
  );
}
