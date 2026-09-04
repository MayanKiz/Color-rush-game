# Memory

The original repository used direct Supabase browser calls. The current implementation intentionally routes leaderboard reads and score writes through Vercel serverless functions backed by Neon Postgres. This matches the current Vercel Marketplace database path and keeps the connection string server-side. The browser still keeps a local-storage fallback for previews and for deployments that have not yet configured the database.

`database/schema.sql` must be run once in the Neon SQL editor. The server functions accept `DATABASE_URL`, `POSTGRES_URL`, or `NEON_DATABASE_URL`. Telegram remains optional and is handled by the same score-submission function.

The browser flow was verified through setup, game, result, Live Top 5 preview, full leaderboard, and Back navigation. Static local preview cannot execute the serverless functions, so it correctly displays local scores and the unconfigured-service notice until the project runs through Vercel.
