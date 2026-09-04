# Color Rush implementation plan

## Completed scope

- Replace the partial screen flow with a complete start, play, result, and leaderboard experience.
- Add progressive visual feedback, timer progress, streaks, pause/resume, quit-round handling, keyboard support, and mobile-friendly controls.
- Preserve Supabase online scores while adding a local-storage fallback.
- Add a server-side Telegram score endpoint using environment variables only.
- Add generated neon arena art as the visual direction and page background.

## Verification criteria

- The game starts from the rules screen and accepts a valid player name.
- Each board always contains at least one target-color orb.
- Correct and incorrect taps update score, streak, feedback, and accessibility labels.
- Timer reaches zero exactly once and produces a result screen.
- Results are saved locally even when external services are unavailable.
- Telegram credentials are not present in frontend code or committed configuration.
- `/api/submit-score` rejects non-POST requests and handles missing configuration safely.
- Layout works at desktop and narrow mobile widths.
