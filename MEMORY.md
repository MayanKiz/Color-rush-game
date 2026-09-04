# Memory

The original repository was a static HTML/CSS/JavaScript game with Supabase calls already present. Its audio files live under `Public/`, but the new implementation uses the Web Audio API instead, avoiding broken relative audio paths and autoplay failures.

The repository has no package manifest, so validation is performed with syntax checks and a local HTTP preview. Telegram delivery requires Vercel-style serverless execution and two deployment environment variables; a plain static file server cannot execute the endpoint. The local leaderboard is deliberately retained as a reliable fallback.
