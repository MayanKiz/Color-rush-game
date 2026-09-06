import { connectionString, databaseClient, ensureSchema } from '../../../lib/leaderboard-server.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const configured = Boolean(connectionString());
  const sql = databaseClient();
  if (!sql) return Response.json({ ok: false, databaseConfigured: configured, error: 'No Neon/Postgres environment variable found' }, { status: 503 });
  try {
    await ensureSchema(sql);
    const rows = await sql`select count(*)::int as count from scores`;
    return Response.json({ ok: true, databaseConfigured: true, scoresTable: true, rowCount: Number(rows[0]?.count || 0) });
  } catch (error) {
    console.error('database health error', error);
    return Response.json({ ok: false, databaseConfigured: true, scoresTable: false, error: String(error.message || 'Database check failed').slice(0, 180) }, { status: 500 });
  }
}
