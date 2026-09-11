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
  getHostedLeaderboard,
  localProfiles,
  makeBoard,
  normalizeName,
  playTone,
  postScore,
  readCachedProfiles,
  scorePayload,
  writeCachedProfiles,
} from '../lib/color-rush/client-utils';

export default function ColorRush() {
  const [screen, setScreen] = useState('fullscreen');
  const [playerName, setPlayerName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [game, setGame] = useState(initialGame);
  const [result, setResult] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [leaderboardScores, setLeaderboardScores] = useState([]);
  const [leaderboardDates, setLeaderboardDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [leaderboardDateLabel, setLeaderboardDateLabel] = useState('Today');
  const [leaderboardTotalPlayed, setLeaderboardTotalPlayed] = useState(0);
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

  const loadLeaderboard = useCallback(async (force = false, date = '') => {
    const cached = readCachedProfiles();
    if (cached.length && !force && !date) setProfiles(cached);
    setLeaderboardLoading(true);
    setLeaderboardError(false);
    try {
      const hosted = await getHostedLeaderboard(date);
      const scores = hosted.scores || [];
      setLeaderboardScores(scores);
      setLeaderboardDates(hosted.dates || []);
      setSelectedDate(hosted.date || date);
      setLeaderboardDateLabel(hosted.dateLabel || 'Today');
      setLeaderboardTotalPlayed(hosted.totalPlayed || scores.length);
      const nextProfiles = scores.map((score) => ({ playerName: score.username, topScore: score.score, totalGames: 1, averageAccuracy: score.accuracy, history: [score] }));
      setProfiles(nextProfiles);
      setLeaderboardSynced(true);
      if (!date) writeCachedProfiles(nextProfiles);
    } catch {
      const fallback = cached.length ? cached : localProfiles();
      setProfiles(fallback);
      setLeaderboardScores([]);
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
    const cleanName = normalizeName(playerName);
    if (cleanName.length < 2 || cleanName.length > 15) {
      setNameError(true);
      return;
    }
    setNameError(false);
    if (window.localStorage.getItem('colorRushGuideSeen') !== '1') setGuideOpen(true);
    else openGameLobby();
  };

  const openGameLobby = () => {
    clearTimeout(countdownRef.current);
    setCountdown(null);
    setGame(initialGame);
    setScreen('game');
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

  const goToSetup = () => {
    setScreen('setup');
    window.setTimeout(() => document.getElementById('player-name')?.focus(), 50);
  };

  const playAgain = () => {
    setPlayerName((name) => name || '');
    goToSetup();
  };

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
        {screen === 'fullscreen' ? <FullscreenScreen onEnter={enterFullscreen} onContinue={showRules} /> : null}
        {screen === 'rules' ? <RulesScreen profiles={profiles} onEnterSetup={goToSetup} onViewLeaderboard={() => openLeaderboard('rules')} onSelectProfile={(profile) => { openLeaderboard('rules'); setSelectedProfile(profile); }} /> : null}
        {screen === 'setup' ? <SetupScreen playerName={playerName} setPlayerName={setPlayerName} error={nameError} onBack={showRules} onStart={beginChallenge} /> : null}
        {screen === 'game' ? <GameScreen game={game} playerName={playerName} onOrb={handleOrb} onPause={togglePause} onBack={leaveGame} onQuit={finishGame} onStart={startCountdown} /> : null}
        {screen === 'result' && result ? <ResultScreen result={result} profiles={profiles} onViewLeaderboard={() => openLeaderboard('result')} onSelectProfile={(profile) => { openLeaderboard('result'); setSelectedProfile(profile); }} onPlayAgain={playAgain} onBack={goToSetup} onShare={shareResult} shareFeedback={shareFeedback} /> : null}
        {screen === 'leaderboard' ? <LeaderboardScreen profiles={profiles} scores={leaderboardScores} dates={leaderboardDates} selectedDate={selectedDate} dateLabel={leaderboardDateLabel} totalPlayed={leaderboardTotalPlayed} onDateChange={(date) => loadLeaderboard(true, date)} loading={leaderboardLoading} synced={leaderboardSynced} error={leaderboardError} selectedProfile={selectedProfile} onSelect={setSelectedProfile} onCloseProfile={() => setSelectedProfile(null)} onPlayAgain={playAgain} onBack={() => { setSelectedProfile(null); setScreen(leaderboardReturn); }} /> : null}
      </div>
      <Footer />
      {guideOpen ? <GuideModal onClose={() => { setGuideOpen(false); setScreen('setup'); }} onStart={() => { window.localStorage.setItem('colorRushGuideSeen', '1'); setGuideOpen(false); openGameLobby(); }} /> : null}
      {countdown ? <CountdownOverlay value={countdown} /> : null}
    </main>
  );
}
