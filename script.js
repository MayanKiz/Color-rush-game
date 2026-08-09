/**
 * Color Rush Reflex - Game Logic & Supabase Integration
 */

// ==========================================
// 1. SUPABASE INITIALIZATION
// ==========================================
const SUPABASE_URL = 'https://yopaejjixslcjmndnvtz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Dl2a6iEvnmf2eQ_MRrPIeg_8THmHK8i';

// Create Supabase client using ONLY the publishable key
const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
// Screens
const screenRules = document.getElementById('rules-screen');
const screenStart = document.getElementById('start-screen');
const screenGame = document.getElementById('game-screen');
const screenLeaderboard = document.getElementById('leaderboard-screen');

// Buttons
const btnGotIt = document.getElementById('btn-got-it');
const btnStartGame = document.getElementById('btn-start-game');
const btnPlayAgain = document.getElementById('btn-play-again');

// Inputs & Errors
const inputPlayerName = document.getElementById('player-name');
const nameError = document.getElementById('name-error');

// Game UI
const targetColorDisplay = document.getElementById('target-color-display');
const timeLeftDisplay = document.getElementById('time-left');
const scoreDisplay = document.getElementById('current-score');
const gameBoard = document.getElementById('game-board');

// Leaderboard UI
const leaderboardUl = document.getElementById('leaderboard-ul');
const liveIndicator = document.getElementById('live-indicator');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');

// ==========================================
// 3. GAME CONFIGURATION & STATE
// ==========================================
const GAME_DURATION = 30; // seconds
const POINTS_CORRECT = 5;
const POINTS_WRONG = 3;
const TOTAL_CIRCLES = 25;

const colorPalette = [
    { name: 'Red', hex: '#ff0055', glow: '0 0 15px #ff0055' },
    { name: 'Blue', hex: '#00f3ff', glow: '0 0 15px #00f3ff' },
    { name: 'Purple', hex: '#aa00ff', glow: '0 0 15px #aa00ff' },
    { name: 'Green', hex: '#39ff14', glow: '0 0 15px #39ff14' },
    { name: 'Yellow', hex: '#ffff00', glow: '0 0 15px #ffff00' }
];

let playerName = '';
let score = 0;
let timeLeft = GAME_DURATION;
let timerInterval = null;
let currentTargetColor = null;
let isGameRunning = false;
let isSubmitting = false; // Prevent multiple DB inserts
let realtimeSubscription = null;

// Audio setup (using modern Audio API)
const soundCorrect = new Audio('Correct.mp3');
const soundWrong = new Audio('Wrong.mp3');

// Preload audio
soundCorrect.load();
soundWrong.load();

// ==========================================
// 4. NAVIGATION LOGIC
// ==========================================
function switchScreen(activeScreen) {
    screenRules.classList.add('hidden');
    screenStart.classList.add('hidden');
    screenGame.classList.add('hidden');
    screenLeaderboard.classList.add('hidden');
    
    activeScreen.classList.remove('hidden');
}

btnGotIt.addEventListener('click', () => {
    switchScreen(screenStart);
    inputPlayerName.focus();
});

btnPlayAgain.addEventListener('click', () => {
    switchScreen(screenStart);
    inputPlayerName.value = ''; // Reset input
    inputPlayerName.focus();
});

btnStartGame.addEventListener('click', () => {
    const name = inputPlayerName.value.trim();
    
    if (!name || name.length > 15) {
        nameError.classList.remove('hidden');
        return;
    }
    
    nameError.classList.add('hidden');
    playerName = name;
    startGame();
});

