# Browser verification notes

- The Next.js entry screen renders the new Color Rush shell with the deep-space background, editorial typography, warm gold/lilac accents, and responsive glass card.
- Continuing to the rules screen shows a compact leaderboard preview with only the top-player slot; the full rankings are not shown initially.
- The `View all` control opens a separate `GLOBAL RANKINGS` screen. With no hosted/local scores it shows an intentional empty state and a `LOCAL CACHE` status.
- The setup screen accepts a 2–15 character name and preserves the existing challenge settings copy.
- The first challenge shows the quick guide modal with the visual guide asset, then a full-screen countdown overlay before gameplay.
- Browser smoke test reached the live arena HUD with target lockup, timer, score, streak, 5×5 orb board, pause control, back control, and end-round action visible.
- Production build passed with Next.js App Router routes for `/`, `/api/leaderboard`, `/api/submit-score`, `/api/database-health`, and `/api/telegram-health`.

The live arena smoke test also confirmed the timer counts down, the target label and swatch render, a correct matching orb awards +5 and advances the round, the board regenerates, and the streak/feedback copy updates.

After the sample round completed, the result screen displayed final score, hits, accuracy, best score, and a single compact leaderboard row for the top player. The local fallback board populated correctly even without Neon configuration, and the dedicated `View all` action remained available.

The populated full leaderboard rendered the top player as a clean ranked row, and clicking that row opened the player profile with top score, total games, average accuracy, and run history. This confirms the separate leaderboard screen is not just a visual placeholder.
