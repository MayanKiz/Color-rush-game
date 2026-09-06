import { databaseClient, ensureSchema, mergeProfiles } from '../../../lib/leaderboard-server.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sql = databaseClient();
  if (!sql) return Response.json({ ok: false, error: 'Database is not configured' }, { status: 503 });
  try {
    await ensureSchema(sql);
    const rows = await sql`
      select id, player_name as "playerName", player_name_key as "playerNameKey", score, hits, attempts, accuracy, created_at as "playedAt"
      from scores
      order by score desc, created_at desc
      limit 5000
    `;
    const profiles = mergeProfiles(rows);
    return Response.json({ ok: true, profiles, scores: profiles });
  } catch (error) {
    console.error('leaderboard error', error);
    return Response.json({ ok: false, error: 'Could not load leaderboard' }, { status: 500 });
  }
}