// ==========================================
// 5. GAME ENGINE
// ==========================================
function startGame() {
    // Reset State
    score = 0;
    timeLeft = GAME_DURATION;
    isGameRunning = true;
    isSubmitting = false;
    
    // Update UI
    scoreDisplay.innerText = score;
    timeLeftDisplay.innerText = `${timeLeft}s`;
    
    switchScreen(screenGame);
    generateBoard();
    
    // Timer Logic
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        timeLeftDisplay.innerText = `${timeLeft}s`;
        
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function generateBoard() {
    if (!isGameRunning) return;
    
    gameBoard.innerHTML = ''; // Clear previous board
    let generatedColors = [];
    
    // Generate 25 circles with random colors
    for (let i = 0; i < TOTAL_CIRCLES; i++) {
        const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        generatedColors.push(randomColor);
        
        const circle = document.createElement('div');
        circle.classList.add('circle');
        circle.style.backgroundColor = randomColor.hex;
        circle.style.boxShadow = randomColor.glow;
        
        // Use pointerdown for faster response than click on mobile/desktop
        circle.addEventListener('pointerdown', (e) => {
            e.preventDefault(); // Prevent double triggering
            handleCircleClick(randomColor);
        });
        
        gameBoard.appendChild(circle);
    }
    
    // Pick one color from the GENERATED board as the target 
    // (guarantees at least 1 correct circle exists)
    currentTargetColor = generatedColors[Math.floor(Math.random() * generatedColors.length)];
    
    // Update Target UI
    targetColorDisplay.innerText = currentTargetColor.name;
    targetColorDisplay.style.color = currentTargetColor.hex;
    targetColorDisplay.style.textShadow = currentTargetColor.glow;
}

function handleCircleClick(clickedColor) {
    if (!isGameRunning) return;
    
    let isCorrect = (clickedColor.name === currentTargetColor.name);
    
    // Score update
    if (isCorrect) {
        score += POINTS_CORRECT;
        playSound(true);
    } else {
        score -= POINTS_WRONG;
        playSound(false);
    }
    
    // Prevent score from going NaN somehow
    if (isNaN(score) || !isFinite(score)) score = 0;
    
    scoreDisplay.innerText = score;
    
    // Generate next round immediately
    generateBoard();
}

function playSound(isCorrect) {
    const sound = isCorrect ? soundCorrect : soundWrong;
    
    // Reset and play
    sound.currentTime = 0;
    sound.play().catch(e => {
        // Silently ignore audio block errors to prevent game crash
        console.warn('Audio play prevented by browser:', e);
    });
    
    // Vibration logic
    if (navigator.vibrate) {
        if (isCorrect) {
            navigator.vibrate(40);
        } else {
            navigator.vibrate([40, 40, 40]); // Error feel
        }
    }
}

async function endGame() {
    isGameRunning = false;
    clearInterval(timerInterval);
    
    // Prevent duplicate submissions
    if (isSubmitting) return;
    isSubmitting = true;
    
    // Navigate to leaderboard early to show loading state
    switchScreen(screenLeaderboard);
    loadingState.classList.remove('hidden');
    leaderboardUl.innerHTML = '';
    errorState.classList.add('hidden');
    
    // Sanitize input before DB insertion
    const finalScore = parseInt(score, 10);
    const safeScore = (isNaN(finalScore) || !isFinite(finalScore)) ? 0 : finalScore;
    const safeName = playerName.trim() || 'Anonymous';
    
    try {
        // 1. Submit score to Supabase
        const { error: insertError } = await supabase
            .from('scores')
            .insert([{
                player_name: safeName.substring(0, 15),
                score: safeScore
            }]);
            
        if (insertError) throw insertError;
        
        // 2. Setup Realtime (if not already setup)
        setupRealtimeLeaderboard();
        
        // 3. Fetch Leaderboard manually this first time
        await fetchLeaderboard();
        
    } catch (err) {
        console.error("Error finalizing game:", err);
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
    }
}

// ==========================================
// 6. LEADERBOARD & REALTIME LOGIC
// ==========================================

async function fetchLeaderboard() {
    try {
        loadingState.classList.remove('hidden');
        
        const { data, error } = await supabase
            .from('scores')
            .select('player_name, score')
            .order('score', { ascending: false })
            .limit(10);
            
        if (error) throw error;
        
        renderLeaderboard(data);
    } catch (err) {
        console.error("Error fetching leaderboard:", err);
        errorState.classList.remove('hidden');
    } finally {
        loadingState.classList.add('hidden');
    }
}

function renderLeaderboard(data) {
    leaderboardUl.innerHTML = '';
    
    if (!data || data.length === 0) {
        leaderboardUl.innerHTML = '<li style="justify-content:center;">No scores yet!</li>';
        return;
    }
    
    data.forEach((entry, index) => {
        const li = document.createElement('li');
        
        // Rank logic
        let rankStr = `#${index + 1}`;
        if (index === 0) rankStr = '🥇';
        else if (index === 1) rankStr = '🥈';
        else if (index === 2) rankStr = '🥉';
        
        // Escape HTML to prevent XSS from names
        const safeName = escapeHTML(entry.player_name);
        
        li.innerHTML = `
            <div>
                <span class="rank-icon">${rankStr}</span>
                <strong>${safeName}</strong>
            </div>
            <span>${entry.score} pts</span>
        `;
        
        // Highlight current player's latest score
        if (entry.player_name === playerName && entry.score === score && isSubmitting) {
            li.style.color = 'var(--neon-yellow)';
            li.style.textShadow = '0 0 10px rgba(255, 255, 0, 0.5)';
        }
        
        leaderboardUl.appendChild(li);
    });
}

function setupRealtimeLeaderboard() {
    // Only subscribe once
    if (realtimeSubscription) return;
    
    realtimeSubscription = supabase
        .channel('public:scores')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'scores' },
            (payload) => {
                // Whenever a new score is inserted anywhere, refresh our board
                fetchLeaderboard();
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                liveIndicator.classList.remove('hidden');
            } else {
                liveIndicator.classList.add('hidden');
            }
        });
}

// Utility to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
