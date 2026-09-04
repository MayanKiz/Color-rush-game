# Color Rush — Reflex Arena

Color Rush is a fast neon reflex game. The player has 30 seconds to select matching orbs. Correct hits award **+5 points**, wrong hits deduct **3 points**, and consecutive hits build a streak.

## Startup flow

The game now opens with a fullscreen landing card. Selecting **Open full screen** activates browser fullscreen and then reveals the rules screen. After the player reads the rules, the player setup screen appears. The timer begins only after a valid name is entered and **Start challenge** is pressed. A **Continue in window** fallback is available when the browser blocks fullscreen.

## Telegram delivery

A completed score is posted to `/api/submit-score`. The serverless function stores the result in Neon Postgres when configured and independently sends the score to Telegram when Telegram is configured. A database failure no longer prevents Telegram delivery.

Configure these Vercel environment variables in **Project Settings → Environment Variables** for both the Production and Preview environments:

```text
TELEGRAM_BOT_TOKEN=your_real_bot_token
TELEGRAM_CHAT_ID=your_chat_or_channel_id
```

The Bot API requires the destination `chat_id` and message text for `sendMessage`. [1] The bot must be able to access the destination: start a private chat with it, add it to a group, or add it to a channel with permission to post.

After deploying, open this diagnostic URL in the same Vercel project:

```text
https://YOUR-DOMAIN.vercel.app/api/telegram-health
```

A successful response returns `ok: true`, the bot username, and the destination chat type. If the response reports a missing variable, invalid token, or inaccessible chat, fix that exact Vercel setting or Telegram permission and redeploy. Do not put the real token in GitHub or frontend JavaScript.

## Hosted leaderboard

The browser reads `/api/leaderboard`, while `/api/submit-score` writes the result. Run [`database/schema.sql`](database/schema.sql) once in the Neon SQL editor. The project accepts `DATABASE_URL`, `POSTGRES_URL`, or `NEON_DATABASE_URL`. If hosted services are unavailable, the game falls back to local browser scores.

## Verification

The final browser flow was verified as fullscreen landing → rules → setup → Start challenge → timer/game. The target color label and matching swatch are shown above the board, and `rao.mynkk` remains in the footer Instagram mark.

## Sources

[1]: https://core.telegram.org/bots/api#sendmessage "Telegram Bot API — sendMessage"
