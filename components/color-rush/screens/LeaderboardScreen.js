'use client';
import { ArrowLeft, ArrowRight, ChevronRight, Crown, Sparkles, CalendarDays } from 'lucide-react';
import ProfileDetail from '../modals/ProfileDetail';
import { Button, Eyebrow, StatusPill } from '../SharedUI';
export default function LeaderboardScreen({ profiles, scores = [], dates = [], selectedDate, dateLabel, totalPlayed = 0, loading, synced, error, selectedProfile, onSelect, onDateChange, onCloseProfile, onPlayAgain, onBack }) {
  const rows = scores.map((score, index) => ({ ...score, rank: score.rank || index + 1 }));
  return (
    <section className="screen-card leaderboard-screen">
      <div className="leaderboard-header"><div><Eyebrow number="05">DAILY RANKINGS</Eyebrow><h2>Daily <em>scores.</em></h2><p className="section-copy">Fresh board every midnight, with every day saved.</p></div><StatusPill synced={synced} /></div>
      <div className="leaderboard-date-bar"><CalendarDays size={16} /><label htmlFor="leaderboard-date">View leaderboard</label><select id="leaderboard-date" value={selectedDate} onChange={(event) => onDateChange(event.target.value)}>{dates.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
      <p className="leaderboard-date-label">{dateLabel} <span>· {totalPlayed || scores.length} total played</span></p>
      {loading ? <div className="loading-state"><span className="loading-orb" /> syncing the arena…</div> : null}
      {error ? <div className="offline-note">Showing the local board while the arena reconnects.</div> : null}
      <ol className="leaderboard-list">
        {!loading && rows.length === 0 ? <li className="empty-leaderboard"><Sparkles size={17} /> No scores saved for this date yet.</li> : rows.map((score, index) => <li key={`${score.userId || score.username}-${score.id || index}`}><button type="button" className={`leaderboard-row ${index < 3 ? 'top-rank' : ''}`} onClick={() => onSelect?.({ playerName: score.username, topScore: score.score, totalGames: 1, averageAccuracy: score.accuracy, history: [score] })}><span className="rank-badge">{index === 0 ? <Crown size={15} /> : String(score.rank).padStart(2, '0')}</span><span className="rank-copy"><strong>{score.username || 'Anonymous'}</strong><small>{Number(score.accuracy || 0)}% accuracy · {score.hits || 0} hits</small></span><span className="leader-score">{Number(score.score || 0)}<small> pts</small><ChevronRight size={16} /></span></button></li>)}
      </ol>
      <ProfileDetail profile={selectedProfile} onClose={onCloseProfile} />
      <div className="leaderboard-actions"><Button variant="secondary" onClick={onPlayAgain}>Play another round <ArrowRight size={16} /></Button><button className="quiet-button" type="button" onClick={onBack}><ArrowLeft size={14} /> Back</button></div>
    </section>
  );
}
