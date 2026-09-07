'use client';

import { ExternalLink, Instagram } from 'lucide-react';

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Eyebrow({ children, number }) {
  return (
    <div className="eyebrow">
      <span className="eyebrow-line" />
      {children}
      {number ? <span className="eyebrow-number">{number}</span> : null}
    </div>
  );
}

export function BrandBar() {
  return (
    <header className="brand-bar">
      <div className="brand-lockup">
        <span className="brand-orb"><span /></span>
        <span>COLOR <strong>RUSH</strong></span>
      </div>
      <div className="brand-meta"><span className="live-dot" /> REFLEX ARENA <span className="version-chip">v2.0</span></div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <span>COLOR RUSH / 2026</span>
      <a href="https://instagram.com/rao.mynkk" target="_blank" rel="noreferrer">
        <Instagram size={13} strokeWidth={1.8} /> rao.mynkk <ExternalLink size={11} />
      </a>
    </footer>
  );
}

export function StatusPill({ synced = false }) {
  return <span className={`status-pill ${synced ? 'is-synced' : ''}`}><span /> {synced ? 'SYNCED' : 'LOCAL CACHE'}</span>;
}
