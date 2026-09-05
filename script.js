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
let leaderboardCache = [];
let leaderboardCacheAt = 0;
let leaderboardReturnScreen = $('result-screen');
let selectedProfile = null;
const LEADERBOARD_CACHE_KEY = 'colorRushLeaderboardCache';
const LEADERBOARD_CACHE_AT_KEY = 'colorRushLeaderboardCacheAt';
const DEVICE_ID_KEY = 'colorRushDeviceId';

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = window.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
const deviceId = getDeviceId();

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
  if (!correct && navigator.vibrate) navigator.vibrate([35, 35, 70]);
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

function openGuide() {
  $('guide-overlay').classList.remove('hidden'); document.body.classList.add('guide-open'); $('btn-guide-start').focus();
}

function closeGuide() {
  $('guide-overlay').classList.add('hidden'); document.body.classList.remove('guide-open');
}

function beginChallenge() {
  if (localStorage.getItem('colorRushGuideSeen') !== '1') openGuide();
  else startCountdown();
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
  const cleanName = playerName.slice(0, 15);
  return { playerName: cleanName, playerNameKey: cleanName.trim().toLowerCase().replace(/\s+/g, ' '), deviceId, score: Number(score) || 0, hits, attempts, accuracy: attempts ? Math.round((hits / attempts) * 100) : 0, playedAt: new Date().toISOString() };
}
function saveLocalScore(entry) {
  const scores = JSON.parse(localStorage.getItem('colorRushScores') || '[]'); scores.push(entry); scores.sort((a, b) => b.score - a.score); localStorage.setItem('colorRushScores', JSON.stringify(scores.slice(0, 100)));
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

async function fetchHostedProfiles() {
  const response = await fetch('/api/leaderboard', { headers: { Accept: 'application/json' }, cache: 'no-store' });
  const body = await response.json(); if (!response.ok || !body.ok) throw new Error(body.error || 'Leaderboard unavailable');
  return Array.isArray(body.profiles) ? body.profiles : (Array.isArray(body.scores) ? body.scores : []);
}

function localProfiles() {
  const entries = JSON.parse(localStorage.getItem('colorRushScores') || '[]');
  const groups = new Map();
  entries.forEach((entry) => {
    const key = `${entry.deviceId || deviceId}::${entry.playerNameKey || String(entry.playerName || '').trim().toLowerCase()}`;
    const existing = groups.get(key) || { playerName: entry.playerName, topScore: -Infinity, totalGames: 0, averageAccuracy: 0, lastPlayed: entry.playedAt, history: [] };
    existing.history.push({ score: Number(entry.score) || 0, hits: entry.hits || 0, attempts: entry.attempts || 0, accuracy: entry.accuracy || 0, playedAt: entry.playedAt });
    existing.totalGames = existing.history.length; existing.topScore = Math.max(existing.topScore, Number(entry.score) || 0); existing.averageAccuracy = Math.round(existing.history.reduce((sum, item) => sum + Number(item.accuracy || 0), 0) / existing.totalGames); existing.lastPlayed = new Date(entry.playedAt || 0) > new Date(existing.lastPlayed || 0) ? entry.playedAt : existing.lastPlayed;
    groups.set(key, existing);
  });
  return [...groups.values()].sort((a, b) => b.topScore - a.topScore);
}

function readCachedLeaderboard() {
  if (leaderboardCache.length) return leaderboardCache;
  try { leaderboardCache = JSON.parse(localStorage.getItem(LEADERBOARD_CACHE_KEY) || '[]'); leaderboardCacheAt = Number(localStorage.getItem(LEADERBOARD_CACHE_AT_KEY) || 0); } catch (_) { leaderboardCache = []; }
  return leaderboardCache;
}

function writeCachedLeaderboard(profiles) {
  leaderboardCache = profiles; leaderboardCacheAt = Date.now(); lastScores = profiles;
  localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(profiles)); localStorage.setItem(LEADERBOARD_CACHE_AT_KEY, String(leaderboardCacheAt));
}

function paintLeaderboard(profiles, isResult = false) {
  lastScores = profiles;
  renderLeaderboard(profiles, $('leaderboard-ul'));
  renderLeaderboard(profiles.slice(0, 3), $('rules-top-list'), true);
  if (isResult) renderLeaderboard(profiles.slice(0, 5), $('result-leaderboard-list'), true);
}

async function prefetchLeaderboard(force = false) {
  const cached = readCachedLeaderboard();
  if (cached.length) paintLeaderboard(cached);
  if (!force && cached.length && Date.now() - leaderboardCacheAt < 60000) return cached;
  try {
    const profiles = await fetchHostedProfiles(); writeCachedLeaderboard(profiles); paintLeaderboard(profiles);
    $('live-indicator')?.classList.remove('hidden'); $('result-database-status')?.classList.remove('hidden');
    return profiles;
  } catch (_) {
    const fallback = cached.length ? cached : localProfiles();
    if (fallback.length) { writeCachedLeaderboard(fallback); paintLeaderboard(fallback); }
    $('live-indicator')?.classList.add('hidden'); $('result-database-status')?.classList.add('hidden');
    return fallback;
  }
}

async function loadLeaderboard(isResult = false) {
  const cached = readCachedLeaderboard();
  if (cached.length) { paintLeaderboard(cached, isResult); $('loading-state').classList.add('hidden'); }
  else { $('loading-state').classList.remove('hidden'); $('error-state').classList.add('hidden'); }
  const scores = await prefetchLeaderboard(true);
  if (!scores.length) $('error-state').classList.remove('hidden'); else $('error-state').classList.add('hidden');
  $('loading-state').classList.add('hidden'); paintLeaderboard(scores, isResult);
}

