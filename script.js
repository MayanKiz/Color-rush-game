const $ = (id) => document.getElementById(id);
const screens = ['fullscreen-screen', 'rules-screen', 'start-screen', 'game-screen', 'result-screen', 'leaderboard-screen'].map($);
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
let countdownTimerId = null;
let countdownActive = false;
let audioContext;
let lastScores = [];

function showScreen(screen) {
  screens.forEach((item) => item.classList.toggle('hidden', item !== screen));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function setText(id, value) { $(id).textContent = value; }
function escapeHTML(value) { return String(value ?? '').replace(/[&<>'"]/g, (tag) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag])); }

function playTone(correct) {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain();
    oscillator.type = correct ? 'sine' : 'sawtooth'; oscillator.frequency.value = correct ? 620 : 160;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.01); gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.12);
    oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + 0.13);
  } catch (_) { /* Audio is optional and can be blocked by the browser. */ }
  if (navigator.vibrate) navigator.vibrate(correct ? 25 : [25, 25, 25]);
}

async function requestGameFullscreen() {
  try {
    if (!document.fullscreenElement && !document.documentElement.requestFullscreen) return false;
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    document.body.classList.add('is-fullscreen');
    return true;
  } catch (_) {
    return false;
  }
}

function syncFullscreenHint() {
  const active = Boolean(document.fullscreenElement);
  document.body.classList.toggle('is-fullscreen', active);
  if ($('fullscreen-screen-note')) $('fullscreen-screen-note').textContent = active ? 'Fullscreen ready. Next, read the rules before you start.' : 'You can exit fullscreen anytime with your browser controls.';
  if ($('btn-enter-fullscreen')) $('btn-enter-fullscreen').innerHTML = active ? 'Fullscreen ready <span>✓</span>' : 'Open full screen <span>↗</span>';
}

function validatePlayer() {
  const value = $('player-name').value.trim();
  if (value.length < 2 || value.length > 15) { $('name-error').classList.remove('hidden'); return false; }
  $('name-error').classList.add('hidden'); playerName = value; return true;
}

function startCountdown() {
  clearTimeout(countdownTimerId);
  countdownActive = true;
  showScreen($('game-screen'));
  const overlay = $('countdown-overlay'); const value = $('countdown-value');
  const steps = ['3', '2', '1', 'GO']; let step = 0;
  overlay.classList.remove('hidden');
  const tick = () => {
    if (!countdownActive) return;
    value.textContent = steps[step]; value.classList.remove('countdown-pop'); void value.offsetWidth; value.classList.add('countdown-pop');
    step += 1;
    if (step >= steps.length) {
      countdownTimerId = window.setTimeout(() => { countdownActive = false; overlay.classList.add('hidden'); startGame(); }, 520);
    } else countdownTimerId = window.setTimeout(tick, 720);
  };
  tick();
}

function cancelCountdown() {
  countdownActive = false; clearTimeout(countdownTimerId); countdownTimerId = null; $('countdown-overlay').classList.add('hidden');
}

function startGame() {
  score = 0; timeLeft = GAME_DURATION; streak = 0; hits = 0; attempts = 0; rounds = 0;
  running = true; paused = false; submitted = false;
  setText('current-score', '0'); setText('current-streak', '0'); setText('time-left', '30.0');
  $('time-progress').style.width = '100%'; $('time-progress').classList.remove('urgent'); $('pause-overlay').classList.add('hidden');
  showScreen($('game-screen')); nextBoard();
  clearInterval(timerId);
  const startedAt = performance.now();
  timerId = setInterval(() => {
    if (!running || paused) return;
    timeLeft = Math.max(0, GAME_DURATION - (performance.now() - startedAt) / 1000);
    setText('time-left', timeLeft.toFixed(1)); $('time-progress').style.width = `${(timeLeft / GAME_DURATION) * 100}%`;
    $('time-progress').classList.toggle('urgent', timeLeft <= 8);
    if (timeLeft <= 0) endGame();
  }, 100);
}

