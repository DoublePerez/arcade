/**
 * ============================================================================
 *  SNAKE.JS — Snake Game
 * ============================================================================
 *
 *  Classic Snake in ASCII art. The snake grows when eating food (*),
 *  and the game ends on wall or self collision.
 *
 *  Game flow:
 *    1. Intro       — Title screen with rules
 *    2. Countdown   — "3… 2… 1…" before start
 *    3. Playing     — Snake moves on a timer, speed increases with each food eaten
 *    4. Game over   — Final score, best score tracking
 *
 *  Speed system:
 *    • Starts at SNAKE_INITIAL_SPEED (130 ms per move)
 *    • Decreases by SNAKE_SPEED_DECREASE (2 ms) per food eaten
 *    • Minimum speed is SNAKE_MIN_SPEED (55 ms)
 *
 *  Snake characters:
 *    @ = head, # = body, * = food (green)
 *
 *  Controls:
 *    Arrows / WASD  — Change direction
 *    Enter          — Start / replay
 *    ESC            — Return to menu
 *
 *  Depends on:  app.js (loadArcadeData, saveArcadeData, getPlayerName)
 *               grid.js (ArcadeGrid)
 * ============================================================================
 */


/* ═══════════════════════════════════════════════════════════════════════════
   CONFIGURATION
   ═══════════════════════════════════════════════════════════════════════════ */

const SNAKE_W = 70;                  // arena width
const SNAKE_H = 30;                  // arena height
const SNAKE_INITIAL_SPEED = 130;     // starting move interval (ms)
const SNAKE_MIN_SPEED = 55;          // fastest possible move interval (ms)
const SNAKE_SPEED_DECREASE = 2;      // ms faster per food eaten


/* ═══════════════════════════════════════════════════════════════════════════
   GAME STATE
   ═══════════════════════════════════════════════════════════════════════════ */

const snakeGrid = ArcadeGrid(SNAKE_W, SNAKE_H);

const snk = {
    body: [],                        // array of {x, y} segments (head at index 0)
    dir: { x: 1, y: 0 },            // current movement direction
    nextDir: { x: 1, y: 0 },        // buffered direction (applied on next tick)
    food: { x: 0, y: 0 },           // current food position
    score: 0,                        // food eaten this game
    bestScore: 0,                    // all-time best score
    speed: SNAKE_INITIAL_SPEED,      // current move interval (ms)
    running: false,                  // game active flag
    phase: "countdown",              // "intro" | "countdown" | "playing" | "gameover"
    countdown: 3,                    // countdown value
    countdownTimer: null,            // setInterval handle for countdown
    moveTimer: null,                 // setTimeout handle for snake movement
    paused: false                    // pause toggle (P key during "playing" phase)
};


/* ═══════════════════════════════════════════════════════════════════════════
   INIT & LIFECYCLE
   ═══════════════════════════════════════════════════════════════════════════ */

/** Initialize the Snake game. Returns a cleanup function. */
function initSnake() {
    snk.running = true;
    snk.score = 0;
    snk.phase = "intro";
    snk.speed = SNAKE_INITIAL_SPEED;
    snk.paused = false;

    const data = loadArcadeData();
    snk.bestScore = (data.snake && data.snake.bestScore) || 0;

    // Start the snake in the center, 3 segments long, moving right
    const cx = Math.floor(SNAKE_W / 2);
    const cy = Math.floor(SNAKE_H / 2);
    snk.body = [
        { x: cx, y: cy },
        { x: cx - 1, y: cy },
        { x: cx - 2, y: cy }
    ];
    snk.dir = { x: 1, y: 0 };
    snk.nextDir = { x: 1, y: 0 };

    spawnSnakeFood();
    renderSnake();

    return function stopSnake() {
        snk.running = false;
        if (snk.countdownTimer) clearInterval(snk.countdownTimer);
        if (snk.moveTimer) clearTimeout(snk.moveTimer);
    };
}


/* ═══════════════════════════════════════════════════════════════════════════
   FOOD SPAWNING
   ═══════════════════════════════════════════════════════════════════════════ */

/** Place food at a random position not occupied by the snake. */
function spawnSnakeFood() {
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 1000) {
        snk.food.x = 1 + Math.floor(Math.random() * (SNAKE_W - 2));
        snk.food.y = 1 + Math.floor(Math.random() * (SNAKE_H - 2));
        valid = true;
        for (let i = 0; i < snk.body.length; i++) {
            if (snk.body[i].x === snk.food.x && snk.body[i].y === snk.food.y) {
                valid = false;
                break;
            }
        }
        attempts++;
    }
}


