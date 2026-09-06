# Color Rush — Reflex Arena

Color Rush is a fast, focused colour-matching reflex game. You get 30 seconds to find matching orbs, earn **+5** for a correct hit, lose **3** for a miss, and build a streak when your eyes stay locked in.

## Next.js app

The project is now a Next.js App Router application. The interactive game lives in `app/page.js`, the visual system is in `app/globals.css`, the deployment shell is in `app/layout.js`, and the hosted leaderboard endpoints live under `app/api/`. Assets used by the client are served from `public/`.

Run it locally with:

```bash
npm install
npm run dev
```

The production check is:

```bash
npm run build
```

## UX flow

The opening screen introduces an optional fullscreen mode, followed by a calm rules screen and player setup. The rules screen intentionally shows only the **single top player** in a compact leaderboard preview. Selecting **View all** opens the dedicated global rankings screen, where each player can be opened to inspect their run history. The challenge itself keeps the target colour, timer, score, streak, pause state, and 5×5 orb board visible without visual clutter.

## Hosted leaderboard

The browser reads `GET /api/leaderboard`, while `POST /api/submit-score` persists completed rounds. Neon/Postgres is accepted through `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, or `NEON_DATABASE_URL`. The API automatically creates the `scores` table and indexes if needed; running [`database/schema.sql`](database/schema.sql) once in the Neon SQL editor is still recommended.

If the hosted database is unavailable, the browser falls back to local scores in `localStorage` and labels the full leaderboard as `LOCAL CACHE`. The diagnostic route is:

```text
https://YOUR-DOMAIN.vercel.app/api/database-health
```

A healthy response includes `ok: true`, `databaseConfigured: true`, `scoresTable: true`, and a `rowCount`.

## Telegram delivery

When configured, each completed score is independently sent to Telegram after the database attempt. Add these variables in Vercel Project Settings for both Production and Preview:

```text
TELEGRAM_BOT_TOKEN=your_real_bot_token
TELEGRAM_CHAT_ID=your_chat_or_channel_id
```

The bot must have access to the destination chat. Verify the integration at:

```text
https://YOUR-DOMAIN.vercel.app/api/telegram-health
```

Do not place real secrets in GitHub or frontend JavaScript. [1]

## Verification

The browser smoke test covered the immersive entry screen, compact one-player preview, separate full leaderboard, setup validation, first-time guide, countdown overlay, live arena interactions, score/streak updates, result metrics, local fallback, and profile history. `npm run build` also passes with routes for `/`, `/api/leaderboard`, `/api/submit-score`, `/api/database-health`, and `/api/telegram-health`.

[1]: https://core.telegram.org/bots/api#sendmessage "Telegram Bot API — sendMessage"
