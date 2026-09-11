'use client';

import { ArrowRight, X } from 'lucide-react';
import { Button, Eyebrow } from '../SharedUI';

export default function GuideModal({ onClose, onStart }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <div className="guide-modal">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close guide"><X size={17} /></button>
        <Eyebrow number="03">QUICK GUIDE</Eyebrow>
        <h2 id="guide-title">Know the move.<br /><em>Own the board.</em></h2>
        <div className="guide-visual"><img src="/how-to-play-guide.png" alt="A matching color orb guide" /></div>
        <div className="guide-steps"><div><b>01</b><span><strong>See the target</strong> at the top of the arena.</span></div><div><b>02</b><span>Tap the orb with the <strong>same color</strong>.</span></div><div><b>03</b><span>Correct <strong>+5</strong>, wrong orb <strong>−3</strong>.</span></div></div>
        <Button onClick={onStart}>Got it — start in 3s <ArrowRight size={16} /></Button>
      </div>
    </div>
  );
}