/* ═══════════════════════════════════════════════════════════════════════════
   COUNTDOWN — "3… 2… 1…" before gameplay starts
   ═══════════════════════════════════════════════════════════════════════════ */

/** Run a 3-second countdown, then start the snake moving. */
function startSnakeCountdown() {
    snk.countdown = 3;
    snk.phase = "countdown";
    renderSnake();

    snk.countdownTimer = setInterval(function () {
        snk.countdown--;
        if (snk.countdown <= 0) {
            clearInterval(snk.countdownTimer);
            snk.countdownTimer = null;
            snk.phase = "playing";
            scheduleSnakeMove();
        }
        renderSnake();
    }, 700);
}


/* ═══════════════════════════════════════════════════════════════════════════
   GAME LOOP — Timer-based movement
   ═══════════════════════════════════════════════════════════════════════════ */

/** Schedule the next snake movement tick. */
function scheduleSnakeMove() {
    if (!snk.running || snk.phase !== "playing" || snk.paused) return;
    snk.moveTimer = setTimeout(snakeTick, snk.speed);
}

/** One tick of snake movement: move head, check collisions, eat food. */
function snakeTick() {
    if (!snk.running || snk.phase !== "playing" || snk.paused) return;

    // Apply buffered direction
    snk.dir.x = snk.nextDir.x;
    snk.dir.y = snk.nextDir.y;

    const head = snk.body[0];
    const newHead = { x: head.x + snk.dir.x, y: head.y + snk.dir.y };

    // ── Wall collision ───────────────────────────────────────
    if (newHead.x <= 0 || newHead.x >= SNAKE_W - 1 || newHead.y <= 0 || newHead.y >= SNAKE_H - 1) {
        snakeGameOver();
        return;
    }

    // ── Self collision ───────────────────────────────────────
    for (let i = 0; i < snk.body.length; i++) {
        if (snk.body[i].x === newHead.x && snk.body[i].y === newHead.y) {
            snakeGameOver();
            return;
        }
    }

    snk.body.unshift(newHead);

    // ── Food eaten? Grow and speed up ────────────────────────
    if (newHead.x === snk.food.x && newHead.y === snk.food.y) {
        snk.score++;
        snk.speed = Math.max(SNAKE_MIN_SPEED, snk.speed - SNAKE_SPEED_DECREASE);
        sfx(660, 50);
        spawnSnakeFood();
    } else {
        snk.body.pop();   // remove tail (no growth)
    }

    renderSnake();
    scheduleSnakeMove();
}


/* ═══════════════════════════════════════════════════════════════════════════
   GAME OVER — Save stats and show results
   ═══════════════════════════════════════════════════════════════════════════ */

/** End the game and persist stats. */
function snakeGameOver() {
    snk.phase = "gameover";
    sfx(180, 300);

    const data = loadArcadeData();
    if (!data.snake) data.snake = { bestScore: 0, gamesPlayed: 0, lastScore: 0 };
    data.snake.gamesPlayed++;
    data.snake.lastScore = snk.score;
    if (snk.score > data.snake.bestScore) {
        data.snake.bestScore = snk.score;
        snk.bestScore = snk.score;
    }
    saveArcadeData(data);

    renderSnake();
}


/* ═══════════════════════════════════════════════════════════════════════════
   RENDERING
   ═══════════════════════════════════════════════════════════════════════════ */

