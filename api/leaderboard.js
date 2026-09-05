import { neon } from '@neondatabase/serverless';

function connectionString() {
  return process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.NEON_DATABASE_URL;
}

function databaseClient() {
  const url = connectionString();
  return url ? neon(url) : null;
}

async function ensureSchema(sql) {
  await sql`
    create table if not exists scores (
      id bigserial primary key,
      player_name varchar(15) not null,
      player_name_key varchar(15),
      score integer not null default 0,
      hits integer not null default 0,
      attempts integer not null default 0,
      accuracy integer not null default 0,
      created_at timestamptz not null default now()
    )
  `;
  await sql`alter table scores add column if not exists player_name_key varchar(15)`;
  await sql`update scores set player_name_key = lower(trim(player_name)) where player_name_key is null`;
  await sql`create index if not exists scores_score_created_idx on scores (score desc, created_at asc)`;
  await sql`create index if not exists scores_name_key_idx on scores (player_name_key)`;
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function mergeProfiles(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = normalizeName(row.playerNameKey || row.playerName) || 'anonymous';
    const group = groups.get(key) || { rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  });

  return [...groups.values()].map((group) => {
    const history = group.rows
      .sort((a, b) => b.score - a.score || new Date(b.playedAt) - new Date(a.playedAt))
      .map((row) => ({ id: row.id, score: row.score, hits: row.hits, attempts: row.attempts, accuracy: row.accuracy, playedAt: row.playedAt }));
    const latest = [...group.rows].sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))[0];
    return {
      playerName: latest?.playerName || 'Anonymous',
      topScore: history[0]?.score || 0,
      totalGames: history.length,
      averageAccuracy: history.length ? Math.round(history.reduce((sum, entry) => sum + (Number(entry.accuracy) || 0), 0) / history.length) : 0,
      lastPlayed: latest?.playedAt || null,
      history
    };
  }).sort((a, b) => b.topScore - a.topScore || new Date(b.lastPlayed || 0) - new Date(a.lastPlayed || 0));
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ ok: false, error: 'Method not allowed' });
  const sql = databaseClient();
  if (!sql) return response.status(503).json({ ok: false, error: 'Database is not configured' });

  try {
    await ensureSchema(sql);
    const rows = await sql`
      select id, player_name as "playerName", player_name_key as "playerNameKey", score, hits, attempts, accuracy, created_at as "playedAt"
      from scores
      order by score desc, created_at desc
      limit 5000
    `;
    const profiles = mergeProfiles(rows);
    return response.status(200).json({ ok: true, profiles, scores: profiles });
  } catch (error) {
    console.error('leaderboard error', error);
    return response.status(500).json({ ok: false, error: 'Could not load leaderboard' });
  }
}
