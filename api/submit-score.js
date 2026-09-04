import { neon } from '@neondatabase/serverless';

function databaseClient() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
  return connectionString ? neon(connectionString) : null;
}

function cleanPayload(body = {}) {
  const playerName = String(body.playerName || 'Anonymous').trim().slice(0, 15) || 'Anonymous';
  const numberOr = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : fallback;
  const score = numberOr(body.score);
  const hits = Math.max(0, numberOr(body.hits));
  const attempts = Math.max(0, numberOr(body.attempts));
  const accuracy = Math.max(0, Math.min(100, numberOr(body.accuracy)));
  return { playerName, score, hits, attempts, accuracy };
}

async function storeScore(sql, payload) {
  if (!sql) return false;
  await sql`
    insert into scores (player_name, score, hits, attempts, accuracy)
    values (${payload.playerName}, ${payload.score}, ${payload.hits}, ${payload.attempts}, ${payload.accuracy})
  `;
  return true;
}

async function sendTelegram(payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  const text = [
    '🎨 COLOR RUSH — NEW SCORE', '',
    `Player: ${payload.playerName}`,
    `Score: ${payload.score} points`,
    `Hits: ${payload.hits}/${payload.attempts} (${payload.accuracy}% accuracy)`,
    `Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
  ].join('\n');
  const telegramResponse = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text })
  });
  const telegramBody = await telegramResponse.json();
  if (!telegramResponse.ok || !telegramBody.ok) throw new Error('Telegram rejected the message');
  return true;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body || {};
    const payload = cleanPayload(body);
    const databaseReady = await storeScore(databaseClient(), payload);
    let telegramSent = false;
    try { telegramSent = await sendTelegram(payload); } catch (error) { console.error('telegram error', error); }
    if (!databaseReady && !telegramSent) return response.status(503).json({ ok: false, error: 'Database and Telegram are not configured' });
    return response.status(200).json({ ok: true, databaseSaved: databaseReady, telegramSent });
  } catch (error) {
    console.error('submit-score error', error);
    return response.status(400).json({ ok: false, error: 'Invalid score payload' });
  }
}
