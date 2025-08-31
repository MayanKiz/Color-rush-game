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
  fetchLeaderboard();
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
  fetchLeaderboard();
}

function sendToTelegram(name, score) {
  const message = `🎮 Score Update\n👤 Player: ${name}\n🏆 Score: ${score}`;
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(message)}`);
}

async function fetchLeaderboard() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
    const data = await res.json();

    scoreList.innerHTML = "";

    const messages = data.result
      .filter(msg => msg.message && msg.message.chat.id == CHAT_ID)
      .map(msg => msg.message.text)
      .filter(text => text.startsWith("🎮 Score Update"));

    const scores = messages.map(m => {
      const nameMatch = m.match(/👤 Player: (.*)/);
      const scoreMatch = m.match(/🏆 Score: (-?\d+)/);
      return {
        name: nameMatch ? nameMatch[1] : "Unknown",
        score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
      };
    });

    scores.sort((a, b) => b.score - a.score);

    const topFive = scores.slice(0, 5);
    topFive.forEach((player, index) => {
      const li = document.createElement("li");
      li.textContent = `#${index + 1} ${player.name}: ${player.score}`;
      scoreList.appendChild(li);
    });

    if (topFive.length === 0) {
      scoreList.innerHTML = "<li>No scores yet</li>";
    }
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    scoreList.innerHTML = "<li>⚠️ Unable to load leaderboard</li>";
  }
}

startBtn.addEventListener("click", startGame);
window.onload = fetchLeaderboard;