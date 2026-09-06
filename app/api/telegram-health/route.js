function telegramUrl(token, method) {
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function telegramCall(token, method, payload) {
  const response = await fetch(telegramUrl(token, method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.ok) throw new Error(String(body.description || `Telegram HTTP ${response.status}`).slice(0, 180));
  return body.result;
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();
  if (!token || !chatId) return Response.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing' }, { status: 503 });
  try {
    const bot = await telegramCall(token, 'getMe');
    const chat = await telegramCall(token, 'getChat', { chat_id: chatId });
    return Response.json({ ok: true, bot: { username: bot.username, id: bot.id }, chat: { id: chat.id, title: chat.title || chat.username || chat.first_name, type: chat.type } });
  } catch (error) {
    console.error('telegram health error', error);
    return Response.json({ ok: false, error: String(error.message || 'Telegram configuration failed').slice(0, 180) }, { status: 502 });
  }
}
