# Leaderboard UI verification

Date: 2026-09-05

The local rules page was opened after the fullscreen landing screen. The background prefetch populated the `LIVE TOP 3` preview immediately before setup. The preview showed grouped profile summaries with rank, name, total runs, average accuracy, top score, and a profile arrow. Existing local data combined two `Test Player` runs into one profile (`2 runs · 50% avg`, top score 5), confirming repeat-run grouping behavior in the fallback path.
