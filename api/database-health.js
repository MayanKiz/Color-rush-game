import { neon } from '@neondatabase/serverless';

function connectionString() {
  return process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.NEON_DATABASE_URL;
}

async function ensureSchema(sql) {
  await sql`
    create table if not exists scores (
      id bigserial primary key,
      player_name varchar(15) not null,
      score integer not null default 0,
      hits integer not null default 0,
      attempts integer not null default 0,
      accuracy integer not null default 0,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists scores_score_created_idx on scores (score desc, created_at asc)`;
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ ok: false, error: 'Method not allowed' });
  const url = connectionString();
  if (!url) return response.status(503).json({ ok: false, databaseConfigured: false, error: 'No Neon/Postgres environment variable found' });

  try {
    const sql = neon(url);
    await sql`select 1 as connected`;
    await ensureSchema(sql);
    const rows = await sql`select count(*)::int as count from scores`;
    return response.status(200).json({ ok: true, databaseConfigured: true, scoresTable: true, rowCount: rows[0]?.count || 0 });
  } catch (error) {
    console.error('database health error', error);
    return response.status(502).json({ ok: false, databaseConfigured: true, scoresTable: false, error: String(error.message || 'Database connection failed').slice(0, 180) });
  }
}
