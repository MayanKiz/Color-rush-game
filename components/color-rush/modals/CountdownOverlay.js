'use client';

export default function CountdownOverlay({ value }) {
  return <div className="countdown-overlay" aria-live="assertive"><span>GET READY</span><strong>{value}</strong><small>COLOR RUSH</small></div>;
}
