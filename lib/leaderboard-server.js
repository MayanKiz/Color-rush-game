import { neon } from '@neondatabase/serverless';

export function connectionString() {
  return process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.NEON_DATABASE_URL;
}

export function databaseClient() {
  const url = connectionString();
  return url ? neon(url) : null;
}

export async function ensureSchema(sql) {
  await sql`
    create table if not exists scores (
      id bigserial primary key,
      player_name varchar(15) not null,
      player_name_key varchar(15),
      score integer not null default 0,
      hits integer not null default 0,
      attempts integer not null default 0,
      accuracy integer not null default 0,
      created_at timestamptz not null default now()
    )
  `;
  await sql`alter table scores add column if not exists player_name_key varchar(15)`;
  await sql`update scores set player_name_key = lower(trim(player_name)) where player_name_key is null`;
  await sql`create index if not exists scores_score_created_idx on scores (score desc, created_at asc)`;
  await sql`create index if not exists scores_name_key_idx on scores (player_name_key)`;
}

export function normalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function mergeProfiles(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = normalizeName(row.playerNameKey || row.playerName) || 'anonymous';
    const group = groups.get(key) || { rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  });

  return [...groups.values()].map((group) => {
    const history = group.rows
      .sort((a, b) => b.score - a.score || new Date(b.playedAt) - new Date(a.playedAt))
      .map((row) => ({ id: row.id, score: row.score, hits: row.hits, attempts: row.attempts, accuracy: row.accuracy, playedAt: row.playedAt }));
    const latest = [...group.rows].sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))[0];
    return {
      playerName: latest?.playerName || 'Anonymous',
      topScore: history[0]?.score || 0,
      totalGames: history.length,
      averageAccuracy: history.length ? Math.round(history.reduce((sum, entry) => sum + (Number(entry.accuracy) || 0), 0) / history.length) : 0,
      lastPlayed: latest?.playedAt || null,
      history,
    };
  }).sort((a, b) => b.topScore - a.topScore || new Date(b.lastPlayed || 0) - new Date(a.lastPlayed || 0));
}

export function cleanPayload(body = {}) {
  const playerName = String(body.playerName || 'Anonymous').trim().slice(0, 15) || 'Anonymous';
  const playerNameKey = String(body.playerNameKey || playerName).trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 15);
  const numberOr = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : fallback;
  return {
    playerName,
    playerNameKey,
    score: numberOr(body.score),
    hits: Math.max(0, numberOr(body.hits)),
    attempts: Math.max(0, numberOr(body.attempts)),
    accuracy: Math.max(0, Math.min(100, numberOr(body.accuracy))),
  };
}

export async function storeScore(sql, payload) {
  if (!sql) return { saved: false, configured: false };
  await ensureSchema(sql);
  await sql`
    insert into scores (player_name, player_name_key, score, hits, attempts, accuracy)
    values (${payload.playerName}, ${payload.playerNameKey}, ${payload.score}, ${payload.hits}, ${payload.attempts}, ${payload.accuracy})
  `;
  return { saved: true, configured: true };
}

export async function sendTelegram(payload) {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();
  if (!token || !chatId) return { sent: false, configured: false };
  const text = [
    'COLOR RUSH — NEW SCORE', '',
    `Player: ${payload.playerName}`,
    `Score: ${payload.score} points`,
    `Hits: ${payload.hits}/${payload.attempts} (${payload.accuracy}% accuracy)`,
    `Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
  ].join('\n');
  const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  const telegramBody = await telegramResponse.json().catch(() => ({}));
  if (!telegramResponse.ok || !telegramBody.ok) {
    const description = String(telegramBody.description || `HTTP ${telegramResponse.status}`).slice(0, 180);
    throw new Error(`Telegram ${telegramBody.error_code || telegramResponse.status}: ${description}`);
  }
  return { sent: true, configured: true };
}
