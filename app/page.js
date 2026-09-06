'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Crown,
  ExternalLink,
  Flame,
  Instagram,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Trophy,
  X,
  Zap,
} from 'lucide-react';

const COLORS = [
  { name: 'Red', hex: '#ff668a' },
  { name: 'Blue', hex: '#5bd9ff' },
  { name: 'Purple', hex: '#b995ff' },
  { name: 'Green', hex: '#7de8b7' },
  { name: 'Yellow', hex: '#ffe28a' },
  { name: 'Orange', hex: '#ffad74' },
];

const GAME_DURATION = 30;
const TOTAL_CIRCLES = 25;
const POINTS_CORRECT = 5;
const POINTS_WRONG = 3;
const LEADERBOARD_CACHE_KEY = 'colorRushLeaderboardCache';
const LEADERBOARD_CACHE_AT_KEY = 'colorRushLeaderboardCacheAt';

const initialGame = {
  score: 0,
  timeLeft: GAME_DURATION,
  streak: 0,
  hits: 0,
  attempts: 0,
  round: 0,
  target: null,
  board: [],
  running: false,
  paused: false,
  submitted: false,
  feedback: 'Find the target.',
  delta: null,
};

function makeBoard() {
  const target = COLORS[Math.floor(Math.random() * COLORS.length)];
  const board = Array.from({ length: TOTAL_CIRCLES }, () => COLORS[Math.floor(Math.random() * COLORS.length)]);
  board[Math.floor(Math.random() * board.length)] = target;
  return { target, board };
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function localProfiles() {
  if (typeof window === 'undefined') return [];
  try {
    const entries = JSON.parse(window.localStorage.getItem('colorRushScores') || '[]');
    const groups = new Map();
    entries.forEach((entry) => {
      const key = entry.playerNameKey || normalizeName(entry.playerName) || 'anonymous';
      const group = groups.get(key) || {
        playerName: entry.playerName || 'Anonymous',
        topScore: -Infinity,
        totalGames: 0,
        averageAccuracy: 0,
        lastPlayed: entry.playedAt,
        history: [],
      };
      group.history.push({
        score: Number(entry.score) || 0,
        hits: Number(entry.hits) || 0,
        attempts: Number(entry.attempts) || 0,
        accuracy: Number(entry.accuracy) || 0,
        playedAt: entry.playedAt,
      });
      group.totalGames = group.history.length;
      group.topScore = Math.max(group.topScore, Number(entry.score) || 0);
      group.averageAccuracy = Math.round(group.history.reduce((sum, item) => sum + item.accuracy, 0) / group.totalGames);
      group.lastPlayed = new Date(entry.playedAt || 0) > new Date(group.lastPlayed || 0) ? entry.playedAt : group.lastPlayed;
      groups.set(key, group);
    });
    return [...groups.values()].sort((a, b) => b.topScore - a.topScore);
  } catch {
    return [];
  }
}

function readCachedProfiles() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(LEADERBOARD_CACHE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeCachedProfiles(profiles) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(profiles));
  window.localStorage.setItem(LEADERBOARD_CACHE_AT_KEY, String(Date.now()));
}

