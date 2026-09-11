'use client';

import { X } from 'lucide-react';
import { formatDate } from '../../../lib/color-rush/client-utils';

export default function ProfileDetail({ profile, onClose }) {
  if (!profile) return null;
  const history = Array.isArray(profile.history) ? profile.history : [];

  return (
    <div className="profile-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <div className="profile-head"><div><span className="section-kicker">PLAYER PROFILE</span><h3 id="profile-title">{profile.playerName || 'Anonymous'}</h3></div><button className="icon-button subtle" type="button" onClick={onClose} aria-label="Close profile"><X size={16} /></button></div>
        <div className="profile-stats"><div><strong>{Number(profile.topScore || 0)}</strong><span>top score</span></div><div><strong>{Number(profile.totalGames || history.length || 0)}</strong><span>total games</span></div><div><strong>{Number(profile.averageAccuracy || 0)}%</strong><span>avg accuracy</span></div></div>
        <ol className="history-list">{history.length ? history.map((run, index) => <li key={`${run.playedAt}-${index}`}><span><b>#{String(index + 1).padStart(2, '0')}</b><small>{formatDate(run.playedAt)}</small></span><strong>{Number(run.score || 0)} <small>pts</small></strong></li>) : <li className="history-empty">No history yet.</li>}</ol>
      </section>
    </div>
  );
}
