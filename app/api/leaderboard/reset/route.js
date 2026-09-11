import { archiveAndReset, databaseClient, istDate } from '../../../../lib/leaderboard-server.js';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  const configuredSecret = String(process.env.CRON_SECRET || '').trim();
  const auth = request.headers.get('authorization') || '';
  if (configuredSecret && auth !== `Bearer ${configuredSecret}`) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const sql = databaseClient();
  if (!sql) return Response.json({ ok: false, error: 'Database is not configured' }, { status: 503 });
  try {
    const result = await archiveAndReset(sql, istDate(new Date(Date.now() - 86400000)));
    return Response.json({ ok: true, ...result, ranAt: new Date().toISOString() });
  } catch (error) {
    console.error('leaderboard reset error', error);
    return Response.json({ ok: false, error: 'Could not archive leaderboard' }, { status: 500 });
  }
}
