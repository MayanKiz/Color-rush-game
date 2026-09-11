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
        <div className="lobby-meta"><span><strong>{GAME_DURATION}s</strong> round</span><span><strong>+5</strong> correct</span><span><strong>−3</strong> miss</span></div>
        <Button onClick={onStart}>Start round <Play size={17} /></Button>
        <button className="quiet-button" type="button" onClick={onBack}><ArrowLeft size={14} /> Back to setup</button>
      </section>
    );
  }

  const targetColor = game.target?.hex || '#b995ff';
  const targetName = game.target?.name?.toUpperCase() || 'READY';

  return (
    <section className="game-screen">
      <div className="game-topline">
        <div className="game-context"><button className="back-button" type="button" onClick={onBack}><ArrowLeft size={15} /> Back</button><span className="player-chip"><span /> {playerName || 'Player'}</span></div>
        <div className="game-round-meta"><span className="round-chip">ROUND {String(game.round).padStart(2, '0')}</span><button className="icon-button" type="button" onClick={onPause} aria-label={game.paused ? 'Resume game' : 'Pause game'}>{game.paused ? <Play size={16} /> : <Pause size={16} />}</button></div>
      </div>

      <div className="landscape-game-layout">
        <aside className="target-panel" style={{ '--target-color': targetColor }} aria-label={`Target color ${targetName}`}>
          <div className="target-panel-label"><span>TARGET COLOR</span><i /></div>
          <div className="target-panel-orb" style={{ backgroundColor: targetColor, boxShadow: `0 0 46px ${targetColor}88, inset 0 3px 10px rgba(255,255,255,.55), inset 0 -14px 20px rgba(0,0,0,.18)` }} />
          <div className="target-panel-copy"><strong style={{ color: targetColor }}>{targetName}</strong><span>match this color</span></div>
          <div className="target-panel-foot"><span>FIND ONE MATCH</span><b /></div>
        </aside>

        <div className="game-play-area">
          <div className="hud-grid"><div className="hud-card timer-card"><div className="hud-card-top"><span className="hud-label"><Clock3 size={12} /> TIME LEFT</span><strong>{game.timeLeft.toFixed(1)}</strong></div><div className="progress-track"><span className={game.timeLeft <= 8 ? 'urgent' : ''} style={{ width: `${progress}%` }} /></div></div><div className="hud-card"><span className="hud-label">SCORE</span><strong>{game.score}</strong>{game.delta ? <span className={`score-delta ${game.delta > 0 ? 'positive' : 'negative'}`}>{game.delta > 0 ? '+' : '−'}{Math.abs(game.delta)}</span> : null}</div><div className="hud-card"><span className="hud-label">STREAK</span><strong>{game.streak}</strong><span className="hud-subline"><Flame size={12} /> {game.streak >= 3 ? 'on fire' : 'build it'}</span></div></div>

          <div className="arena-wrap"><div className="arena-caption"><span>SELECT THE MATCHING ORB</span><span>ROUND {String(game.round).padStart(2, '0')}</span></div><div className="grid-board" aria-label="Color matching game board">{game.board.map((color, index) => <button key={`${game.round}-${index}`} className="color-orb" type="button" aria-label={`${color.name} orb`} style={{ '--orb-color': color.hex, '--delay': `${(index % 4) * 18}ms` }} onPointerDown={(event) => { event.preventDefault(); onOrb(color, event.currentTarget); }} />)}</div>{game.paused ? <div className="pause-overlay"><span className="pause-icon"><Pause size={17} /></span><strong>Take a breath.</strong><span>Your board is waiting.</span><Button onClick={() => onPause(false)}>Resume <Play size={15} /></Button></div> : null}</div>

          <div className="game-footer"><span aria-live="polite">{game.feedback}</span><button className="quiet-button danger" type="button" onClick={onQuit}>End round</button></div>
        </div>
      </div>
    </section>
  );
}
