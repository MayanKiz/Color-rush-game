'use client';

import { ArrowLeft, Check, RotateCcw, Share2 } from 'lucide-react';
import LeaderboardPreview from '../LeaderboardPreview';
import { Button, Eyebrow } from '../SharedUI';

export default function ResultScreen({ result, profiles, onViewLeaderboard, onSelectProfile, onPlayAgain, onBack, onShare, shareFeedback }) {
  return (
    <section className="screen-card result-screen">
      <Eyebrow number="04">ROUND COMPLETE</Eyebrow>
      <div className="result-badge"><Check size={13} /> {result.isNewBest ? 'NEW PERSONAL BEST' : 'NICE RUN'}</div>
      <h2>That was <em>fast.</em></h2>
      <div className="final-score"><span>FINAL SCORE</span><strong>{result.score}</strong><small>points</small></div>
      <div className="result-stats"><div><strong>{result.hits}</strong><span>hits</span></div><div><strong>{result.accuracy}%</strong><span>accuracy</span></div><div><strong>{result.bestScore}</strong><span>best score</span></div></div>
      <LeaderboardPreview profiles={profiles} onViewAll={onViewLeaderboard} onSelect={onSelectProfile} />
      <div className="result-actions"><Button onClick={onPlayAgain}>Play again <RotateCcw size={16} /></Button><Button variant="secondary" onClick={onShare}><Share2 size={15} /> Share result</Button></div>
      {shareFeedback ? <p className="share-feedback">{shareFeedback}</p> : null}
      <button className="quiet-button" type="button" onClick={onBack}><ArrowLeft size={14} /> Back to setup</button>
    </section>
  );
}
