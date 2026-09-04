const SUPABASE_URL = 'https://yopaejjixslcjmndnvtz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Dl2a6iEvnmf2eQ_MRrPIeg_8THmHK8i';
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (id) => document.getElementById(id);
const screens = ['rules-screen', 'start-screen', 'game-screen', 'result-screen', 'leaderboard-screen'].map($);
const colorPalette = [
  { name: 'Red', hex: '#ff4d6d' }, { name: 'Blue', hex: '#35d7ff' },
  { name: 'Purple', hex: '#b277ff' }, { name: 'Green', hex: '#63f29b' },
  { name: 'Yellow', hex: '#ffe16a' }, { name: 'Orange', hex: '#ff9f5b' }
];
const GAME_DURATION = 30;
const POINTS_CORRECT = 5;
const POINTS_WRONG = 3;
const TOTAL_CIRCLES = 25;

let playerName = '';
let score = 0;
let bestScore = Number(localStorage.getItem('colorRushBest') || 0);
let timeLeft = GAME_DURATION;
let timerId = null;
let currentTarget = null;
let running = false;
let paused = false;
let streak = 0;
let hits = 0;
let attempts = 0;
let rounds = 0;
let submitted = false;
let realtimeSubscription = null;
let audioContext;

function showScreen(screen) {
  screens.forEach((item) => item.classList.toggle('hidden', item !== screen));
}

function setText(id, value) { $(id).textContent = value; }
function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
function escapeHTML(value) { return String(value ?? '').replace(/[&<>'"]/g, (tag) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag])); }

function playTone(correct) {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = correct ? 'sine' : 'sawtooth';
    oscillator.frequency.value = correct ? 620 : 160;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.12);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + 0.13);
  } catch (_) { /* Audio is optional and can be blocked by the browser. */ }
  if (navigator.vibrate) navigator.vibrate(correct ? 25 : [25, 25, 25]);
}

function startGame() {
  score = 0; timeLeft = GAME_DURATION; streak = 0; hits = 0; attempts = 0; rounds = 0;
  running = true; paused = false; submitted = false;
  setText('current-score', '0'); setText('current-streak', '0'); setText('time-left', '30.0');
  $('time-progress').style.width = '100%'; $('pause-overlay').classList.add('hidden');
  showScreen($('game-screen')); nextBoard();
  clearInterval(timerId);
  const startedAt = performance.now();
  timerId = setInterval(() => {
    if (!running || paused) return;
    timeLeft = Math.max(0, GAME_DURATION - (performance.now() - startedAt) / 1000);
    setText('time-left', timeLeft.toFixed(1));
    $('time-progress').style.width = `${(timeLeft / GAME_DURATION) * 100}%`;
    $('time-progress').classList.toggle('urgent', timeLeft <= 8);
    if (timeLeft <= 0) endGame();
  }, 100);
}

function nextBoard() {
  if (!running) return;
  rounds += 1;
  const difficulty = Math.min(0.15, rounds * 0.004);
  $('round-counter').textContent = `ROUND ${String(rounds).padStart(2, '0')}`;
  const colors = Array.from({ length: TOTAL_CIRCLES }, () => colorPalette[Math.floor(Math.random() * colorPalette.length)]);
  currentTarget = colors[Math.floor(Math.random() * colors.length)];
  const target = $('target-color-display');
  target.textContent = currentTarget.name.toUpperCase(); target.style.color = currentTarget.hex; target.style.textShadow = `0 0 26px ${currentTarget.hex}66`;
  const fragment = document.createDocumentFragment();
  colors.forEach((color, index) => {
    const orb = document.createElement('button');
    orb.type = 'button'; orb.className = 'color-orb'; orb.setAttribute('aria-label', `${color.name} orb`);
    orb.style.setProperty('--orb-color', color.hex); orb.style.setProperty('--delay', `${(index % 5) * 18}ms`);
    orb.addEventListener('pointerdown', (event) => { event.preventDefault(); handleOrb(color, orb); }, { once: true });
    fragment.appendChild(orb);
  });
  $('game-board').replaceChildren(fragment);
  $('game-board').style.setProperty('--board-scale', (1 + difficulty).toFixed(3));
}

function handleOrb(color, orb) {
  if (!running || paused) return;
  attempts += 1;
  const correct = color.name === currentTarget.name;
  orb.classList.add(correct ? 'hit' : 'miss');
  if (correct) { score += POINTS_CORRECT; streak += 1; hits += 1; setText('feedback-text', streak >= 3 ? `Streak x${streak} — keep going!` : 'Nice hit. Find the next one.'); }
  else { score -= POINTS_WRONG; streak = 0; setText('feedback-text', 'Missed. Reset your focus.'); }
  score = Math.max(-999, score);
  setText('current-score', score); setText('current-streak', streak); $('streak-label').textContent = streak >= 3 ? 'on fire' : 'build it';
  const delta = $('score-delta'); delta.textContent = correct ? `+${POINTS_CORRECT}` : `−${POINTS_WRONG}`; delta.className = `score-delta ${correct ? 'positive' : 'negative'}`;
  playTone(correct);
  window.setTimeout(() => { if (running) nextBoard(); }, 80);
}

function togglePause(force) {
  if (!running) return;
  paused = typeof force === 'boolean' ? force : !paused;
  $('pause-overlay').classList.toggle('hidden', !paused); $('btn-pause').textContent = paused ? '▶' : 'Ⅱ';
}

