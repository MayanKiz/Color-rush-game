import { databaseClient, ensureSchema, formatIstDate, getRankedScores, istDate } from '../../../lib/leaderboard-server.js';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  const sql = databaseClient();
  if (!sql) return Response.json({ ok: false, error: 'Database is not configured' }, { status: 503 });
  const requestedDate = new URL(request.url).searchParams.get('date') || istDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) return Response.json({ ok: false, error: 'Invalid date' }, { status: 400 });
  try {
    await ensureSchema(sql);
    const scores = await getRankedScores(sql, requestedDate);
    const dates = (await sql`select to_char(date, 'YYYY-MM-DD') as date from leaderboard_history order by date desc limit 90`).map((row) => ({ value: row.date, label: formatIstDate(row.date) }));
    const today = istDate();
    return Response.json({ ok: true, date: requestedDate, dateLabel: requestedDate === today ? `Today's Leaderboard · ${formatIstDate(today)}` : formatIstDate(requestedDate), scores, dates: [{ value: today, label: `Today · ${formatIstDate(today)}` }, ...dates.filter((item) => item.value !== today)] });
  } catch (error) {
    console.error('leaderboard error', error);
    return Response.json({ ok: false, error: 'Could not load leaderboard' }, { status: 500 });
  }
}