function nextBoard() {
  if (!running) return;
  rounds += 1; $('round-counter').textContent = `ROUND ${String(rounds).padStart(2, '0')}`;
  currentTarget = colorPalette[Math.floor(Math.random() * colorPalette.length)];
  const target = $('target-color-display'); target.textContent = currentTarget.name.toUpperCase(); target.style.color = currentTarget.hex; target.style.textShadow = `0 0 26px ${currentTarget.hex}66`; $('target-swatch').style.backgroundColor = currentTarget.hex; $('target-swatch').style.boxShadow = `0 0 20px ${currentTarget.hex}99`;
  const colors = Array.from({ length: TOTAL_CIRCLES }, () => colorPalette[Math.floor(Math.random() * colorPalette.length)]);
  colors[Math.floor(Math.random() * colors.length)] = currentTarget;
  const fragment = document.createDocumentFragment();
  colors.forEach((color, index) => {
    const orb = document.createElement('button'); orb.type = 'button'; orb.className = 'color-orb'; orb.setAttribute('aria-label', `${color.name} orb`);
    orb.style.setProperty('--orb-color', color.hex); orb.style.setProperty('--delay', `${(index % 5) * 18}ms`);
    orb.addEventListener('pointerdown', (event) => { event.preventDefault(); handleOrb(color, orb); }, { once: true }); fragment.appendChild(orb);
  });
  $('game-board').replaceChildren(fragment);
}

function handleOrb(color, orb) {
  if (!running || paused) return;
  attempts += 1; const correct = color.name === currentTarget.name; orb.classList.add(correct ? 'hit' : 'miss');
  if (correct) { score += POINTS_CORRECT; streak += 1; hits += 1; setText('feedback-text', streak >= 3 ? `Streak x${streak} — keep going!` : 'Nice hit. Find the next one.'); }
  else { score -= POINTS_WRONG; streak = 0; setText('feedback-text', 'Missed. Reset your focus.'); }
  score = Math.max(-999, score); setText('current-score', score); setText('current-streak', streak); $('streak-label').textContent = streak >= 3 ? 'on fire' : 'build it';
  const delta = $('score-delta'); delta.textContent = correct ? `+${POINTS_CORRECT}` : `−${POINTS_WRONG}`; delta.className = `score-delta ${correct ? 'positive' : 'negative'}`; playTone(correct);
  window.setTimeout(() => { if (running) nextBoard(); }, 80);
}

function togglePause(force) {
  if (!running) return;
  paused = typeof force === 'boolean' ? force : !paused; $('pause-overlay').classList.toggle('hidden', !paused); $('btn-pause').textContent = paused ? '▶' : 'Ⅱ';
}

function makePayload() {
  return { playerName: playerName.slice(0, 15), score: Number(score) || 0, hits, attempts, accuracy: attempts ? Math.round((hits / attempts) * 100) : 0, playedAt: new Date().toISOString() };
}
function saveLocalScore(entry) {
  const scores = JSON.parse(localStorage.getItem('colorRushScores') || '[]'); scores.push(entry); scores.sort((a, b) => b.score - a.score); localStorage.setItem('colorRushScores', JSON.stringify(scores.slice(0, 20)));
}

async function submitScore(payload) {
  try {
    const response = await fetch('/api/submit-score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Score API unavailable');
    return body;
  } catch (error) { console.warn('Score sync unavailable:', error.message); return { ok: false, databaseSaved: false, telegramSent: false }; }
}

async function endGame() {
  if (!running || submitted) return;
  running = false; paused = false; submitted = true; clearInterval(timerId);
  bestScore = Math.max(bestScore, score); localStorage.setItem('colorRushBest', String(bestScore));
  setText('final-score', score); setText('result-hits', hits); setText('result-best', bestScore); setText('result-accuracy', attempts ? `${Math.round((hits / attempts) * 100)}%` : '0%');
  $('result-badge').textContent = score >= bestScore && score > 0 ? 'NEW PERSONAL BEST' : 'ROUND COMPLETE';
  const payload = makePayload(); saveLocalScore(payload); showScreen($('result-screen'));
  await submitScore(payload);
  await loadLeaderboard(true);
}

async function fetchHostedScores() {
  const response = await fetch('/api/leaderboard', { headers: { Accept: 'application/json' } });
  const body = await response.json(); if (!response.ok || !body.ok) throw new Error(body.error || 'Leaderboard unavailable');
  return Array.isArray(body.scores) ? body.scores : [];
}