/** Render the snake game based on the current phase. */
function renderSnake() {
    const g = snakeGrid;
    g.clear();

    // ── Intro screen (no borders) ────────────────────────────
    if (snk.phase === "intro") {
        const midRow = Math.floor(SNAKE_H / 2);
        g.text("S N A K E", midRow - 6);
        g.text("============================", midRow - 4);
        g.text("ARROWS/WASD:STEER", midRow - 2);
        const eatLine = "EAT * TO GROW";
        const eatCol = Math.floor((SNAKE_W - eatLine.length) / 2);
        g.text("EAT ", midRow, eatCol);
        g.setGreen(midRow, eatCol + 4, "*");
        g.text(" TO GROW", midRow, eatCol + 5);
        g.text("AVOID WALLS AND YOUR TAIL", midRow + 2);
        g.text("============================", midRow + 4);
        const enterLine = "PRESS ENTER TO START";
        const enterCol = Math.floor((SNAKE_W - enterLine.length) / 2);
        g.text("PRESS ", midRow + 7, enterCol);
        g.textGreen("ENTER", midRow + 7, enterCol + 6);
        g.text(" TO START", midRow + 7, enterCol + 11);
        g.render("snake-arena");
        return;
    }

    // ── Bordered arena ───────────────────────────────────────
    g.borders();

    // Score + length in top border (title during gameover to avoid double info)
    const pName = getPlayerName();
    if (snk.phase === "gameover") {
        g.borderText(" S N A K E ", 0);
    } else {
        g.borderText(" " + pName + ": " + snk.score + "  BEST: " + snk.bestScore + "  LEN: " + snk.body.length + " ", 0);
    }

    // Controls in bottom border
    g.borderText(" WASD: STEER   P: PAUSE   M: MUTE   ESC: MENU ", SNAKE_H - 1);

    // ── Game elements (food + snake body) ────────────────────
    const showField = (snk.phase === "playing" || snk.phase === "countdown" || snk.phase === "gameover");
    if (showField) {
        // Food (green "*")
        g.setGreen(snk.food.y, snk.food.x, "*");

        // Snake body: "#" for body segments, "@" for head
        for (let i = snk.body.length - 1; i >= 0; i--) {
            const seg = snk.body[i];
            g.set(seg.y, seg.x, i === 0 ? "@" : "#");
        }
    }

    // ── Phase overlays ───────────────────────────────────────
    const midRow = Math.floor(SNAKE_H / 2);

    if (snk.phase === "countdown") {
        g.textInner("GET READY!", midRow - 1);
        g.textInner(String(snk.countdown), midRow + 1);
    }

    if (snk.paused && snk.phase === "playing") {
        g.textInner("P  A  U  S  E  D", midRow - 1);
        var resumeLine = "[P] RESUME";
        var resumeCol = Math.floor((SNAKE_W - resumeLine.length) / 2);
        g.textGreen("[P]", midRow + 1, resumeCol);
        g.textInner(" RESUME", midRow + 1, resumeCol + 3);
    }

    if (snk.phase === "gameover") {
        g.textInner("====================", midRow - 3);
        g.textInner("G A M E   O V E R", midRow - 1);
        g.textInner("====================", midRow + 1);
        g.textInner("SCORE: " + snk.score + "  LENGTH: " + snk.body.length, midRow + 3);
        if (snk.score > 0 && snk.score >= snk.bestScore) {
            g.textInner("** NEW BEST! **", midRow + 5);
        }
        const replayLine = "[ENTER] REPLAY";
        const replayCol = Math.floor((SNAKE_W - replayLine.length) / 2);
        g.textGreen("[ENTER]", midRow + 7, replayCol);
        g.textInner(" REPLAY", midRow + 7, replayCol + 7);
    }

    g.render("snake-arena");
}


/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD HANDLER
   ═══════════════════════════════════════════════════════════════════════════ */

/** Handle keyboard input for Snake. */
function handleSnakeKey(e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) !== -1) {
        e.preventDefault();
    }

    // Intro → start countdown
    if (snk.phase === "intro" && (e.key === "Enter" || e.key === " ")) {
        startSnakeCountdown();
        return;
    }

    // Pause toggle (P during "playing" phase only)
    if ((e.key === "p" || e.key === "P") && snk.phase === "playing") {
        snk.paused = !snk.paused;
        if (snk.paused) {
            if (snk.moveTimer) clearTimeout(snk.moveTimer);
        } else {
            scheduleSnakeMove();
        }
        renderSnake();
        return;
    }

    // Direction changes (with opposite-direction guard)
    if (snk.phase === "playing") {
        if ((e.key === "w" || e.key === "W" || e.key === "ArrowUp") && snk.dir.y !== 1) {
            snk.nextDir = { x: 0, y: -1 };
        } else if ((e.key === "s" || e.key === "S" || e.key === "ArrowDown") && snk.dir.y !== -1) {
            snk.nextDir = { x: 0, y: 1 };
        } else if ((e.key === "a" || e.key === "A" || e.key === "ArrowLeft") && snk.dir.x !== 1) {
            snk.nextDir = { x: -1, y: 0 };
        } else if ((e.key === "d" || e.key === "D" || e.key === "ArrowRight") && snk.dir.x !== -1) {
            snk.nextDir = { x: 1, y: 0 };
        }
    }

    // Game over → replay
    if (e.key === "Enter" && snk.phase === "gameover") {
        if (activeGame) activeGame();
        activeGame = initSnake();
    }
}
