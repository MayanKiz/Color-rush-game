import { databaseClient, ensureSchema, formatIstDate, getLeaderboardDates, getRankedScores, istDate } from '../../../lib/leaderboard-server.js';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  const sql = databaseClient();
  if (!sql) return Response.json({ ok: false, error: 'Database is not configured' }, { status: 503 });
  const requestedDate = new URL(request.url).searchParams.get('date') || istDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) return Response.json({ ok: false, error: 'Invalid date' }, { status: 400 });
  try {
    await ensureSchema(sql);
    const scores = await getRankedScores(sql, requestedDate);
    const storedDates = await getLeaderboardDates(sql);
    const today = istDate();
    const todayCount = requestedDate === today ? scores.length : (storedDates.find((item) => item.value === requestedDate)?.totalPlayed || scores.length);
    const dates = storedDates.map((item) => ({ ...item, label: `${formatIstDate(item.value)} · ${item.totalPlayed} played` }));
    const todayItem = { value: today, totalPlayed: today === requestedDate ? scores.length : (storedDates.find((item) => item.value === today)?.totalPlayed || 0), label: `Today · ${formatIstDate(today)} · ${today === requestedDate ? scores.length : (storedDates.find((item) => item.value === today)?.totalPlayed || 0)} played` };
    return Response.json({ ok: true, date: requestedDate, totalPlayed: todayCount, dateLabel: requestedDate === today ? `Today's Leaderboard · ${formatIstDate(today)}` : `${formatIstDate(requestedDate)} · ${todayCount} played`, scores, dates: [todayItem, ...dates.filter((item) => item.value !== today)] });
  } catch (error) {
    console.error('leaderboard error', error);
    return Response.json({ ok: false, error: 'Could not load leaderboard' }, { status: 500 });
  }
}