function localScores() {
  return JSON.parse(localStorage.getItem('colorRushScores') || '[]').map((entry) => ({ playerName: entry.playerName, score: entry.score, hits: entry.hits, attempts: entry.attempts, accuracy: entry.accuracy }));
}

async function loadLeaderboard(isResult = false) {
  $('loading-state').classList.remove('hidden'); $('error-state').classList.add('hidden');
  let scores;
  try {
    scores = await fetchHostedScores();
    $('live-indicator').classList.remove('hidden');
    $('result-database-status').classList.remove('hidden');
  } catch (_) {
    scores = localScores().slice(0, 10);
    $('live-indicator').classList.add('hidden');
    $('result-database-status').classList.add('hidden');
    $('error-state').classList.remove('hidden');
  }
  $('loading-state').classList.add('hidden'); lastScores = scores;
  renderLeaderboard(scores, $('leaderboard-ul')); if (isResult) renderLeaderboard(scores.slice(0, 5), $('result-leaderboard-list'), true);
}

function renderLeaderboard(scores, list, mini = false) {
  if (!list) return; list.replaceChildren();
  if (!scores.length) { list.innerHTML = '<li class="empty-row">No runs yet. Be the first.</li>'; return; }
  scores.slice(0, mini ? 5 : 10).forEach((entry, index) => {
    const li = document.createElement('li'); const name = entry.playerName || entry.player_name || 'Anonymous';
    li.innerHTML = `<span class="rank"><b>${String(index + 1).padStart(2, '0')}</b><strong>${escapeHTML(name)}</strong></span><span class="leader-score">${Number(entry.score) || 0}<small> pts</small></span>`; list.appendChild(li);
  });
}

function leaveGame() { cancelCountdown(); running = false; paused = false; clearInterval(timerId); showScreen($('start-screen')); }
$('btn-enter-fullscreen').addEventListener('click', async () => { const entered = await requestGameFullscreen(); if (!entered) $('fullscreen-screen-note').textContent = 'Fullscreen is unavailable here. You can still continue in the window.'; showScreen($('rules-screen')); });
$('btn-skip-fullscreen').addEventListener('click', () => showScreen($('rules-screen')));
$('btn-got-it').addEventListener('click', () => { showScreen($('start-screen')); $('player-name').focus(); });
$('btn-back-rules').addEventListener('click', () => showScreen($('rules-screen')));
$('btn-start-game').addEventListener('click', () => { if (!validatePlayer()) return; startCountdown(); });
document.addEventListener('fullscreenchange', syncFullscreenHint);
$('player-name').addEventListener('keydown', (event) => { if (event.key === 'Enter') $('btn-start-game').click(); });

$('btn-pause').addEventListener('click', () => togglePause()); $('btn-resume').addEventListener('click', () => togglePause(false));
$('btn-game-back').addEventListener('click', leaveGame); $('btn-quit').addEventListener('click', endGame);
$('btn-play-again').addEventListener('click', () => { $('player-name').value = playerName; showScreen($('start-screen')); $('player-name').focus(); });
$('btn-result-back').addEventListener('click', () => { $('player-name').value = playerName; showScreen($('start-screen')); $('player-name').focus(); });
$('btn-view-leaderboard').addEventListener('click', () => { showScreen($('leaderboard-screen')); loadLeaderboard(); });
$('btn-leaderboard-again').addEventListener('click', () => { $('player-name').value = playerName; showScreen($('start-screen')); $('player-name').focus(); });
$('btn-leaderboard-back').addEventListener('click', () => showScreen($('result-screen')));
$('btn-share').addEventListener('click', async () => { const message = `I scored ${score} points in Color Rush! Can you beat me?`; try { await navigator.clipboard.writeText(message); $('share-feedback').textContent = 'Result copied. Send it to your squad.'; } catch (_) { $('share-feedback').textContent = message; } $('share-feedback').classList.remove('hidden'); });
document.addEventListener('keydown', (event) => { if (event.key.toLowerCase() === 'p' || event.key === 'Escape') togglePause(); });
showScreen($('fullscreen-screen'));
