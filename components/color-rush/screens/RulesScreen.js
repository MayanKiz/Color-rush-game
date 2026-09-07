'use client';

import { ArrowRight, ChevronRight, Sparkles } from 'lucide-react';
import LeaderboardPreview from '../LeaderboardPreview';
import { Button, Eyebrow } from '../SharedUI';
import { GAME_DURATION, TOTAL_CIRCLES } from '../../../lib/color-rush/config';

export default function RulesScreen({ profiles, onEnterSetup, onViewLeaderboard, onSelectProfile }) {
  return (
    <section className="screen-card hero-screen rules-screen">
      <Eyebrow number="01">NEURAL SPEED TEST</Eyebrow>
      <div className="intro-row"><div><h1>Match the color.<br /><em>Beat the clock.</em></h1><p className="hero-copy">Find the target. Tap the match. Chase your streak.</p></div><div className="mini-spark"><Sparkles size={20} /><span>{GAME_DURATION}<br /><small>SEC</small></span></div></div>
      <div className="stat-strip"><div><strong>+5</strong><span>hit</span></div><div><strong>−3</strong><span>miss</span></div><div><strong>{TOTAL_CIRCLES}</strong><span>orbs</span></div></div>
      <LeaderboardPreview profiles={profiles} onViewAll={onViewLeaderboard} onSelect={onSelectProfile} />
      <Button onClick={onEnterSetup}>Enter the arena <ArrowRight size={17} /></Button>
      <p className="microcopy">Fast hands. Clear eyes.</p>
    </section>
  );
}
