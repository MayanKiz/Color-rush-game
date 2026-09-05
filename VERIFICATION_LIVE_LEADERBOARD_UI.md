# Live leaderboard UI verification

Date: 2026-09-05

The live deployed game was opened with a cache-busting query. After selecting `Continue in window`, the rules page immediately displayed `LIVE TOP 3` with `READY`, showing:

1. Mynk tyagi — 1 run, 100% average, top score 135
2. Mayank — 1 run, 100% average, top score 115
3. Developer — 2 runs, 100% average, top score 110

This confirms the leaderboard is prefetched in the background and displayed before setup/round start.
