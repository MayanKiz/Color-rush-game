# Color Rush structure

The project remains intentionally lightweight so it can run as a static Vercel deployment with one serverless function. `index.html` owns the semantic screens and controls. `style.css` owns the visual system, responsive layout, orb states, animations, and generated arena background. `script.js` owns all game state and navigation, including board generation, timer, scoring, pause state, result calculations, local storage, Supabase synchronization, and the Telegram request.

The `api/submit-score.js` function is the only place that talks to the Telegram Bot API. It validates and bounds the incoming score payload, reads `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` from the deployment environment, and returns a small success or failure response. No bot credential is sent to the browser.

`assets/color-rush-bg.png` supplies the generated neon arena atmosphere. The game itself uses CSS-rendered orbs so color matching remains sharp, fast, accessible, and responsive at any screen size.
