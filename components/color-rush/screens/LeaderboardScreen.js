'use client';

import { ArrowLeft, ArrowRight, ChevronRight, Crown, Sparkles } from 'lucide-react';
import ProfileDetail from '../modals/ProfileDetail';
import { Button, Eyebrow, StatusPill } from '../SharedUI';

export default function LeaderboardScreen({ profiles, loading, synced, error, selectedProfile, onSelect, onCloseProfile, onPlayAgain, onBack }) {
  const rows = profiles.slice(0, 50).map((profile, index) => {
    const runs = Number(profile.totalGames || profile.history?.length || 1);
    return (
      <li key={`${profile.playerName}-${index}`}>
        <button type="button" className={`leaderboard-row ${index < 3 ? 'top-rank' : ''}`} onClick={() => onSelect(profile)}>
          <span className="rank-badge">{index === 0 ? <Crown size={15} /> : String(index + 1).padStart(2, '0')}</span>
          <span className="rank-copy"><strong>{profile.playerName || 'Anonymous'}</strong><small>{runs} {runs === 1 ? 'run' : 'runs'} · {Number(profile.averageAccuracy || 0)}% avg</small></span>
          <span className="leader-score">{Number(profile.topScore ?? profile.score ?? 0)}<small> pts</small><ChevronRight size={16} /></span>
        </button>
      </li>
    );
  });

  return (
    <section className="screen-card leaderboard-screen">
      <div className="leaderboard-header"><div><Eyebrow number="05">GLOBAL RANKINGS</Eyebrow><h2>Top <em>players.</em></h2><p className="section-copy">One clean board. Tap a player for details.</p></div><StatusPill synced={synced} /></div>
      {loading ? <div className="loading-state"><span className="loading-orb" /> syncing the arena…</div> : null}
      {error ? <div className="offline-note">Showing the local board while the arena reconnects.</div> : null}
      <ol className="leaderboard-list">
        {!loading && profiles.length === 0 ? <li className="empty-leaderboard"><Sparkles size={17} /> No runs yet. Be the first name here.</li> : rows}
      </ol>
      <ProfileDetail profile={selectedProfile} onClose={onCloseProfile} />
      <div className="leaderboard-actions"><Button variant="secondary" onClick={onPlayAgain}>Play another round <ArrowRight size={16} /></Button><button className="quiet-button" type="button" onClick={onBack}><ArrowLeft size={14} /> Back</button></div>
    </section>
  );
}
