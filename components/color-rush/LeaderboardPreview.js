'use client';

import { ArrowRight, ChevronRight, Crown, Sparkles, Trophy } from 'lucide-react';

export default function LeaderboardPreview({ profiles, onViewAll, onSelect }) {
  const top = profiles[0];
  return (
    <section className="leaderboard-preview" aria-label="Leaderboard preview">
      <div className="preview-heading">
        <div><span className="section-kicker"><Trophy size={13} /> LEADERBOARD</span><span className="preview-note">top player right now</span></div>
        <button className="text-link" type="button" onClick={onViewAll}>View all <ArrowRight size={14} /></button>
      </div>
      {top ? (
        <button className="preview-row" type="button" onClick={() => onSelect?.(top)}>
          <span className="preview-rank"><Crown size={15} /> 01</span>
          <span className="preview-player"><strong>{top.playerName || 'Anonymous'}</strong><small>{Number(top.totalGames || top.history?.length || 1)} {Number(top.totalGames || top.history?.length || 1) === 1 ? 'run' : 'runs'} · {Number(top.averageAccuracy || 0)}% avg</small></span>
          <span className="preview-score">{Number(top.topScore ?? top.score ?? 0)}<small> pts</small><ChevronRight size={16} /></span>
        </button>
      ) : (
        <div className="preview-empty"><Sparkles size={15} /> Your name could be up here.</div>
      )}
    </section>
  );
}
