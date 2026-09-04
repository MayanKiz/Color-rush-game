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
  if (!sql) return { saved: false, configured: false };
  await sql`
    insert into scores (player_name, score, hits, attempts, accuracy)
    values (${payload.playerName}, ${payload.score}, ${payload.hits}, ${payload.attempts}, ${payload.accuracy})
  `;
  return { saved: true, configured: true };
}

async function sendTelegram(payload) {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();
  if (!token || !chatId) return { sent: false, configured: false };

  const text = [
    '🎨 COLOR RUSH — NEW SCORE', '',
    `Player: ${payload.playerName}`,
    `Score: ${payload.score} points`,
    `Hits: ${payload.hits}/${payload.attempts} (${payload.accuracy}% accuracy)`,
    `Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
  ].join('\n');

  // Telegram bot tokens contain a colon. Keep the token unencoded in the path.
  const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
  });
  const telegramBody = await telegramResponse.json().catch(() => ({}));
  if (!telegramResponse.ok || !telegramBody.ok) {
    const description = String(telegramBody.description || `HTTP ${telegramResponse.status}`).slice(0, 180);
    throw new Error(`Telegram ${telegramBody.error_code || telegramResponse.status}: ${description}`);
  }
  return { sent: true, configured: true };
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ ok: false, error: 'Method not allowed' });

  let payload;
  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body || {};
    payload = cleanPayload(body);
  } catch (_) {
    return response.status(400).json({ ok: false, error: 'Invalid score payload' });
  }

  let database = { saved: false, configured: false, error: null };
  let telegram = { sent: false, configured: false, error: null };

  try { database = await storeScore(databaseClient(), payload); }
  catch (error) { database.error = String(error.message || 'Database insert failed').slice(0, 180); console.error('database error', error); }

  try { telegram = await sendTelegram(payload); }
  catch (error) { telegram.error = String(error.message || 'Telegram send failed').slice(0, 180); console.error('telegram error', error); }

  const delivered = database.saved || telegram.sent;
  if (!delivered) {
    return response.status(503).json({
      ok: false,
      error: 'No score destination is available',
      databaseSaved: false,
      telegramSent: false,
      telegramConfigured: telegram.configured,
      databaseError: database.error,
      telegramError: telegram.error
    });
  }

  return response.status(200).json({
    ok: true,
    databaseSaved: database.saved,
    telegramSent: telegram.sent,
    telegramConfigured: telegram.configured
  });
}
