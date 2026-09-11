'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BrandBar, Footer } from '../components/color-rush/SharedUI';
import FullscreenScreen from '../components/color-rush/screens/FullscreenScreen';
import RulesScreen from '../components/color-rush/screens/RulesScreen';
import SetupScreen from '../components/color-rush/screens/SetupScreen';
import GameScreen from '../components/color-rush/screens/GameScreen';
import ResultScreen from '../components/color-rush/screens/ResultScreen';
import LeaderboardScreen from '../components/color-rush/screens/LeaderboardScreen';
import GuideModal from '../components/color-rush/modals/GuideModal';
import CountdownOverlay from '../components/color-rush/modals/CountdownOverlay';
import { initialGame, POINTS_CORRECT, POINTS_WRONG } from '../lib/color-rush/config';
import {
  getHostedProfiles,
  localProfiles,
  makeBoard,
  normalizeName,
  postScore,
  readCachedProfiles,
  scorePayload,
  writeCachedProfiles,
} from '../lib/color-rush/client-utils';

const CORRECT_AUDIO_FILES = Array.from({ length: 23 }, (_, index) => `/right/right${index + 1}.mp3`);
const WRONG_AUDIO_FILES = ['/wrong/wrong1.mp3', '/wrong/wromg2.mp3', '/wrong/wrong2.mp3'];

function playFallbackWrongFeedback() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 160;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.13);
  } catch {
    // Browser audio can be blocked; gameplay must continue.
  }
  if (navigator.vibrate) navigator.vibrate([35, 35, 70]);
}

