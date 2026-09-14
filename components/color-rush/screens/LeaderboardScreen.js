'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronRight, Crown, Sparkles, Sun, Trophy } from 'lucide-react';
import ProfileDetail from '../modals/ProfileDetail';
import { Button, Eyebrow, StatusPill } from '../SharedUI';

export default function LeaderboardScreen({ profiles, loading, synced, error, selectedProfile, onSelect, onCloseProfile, onPlayAgain, onBack }) {
  const [view, setView] = useState('today');
  const cutoff = Date.now() - (24 * 60 * 60 * 1000);
  const todayProfiles = useMemo(() => profiles.map((profile) => {
    const history = (profile.history || []).filter((entry) => new Date(entry.playedAt || 0).getTime() >= cutoff);
    if (!history.length) return null;
    const topScore = Math.max(...history.map((entry) => Number(entry.score) || 0));
    return {
      ...profile,
      topScore,
      totalGames: history.length,
      averageAccuracy: Math.round(history.reduce((sum, entry) => sum + (Number(entry.accuracy) || 0), 0) / history.length),
      history,
    };
  }).filter(Boolean).sort((a, b) => b.topScore - a.topScore), [profiles, cutoff]);
  const visibleProfiles = view === 'today' ? todayProfiles : profiles;
  const rows = visibleProfiles.slice(0, 50).map((profile, index) => {
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
      <div className="leaderboard-header"><div><Eyebrow number="05">SCOREBOARD</Eyebrow><h2>{view === 'today' ? 'Last 24h ' : 'All-time '}<em>players.</em></h2><p className="section-copy">{view === 'today' ? 'Fresh runs from the last 24 hours.' : 'The arena’s highest scores, always.'}</p></div><StatusPill synced={synced} /></div>
      <div className="leaderboard-tabs" role="tablist" aria-label="Scoreboard range"><span className="liquid-tab-thumb" style={{ transform: view === 'today' ? 'translateX(0)' : 'translateX(100%)' }} /><button type="button" className={view === 'today' ? 'is-active' : ''} onClick={() => setView('today')} role="tab" aria-selected={view === 'today'}><Sun size={13} /> Last 24h</button><button type="button" className={view === 'all' ? 'is-active' : ''} onClick={() => setView('all')} role="tab" aria-selected={view === 'all'}><Trophy size={13} /> All time</button></div>
      {loading ? <div className="loading-state liquid-loading"><span className="loading-orb" /><span className="loading-sheen" /><div><strong>Syncing the arena</strong><small>Refreshing the latest scores…</small></div></div> : null}
      {error ? <div className="offline-note">Showing the local board while the arena reconnects.</div> : null}
      <ol className="leaderboard-list">
        {!loading && visibleProfiles.length === 0 ? <li className="empty-leaderboard"><Sparkles size={17} /> {view === 'today' ? 'No runs in the last 24 hours yet.' : 'No runs yet. Be the first name here.'}</li> : rows}
      </ol>
      <ProfileDetail profile={selectedProfile} onClose={onCloseProfile} />
      <div className="leaderboard-actions"><Button variant="secondary" onClick={onPlayAgain}>Play another round <ArrowRight size={16} /></Button><button className="quiet-button" type="button" onClick={onBack}><ArrowLeft size={14} /> Back</button></div>
    </section>
  );
}
