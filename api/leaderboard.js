import { neon } from '@neondatabase/serverless';

function databaseClient() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
  return connectionString ? neon(connectionString) : null;
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ ok: false, error: 'Method not allowed' });
  const sql = databaseClient();
  if (!sql) return response.status(503).json({ ok: false, error: 'Database is not configured' });

  try {
    const rows = await sql`
      select player_name as "playerName", score, hits, attempts, accuracy, created_at as "createdAt"
      from scores
      order by score desc, created_at asc
      limit 10
    `;
    return response.status(200).json({ ok: true, scores: rows });
  } catch (error) {
    console.error('leaderboard error', error);
    return response.status(500).json({ ok: false, error: 'Could not load leaderboard' });
  }
}
