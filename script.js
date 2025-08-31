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

// ✅ Sound Effects
const correctSound = new Audio("Public/Correct.mp3");
const wrongSound = new Audio("Public/Wrong.mp3");

// ✅ Telegram Config
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
        correctSound.currentTime = 0;
        correctSound.play();
      } else {
        score -= 3;
        wrongSound.currentTime = 0;
        wrongSound.play();
      }

      scoreElem.textContent = score;
      setTargetColor();
      generateCircles();
    });

    gameArea.appendChild(circle);
  }
}

async function endGame() {
  clearInterval(timer);
  alert(`⏳ Time's up!\n${playerName}, your score: ${score}`);

  await sendScoreToTelegram(playerName, score);
  displayLeaderboard();

  gameScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
}

async function sendScoreToTelegram(name, score) {
  const message = JSON.stringify({ name, score, timestamp: Date.now() });

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: message,
    }),
  });
}

async function displayLeaderboard() {
  scoreList.innerHTML = "<li>Loading...</li>";

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`
    );
    const data = await response.json();

    let scores = [];
    data.result.forEach(update => {
      try {
        const msg = JSON.parse(update.message.text);
        if (msg.name && typeof msg.score === "number") {
          scores.push(msg);
        }
      } catch (e) {}
    });

    scores.sort((a, b) => b.score - a.score);

    scoreList.innerHTML = "";
    const topFive = scores.slice(0, 5);
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
  }
}

startBtn.addEventListener("click", startGame);
window.onload = displayLeaderboard;