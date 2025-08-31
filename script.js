const startBtn = document.getElementById("startBtn");
const playerNameInput = document.getElementById("playerName");
const gameScreen = document.getElementById("game-screen");
const startScreen = document.getElementById("start-screen");
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

  saveScore(playerName, score);
  sendToTelegram(playerName, score);

  gameScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
  displayLeaderboard();
}

function saveScore(name, score) {
  let leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];
  leaderboard.push({ name, score });
  leaderboard.sort((a, b) => b.score - a.score);
  localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
}

function displayLeaderboard() {
  scoreList.innerHTML = "";
  let leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];
  leaderboard.slice(0, 10).forEach((entry, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${entry.name} — ${entry.score} pts`;
    scoreList.appendChild(li);
  });
}

function sendToTelegram(name, score) {
  const message = `🎮 New Score!\n👤 Player: ${name}\n🏆 Score: ${score}`;
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(message)}`);
}

startBtn.addEventListener("click", startGame);
window.onload = displayLeaderboard;
