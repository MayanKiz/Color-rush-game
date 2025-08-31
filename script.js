const showStartBtn = document.getElementById("showStart");
const startBtn = document.getElementById("startBtn");
const playerNameInput = document.getElementById("playerName");
const gameScreen = document.getElementById("game-screen");
const startScreen = document.getElementById("start-screen");
const rulesScreen = document.getElementById("rules-screen");
const targetColorElem = document.getElementById("targetColor");
const gameArea = document.getElementById("game-area");
const scoreElem = document.getElementById("score");
const timeElem = document.getElementById("timeLeft");
const scoreList = document.getElementById("scoreList");

const BOT_TOKEN = "7471112121:AAHXaDVEV7dQTBdpP38OBvytroRUSu-2jYo";
const CHAT_ID = "7643222418";

const colors = ["red", "blue", "green", "yellow", "purple", "orange"];
let targetColor = "";
let score = 0;
let timeLeft = 30;
let timer = null;
let playerName = "";

showStartBtn.addEventListener("click", () => {
  rulesScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
});

function startGame() {
  playerName = playerNameInput.value.trim();
  if (!playerName) {
    alert("Please enter your name!");
    return;
  }

  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  score = 0;
  scoreElem.textContent = score;
  timeLeft = 30;
  timeElem.textContent = timeLeft;

  setTargetColor();
  generateCircles();

  timer = setInterval(() => {
    timeLeft--;
    timeElem.textContent = timeLeft;

    if (timeLeft <= 0) endGame();
  }, 1000);
}

function setTargetColor() {
  targetColor = colors[Math.floor(Math.random() * colors.length)];
  targetColorElem.textContent = targetColor;
  targetColorElem.style.color = targetColor;
}

function generateCircles() {
  gameArea.innerHTML = "";
  for (let i = 0; i < 25; i++) {
    const circle = document.createElement("div");
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    circle.classList.add("circle");
    circle.style.backgroundColor = randomColor;

    circle.addEventListener("click", () => {
      if (navigator.vibrate) navigator.vibrate(60);
      circle.classList.add("blink");
      setTimeout(() => circle.classList.remove("blink"), 150);

      if (randomColor === targetColor) {
        score += 5;
      } else {
        score -= 3;
      }

      scoreElem.textContent = score;
      setTargetColor();
      generateCircles();
    });

    gameArea.appendChild(circle);
  }
}

function endGame() {
  clearInterval(timer);
  alert(`⏳ Time's up!\n${playerName}, your score: ${score}`);
  sendToTelegram(playerName, score);
  gameScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
  displayLeaderboard();
}

// ✅ Send Score to Telegram
function sendToTelegram(name, score) {
  const message = `SCORE|${name}|${score}`;
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(message)}`);
}

// ✅ Fetch Leaderboard from Telegram
async function displayLeaderboard() {
  scoreList.innerHTML = "<li>Loading leaderboard...</li>";

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
    const data = await res.json();

    let scores = [];
    data.result.forEach(update => {
      if (update.message && update.message.text && update.message.text.startsWith("SCORE|")) {
        const parts = update.message.text.split("|");
        if (parts.length === 3) {
          scores.push({ name: parts[1], score: parseInt(parts[2]) });
        }
      }
    });

    scores.sort((a, b) => b.score - a.score);
    const topFive = scores.slice(0, 5);

    scoreList.innerHTML = "";
    topFive.forEach((player, index) => {
      const li = document.createElement("li");
      li.textContent = `#${index + 1} ${player.name}: ${player.score}`;
      scoreList.appendChild(li);
    });

    if (topFive.length === 0) {
      scoreList.innerHTML = "<li>No scores yet</li>";
    }
  } catch (error) {
    scoreList.innerHTML = "<li>Error loading leaderboard</li>";
    console.error(error);
  }
}

startBtn.addEventListener("click", startGame);
window.onload = displayLeaderboard;