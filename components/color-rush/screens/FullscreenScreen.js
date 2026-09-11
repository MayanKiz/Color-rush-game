'use client';

import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Button, Eyebrow } from '../SharedUI';

export default function FullscreenScreen({ onEnter, onContinue }) {
  return (
    <section className="screen-card hero-screen fullscreen-screen">
      <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
      <Eyebrow number="00">IMMERSIVE MODE</Eyebrow>
      <div className="hero-mark"><span /><span /><span /><span /><span /></div>
      <h1>Make room for<br /><em>your reflexes.</em></h1>
      <p className="hero-copy">A calmer canvas for one quick reflex test.</p>
      <Button onClick={onEnter}>Open the arena <ArrowUpRight size={17} /></Button>
      <button className="quiet-button" type="button" onClick={onContinue}>Continue in window <ArrowRight size={14} /></button>
    </section>
  );
}
