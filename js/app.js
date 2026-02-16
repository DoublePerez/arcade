/**
 * ============================================================================
 *  APP.JS — Application Core
 * ============================================================================
 *
 *  Central nervous system of the Retro Arcade Terminal.
 *  Handles everything that sits *above* individual games:
 *
 *  1. SCORE SYSTEM           — Live match scores (Player vs CPU)
 *  2. ARCADE DATA            — Persistent player profile, match history & stats
 *  3. SCREEN REGISTRY        — Declares every screen and wires init / key handlers
 *  4. SCREEN MANAGER         — Transitions between screens, manages cleanup
 *  5. GLOBAL KEY DISPATCHER  — Routes keyboard input to the active screen
 *
 *  Load order:  grid.js → app.js → boot.js → menu.js → (game files)
 * ============================================================================
 */


/* ═══════════════════════════════════════════════════════════════════════════
   1. SCORE SYSTEM
   ────────────────────────────────────────────────────────────────────────────
   Two-team score tracker (Player = "a", CPU = "b").
   Persisted to localStorage so scores survive page reloads.
   ═══════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "scoreKeeper";
const scores = { a: 0, b: 0 };

/** Load scores from localStorage, applying legacy migration if needed. */
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

    // One-time migration: merge old Score Keeper storage into main scores
    try {
        const oldKeeper = localStorage.getItem("keeperScores");
        if (oldKeeper) {
            const parsed = JSON.parse(oldKeeper);
            if (scores.a === 0 && scores.b === 0) {
                scores.a = parsed.a || 0;
                scores.b = parsed.b || 0;
            }
            localStorage.removeItem("keeperScores");
            save();
        }
    } catch (e) {
        // ignore corrupt data
    }

    updateDisplay();
}

/** Persist current scores to localStorage. */
function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
}

/** Scores are displayed within each game's own rendered grid. */
function updateDisplay() {}

/** Add 1 point to a team ("a" or "b"). */
function increment(team) {
    scores[team] += 1;
    updateDisplay();
    save();
}

/** Remove 1 point from a team (floor at 0). */
function decrement(team) {
    if (scores[team] > 0) scores[team] -= 1;
    updateDisplay();
    save();
}

/** Reset a single team's score to 0. */
function reset(team) {
    scores[team] = 0;
    updateDisplay();
    save();
}

/** Reset both teams to 0. */
function resetAll() {
    scores.a = 0;
    scores.b = 0;
    updateDisplay();
    save();
}


/* ═══════════════════════════════════════════════════════════════════════════
   1.5. SOUND SYSTEM
   ────────────────────────────────────────────────────────────────────────────
   Retro sound effects via Web Audio API oscillators. No audio files needed.
   AudioContext is lazy-initialized on first call (browser autoplay policy).
   ═══════════════════════════════════════════════════════════════════════════ */

let _audioCtx = null;
let _muted = false;

/** Toggle mute on/off. Returns the new muted state. */
function toggleMute() {
    _muted = !_muted;
    return _muted;
}

/** Play a retro beep. freq in Hz, duration in ms, type defaults to "square". */
function sfx(freq, duration, type) {
    if (_muted) return;
    if (!_audioCtx) {
        try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { return; }
    }
    try {
        const osc = _audioCtx.createOscillator();
        const gain = _audioCtx.createGain();
        osc.type = type || "square";
        osc.frequency.value = freq;
        gain.gain.value = 0.12;
        osc.connect(gain);
        gain.connect(_audioCtx.destination);
        const t = _audioCtx.currentTime;
        osc.start(t);
        osc.stop(t + duration / 1000);
    } catch (e) {}
}


/* ═══════════════════════════════════════════════════════════════════════════
   2. ARCADE DATA  — Player Profile & Match History
   ────────────────────────────────────────────────────────────────────────────
   Stores per-game win/loss records and high scores.
   Cached in memory after first load to avoid repeated JSON parsing.

   Shape:
     { playerName, pong: {…}, ttt: {…}, bingo: {…}, snake: {…}, invaders: {…} }
   ═══════════════════════════════════════════════════════════════════════════ */

const ARCADE_STORAGE_KEY = "arcadeData";
let _arcadeCache = null;

/** Return a blank profile with zeroed stats. */
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