async function endGame() {
  if (!running || submitted) return;
  running = false; paused = false; submitted = true; clearInterval(timerId);
  bestScore = Math.max(bestScore, score); localStorage.setItem('colorRushBest', String(bestScore));
  setText('final-score', score); setText('result-hits', hits); setText('result-best', bestScore);
  setText('result-accuracy', attempts ? `${Math.round((hits / attempts) * 100)}%` : '0%');
  $('result-badge').textContent = score >= bestScore && score > 0 ? 'NEW PERSONAL BEST' : 'ROUND COMPLETE';
  showScreen($('result-screen'));
  updateTelegramStatus('pending');
  const payload = { playerName: playerName.slice(0, 15), score: Number(score) || 0, hits, attempts, accuracy: attempts ? Math.round((hits / attempts) * 100) : 0, playedAt: new Date().toISOString() };
  saveLocalScore(payload);
  await Promise.allSettled([sendScoreToTelegram(payload), syncScore(payload)]);
}

function saveLocalScore(entry) {
  const scores = JSON.parse(localStorage.getItem('colorRushScores') || '[]');
  scores.push(entry); scores.sort((a, b) => b.score - a.score);
  localStorage.setItem('colorRushScores', JSON.stringify(scores.slice(0, 20)));
}

async function sendScoreToTelegram(payload) {
  try {
    const response = await fetch('/api/submit-score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error('Telegram endpoint unavailable');
    updateTelegramStatus('sent');
  } catch (_) {
    updateTelegramStatus('offline');
  }
}

function updateTelegramStatus(state) {
  const text = $('telegram-status-text'); const box = $('telegram-status');
  box.className = `telegram-status ${state}`;
  text.textContent = state === 'sent' ? 'Score sent to Telegram' : state === 'offline' ? 'Telegram is not connected yet' : 'Sending score to Telegram…';
}

async function syncScore(payload) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient.from('scores').insert([{ player_name: payload.playerName, score: payload.score }]);
    if (error) throw error;
    setupRealtime();
  } catch (_) { /* The local leaderboard remains usable without Supabase. */ }
}

async function loadLeaderboard() {
  $('loading-state').classList.remove('hidden'); $('error-state').classList.add('hidden');
  let scores = [];
  try {
    if (!supabaseClient) throw new Error('No database');
    const { data, error } = await supabaseClient.from('scores').select('player_name, score').order('score', { ascending: false }).limit(10);
    if (error) throw error;
    scores = (data || []).map((item) => ({ playerName: item.player_name, score: item.score }));
  } catch (_) {
    scores = JSON.parse(localStorage.getItem('colorRushScores') || '[]').slice(0, 10);
    $('error-state').classList.remove('hidden');
  }
  $('loading-state').classList.add('hidden'); renderLeaderboard(scores);
}

function renderLeaderboard(scores) {
  const list = $('leaderboard-ul'); list.replaceChildren();
  if (!scores.length) { list.innerHTML = '<li class="empty-row">No runs yet. Be the first.</li>'; return; }
  scores.slice(0, 10).forEach((entry, index) => {
    const li = document.createElement('li'); li.innerHTML = `<span class="rank"><b>${String(index + 1).padStart(2, '0')}</b><strong>${escapeHTML(entry.playerName || entry.player_name || 'Anonymous')}</strong></span><span class="leader-score">${Number(entry.score) || 0}<small> pts</small></span>`;
    list.appendChild(li);
  });
}

function setupRealtime() {
  if (!supabaseClient || realtimeSubscription) return;
  realtimeSubscription = supabaseClient.channel('scores-live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scores' }, loadLeaderboard).subscribe((status) => $('live-indicator').classList.toggle('hidden', status !== 'SUBSCRIBED'));
}

$('btn-got-it').addEventListener('click', () => { showScreen($('start-screen')); $('player-name').focus(); });
$('btn-back-rules').addEventListener('click', () => showScreen($('rules-screen')));
$('btn-start-game').addEventListener('click', () => {
  const value = $('player-name').value.trim();
  if (value.length < 2 || value.length > 15) { $('name-error').classList.remove('hidden'); return; }
  $('name-error').classList.add('hidden'); playerName = value; startGame();
});
$('player-name').addEventListener('keydown', (event) => { if (event.key === 'Enter') $('btn-start-game').click(); });
$('btn-pause').addEventListener('click', () => togglePause()); $('btn-resume').addEventListener('click', () => togglePause(false));
$('btn-quit').addEventListener('click', () => endGame());
$('btn-play-again').addEventListener('click', () => { $('player-name').value = playerName; showScreen($('start-screen')); $('player-name').focus(); });
$('btn-view-leaderboard').addEventListener('click', () => { showScreen($('leaderboard-screen')); loadLeaderboard(); });
$('btn-leaderboard-again').addEventListener('click', () => { $('player-name').value = playerName; showScreen($('start-screen')); });
$('btn-share').addEventListener('click', async () => {
  const message = `I scored ${score} points in Color Rush! Can you beat me?`;
  try { await navigator.clipboard.writeText(message); $('share-feedback').textContent = 'Result copied. Send it to your squad.'; }
  catch (_) { $('share-feedback').textContent = message; }
  $('share-feedback').classList.remove('hidden');
});

// Keyboard accessibility: press P or Escape to pause during a run.
document.addEventListener('keydown', (event) => { if (event.key.toLowerCase() === 'p' || event.key === 'Escape') togglePause(); });

showScreen($('rules-screen'));
