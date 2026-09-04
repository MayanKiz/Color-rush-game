export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return response.status(503).json({ ok: false, error: 'Telegram is not configured' });
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body || {};
    const playerName = String(body.playerName || 'Anonymous').trim().slice(0, 15) || 'Anonymous';
    const score = Number.isFinite(Number(body.score)) ? Math.trunc(Number(body.score)) : 0;
    const hits = Number.isFinite(Number(body.hits)) ? Math.max(0, Math.trunc(Number(body.hits))) : 0;
    const attempts = Number.isFinite(Number(body.attempts)) ? Math.max(0, Math.trunc(Number(body.attempts))) : 0;
    const accuracy = Number.isFinite(Number(body.accuracy)) ? Math.max(0, Math.min(100, Math.trunc(Number(body.accuracy)))) : 0;
    const text = [
      '🎨 COLOR RUSH — NEW SCORE',
      '',
      `Player: ${playerName}`,
      `Score: ${score} points`,
      `Hits: ${hits}/${attempts} (${accuracy}% accuracy)`,
      `Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
    ].join('\n');

    const telegramResponse = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    const telegramBody = await telegramResponse.json();
    if (!telegramResponse.ok || !telegramBody.ok) {
      return response.status(502).json({ ok: false, error: 'Telegram rejected the message' });
    }
    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error('submit-score error', error);
    return response.status(400).json({ ok: false, error: 'Invalid score payload' });
  }
}
