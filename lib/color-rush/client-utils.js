import {
  COLORS,
  LEADERBOARD_CACHE_AT_KEY,
  LEADERBOARD_CACHE_KEY,
  TOTAL_CIRCLES,
} from './config';

export function makeBoard() {
  const target = COLORS[Math.floor(Math.random() * COLORS.length)];
  const board = Array.from({ length: TOTAL_CIRCLES }, () => COLORS[Math.floor(Math.random() * COLORS.length)]);
  board[Math.floor(Math.random() * board.length)] = target;
  return { target, board };
}

export function normalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function localProfiles() {
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

export function readCachedProfiles() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(LEADERBOARD_CACHE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function writeCachedProfiles(profiles) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(profiles));
  window.localStorage.setItem(LEADERBOARD_CACHE_AT_KEY, String(Date.now()));
}

export function formatDate(value) {
  try {
    return new Date(value || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'recently';
  }
}

export function scorePayload(playerName, game) {
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

export async function getHostedLeaderboard(date = '') {
  const response = await fetch(`/api/leaderboard${date ? `?date=${encodeURIComponent(date)}` : ''}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.ok) throw new Error(body.error || 'Leaderboard unavailable');
  return body;
}
export async function getHostedProfiles() {
  const body = await getHostedLeaderboard();
  return body.scores || [];
}

export async function postScore(payload) {
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

export function playTone(correct) {
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
