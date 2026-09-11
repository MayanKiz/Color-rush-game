import { neon } from '@neondatabase/serverless';

export function connectionString() {
  return process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.NEON_DATABASE_URL;
}
export function databaseClient() { const url = connectionString(); return url ? neon(url) : null; }
export function istDate(value = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)); }
export function formatIstDate(value) { return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00+05:30`)); }

export async function ensureSchema(sql) {
  await sql`create table if not exists scores (id bigserial primary key, player_name varchar(15) not null, player_name_key varchar(15), score integer not null default 0, hits integer not null default 0, attempts integer not null default 0, accuracy integer not null default 0, created_at timestamptz not null default now())`;
  await sql`alter table scores add column if not exists player_name_key varchar(15)`;
  await sql`update scores set player_name_key = lower(trim(player_name)) where player_name_key is null`;
  await sql`create index if not exists scores_score_created_idx on scores (score desc, created_at asc)`;
  await sql`create index if not exists scores_name_key_idx on scores (player_name_key)`;
  await sql`create table if not exists current_leaderboard (id bigserial primary key, user_id varchar(64) not null, username varchar(15) not null, score integer not null default 0, hits integer not null default 0, attempts integer not null default 0, accuracy integer not null default 0, played_at timestamptz not null default now())`;
  await sql`create index if not exists current_leaderboard_score_idx on current_leaderboard (score desc, played_at asc)`;
  await sql`create table if not exists leaderboard_history (date date primary key, scores jsonb not null default '[]'::jsonb, created_at timestamptz not null default now())`;
}
export function normalizeName(value) { return String(value || '').trim().toLowerCase().replace(/\s+/g, ' '); }
export function mergeProfiles(rows) {
  const groups = new Map();
  rows.forEach((row) => { const key = normalizeName(row.playerNameKey || row.playerName) || 'anonymous'; const group = groups.get(key) || { rows: [] }; group.rows.push(row); groups.set(key, group); });
  return [...groups.values()].map((group) => { const history = group.rows.sort((a, b) => b.score - a.score || new Date(b.playedAt) - new Date(a.playedAt)).map((row) => ({ id: row.id, score: row.score, hits: row.hits, attempts: row.attempts, accuracy: row.accuracy, playedAt: row.playedAt })); const latest = [...group.rows].sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))[0]; return { playerName: latest?.playerName || latest?.username || 'Anonymous', topScore: history[0]?.score || 0, totalGames: history.length, averageAccuracy: history.length ? Math.round(history.reduce((sum, entry) => sum + (Number(entry.accuracy) || 0), 0) / history.length) : 0, lastPlayed: latest?.playedAt || null, history }; }).sort((a, b) => b.topScore - a.topScore || new Date(b.lastPlayed || 0) - new Date(a.lastPlayed || 0));
}
export function cleanPayload(body = {}) { const playerName = String(body.playerName || 'Anonymous').trim().slice(0, 15) || 'Anonymous'; const playerNameKey = String(body.playerNameKey || playerName).trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 15); const numberOr = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : fallback; return { playerName, playerNameKey, userId: String(body.userId || playerNameKey || 'anonymous').slice(0, 64), score: numberOr(body.score), hits: Math.max(0, numberOr(body.hits)), attempts: Math.max(0, numberOr(body.attempts)), accuracy: Math.max(0, Math.min(100, numberOr(body.accuracy))) }; }
export async function storeScore(sql, payload) { if (!sql) return { saved: false, configured: false }; await ensureSchema(sql); await sql`insert into scores (player_name, player_name_key, score, hits, attempts, accuracy) values (${payload.playerName}, ${payload.playerNameKey}, ${payload.score}, ${payload.hits}, ${payload.attempts}, ${payload.accuracy})`; await sql`insert into current_leaderboard (user_id, username, score, hits, attempts, accuracy) values (${payload.userId}, ${payload.playerName}, ${payload.score}, ${payload.hits}, ${payload.attempts}, ${payload.accuracy})`; return { saved: true, configured: true }; }
export async function getRankedScores(sql, date) {
  let rows;
  if (date === istDate()) {
    rows = await sql`select id, user_id as "userId", username, score, hits, attempts, accuracy, played_at as "playedAt" from current_leaderboard order by score desc, played_at asc`;
  } else {
    const legacyRows = await sql`select id, player_name as username, player_name_key as "userId", score, hits, attempts, accuracy, created_at as "playedAt" from scores where (created_at at time zone 'Asia/Kolkata')::date = ${date}::date order by score desc, created_at asc`;
    const archived = (await sql`select scores from leaderboard_history where date = ${date} limit 1`)[0]?.scores;
    rows = legacyRows.length ? legacyRows : (archived || []);
  }
  return rows.map((row, index) => ({ ...row, rank: index + 1, score: Number(row.score) || 0 }));
}
export async function getLeaderboardDates(sql) {
  const rows = await sql`select date, total_played from (select date, jsonb_array_length(scores) as total_played from leaderboard_history union all select (created_at at time zone 'Asia/Kolkata')::date as date, count(*)::int as total_played from scores group by 1) dates order by date desc limit 90`;
  const merged = new Map();
  rows.forEach((row) => { const value = String(row.date); merged.set(value, { value, totalPlayed: Number(row.total_played) || 0 }); });
  return [...merged.values()];
}
export async function archiveAndReset(sql, archiveDate = istDate(new Date(Date.now() - 86400000))) { await ensureSchema(sql); const rows = await sql`select id, user_id as "userId", username, score, hits, attempts, accuracy, played_at as "playedAt" from current_leaderboard order by score desc, played_at asc`; const scores = rows.map((row, index) => ({ ...row, rank: index + 1, score: Number(row.score) || 0 })); await sql`insert into leaderboard_history (date, scores) values (${archiveDate}, ${JSON.stringify(scores)}::jsonb) on conflict (date) do update set scores = excluded.scores`; await sql`delete from current_leaderboard`; return { date: archiveDate, count: scores.length }; }
export async function sendTelegram(payload) { const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim(); const chatId = String(process.env.TELEGRAM_CHAT_ID || '').trim(); if (!token || !chatId) return { sent: false, configured: false }; const text = ['COLOR RUSH — NEW SCORE', '', `Player: ${payload.playerName}`, `Score: ${payload.score} points`, `Hits: ${payload.hits}/${payload.attempts} (${payload.accuracy}% accuracy)`, `Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`].join('\n'); const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }) }); const telegramBody = await telegramResponse.json().catch(() => ({})); if (!telegramResponse.ok || !telegramBody.ok) throw new Error(`Telegram ${telegramBody.error_code || telegramResponse.status}: ${String(telegramBody.description || '').slice(0, 180)}`); return { sent: true, configured: true }; }
