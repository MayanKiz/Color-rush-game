import { cleanPayload, databaseClient, sendTelegram, storeScore } from '../../../lib/leaderboard-server.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let payload;
  try {
    payload = cleanPayload(await request.json());
  } catch {
    return Response.json({ ok: false, error: 'Invalid score payload' }, { status: 400 });
  }

  let database = { saved: false, configured: false, error: null };
  let telegram = { sent: false, configured: false, error: null };
  try {
    database = await storeScore(databaseClient(), payload);
  } catch (error) {
    database.error = String(error.message || 'Database insert failed').slice(0, 180);
    console.error('database error', error);
  }
  try {
    telegram = await sendTelegram(payload);
  } catch (error) {
    telegram.error = String(error.message || 'Telegram send failed').slice(0, 180);
    console.error('telegram error', error);
  }

  const delivered = database.saved || telegram.sent;
  if (!delivered) {
    return Response.json({
      ok: false,
      error: 'No score destination is available',
      databaseSaved: false,
      telegramSent: false,
      telegramConfigured: telegram.configured,
      databaseError: database.error,
      telegramError: telegram.error,
    }, { status: 503 });
  }
  return Response.json({ ok: true, databaseSaved: database.saved, telegramSent: telegram.sent, telegramConfigured: telegram.configured });
}
