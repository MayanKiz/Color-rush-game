# Color Rush structure

The project stays lightweight for Vercel: `index.html` provides the semantic screens and navigation controls, `style.css` provides the responsive neon visual system and motion, and `script.js` owns game state, scoring, local fallback storage, navigation, and calls to the serverless API.

`api/submit-score.js` validates a completed result, inserts it into Neon Postgres, and sends the same result to Telegram using server-only environment variables. `api/leaderboard.js` reads the top ten rows from Neon and returns them to the browser. The client renders the response as a Live Top 5 preview on the result screen and as the full leaderboard screen. If either hosted route is not configured, local storage keeps the game playable and visible.

`database/schema.sql` is the one-time SQL migration. `assets/color-rush-bg.png` supplies the generated neon arena atmosphere. The interactive orbs are CSS-rendered so the target colors remain sharp and responsive.
