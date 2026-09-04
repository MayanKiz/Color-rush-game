# Color Rush — Reflex Arena

Color Rush is a fast neon reflex game. The player has 30 seconds to select matching orbs. Correct hits award **+5 points**, wrong hits deduct **3 points**, and consecutive hits build a streak.

## What is connected now

The game uses a server-side API layer for scores. The browser posts each completed result to `/api/submit-score`. That function validates the payload, saves it to the hosted Postgres database, and sends the same result to Telegram. The browser never receives the database connection string or Telegram bot token.

The leaderboard is fetched from `/api/leaderboard` and is visible in two places: a **Live Top 5** preview directly on the result screen and the full **Top Players** screen. If the database is unavailable, the game automatically shows the local browser leaderboard instead.

## Connect a database through Vercel

Vercel's old built-in Vercel Postgres product is no longer offered for new projects; the current route is a Postgres provider from the Vercel Marketplace, such as Neon. See [Vercel's Postgres documentation](https://vercel.com/docs/postgres) and the [Neon Vercel Marketplace integration](https://vercel.com/marketplace/neon).

In Vercel, open the project connected to this repository, choose **Integrations / Marketplace**, install **Neon**, and choose **Create New Neon Account** if you do not already have Neon. The integration injects a database connection variable into the project. This code accepts `DATABASE_URL`, `POSTGRES_URL`, or `NEON_DATABASE_URL`; `DATABASE_URL` is the recommended name for a manual setup.

After the database is created, open the Neon SQL editor and run the contents of [`database/schema.sql`](database/schema.sql). This creates the `scores` table used by both API functions. Then redeploy the project. Vercel environment-variable changes only apply to new deployments, so a redeploy is required after adding or changing them. [1]

## Connect Telegram score delivery

Create a bot with [BotFather](https://t.me/BotFather), add it to the destination chat, group, or channel, and give it permission to send messages. Add these variables in Vercel Project Settings → Environment Variables:

```text
TELEGRAM_BOT_TOKEN=your_real_bot_token
TELEGRAM_CHAT_ID=your_chat_or_channel_id
```

Select **Production** and **Preview** if you want the integration in both environments. Keep the real token out of GitHub and frontend code. If Telegram is not configured, the leaderboard still works and the result screen will say that Telegram is not connected yet.

## Deploy and verify

Push the repository to the Vercel project or trigger a redeploy from the dashboard. Open the deployed URL, play one round, and check that the result screen shows the score in **Live Top 5**. Open **View all** to see the hosted leaderboard. The serverless endpoint can also be checked by completing a round; a successful hosted save is reflected on the next leaderboard load.

The game now includes a Back control from setup to rules, from the game to setup, from results to setup, and from the full leaderboard back to results. Screen entrances, card glow, orb hits, score deltas, timer urgency, and pause overlays have smooth motion while reduced-motion preferences are respected.

## Sources

[1]: https://vercel.com/docs/environment-variables "Vercel Environment Variables"
