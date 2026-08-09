// ============================================
// SUPABASE CONFIGURATION
// ============================================

const SUPABASE_URL =
  "https://yopaejjixslcjmndnvtz.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_Dl2a6iEvnmf2eQ_MRrPIeg_8THmHK8i";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ============================================
// HTML ELEMENTS
// ============================================

const showStartBtn =
  document.getElementById("showStart");

const startBtn =
  document.getElementById("startBtn");

const playerNameInput =
  document.getElementById("playerName");

const gameScreen =
  document.getElementById("game-screen");

const startScreen =
  document.getElementById("start-screen");

const rulesScreen =
  document.getElementById("rules-screen");

const targetColorElem =
  document.getElementById("targetColor");

const gameArea =
  document.getElementById("game-area");

const scoreElem =
  document.getElementById("score");

const timeElem =
  document.getElementById("timeLeft");

const scoreList =
  document.getElementById("scoreList");

const leaderboardStatus =
  document.getElementById("leaderboardStatus");


// ============================================
// SOUND EFFECTS
// ============================================

const correctSound =
  new Audio("Correct.mp3");

const wrongSound =
  new Audio("Wrong.mp3");


// ============================================
// GAME VARIABLES
// ============================================

const colors = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange"
];

let targetColor = "";

let score = 0;

let timeLeft = 30;

let timer = null;

let playerName = "";


// ============================================
// SHOW START SCREEN
// ============================================

showStartBtn.addEventListener("click", () => {

  rulesScreen.classList.add("hidden");

  startScreen.classList.remove("hidden");

});


// ============================================
// START GAME
// ============================================

function startGame() {

  playerName =
    playerNameInput.value.trim();


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


  clearInterval(timer);


  timer = setInterval(() => {

    timeLeft--;

    timeElem.textContent = timeLeft;


    if (timeLeft <= 0) {

      endGame();

    }

  }, 1000);

}


// ============================================
// TARGET COLOR
// ============================================

function setTargetColor() {

  targetColor =
    colors[
      Math.floor(
        Math.random() * colors.length
      )
    ];


  targetColorElem.textContent =
    targetColor;


  targetColorElem.style.color =
    targetColor;

}


// ============================================
// GENERATE CIRCLES
// ============================================

function generateCircles() {

  gameArea.innerHTML = "";


  for (let i = 0; i < 25; i++) {

    const circle =
      document.createElement("div");


    const randomColor =
      colors[
        Math.floor(
          Math.random() * colors.length
        )
      ];


    circle.classList.add("circle");

    circle.style.backgroundColor =
      randomColor;


    circle.addEventListener("click", () => {

      // Phone vibration
      if (navigator.vibrate) {

        navigator.vibrate(60);

      }


      circle.classList.add("blink");


      setTimeout(() => {

        circle.classList.remove("blink");

      }, 150);


      // Correct
      if (randomColor === targetColor) {

        score += 5;

        correctSound.currentTime = 0;

        correctSound.play().catch(() => {});

      }

      // Wrong
      else {

        score -= 3;

        wrongSound.currentTime = 0;

        wrongSound.play().catch(() => {});

      }


      scoreElem.textContent = score;


      setTargetColor();

      generateCircles();

    });


    gameArea.appendChild(circle);

  }

}


// ============================================
// END GAME
// ============================================

async function endGame() {

  clearInterval(timer);


  alert(
    `⏳ Time's up!\n${playerName}, your score: ${score}`
  );


  // Save score to Supabase
  await saveScore(playerName, score);


  gameScreen.classList.add("hidden");

  startScreen.classList.remove("hidden");


  // Refresh leaderboard immediately
  await displayLeaderboard();

}


// ============================================
// SAVE SCORE TO SUPABASE
// ============================================

async function saveScore(name, score) {

  console.log("Saving score:", name, score);


  const { data, error } =
    await supabase
      .from("scores")
      .insert([
        {
          player_name: name,
          score: score
        }
      ])
      .select();


  if (error) {

    console.error(
      "Supabase save error:",
      error
    );

    alert(
      "Could not save score.\nCheck console for error."
    );

    return false;

  }


  console.log(
    "Score saved successfully:",
    data
  );


  return true;

}


// ============================================
// DISPLAY TOP 5 LEADERBOARD
// ============================================

async function displayLeaderboard() {

  leaderboardStatus.textContent =
    "Loading leaderboard...";


  const { data, error } =
    await supabase
      .from("scores")
      .select("player_name, score, created_at")
      .order("score", {
        ascending: false
      })
      .limit(5);


  if (error) {

    console.error(
      "Leaderboard error:",
      error
    );


    leaderboardStatus.textContent =
      "Unable to load leaderboard";


    scoreList.innerHTML =
      "<li>Database error</li>";


    return;

  }


  scoreList.innerHTML = "";


  if (!data || data.length === 0) {

    leaderboardStatus.textContent =
      "No scores yet";


    scoreList.innerHTML =
      "<li>No scores yet</li>";


    return;

  }


  leaderboardStatus.textContent =
    "🔴 LIVE";


  data.forEach((player, index) => {

    const li =
      document.createElement("li");


    li.textContent =
      `#${index + 1} ${player.player_name}: ${player.score}`;


    scoreList.appendChild(li);

  });

}


// ============================================
// REALTIME LEADERBOARD
// ============================================

function startRealtimeLeaderboard() {

  supabase
    .channel("scores-live")

    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "scores"
      },

      (payload) => {

        console.log(
          "New score received:",
          payload.new
        );


        // Automatically refresh leaderboard
        displayLeaderboard();

      }
    )

    .subscribe((status) => {

      console.log(
        "Realtime status:",
        status
      );

    });

}


// ============================================
// START BUTTON
// ============================================

startBtn.addEventListener(
  "click",
  startGame
);


// ============================================
// PAGE LOAD
// ============================================

window.addEventListener(
  "load",
  () => {

    displayLeaderboard();

    startRealtimeLeaderboard();

  }
);