function formatDate(value) {
  try {
    return new Date(value || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'recently';
  }
}

function scorePayload(playerName, game) {
  const accuracy = game.attempts ? Math.round((game.hits / game.attempts) * 100) : 0;
  return {
    playerName: playerName.slice(0, 15),
    playerNameKey: normalizeName(playerName),
    score: Number(game.score) || 0,
    hits: game.hits,
    attempts: game.attempts,
    accuracy,
    playedAt: new Date().toISOString(),
  };
}

async function getHostedProfiles() {
  const response = await fetch('/api/leaderboard', { headers: { Accept: 'application/json' }, cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.ok) throw new Error(body.error || 'Leaderboard unavailable');
  return Array.isArray(body.profiles) ? body.profiles : Array.isArray(body.scores) ? body.scores : [];
}

async function postScore(payload) {
  try {
    const response = await fetch('/api/submit-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json().catch(() => ({}));
  } catch {
    return { ok: false };
  }
}

function playTone(correct) {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = correct ? 'sine' : 'sawtooth';
    oscillator.frequency.value = correct ? 620 : 160;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.13);
  } catch {
    // Sound is optional and can be blocked by the browser.
  }
  if (!correct && navigator.vibrate) navigator.vibrate([35, 35, 70]);
}

function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Eyebrow({ children, number }) {
  return (
    <div className="eyebrow">
      <span className="eyebrow-line" />
      {children}
      {number ? <span className="eyebrow-number">{number}</span> : null}
    </div>
  );
}

function BrandBar() {
  return (
    <header className="brand-bar">
      <div className="brand-lockup">
        <span className="brand-orb"><span /></span>
        <span>COLOR <strong>RUSH</strong></span>
      </div>
      <div className="brand-meta"><span className="live-dot" /> REFLEX ARENA <span className="version-chip">v2.0</span></div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <span>COLOR RUSH / 2026</span>
      <a href="https://instagram.com/rao.mynkk" target="_blank" rel="noreferrer">
        <Instagram size={13} strokeWidth={1.8} /> rao.mynkk <ExternalLink size={11} />
      </a>
    </footer>
  );
}

function StatusPill({ synced = false }) {
  return <span className={`status-pill ${synced ? 'is-synced' : ''}`}><span /> {synced ? 'SYNCED' : 'LOCAL CACHE'}</span>;
}

function LeaderboardPreview({ profiles, onViewAll, onSelect }) {
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

function FullscreenScreen({ onEnter, onContinue }) {
  return (
    <section className="screen-card hero-screen fullscreen-screen">
      <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
      <Eyebrow number="00">IMMERSIVE MODE</Eyebrow>
      <div className="hero-mark"><span /><span /><span /><span /><span /></div>
      <h1>Make room for<br /><em>your reflexes.</em></h1>
      <p className="hero-copy">A calmer canvas, cleaner timing, and a little more space to chase the next perfect hit.</p>
      <Button onClick={onEnter}>Open the arena <ArrowUpRight size={17} /></Button>
      <button className="quiet-button" type="button" onClick={onContinue}>Continue in window <ArrowRight size={14} /></button>
      <p className="microcopy"><Zap size={12} /> Fullscreen is optional. The rush is not.</p>
    </section>
  );
}

function RulesScreen({ profiles, onEnterSetup, onViewLeaderboard, onSelectProfile }) {
  return (
    <section className="screen-card hero-screen rules-screen">
      <Eyebrow number="01">NEURAL SPEED TEST</Eyebrow>
      <div className="intro-row"><div><h1>Match the color.<br /><em>Beat the clock.</em></h1><p className="hero-copy">Find the target, trust your eyes, and tap before the board shifts again.</p></div><div className="mini-spark"><Sparkles size={20} /><span>30<br /><small>SEC</small></span></div></div>
      <div className="stat-strip"><div><strong>+5</strong><span>correct hit</span></div><div><strong>−3</strong><span>wrong orb</span></div><div><strong>25</strong><span>orbs per round</span></div></div>
      <div className="how-row"><span className="step-number">01</span><span>See the target</span><ChevronRight /><span className="step-number">02</span><span>Tap the match</span><ChevronRight /><span className="step-number">03</span><span>Build your streak</span></div>
      <LeaderboardPreview profiles={profiles} onViewAll={onViewLeaderboard} onSelect={onSelectProfile} />
      <Button onClick={onEnterSetup}>Enter the arena <ArrowRight size={17} /></Button>
      <p className="microcopy">Fast hands. Clear eyes. No second chances.</p>
    </section>
  );
}

function SetupScreen({ playerName, setPlayerName, error, onBack, onStart }) {
  return (
    <section className="screen-card setup-screen">
      <Eyebrow number="02">PLAYER SETUP</Eyebrow>
      <h2>Ready when <em>you are.</em></h2>
      <p className="section-copy">Your best run gets a tiny place on the board. No account, no noise.</p>
      <label className="field-label" htmlFor="player-name">Display name</label>
      <input id="player-name" className={`name-input ${error ? 'has-error' : ''}`} value={playerName} onChange={(event) => setPlayerName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onStart(); }} maxLength={15} placeholder="e.g. rao.mynkk" autoComplete="nickname" autoFocus />
      {error ? <p className="error-text">Please enter 2–15 characters.</p> : <p className="input-hint">2–15 characters · shown on the global board</p>}
      <div className="setup-options"><div><span className="field-label">Round length</span><strong>30 seconds</strong></div><div><span className="field-label">Scoring</span><strong>+5 / −3</strong></div></div>
      <Button onClick={onStart}>Start challenge <ArrowRight size={17} /></Button>
      <button className="quiet-button" type="button" onClick={onBack}><ArrowLeft size={14} /> Back to rules</button>
    </section>
  );
}

function CountdownOverlay({ value }) {
  return <div className="countdown-overlay" aria-live="assertive"><span>GET READY</span><strong>{value}</strong><small>COLOR RUSH</small></div>;
}

function GameScreen({ game, onOrb, onPause, onBack, onQuit }) {
  const progress = Math.max(0, Math.min(100, (game.timeLeft / GAME_DURATION) * 100));
  return (
    <section className="game-screen">
      <div className="game-topline"><button className="back-button" type="button" onClick={onBack}><ArrowLeft size={15} /> Back</button><div className="target-lock"><span className="target-kicker">TARGET COLOR <i /></span><div className="target-name-line"><span className="target-swatch" style={{ backgroundColor: game.target?.hex, boxShadow: `0 0 24px ${game.target?.hex}88` }} /><strong style={{ color: game.target?.hex }}>{game.target?.name?.toUpperCase()}</strong></div><span className="target-note">match the orb</span></div><button className="icon-button" type="button" onClick={onPause} aria-label={game.paused ? 'Resume game' : 'Pause game'}>{game.paused ? <Play size={16} /> : <Pause size={16} />}</button></div>
      <div className="hud-grid"><div className="hud-card timer-card"><div className="hud-card-top"><span className="hud-label"><Clock3 size={12} /> TIME LEFT</span><strong>{game.timeLeft.toFixed(1)}</strong></div><div className="progress-track"><span className={game.timeLeft <= 8 ? 'urgent' : ''} style={{ width: `${progress}%` }} /></div></div><div className="hud-card"><span className="hud-label">SCORE</span><strong>{game.score}</strong>{game.delta ? <span className={`score-delta ${game.delta > 0 ? 'positive' : 'negative'}`}>{game.delta > 0 ? '+' : '−'}{Math.abs(game.delta)}</span> : null}</div><div className="hud-card"><span className="hud-label">STREAK</span><strong>{game.streak}</strong><span className="hud-subline"><Flame size={12} /> {game.streak >= 3 ? 'on fire' : 'build it'}</span></div></div>
      <div className="arena-wrap"><div className="arena-caption"><span>SELECT THE MATCHING ORB</span><span>ROUND {String(game.round).padStart(2, '0')}</span></div><div className="grid-board" aria-label="Color matching game board">{game.board.map((color, index) => <button key={`${game.round}-${index}`} className="color-orb" type="button" aria-label={`${color.name} orb`} style={{ '--orb-color': color.hex, '--delay': `${(index % 5) * 18}ms` }} onPointerDown={(event) => { event.preventDefault(); onOrb(color, event.currentTarget); }} />)}</div>{game.paused ? <div className="pause-overlay"><span className="pause-icon"><Pause size={17} /></span><strong>Take a breath.</strong><span>Your board is waiting.</span><Button onClick={() => onPause(false)}>Resume <Play size={15} /></Button></div> : null}</div>
      <div className="game-footer"><span aria-live="polite">{game.feedback}</span><button className="quiet-button danger" type="button" onClick={onQuit}>End round</button></div>
    </section>
  );
}

function ResultScreen({ result, profiles, onViewLeaderboard, onSelectProfile, onPlayAgain, onBack, onShare, shareFeedback }) {
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

function ProfileDetail({ profile, onClose }) {
  if (!profile) return null;
  const history = Array.isArray(profile.history) ? profile.history : [];
  return (
    <section className="profile-detail" aria-live="polite"><div className="profile-head"><div><span className="section-kicker">PLAYER PROFILE</span><h3>{profile.playerName || 'Anonymous'}</h3></div><button className="icon-button subtle" type="button" onClick={onClose} aria-label="Close profile"><X size={16} /></button></div><div className="profile-stats"><div><strong>{Number(profile.topScore || 0)}</strong><span>top score</span></div><div><strong>{Number(profile.totalGames || history.length || 0)}</strong><span>total games</span></div><div><strong>{Number(profile.averageAccuracy || 0)}%</strong><span>avg accuracy</span></div></div><ol className="history-list">{history.length ? history.map((run, index) => <li key={`${run.playedAt}-${index}`}><span><b>#{String(index + 1).padStart(2, '0')}</b><small>{formatDate(run.playedAt)}</small></span><strong>{Number(run.score || 0)} <small>pts</small></strong></li>) : <li className="history-empty">No history yet.</li>}</ol></section>
  );
}

function LeaderboardScreen({ profiles, loading, synced, error, selectedProfile, onSelect, onCloseProfile, onPlayAgain, onBack }) {
  const rows = profiles.slice(0, 50).map((profile, index) => {
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
      <div className="leaderboard-header"><div><Eyebrow number="05">GLOBAL RANKINGS</Eyebrow><h2>Top <em>players.</em></h2><p className="section-copy">One profile. Every run. A little proof that you showed up.</p></div><StatusPill synced={synced} /></div>
      {loading ? <div className="loading-state"><span className="loading-orb" /> syncing the arena…</div> : null}
      {error ? <div className="offline-note">Showing the local board while the arena reconnects.</div> : null}
      <ol className="leaderboard-list">
        {!loading && profiles.length === 0 ? <li className="empty-leaderboard"><Sparkles size={17} /> No runs yet. Be the first name here.</li> : rows}
      </ol>
      <ProfileDetail profile={selectedProfile} onClose={onCloseProfile} />
      <div className="leaderboard-actions"><Button variant="secondary" onClick={onPlayAgain}>Play another round <ArrowRight size={16} /></Button><button className="quiet-button" type="button" onClick={onBack}><ArrowLeft size={14} /> Back</button></div>
    </section>
  );
}

function GuideModal({ onClose, onStart }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="guide-title"><div className="guide-modal"><button className="modal-close" type="button" onClick={onClose} aria-label="Close guide"><X size={17} /></button><Eyebrow number="03">QUICK GUIDE</Eyebrow><h2 id="guide-title">Know the move.<br /><em>Own the board.</em></h2><div className="guide-visual"><img src="/how-to-play-guide.png" alt="A matching color orb guide" /></div><div className="guide-steps"><div><b>01</b><span><strong>See the target</strong> at the top of the arena.</span></div><div><b>02</b><span>Tap the orb with the <strong>same color</strong>.</span></div><div><b>03</b><span>Correct <strong>+5</strong>, wrong orb <strong>−3</strong>.</span></div></div><Button onClick={onStart}>Got it — start in 3s <ArrowRight size={16} /></Button></div></div>;
}

export default function ColorRush() {
  const [screen, setScreen] = useState('fullscreen');
  const [playerName, setPlayerName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [game, setGame] = useState(initialGame);
  const [result, setResult] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardSynced, setLeaderboardSynced] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState(false);
  const [leaderboardReturn, setLeaderboardReturn] = useState('rules');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [shareFeedback, setShareFeedback] = useState('');
  const gameRef = useRef(game);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => { gameRef.current = game; }, [game]);

  const loadLeaderboard = useCallback(async (force = false) => {
    const cached = readCachedProfiles();
    if (cached.length && !force) setProfiles(cached);
    setLeaderboardLoading(true);
    setLeaderboardError(false);
    try {
      const hosted = await getHostedProfiles();
      setProfiles(hosted);
      setLeaderboardSynced(true);
      writeCachedProfiles(hosted);
    } catch {
      const fallback = cached.length ? cached : localProfiles();
      setProfiles(fallback);
      setLeaderboardSynced(false);
      setLeaderboardError(true);
      if (fallback.length) writeCachedProfiles(fallback);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard(false);
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(countdownRef.current);
    };
  }, [loadLeaderboard]);

  useEffect(() => {
    if (screen !== 'game' || !game.running) return undefined;
    timerRef.current = window.setInterval(() => {
      setGame((current) => {
        if (!current.running || current.paused) return current;
        const nextTime = Math.max(0, Number((current.timeLeft - 0.1).toFixed(1)));
        if (nextTime <= 0) window.setTimeout(() => finishGame(), 0);
        return { ...current, timeLeft: nextTime, running: nextTime > 0 };
      });
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [screen, game.running]);

  useEffect(() => {
    const onKey = (event) => {
      if (screen === 'game' && (event.key.toLowerCase() === 'p' || event.key === 'Escape')) togglePause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const showRules = () => setScreen('rules');

  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen is optional.
    }
    showRules();
  };

  const startCountdown = () => {
    clearTimeout(countdownRef.current);
    const steps = ['3', '2', '1', 'GO'];
    let index = 0;
    setScreen('game');
    setCountdown(steps[index]);
    const tick = () => {
      index += 1;
      if (index >= steps.length) {
        countdownRef.current = window.setTimeout(() => { setCountdown(null); startGame(); }, 500);
        return;
      }
      setCountdown(steps[index]);
      countdownRef.current = window.setTimeout(tick, 700);
    };
    countdownRef.current = window.setTimeout(tick, 700);
  };

  const beginChallenge = () => {
    if (normalizeName(playerName).length < 2 || normalizeName(playerName).length > 15) {
      setNameError(true);
      return;
    }
    setNameError(false);
    if (window.localStorage.getItem('colorRushGuideSeen') !== '1') setGuideOpen(true);
    else startCountdown();
  };

  const startGame = () => {
    const { target, board } = makeBoard();
    setGame({ ...initialGame, target, board, round: 1, running: true });
    setShareFeedback('');
    setScreen('game');
  };

  const nextBoard = () => {
    const { target, board } = makeBoard();
    setGame((current) => ({ ...current, target, board, round: current.round + 1, delta: null }));
  };

  const handleOrb = (color, node) => {
    const current = gameRef.current;
    if (!current.running || current.paused || !current.target) return;
    const correct = color.name === current.target.name;
    if (node) node.classList.add(correct ? 'hit' : 'miss');
    const nextScore = Math.max(-999, current.score + (correct ? POINTS_CORRECT : -POINTS_WRONG));
    const nextStreak = correct ? current.streak + 1 : 0;
    setGame((value) => ({ ...value, score: nextScore, streak: nextStreak, hits: value.hits + (correct ? 1 : 0), attempts: value.attempts + 1, delta: correct ? POINTS_CORRECT : -POINTS_WRONG, feedback: correct ? (nextStreak >= 3 ? `Streak x${nextStreak} — keep going!` : 'Nice hit. Find the next one.') : 'Missed. Reset your focus.' }));
    playTone(correct);
    window.setTimeout(() => { if (gameRef.current.running) nextBoard(); }, 90);
  };

  const togglePause = (force) => setGame((current) => ({ ...current, paused: typeof force === 'boolean' ? force : !current.paused }));

  const finishGame = async () => {
    const current = gameRef.current;
    if (current.submitted) return;
    clearInterval(timerRef.current);
    const accuracy = current.attempts ? Math.round((current.hits / current.attempts) * 100) : 0;
    const previousBest = Number(window.localStorage.getItem('colorRushBest') || 0);
    const bestScore = Math.max(previousBest, current.score);
    window.localStorage.setItem('colorRushBest', String(bestScore));
    const payload = scorePayload(playerName, current);
    const nextResult = { score: current.score, hits: current.hits, accuracy, bestScore, isNewBest: current.score > previousBest };
    setGame((value) => ({ ...value, running: false, paused: false, submitted: true }));
    setResult(nextResult);
    setScreen('result');
    try {
      const localScores = JSON.parse(window.localStorage.getItem('colorRushScores') || '[]');
      localScores.push(payload);
      localScores.sort((a, b) => b.score - a.score);
      window.localStorage.setItem('colorRushScores', JSON.stringify(localScores.slice(0, 100)));
    } catch {
      // Local score persistence is best effort.
    }
    await postScore(payload);
    await loadLeaderboard(true);
  };

  const leaveGame = () => {
    clearTimeout(countdownRef.current);
    clearInterval(timerRef.current);
    setCountdown(null);
    setGame((current) => ({ ...current, running: false, paused: false }));
    setScreen('setup');
  };

  const openLeaderboard = (from) => {
    setLeaderboardReturn(from);
    setSelectedProfile(null);
    setScreen('leaderboard');
    loadLeaderboard(true);
  };

  const startFromSetup = () => beginChallenge();
  const playAgain = () => { setPlayerName((name) => name || ''); setScreen('setup'); window.setTimeout(() => document.getElementById('player-name')?.focus(), 50); };
  const shareResult = async () => {
    const message = `I scored ${result?.score || 0} points in Color Rush! Can you beat me?`;
    try { await navigator.clipboard.writeText(message); setShareFeedback('Result copied. Send it to your squad.'); } catch { setShareFeedback(message); }
  };

  return (
    <main className="app-shell">
      <BrandBar />
      <div className="content-stage">
        {screen === 'fullscreen' ? <FullscreenScreen onEnter={enterFullscreen} onContinue={showRules} /> : null}
        {screen === 'rules' ? <RulesScreen profiles={profiles} onEnterSetup={() => { setScreen('setup'); window.setTimeout(() => document.getElementById('player-name')?.focus(), 50); }} onViewLeaderboard={() => openLeaderboard('rules')} onSelectProfile={(profile) => { openLeaderboard('rules'); setSelectedProfile(profile); }} /> : null}
        {screen === 'setup' ? <SetupScreen playerName={playerName} setPlayerName={setPlayerName} error={nameError} onBack={showRules} onStart={startFromSetup} /> : null}
        {screen === 'game' ? <GameScreen game={game} onOrb={handleOrb} onPause={togglePause} onBack={leaveGame} onQuit={finishGame} /> : null}
        {screen === 'result' && result ? <ResultScreen result={result} profiles={profiles} onViewLeaderboard={() => openLeaderboard('result')} onSelectProfile={(profile) => { openLeaderboard('result'); setSelectedProfile(profile); }} onPlayAgain={playAgain} onBack={() => setScreen('setup')} onShare={shareResult} shareFeedback={shareFeedback} /> : null}
        {screen === 'leaderboard' ? <LeaderboardScreen profiles={profiles} loading={leaderboardLoading} synced={leaderboardSynced} error={leaderboardError} selectedProfile={selectedProfile} onSelect={setSelectedProfile} onCloseProfile={() => setSelectedProfile(null)} onPlayAgain={playAgain} onBack={() => { setSelectedProfile(null); setScreen(leaderboardReturn); }} /> : null}
      </div>
      <Footer />
      {guideOpen ? <GuideModal onClose={() => { setGuideOpen(false); setScreen('setup'); }} onStart={() => { window.localStorage.setItem('colorRushGuideSeen', '1'); setGuideOpen(false); startCountdown(); }} /> : null}
      {countdown ? <CountdownOverlay value={countdown} /> : null}
    </main>
  );
}