/** Load arcade data from localStorage (cached after first call). */
function loadArcadeData() {
    if (_arcadeCache) return _arcadeCache;
    try {
        const saved = localStorage.getItem(ARCADE_STORAGE_KEY);
        if (saved) {
            const p = JSON.parse(saved);
            _arcadeCache = {
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
            return _arcadeCache;
        }
    } catch (e) {
        // ignore corrupt data
    }
    _arcadeCache = getDefaultArcadeData();
    return _arcadeCache;
}

/** Write arcade data to localStorage and update the in-memory cache. */
function saveArcadeData(data) {
    _arcadeCache = data;
    localStorage.setItem(ARCADE_STORAGE_KEY, JSON.stringify(data));
}

/**
 * Record the outcome of a versus match.
 * @param {string} gameType — key in arcadeData (e.g. "pong", "ttt", "bingo")
 */
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

/** Get the current player name. */
function getPlayerName() {
    return loadArcadeData().playerName;
}

/** Update the player name and persist. */
function setPlayerName(name) {
    const data = loadArcadeData();
    data.playerName = name;
    saveArcadeData(data);
}

/** Wipe all arcade data (stats, name) and clear cache. */
function resetArcadeData() {
    _arcadeCache = null;
    localStorage.removeItem(ARCADE_STORAGE_KEY);
}


/* ═══════════════════════════════════════════════════════════════════════════
   3. SCREEN REGISTRY
   ────────────────────────────────────────────────────────────────────────────
   Declarative map of every screen in the app.
   Each entry wires up:
     • init          — function name called when entering the screen
     • keyHandler    — function name that receives keydown events
     • keyUpHandler  — (optional) function name for keyup events
     • globalEsc     — if true, ESC returns to the menu

   To add a new screen: just add one line here.
   ═══════════════════════════════════════════════════════════════════════════ */

const SCREENS = {
    "screen-boot":     { init: "initBoot",         keyHandler: "handleBootKey" },
    "screen-menu":     { init: "initMenu",         keyHandler: "handleMenuKey" },
    "screen-scores":   { init: "initScoreboard",   keyHandler: "handleScoresKey" },
    "screen-pong":     { init: "initPong",         keyHandler: "handlePongKey",      keyUpHandler: "handlePongKeyUp",      globalEsc: true },
    "screen-ttt":      { init: "initTicTacToe",    keyHandler: "handleTTTKey",       globalEsc: true },
    "screen-bingo":    { init: "initBingo",        keyHandler: "handleBingoKey",     globalEsc: true },
    "screen-snake":    { init: "initSnake",        keyHandler: "handleSnakeKey",     globalEsc: true },
    "screen-invaders": { init: "initInvaders",     keyHandler: "handleInvadersKey",  keyUpHandler: "handleInvadersKeyUp",  globalEsc: true },
    "screen-keeper":   { init: "initKeeper",       keyHandler: "handleKeeperKey" },
    "screen-magic8":   { init: "initMagic8",       keyHandler: "handleMagic8Key",    globalEsc: true },
    "screen-timetraveler": { init: "initTimeTraveler", keyHandler: "handleTimeTravelerKey", globalEsc: true },
    "screen-timemachine":  { init: "initTimeMachine",  keyHandler: "handleTimeMachineKey",  globalEsc: true }
};


/* ═══════════════════════════════════════════════════════════════════════════
   4. SCREEN MANAGER
   ────────────────────────────────────────────────────────────────────────────
   Handles transitions: hides old screen → shows new screen → calls init.
   If the previous screen returned a cleanup function, it is called first.
   ═══════════════════════════════════════════════════════════════════════════ */

let currentScreen = "screen-boot";
let activeGame = null;   // cleanup function for the currently active game

/**
 * Transition to a new screen.
 * @param {string} screenId — DOM id of the target screen (e.g. "screen-pong")
 */
function showScreen(screenId) {
    // Run cleanup for the previous screen (stops timers, animation frames, etc.)
    if (activeGame) {
        activeGame();
        activeGame = null;
    }

    // Toggle visibility
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const target = document.getElementById(screenId);
    if (target) target.classList.add("active");
    currentScreen = screenId;

    const config = SCREENS[screenId];


    // Call the screen's init function; if it returns a cleanup fn, store it
    if (config && config.init) {
        const fn = window[config.init];
        if (typeof fn === "function") {
            const cleanup = fn();
            if (typeof cleanup === "function") activeGame = cleanup;
        }
    }
}


/* ═══════════════════════════════════════════════════════════════════════════
   5. GLOBAL KEY DISPATCHER
   ────────────────────────────────────────────────────────────────────────────
   Single keydown/keyup listener that delegates to the active screen's handler.
   ESC / Q is intercepted globally for back-navigation.
   ═══════════════════════════════════════════════════════════════════════════ */

document.addEventListener("keydown", function (e) {
    const config = SCREENS[currentScreen];
    if (!config) return;

    // Global mute toggle (M key — works on any screen except Magic 8 Ball typing)
    if (e.key === "m" || e.key === "M") {
        if (!(currentScreen === "screen-magic8" && m8.phase === "typing")) {
            toggleMute();
            return;
        }
    }

    // Global back-navigation (ESC or Q)
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

    // Delegate to the screen's keydown handler
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


/* ═══════════════════════════════════════════════════════════════════════════
   STARTUP — Load persisted scores, then boot.js takes over
   ═══════════════════════════════════════════════════════════════════════════ */

load();
