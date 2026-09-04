create table if not exists scores (
  id bigserial primary key,
  player_name varchar(15) not null,
  score integer not null default 0,
  hits integer not null default 0,
  attempts integer not null default 0,
  accuracy integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists scores_score_created_idx on scores (score desc, created_at asc);
