'use client';

import { ArrowLeft, Clock3, Flame, Pause, Play } from 'lucide-react';
import { Button, Eyebrow } from '../SharedUI';
import { GAME_DURATION } from '../../../lib/color-rush/config';

export default function GameScreen({ game, playerName, onOrb, onPause, onBack, onQuit, onStart }) {
  const progress = Math.max(0, Math.min(100, (game.timeLeft / GAME_DURATION) * 100));

  if (!game.running && !game.target) {
    return (
      <section className="screen-card game-lobby">
        <Eyebrow number="03">ROUND READY</Eyebrow>
        <div className="lobby-layout"><div><h2>Ready to<br /><em>rush?</em></h2><p className="section-copy">The board is set. Start when your eyes are ready.</p></div><div className="lobby-orb-cluster"><span /><span /><span /><span /><span /></div></div>
        <div className="lobby-meta"><span><strong>30s</strong> round</span><span><strong>+5</strong> correct</span><span><strong>−3</strong> miss</span></div>
        <Button onClick={onStart}>Start round <Play size={17} /></Button>
        <button className="quiet-button" type="button" onClick={onBack}><ArrowLeft size={14} /> Back to setup</button>
      </section>
    );
  }

  return (
    <section className="game-screen">
      <div className="game-topline"><div className="game-context"><button className="back-button" type="button" onClick={onBack}><ArrowLeft size={15} /> Back</button><span className="player-chip"><span /> {playerName || 'Player'}</span></div><div className="target-lock"><span className="target-kicker">TARGET COLOR <i /></span><div className="target-name-line"><span className="target-swatch" style={{ backgroundColor: game.target?.hex, boxShadow: `0 0 24px ${game.target?.hex}88` }} /><strong style={{ color: game.target?.hex }}>{game.target?.name?.toUpperCase()}</strong></div><span className="target-note">match the orb</span></div><button className="icon-button" type="button" onClick={onPause} aria-label={game.paused ? 'Resume game' : 'Pause game'}>{game.paused ? <Play size={16} /> : <Pause size={16} />}</button></div>
      <div className="hud-grid"><div className="hud-card timer-card"><div className="hud-card-top"><span className="hud-label"><Clock3 size={12} /> TIME LEFT</span><strong>{game.timeLeft.toFixed(1)}</strong></div><div className="progress-track"><span className={game.timeLeft <= 8 ? 'urgent' : ''} style={{ width: `${progress}%` }} /></div></div><div className="hud-card"><span className="hud-label">SCORE</span><strong>{game.score}</strong>{game.delta ? <span className={`score-delta ${game.delta > 0 ? 'positive' : 'negative'}`}>{game.delta > 0 ? '+' : '−'}{Math.abs(game.delta)}</span> : null}</div><div className="hud-card"><span className="hud-label">STREAK</span><strong>{game.streak}</strong><span className="hud-subline"><Flame size={12} /> {game.streak >= 3 ? 'on fire' : 'build it'}</span></div></div>
      <div className="arena-wrap"><div className="arena-caption"><span>SELECT THE MATCHING ORB</span><span>ROUND {String(game.round).padStart(2, '0')}</span></div><div className="grid-board" aria-label="Color matching game board">{game.board.map((color, index) => <button key={`${game.round}-${index}`} className="color-orb" type="button" aria-label={`${color.name} orb`} style={{ '--orb-color': color.hex, '--delay': `${(index % 4) * 18}ms` }} onPointerDown={(event) => { event.preventDefault(); onOrb(color, event.currentTarget); }} />)}</div>{game.paused ? <div className="pause-overlay"><span className="pause-icon"><Pause size={17} /></span><strong>Take a breath.</strong><span>Your board is waiting.</span><Button onClick={() => onPause(false)}>Resume <Play size={15} /></Button></div> : null}</div>
      <div className="game-footer"><span aria-live="polite">{game.feedback}</span><button className="quiet-button danger" type="button" onClick={onQuit}>End round</button></div>
    </section>
  );
}