function renderLeaderboard(profiles, list, mini = false) {
  if (!list) return; list.replaceChildren();
  if (!profiles.length) { list.innerHTML = '<li class="empty-row">No runs yet. Be the first.</li>'; return; }
  profiles.slice(0, mini ? 5 : 50).forEach((entry, index) => {
    const li = document.createElement('li'); li.className = `leaderboard-row ${index < 3 ? 'top-rank' : ''}`;
    const name = entry.playerName || 'Anonymous'; const historyCount = Number(entry.totalGames || entry.history?.length || 1); const topScore = Number(entry.topScore ?? entry.score ?? 0);
    li.innerHTML = `<button class="leaderboard-profile" type="button"><span class="rank"><b>${String(index + 1).padStart(2, '0')}</b><strong>${escapeHTML(name)}</strong><small>${historyCount} ${historyCount === 1 ? 'run' : 'runs'} · ${Number(entry.averageAccuracy || entry.accuracy || 0)}% avg</small></span><span class="leader-score">${topScore}<small> top</small><i>→</i></span></button>`;
    li.querySelector('button').addEventListener('click', () => { const preview = list.id === 'rules-top-list' || list.id === 'result-leaderboard-list'; if (preview) { openLeaderboard(list.id === 'rules-top-list' ? $('rules-screen') : $('result-screen')); window.setTimeout(() => showProfile(entry), 0); } else showProfile(entry); }); list.appendChild(li);
  });
}

function showProfile(profile) {
  selectedProfile = profile; $('profile-detail').classList.remove('hidden'); $('profile-detail-name').textContent = profile.playerName || 'Anonymous'; $('profile-top-score').textContent = Number(profile.topScore || 0); $('profile-total-games').textContent = Number(profile.totalGames || profile.history?.length || 0); $('profile-accuracy').textContent = `${Number(profile.averageAccuracy || 0)}%`;
  const history = Array.isArray(profile.history) ? profile.history : [];
  $('profile-history').replaceChildren();
  history.forEach((run, index) => { const li = document.createElement('li'); li.innerHTML = `<span><b>#${String(index + 1).padStart(2, '0')}</b><small>${new Date(run.playedAt || Date.now()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</small></span><strong>${Number(run.score || 0)} <small>pts</small></strong>`; $('profile-history').appendChild(li); });
  $('profile-detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function leaveGame() { cancelCountdown(); running = false; paused = false; clearInterval(timerId); showScreen($('start-screen')); }
$('btn-enter-fullscreen').addEventListener('click', async () => { const entered = await requestGameFullscreen(); if (!entered) $('fullscreen-screen-note').textContent = 'Fullscreen is unavailable here. You can still continue in the window.'; showScreen($('rules-screen')); });
$('btn-skip-fullscreen').addEventListener('click', () => showScreen($('rules-screen')));
$('btn-got-it').addEventListener('click', () => { showScreen($('start-screen')); $('player-name').focus(); });
$('btn-back-rules').addEventListener('click', () => showScreen($('rules-screen')));
$('btn-start-game').addEventListener('click', () => { if (!validatePlayer()) return; beginChallenge(); });
$('btn-guide-back').addEventListener('click', () => { closeGuide(); showScreen($('start-screen')); });
$('btn-guide-start').addEventListener('click', () => { localStorage.setItem('colorRushGuideSeen', '1'); closeGuide(); startCountdown(); });
document.addEventListener('fullscreenchange', syncFullscreenHint);
$('player-name').addEventListener('keydown', (event) => { if (event.key === 'Enter') $('btn-start-game').click(); });

$('btn-pause').addEventListener('click', () => togglePause()); $('btn-resume').addEventListener('click', () => togglePause(false));
$('btn-game-back').addEventListener('click', leaveGame); $('btn-quit').addEventListener('click', endGame);
$('btn-play-again').addEventListener('click', () => { $('player-name').value = playerName; showScreen($('start-screen')); $('player-name').focus(); });
$('btn-result-back').addEventListener('click', () => { $('player-name').value = playerName; showScreen($('start-screen')); $('player-name').focus(); });
function openLeaderboard(fromScreen) { leaderboardReturnScreen = fromScreen; showScreen($('leaderboard-screen')); loadLeaderboard(); }
$('btn-view-leaderboard').addEventListener('click', () => openLeaderboard($('result-screen')));
$('btn-open-leaderboard-early').addEventListener('click', () => openLeaderboard($('rules-screen')));
$('btn-leaderboard-again').addEventListener('click', () => { $('player-name').value = playerName; showScreen($('start-screen')); $('player-name').focus(); });
$('btn-leaderboard-back').addEventListener('click', () => { $('profile-detail').classList.add('hidden'); showScreen(leaderboardReturnScreen); });
$('btn-profile-close').addEventListener('click', () => { $('profile-detail').classList.add('hidden'); selectedProfile = null; });
$('btn-share').addEventListener('click', async () => { const message = `I scored ${score} points in Color Rush! Can you beat me?`; try { await navigator.clipboard.writeText(message); $('share-feedback').textContent = 'Result copied. Send it to your squad.'; } catch (_) { $('share-feedback').textContent = message; } $('share-feedback').classList.remove('hidden'); });
document.addEventListener('keydown', (event) => { if (event.key.toLowerCase() === 'p' || event.key === 'Escape') togglePause(); });
showScreen($('fullscreen-screen'));
window.setTimeout(() => prefetchLeaderboard(), 80);
