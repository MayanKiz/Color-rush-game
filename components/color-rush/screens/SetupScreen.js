'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, Eyebrow } from '../SharedUI';

export default function SetupScreen({ playerName, setPlayerName, error, onBack, onStart }) {
  return (
    <section className="screen-card setup-screen">
      <Eyebrow number="02">PLAYER SETUP</Eyebrow>
      <h2>Ready when <em>you are.</em></h2>
      <p className="section-copy">Choose a name for the board.</p>
      <label className="field-label" htmlFor="player-name">Display name</label>
      <input id="player-name" className={`name-input ${error ? 'has-error' : ''}`} value={playerName} onChange={(event) => setPlayerName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onStart(); }} maxLength={15} placeholder="e.g. rao.mynkk" autoComplete="nickname" autoFocus />
      {error ? <p className="error-text">Please enter 2–15 characters.</p> : <p className="input-hint">2–15 characters · shown on the global board</p>}
      <div className="setup-options"><div><span className="field-label">Round length</span><strong>30 seconds</strong></div><div><span className="field-label">Scoring</span><strong>+5 / −3</strong></div></div>
      <Button onClick={onStart}>Start challenge <ArrowRight size={17} /></Button>
      <button className="quiet-button" type="button" onClick={onBack}><ArrowLeft size={14} /> Back to rules</button>
    </section>
  );
}
