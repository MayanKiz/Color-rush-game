// Elements
const startBtn = document.getElementById("startBtn");
const playerName = document.getElementById("playerName");
const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const leaderboard = document.getElementById("leaderboard");
const leaderList = document.getElementById("leaderList");
const correctBtn = document.getElementById("correctBtn");
const wrongBtn = document.getElementById("wrongBtn");
const scoreEl = document.getElementById("score");
const timerEl = document.getElementById("timer");

// Sounds
const correctSound = document.getElementById("correctSound");
const wrongSound = document.getElementById("wrongSound");

// Telegram Bot Config
const BOT_TOKEN = "7471112121:AAHXaDVEV7dQTBdpP38OBvytroRUSu-2jYo";  // <-- Replace with your token
const CHAT_ID = "7643222418";      // <-- Replace with your chat ID

let score = 0;
let time = 30;
let player = "";
let countdown;

// Start Game
startBtn.addEventListener("click", () => {
  player = playerName.value.trim();
  if (player === "") {
    alert("Please enter your name!");
    return;
  }

  startScreen.style.display = "none";
  gameScreen.style.display = "block";

  score = 0;
  scoreEl.textContent = `Score: ${score}`;
  timerEl.textContent = `Time: ${time}s`;

  startTimer();
});

// Correct Click
correctBtn.addEventListener("click", () => {
  score += 10;
  scoreEl.textContent = `Score: ${score}`;
  correctSound.currentTime = 0;
  correctSound.play();
  navigator.vibrate(50);
});

// Wrong Click
wrongBtn.addEventListener("click", () => {
  score -= 5;
  scoreEl.textContent = `Score: ${score}`;
  wrongSound.currentTime = 0;
  wrongSound.play();
  navigator.vibrate([150, 100, 150]);
});

// Timer Function
function startTimer() {
  countdown = setInterval(() => {
    time--;
    timerEl.textContent = `Time: ${time}s`;

    if (time <= 0) {
      clearInterval(countdown);
      endGame();
    }
  }, 1000);
}

// End Game
function endGame() {
  gameScreen.style.display = "none";
  leaderboard.style.display = "block";

  saveScore(player, score);
  sendScoreToTelegram(player, score);
  showLeaderboard();
}

// Save Score in LocalStorage
function saveScore(name, score) {
  let scores = JSON.parse(localStorage.getItem("scores")) || [];
  scores.push({ name, score });
  scores.sort((a, b) => b.score - a.score);
  scores = scores.slice(0, 5);
  localStorage.setItem("scores", JSON.stringify(scores));
}

// Show Top 5 Players
function showLeaderboard() {
  const scores = JSON.parse(localStorage.getItem("scores")) || [];
  leaderList.innerHTML = "";
  scores.forEach((s, i) => {
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${s.name} — ${s.score} pts`;
    leaderList.appendChild(li);
  });
}

// Send Score to Telegram
function sendScoreToTelegram(name, score) {
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: `🎮 *New Score Update* 🎮\n\n👤 Player: ${name}\n🏆 Score: ${score}`,
      parse_mode: "Markdown"
    })
  });
}