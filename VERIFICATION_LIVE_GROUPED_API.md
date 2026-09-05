# Live grouped leaderboard API verification

Date: 2026-09-05

Live endpoint: `https://color-rush-gameee.vercel.app/api/leaderboard?v=ad1fa35`

The cache-busted deployment returns `profiles` and `scores` with aggregated records. Examples:

- `Developer` is grouped into one profile with `topScore: 110`, `totalGames: 2`, and two history rows.
- `Mynk` is grouped into one profile with `topScore: 110`, `totalGames: 2`, and scores 110 and 100.
- `Panda` is grouped into one profile with `topScore: 90`, `totalGames: 2`, and scores 90 and 89.

Each profile includes `playerName`, `topScore`, `totalGames`, `averageAccuracy`, `lastPlayed`, and `history`. The default no-query route may briefly show stale cached output; the application uses `cache: no-store`, and a hard refresh/cache-busting request returns the updated API shape.
