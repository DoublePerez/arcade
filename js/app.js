// ========== SCORE SYSTEM ==========
const STORAGE_KEY = "scoreKeeper";
const scores = { a: 0, b: 0 };

function load() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            scores.a = parsed.a || 0;
            scores.b = parsed.b || 0;
        }
    } catch (e) {
        // ignore corrupt data
    }
    updateDisplay();
}

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
}

function updateDisplay() {
    const hudA = document.getElementById("hud-score-a");
    const hudB = document.getElementById("hud-score-b");
    if (hudA) hudA.textContent = String(scores.a).padStart(2, "0");
    if (hudB) hudB.textContent = String(scores.b).padStart(2, "0");

    const hudLabel = document.getElementById("hud-player-label");
    if (hudLabel) {
        const name = loadArcadeData().playerName;
        hudLabel.textContent = name.length > 8 ? name.substring(0, 8) : name;
    }
}

function increment(team) {
    scores[team] += 1;
    updateDisplay();
    save();
}

function decrement(team) {
    if (scores[team] > 0) scores[team] -= 1;
    updateDisplay();
    save();
}

function reset(team) {
    scores[team] = 0;
    updateDisplay();
    save();
}

function resetAll() {
    scores.a = 0;
    scores.b = 0;
    updateDisplay();
    save();
}

// ========== ARCADE DATA (MATCH HISTORY + NAME) ==========
const ARCADE_STORAGE_KEY = "arcadeData";

function getDefaultArcadeData() {
    return {
        playerName: "PLAYER",
        pong:     { playerWins: 0, cpuWins: 0, lastMatch: null },
        ttt:      { playerWins: 0, cpuWins: 0, lastMatch: null },
        bingo:    { playerWins: 0, cpuWins: 0, lastMatch: null },
        snake:    { bestScore: 0, gamesPlayed: 0, lastScore: 0 },
        invaders: { bestScore: 0, gamesPlayed: 0, lastScore: 0 }
    };
}

function loadArcadeData() {
    try {
        const saved = localStorage.getItem(ARCADE_STORAGE_KEY);
        if (saved) {
            const p = JSON.parse(saved);
            return {
                playerName: p.playerName || "PLAYER",
                pong: {
                    playerWins: (p.pong && p.pong.playerWins) || 0,
                    cpuWins:    (p.pong && p.pong.cpuWins) || 0,
                    lastMatch:  (p.pong && p.pong.lastMatch) || null
                },
                ttt: {
                    playerWins: (p.ttt && p.ttt.playerWins) || 0,
                    cpuWins:    (p.ttt && p.ttt.cpuWins) || 0,
                    lastMatch:  (p.ttt && p.ttt.lastMatch) || null
                },
                bingo: {
                    playerWins: (p.bingo && p.bingo.playerWins) || 0,
                    cpuWins:    (p.bingo && p.bingo.cpuWins) || 0,
                    lastMatch:  (p.bingo && p.bingo.lastMatch) || null
                },
                snake: {
                    bestScore:   (p.snake && p.snake.bestScore) || 0,
                    gamesPlayed: (p.snake && p.snake.gamesPlayed) || 0,
                    lastScore:   (p.snake && p.snake.lastScore) || 0
                },
                invaders: {
                    bestScore:   (p.invaders && p.invaders.bestScore) || 0,
                    gamesPlayed: (p.invaders && p.invaders.gamesPlayed) || 0,
                    lastScore:   (p.invaders && p.invaders.lastScore) || 0
                }
            };
        }
    } catch (e) {
        // ignore corrupt data
    }
    return getDefaultArcadeData();
}

function saveArcadeData(data) {
    localStorage.setItem(ARCADE_STORAGE_KEY, JSON.stringify(data));
}

function recordMatchResult(gameType) {
    const data = loadArcadeData();
    const winner = scores.a > scores.b ? "player" : "cpu";

    data[gameType].lastMatch = {
        playerScore: scores.a,
        cpuScore: scores.b,
        winner: winner
    };

    if (winner === "player") {
        data[gameType].playerWins += 1;
    } else {
        data[gameType].cpuWins += 1;
    }

    saveArcadeData(data);
}

function getPlayerName() {
    return loadArcadeData().playerName;
}

function setPlayerName(name) {
    const data = loadArcadeData();
    data.playerName = name;
    saveArcadeData(data);
}

function resetArcadeData() {
    localStorage.removeItem(ARCADE_STORAGE_KEY);
}

// ========== SCREEN REGISTRY ==========
// Adding a new screen? Just add one line here.
const SCREENS = {
    "screen-boot":     { keyHandler: "handleBootKey" },
    "screen-menu":     { init: "initMenu",        keyHandler: "handleMenuKey" },
    "screen-scores":   { init: "initScoreboard",   keyHandler: "handleScoresKey" },
    "screen-pong":     { init: "initPong",         keyHandler: "handlePongKey", keyUpHandler: "handlePongKeyUp", showHud: true, globalEsc: true },
    "screen-ttt":      { init: "initTicTacToe",    keyHandler: "handleTTTKey",    showHud: true, globalEsc: true },
    "screen-bingo":    { init: "initBingo",        keyHandler: "handleBingoKey",  showHud: true, globalEsc: true },
    "screen-snake":    { init: "initSnake",        keyHandler: "handleSnakeKey",  globalEsc: true },
    "screen-invaders": { init: "initInvaders",     keyHandler: "handleInvadersKey", keyUpHandler: "handleInvadersKeyUp", globalEsc: true },
    "screen-keeper":   { init: "initKeeper",       keyHandler: "handleKeeperKey" },
    "screen-magic8":   { init: "initMagic8",       keyHandler: "handleMagic8Key", globalEsc: true }
};

// ========== SCREEN MANAGER ==========
let currentScreen = "screen-boot";
let activeGame = null;

function showScreen(screenId) {
    if (activeGame) {
        activeGame();
        activeGame = null;
    }

    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const target = document.getElementById(screenId);
    if (target) target.classList.add("active");
    currentScreen = screenId;

    const config = SCREENS[screenId];
    const hud = document.getElementById("score-hud");
    if (config && config.showHud) {
        hud.classList.remove("hidden");
    } else {
        hud.classList.add("hidden");
    }

    // Global ESC hint on all screens
    const escHint = document.getElementById("global-esc-hint");
    if (escHint) {
        escHint.textContent = screenId === "screen-boot" ? "ESC to skip" : "ESC to go back";
    }

    if (config && config.init) {
        const fn = window[config.init];
        if (typeof fn === "function") {
            const cleanup = fn();
            if (typeof cleanup === "function") activeGame = cleanup;
        }
    }
}

// ========== GLOBAL KEY HANDLERS ==========
document.addEventListener("keydown", function (e) {
    const config = SCREENS[currentScreen];
    if (!config) return;

    if (e.key === "Escape" || e.key === "q" || e.key === "Q") {
        if (currentScreen === "screen-menu") {
            showScreen("screen-boot");
            return;
        }
        if (config.globalEsc) {
            showScreen("screen-menu");
            return;
        }
    }

    if (config.keyHandler) {
        const fn = window[config.keyHandler];
        if (typeof fn === "function") fn(e);
    }
});

document.addEventListener("keyup", function (e) {
    const config = SCREENS[currentScreen];
    if (config && config.keyUpHandler) {
        const fn = window[config.keyUpHandler];
        if (typeof fn === "function") fn(e);
    }
});

// ========== INIT ==========
load();
