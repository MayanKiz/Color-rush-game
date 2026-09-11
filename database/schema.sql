create table if not exists scores (
  id bigserial primary key,
  player_name varchar(15) not null,
  player_name_key varchar(15),
  score integer not null default 0,
  hits integer not null default 0,
  attempts integer not null default 0,
  accuracy integer not null default 0,
  created_at timestamptz not null default now()
);
alter table scores add column if not exists player_name_key varchar(15);
update scores set player_name_key = lower(trim(player_name)) where player_name_key is null;
create index if not exists scores_score_created_idx on scores (score desc, created_at asc);
create index if not exists scores_name_key_idx on scores (player_name_key);
create table if not exists current_leaderboard (id bigserial primary key, user_id varchar(64) not null, username varchar(15) not null, score integer not null default 0, hits integer not null default 0, attempts integer not null default 0, accuracy integer not null default 0, played_at timestamptz not null default now());
create index if not exists current_leaderboard_score_idx on current_leaderboard (score desc, played_at asc);
create table if not exists leaderboard_history (date date primary key, scores jsonb not null default '[]'::jsonb, created_at timestamptz not null default now());