function playRandomAudio(files, refs, lastRef, fallback) {
  if (typeof window === 'undefined' || !files.length) return;
  let index = Math.floor(Math.random() * files.length);
  if (files.length > 1) {
    while (index === lastRef.current) index = Math.floor(Math.random() * files.length);
  }
  lastRef.current = index;
  refs.current?.pause();
  const audio = new Audio(files[index]);
  audio.volume = 0.62;
  refs.current = audio;
  audio.addEventListener('ended', () => {
    if (refs.current === audio) refs.current = null;
  }, { once: true });
  audio.addEventListener('error', () => {
    if (refs.current === audio) refs.current = null;
    fallback?.();
  }, { once: true });
  void audio.play().catch(() => fallback?.());
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
  const correctAudioRef = useRef(null);
  const wrongAudioRef = useRef(null);
  const lastCorrectAudioRef = useRef(-1);
  const lastWrongAudioRef = useRef(-1);

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
      correctAudioRef.current?.pause();
      wrongAudioRef.current?.pause();
    };
  }, [loadLeaderboard]);

  const finishGame = useCallback(async () => {
    const current = gameRef.current;
    if (current.submitted || (!current.running && current.timeLeft > 0)) return;
    clearInterval(timerRef.current);
    const accuracy = current.attempts ? Math.round((current.hits / current.attempts) * 100) : 0;
    const previousBest = Number(window.localStorage.getItem('colorRushBest') || 0);
    const bestScore = Math.max(previousBest, current.score);
    const payload = scorePayload(playerName, current);
    setGame((value) => ({ ...value, running: false, paused: false, submitted: true }));
    setResult({ score: current.score, hits: current.hits, accuracy, bestScore, isNewBest: current.score > previousBest });
    setScreen('result');
    window.localStorage.setItem('colorRushBest', String(bestScore));
    try {
      const localScores = JSON.parse(window.localStorage.getItem('colorRushScores') || '[]');
      localScores.push(payload);
      localScores.sort((a, b) => b.score - a.score);
      window.localStorage.setItem('colorRushScores', JSON.stringify(localScores.slice(0, 100)));
    } catch {
      // Local persistence is best effort.
    }
    await postScore(payload);
    await loadLeaderboard(true);
  }, [loadLeaderboard, playerName]);

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
  }, [finishGame, game.running, screen]);

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

  const startGame = useCallback(() => {
    const board = makeBoard();
    setGame({ ...initialGame, ...board, round: 1, running: true, feedback: 'Choose the orb matching the target.' });
    setShareFeedback('');
    setScreen('game');
  }, []);

  const startCountdown = useCallback(() => {
    clearTimeout(countdownRef.current);
    const steps = ['3', '2', '1', 'GO'];
    let index = 0;
    setGame(initialGame);
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
  }, [startGame]);

  const beginChallenge = () => {
    const cleanName = normalizeName(playerName);
    if (cleanName.length < 2 || cleanName.length > 15) {
      setNameError(true);
      return;
    }
    setNameError(false);
    if (window.localStorage.getItem('colorRushGuideSeen') !== '1') setGuideOpen(true);
    else startCountdown();
  };

  const nextBoard = () => {
    const board = makeBoard();
    setGame((current) => ({ ...current, ...board, round: current.round + 1, delta: null }));
  };

  const handleOrb = (color, node) => {
    const current = gameRef.current;
    if (!current.running || current.paused || !current.target) return;
    const correct = color.name === current.target.name;
    if (node) node.classList.add(correct ? 'hit' : 'miss');
    const nextScore = Math.max(-999, current.score + (correct ? POINTS_CORRECT : -POINTS_WRONG));
    const nextStreak = correct ? current.streak + 1 : 0;
    setGame((value) => ({ ...value, score: nextScore, streak: nextStreak, hits: value.hits + (correct ? 1 : 0), attempts: value.attempts + 1, delta: correct ? POINTS_CORRECT : -POINTS_WRONG, feedback: correct ? (nextStreak >= 3 ? `Streak x${nextStreak} — keep going!` : 'Correct. Find the next match.') : 'Wrong color. Reset your focus.' }));
    if (correct) playRandomAudio(CORRECT_AUDIO_FILES, correctAudioRef, lastCorrectAudioRef);
    else playRandomAudio(WRONG_AUDIO_FILES, wrongAudioRef, lastWrongAudioRef, playFallbackWrongFeedback);
    window.setTimeout(() => { if (gameRef.current.running) nextBoard(); }, 90);
  };

  const togglePause = (force) => setGame((current) => ({ ...current, paused: typeof force === 'boolean' ? force : !current.paused }));
  const leaveGame = () => {
    clearTimeout(countdownRef.current);
    clearInterval(timerRef.current);
    setCountdown(null);
    setGame(initialGame);
    setScreen('setup');
  };
  const openLeaderboard = (from) => {
    setLeaderboardReturn(from);
    setSelectedProfile(null);
    setScreen('leaderboard');
    loadLeaderboard(true);
  };
  const goToSetup = () => {
    setScreen('setup');
    window.setTimeout(() => document.getElementById('player-name')?.focus(), 50);
  };
  const playAgain = () => goToSetup();
  const shareResult = async () => {
    const message = `I scored ${result?.score || 0} points in Color Rush! Can you beat me?`;
    try {
      await navigator.clipboard.writeText(message);
      setShareFeedback('Result copied. Send it to your squad.');
    } catch {
      setShareFeedback(message);
    }
  };

  return (
    <main className="app-shell">
      <BrandBar />
      <div className="content-stage">
        {screen === 'fullscreen' && <FullscreenScreen onEnter={enterFullscreen} onContinue={showRules} />}
        {screen === 'rules' && <RulesScreen profiles={profiles} onEnterSetup={goToSetup} onViewLeaderboard={() => openLeaderboard('rules')} onSelectProfile={(profile) => { openLeaderboard('rules'); setSelectedProfile(profile); }} />}
        {screen === 'setup' && <SetupScreen playerName={playerName} setPlayerName={setPlayerName} error={nameError} onBack={showRules} onStart={beginChallenge} />}
        {screen === 'game' && <GameScreen game={game} playerName={playerName} onOrb={handleOrb} onPause={togglePause} onBack={leaveGame} onQuit={finishGame} onStart={startCountdown} />}
        {screen === 'result' && result && <ResultScreen result={result} profiles={profiles} onViewLeaderboard={() => openLeaderboard('result')} onSelectProfile={(profile) => { openLeaderboard('result'); setSelectedProfile(profile); }} onPlayAgain={playAgain} onBack={goToSetup} onShare={shareResult} shareFeedback={shareFeedback} />}
        {screen === 'leaderboard' && <LeaderboardScreen profiles={profiles} loading={leaderboardLoading} synced={leaderboardSynced} error={leaderboardError} selectedProfile={selectedProfile} onSelect={setSelectedProfile} onCloseProfile={() => setSelectedProfile(null)} onPlayAgain={playAgain} onBack={() => { setSelectedProfile(null); setScreen(leaderboardReturn); }} />}
      </div>
      <Footer />
      {guideOpen && <GuideModal onClose={() => { setGuideOpen(false); setScreen('setup'); }} onStart={() => { window.localStorage.setItem('colorRushGuideSeen', '1'); setGuideOpen(false); startCountdown(); }} />}
      {countdown && <CountdownOverlay value={countdown} />}
    </main>
  );
}
