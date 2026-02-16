/**
 * ============================================================================
 *  PONG.JS — ASCII Pong Game
 * ============================================================================
 *
 *  Classic Pong with ASCII art rendering. Player vs CPU with three difficulty
 *  levels that control ball speed, paddle speed, and AI reaction time.
 *
 *  Game flow:
 *    1. Difficulty select  — Choose Easy / Medium / Hard
 *    2. Countdown          — "3… 2… 1…" before each serve
 *    3. Playing            — Real-time paddle + ball physics via requestAnimationFrame
 *    4. Point scored       — Brief pause, then next serve
 *    5. Game over          — First to WIN_SCORE (7) wins the match
 *
 *  Physics:
 *    • Fixed-timestep loop (16 ms steps) for deterministic behavior
 *    • Ball accelerates on each paddle hit (hitCount * 0.05 multiplier)
 *    • Paddle hit angle affects ball Y-deflection
 *
 *  Controls:
 *    W / Arrow Up    — Move paddle up
 *    S / Arrow Down  — Move paddle down
 *    ESC             — Return to menu
 *
 *  Depends on:  app.js (scores, resetAll, increment, recordMatchResult, getPlayerName)
 *               grid.js (ArcadeGrid)
 * ============================================================================
 */


/* ═══════════════════════════════════════════════════════════════════════════
   CONFIGURATION
   ═══════════════════════════════════════════════════════════════════════════ */

const PONG_W = 70;        // arena width in characters
const PONG_H = 30;        // arena height in rows
const PADDLE_H = 6;       // paddle height in rows
const WIN_SCORE = 7;      // points needed to win a match

const PONG_DIFFICULTIES = {
    1: { ball: 0.30, player: 0.40, ai: 0.16, label: "EASY" },
    2: { ball: 0.40, player: 0.48, ai: 0.22, label: "MEDIUM" },
    3: { ball: 0.52, player: 0.52, ai: 0.28, label: "HARD" }
};

let ballSpeed = 0.40;     // current ball speed (set by difficulty)
let playerSpeed = 0.48;   // current player paddle speed
let aiSpeed = 0.22;       // current AI paddle speed
let pongDifficulty = 2;   // selected difficulty (1/2/3)


/* ═══════════════════════════════════════════════════════════════════════════
   GAME STATE
   ═══════════════════════════════════════════════════════════════════════════ */

const pongGrid = ArcadeGrid(PONG_W, PONG_H);

const pong = {
    playerY: 15,           // player paddle Y position (center)
    aiY: 15,               // AI paddle Y position (center)
    ballX: 35,             // ball X position (float for sub-character precision)
    ballY: 15,             // ball Y position (float)
    ballDX: 1,             // ball X velocity direction
    ballDY: 0.5,           // ball Y velocity direction
    running: false,        // game loop active flag
    animId: null,          // requestAnimationFrame handle
    lastTime: 0,           // last frame timestamp for delta-time
    phase: "difficulty",   // "difficulty" | "countdown" | "playing" | "point" | "gameover"
    countdown: 3,          // countdown timer value
    countdownTimer: null,  // setInterval handle for countdown
    pointTimer: null,      // setTimeout handle for point-scored pause
    keysDown: {},          // currently held keys (for smooth movement)
    accumulator: 0,        // physics timestep accumulator (ms)
    hitCount: 0,           // paddle hits this rally (drives speed increase)
    lastScorer: "",        // "player" or "cpu" — who scored last
    paused: false          // pause toggle (P key during "playing" phase)
};


/* ═══════════════════════════════════════════════════════════════════════════
   INIT & LIFECYCLE
   ═══════════════════════════════════════════════════════════════════════════ */

/** Initialize the Pong game. Returns a cleanup function for the screen manager. */
function initPong() {
    resetAll();
    pong.playerY = Math.floor(PONG_H / 2);
    pong.aiY = Math.floor(PONG_H / 2);
    pong.running = true;
    pong.keysDown = {};
    pong.phase = "difficulty";
    pong.hitCount = 0;
    pong.lastScorer = "";
    pong.paused = false;
    resetBall();
    renderPong();

    return function stopPong() {
        pong.running = false;
        if (pong.animId) cancelAnimationFrame(pong.animId);
        if (pong.countdownTimer) clearInterval(pong.countdownTimer);
        if (pong.pointTimer) clearTimeout(pong.pointTimer);
    };
}

/** Apply difficulty settings and begin the match. */
function applyPongDifficulty(level) {
    const d = PONG_DIFFICULTIES[level];
    ballSpeed = d.ball;
    playerSpeed = d.player;
    aiSpeed = d.ai;
    pongDifficulty = level;
}

/** Start the game after difficulty is selected. */
function startPongGame() {
    applyPongDifficulty(pongDifficulty);
    pong.phase = "countdown";
    startPongCountdown();
}


/* ═══════════════════════════════════════════════════════════════════════════
   BALL MANAGEMENT
   ═══════════════════════════════════════════════════════════════════════════ */

/** Reset ball to center with a random direction. */
function resetBall() {
    pong.ballX = PONG_W / 2;
    pong.ballY = PONG_H / 2;
    pong.ballDX = Math.random() > 0.5 ? 1 : -1;
    pong.ballDY = (Math.random() - 0.5) * 1.2;
    pong.hitCount = 0;
}


/* ═══════════════════════════════════════════════════════════════════════════
   COUNTDOWN — "3… 2… 1…" before each serve
   ═══════════════════════════════════════════════════════════════════════════ */

/** Run the pre-serve countdown, then start the game loop. */
function startPongCountdown() {
    if (pong.animId) {
        cancelAnimationFrame(pong.animId);
        pong.animId = null;
    }

    pong.countdown = 3;
    pong.phase = "countdown";
    renderPong();

    pong.countdownTimer = setInterval(function () {
        pong.countdown--;
        if (pong.countdown <= 0) {
            clearInterval(pong.countdownTimer);
            pong.countdownTimer = null;
            pong.phase = "playing";
            pong.lastTime = performance.now();
            pong.accumulator = 0;
            pong.animId = requestAnimationFrame(pongLoop);
        }
        renderPong();
    }, 800);
}


/* ═══════════════════════════════════════════════════════════════════════════
   GAME LOOP — Fixed-timestep physics via requestAnimationFrame
   ═══════════════════════════════════════════════════════════════════════════ */

const PONG_STEP = 16;   // fixed physics timestep (ms) — ~60 FPS equivalent

/** Main animation loop. Accumulates elapsed time and runs fixed-step updates. */
function pongLoop(timestamp) {
    if (!pong.running) return;

    let elapsed = timestamp - pong.lastTime;
    pong.lastTime = timestamp;
    if (elapsed > 100) elapsed = 100;   // cap to prevent spiral-of-death

    if (pong.phase === "playing" && !pong.paused) {
        pong.accumulator += elapsed;
        while (pong.accumulator >= PONG_STEP) {
            updatePongPlayer(PONG_STEP);
            updatePongAI(PONG_STEP);
            updatePongBall(PONG_STEP);
            pong.accumulator -= PONG_STEP;
            if (pong.phase !== "playing") break;   // scoring may change phase mid-step
        }
    }

    renderPong();

    if (pong.phase === "playing") {
        pong.animId = requestAnimationFrame(pongLoop);
    } else {
        pong.animId = null;
    }
}


/* ═══════════════════════════════════════════════════════════════════════════
   PHYSICS UPDATES — Player, AI, and Ball
   ═══════════════════════════════════════════════════════════════════════════ */

/** Move the player paddle based on held keys. */
function updatePongPlayer(dt) {
    const move = playerSpeed * dt * 0.06;
    if (pong.keysDown["w"] || pong.keysDown["W"] || pong.keysDown["ArrowUp"]) {
        pong.playerY -= move;
    }
    if (pong.keysDown["s"] || pong.keysDown["S"] || pong.keysDown["ArrowDown"]) {
        pong.playerY += move;
    }
    const half = Math.floor(PADDLE_H / 2);
    pong.playerY = Math.max(half + 1, Math.min(PONG_H - half - 2, pong.playerY));
}

/** Move the AI paddle toward the ball (with limited reaction speed). */
function updatePongAI(dt) {
    const targetY = pong.ballY;
    const diff = targetY - pong.aiY;

    // Only track the ball when it's heading toward the AI side
    if (pong.ballDX > 0 && pong.ballX > PONG_W * 0.3) {
        if (Math.abs(diff) > 1.5) {
            pong.aiY += Math.sign(diff) * aiSpeed * dt * 0.06;
        }
    } else {
        // Drift back toward center when ball is far away
        const centerDiff = PONG_H / 2 - pong.aiY;
        if (Math.abs(centerDiff) > 2) {
            pong.aiY += Math.sign(centerDiff) * aiSpeed * dt * 0.03;
        }
    }

    const half = Math.floor(PADDLE_H / 2);
    pong.aiY = Math.max(half + 1, Math.min(PONG_H - half - 2, pong.aiY));
}

/** Update ball position, handle wall/paddle collisions, and check for scoring. */
function updatePongBall(dt) {
    // Rally speed boost — ball gets faster with each paddle hit
    const speedMult = Math.min(1.6, 1 + pong.hitCount * 0.05);
    const speed = ballSpeed * dt * 0.06 * speedMult;
    pong.ballX += pong.ballDX * speed;
    pong.ballY += pong.ballDY * speed;

    // ── Wall bounce (top/bottom) ─────────────────────────────
    if (pong.ballY <= 1) {
        pong.ballY = 1;
        pong.ballDY = Math.abs(pong.ballDY);
        sfx(330, 30);
    }
    if (pong.ballY >= PONG_H - 2) {
        pong.ballY = PONG_H - 2;
        pong.ballDY = -Math.abs(pong.ballDY);
        sfx(330, 30);
    }

    const half = Math.floor(PADDLE_H / 2);

    // ── Player paddle collision (left side, columns 2–3) ─────
    if (pong.ballDX < 0 && pong.ballX <= 3.5 && pong.ballX >= 2) {
        const py = Math.round(pong.playerY);
        if (pong.ballY >= py - half - 0.5 && pong.ballY <= py + half + 0.5) {
            pong.ballX = 3.5;
            pong.ballDX = Math.abs(pong.ballDX);
            pong.ballDY = Math.max(-1.2, Math.min(1.2, ((pong.ballY - pong.playerY) / half) * 0.8));
            pong.hitCount++;
            sfx(440, 50);
        }
    }

    // ── AI paddle collision (right side) ─────────────────────
    if (pong.ballDX > 0 && pong.ballX >= PONG_W - 4.5 && pong.ballX <= PONG_W - 3) {
        const ay = Math.round(pong.aiY);
        if (pong.ballY >= ay - half - 0.5 && pong.ballY <= ay + half + 0.5) {
            pong.ballX = PONG_W - 4.5;
            pong.ballDX = -Math.abs(pong.ballDX);
            pong.ballDY = Math.max(-1.2, Math.min(1.2, ((pong.ballY - pong.aiY) / half) * 0.8));
            pong.hitCount++;
            sfx(440, 50);
        }
    }

    // ── Scoring — ball passed a paddle ───────────────────────
    if (pong.ballX <= 0) { increment("b"); pong.lastScorer = "cpu"; sfx(880, 100); pongPointScored(); }
    if (pong.ballX >= PONG_W - 1) { increment("a"); pong.lastScorer = "player"; sfx(880, 100); pongPointScored(); }
}


/* ═══════════════════════════════════════════════════════════════════════════
   SCORING — Handle point-scored and match-over transitions
   ═══════════════════════════════════════════════════════════════════════════ */

/** Called when a point is scored. Checks for match win or starts next serve. */
function pongPointScored() {
    if (scores.a >= WIN_SCORE || scores.b >= WIN_SCORE) {
        pong.phase = "gameover";
        recordMatchResult("pong");
        sfx(220, 300);
        if (pong.animId) cancelAnimationFrame(pong.animId);
        renderPong();
        return;
    }

    pong.phase = "point";
    resetBall();
    renderPong();

    pong.pointTimer = setTimeout(function () {
        pong.phase = "countdown";
        startPongCountdown();
    }, 1000);
}


/* ═══════════════════════════════════════════════════════════════════════════
   RENDERING
   ═══════════════════════════════════════════════════════════════════════════ */

/** Main render function — draws the appropriate phase to the grid. */
function renderPong() {
    const g = pongGrid;
    g.clear();

    // ── Difficulty select screen (no borders) ────────────────
    if (pong.phase === "difficulty") {
        const midRow = Math.floor(PONG_H / 2);
        g.text("A S C I I   P O N G", midRow - 7);
        g.text("============================", midRow - 5);
        g.text("SELECT DIFFICULTY", midRow - 3);

        const labels = [
            "[1]  EASY    -  Chill rally",
            "[2]  MEDIUM  -  Classic",
            "[3]  HARD    -  Lightning"
        ];
        for (let li = 0; li < labels.length; li++) {
            const sel = (pongDifficulty === li + 1);
            const arrow = sel ? ">> " : "   ";
            const row = midRow - 1 + li;
            g.text(arrow + labels[li], row);
            if (sel) {
                const col = Math.floor((PONG_W - (arrow + labels[li]).length) / 2);
                g.setGreen(row, col, ">");
                g.setGreen(row, col + 1, ">");
            }
        }

        g.text("============================", midRow + 3);
        const enterLine = "ARROWS/WASD:SELECT  ENTER:PLAY";
        const enterCol = Math.floor((PONG_W - enterLine.length) / 2);
        g.text("ARROWS/WASD:SELECT  ", midRow + 5, enterCol);
        g.textGreen("ENTER", midRow + 5, enterCol + 20);
        g.text(":PLAY", midRow + 5, enterCol + 25);
        g.render("pong-arena");
        return;
    }

    // ── All other phases: bordered arena ──────────────────────
    g.borders();

    const pName = getPlayerName();

    // Draw field elements during active play (hide ball during countdown)
    const showField = (pong.phase === "playing" || pong.phase === "countdown" || pong.phase === "point");
    if (showField) {
        // Center dashed line
        const mid = Math.floor(PONG_W / 2);
        for (let r = 1; r < PONG_H - 1; r++) {
            if (r % 2 === 0) g.set(r, mid, "|");
        }

        // Paddles
        const half = Math.floor(PADDLE_H / 2);
        const py = Math.round(pong.playerY);
        for (let i = -half; i <= half; i++) {
            const pr = py + i;
            if (pr > 0 && pr < PONG_H - 1) {
                g.set(pr, 2, "#");
                g.set(pr, 3, "#");
            }
        }
        const ay = Math.round(pong.aiY);
        for (let j = -half; j <= half; j++) {
            const ar = ay + j;
            if (ar > 0 && ar < PONG_H - 1) {
                g.set(ar, PONG_W - 3, "#");
                g.set(ar, PONG_W - 4, "#");
            }
        }

        // Ball — only visible during active play, not during countdown
        if (pong.phase !== "countdown") {
            const bx = Math.round(pong.ballX);
            const by = Math.round(pong.ballY);
            if (bx > 0 && bx < PONG_W - 1 && by > 0 && by < PONG_H - 1) {
                g.setGreen(by, bx, "O");
            }
        }
    }

    const midRow = Math.floor(PONG_H / 2);

    // ── Top border text ──────────────────────────────────────
    if (pong.phase === "gameover") {
        g.borderText(" A S C I I   P O N G ", 0);
    } else {
        const sa = String(scores.a).padStart(2, "0");
        const sb = String(scores.b).padStart(2, "0");
        const shortName = pName.length > 8 ? pName.substring(0, 8) : pName;
        g.borderText(" " + shortName + " " + sa + " - " + sb + " CPU ", 0);
    }
    g.borderText(" WASD: MOVE   P: PAUSE   M: MUTE   ESC: MENU ", PONG_H - 1);

    // ── Phase overlays ───────────────────────────────────────
    if (pong.phase === "countdown") {
        g.textInner("GET READY", midRow - 2);
        g.textInner(String(pong.countdown), midRow);
    }

    if (pong.phase === "point") {
        const scorer = pong.lastScorer === "player" ? getPlayerName() : "CPU";
        g.textInner(scorer + " SCORES!", midRow);
    }

    if (pong.paused && pong.phase === "playing") {
        g.textInner("P  A  U  S  E  D", midRow - 1);
        var resumeLine = "[P] RESUME";
        var resumeCol = Math.floor((PONG_W - resumeLine.length) / 2);
        g.textGreen("[P]", midRow + 1, resumeCol);
        g.textInner(" RESUME", midRow + 1, resumeCol + 3);
    }

    if (pong.phase === "gameover") {
        const winner = scores.a >= WIN_SCORE ? pName + " WINS!" : "CPU WINS!";
        g.textInner("====================", midRow - 3);
        g.textInner(winner, midRow - 1);
        g.textInner("====================", midRow + 1);
        const sa2 = String(scores.a).padStart(2, "0");
        const sb2 = String(scores.b).padStart(2, "0");
        g.textInner("FINAL: " + pName + " " + sa2 + " - " + sb2 + " CPU", midRow + 3);
        const replayLine = "[ENTER] REPLAY";
        const replayCol = Math.floor((PONG_W - replayLine.length) / 2);
        g.textGreen("[ENTER]", midRow + 5, replayCol);
        g.textInner(" REPLAY", midRow + 5, replayCol + 7);
    }

    g.render("pong-arena");
}


/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD HANDLER
   ═══════════════════════════════════════════════════════════════════════════ */

/** Handle keydown events for Pong (movement + menu interaction). */
function handlePongKey(e) {
    if (["ArrowUp", "ArrowDown", " "].indexOf(e.key) !== -1) {
        e.preventDefault();
    }

    pong.keysDown[e.key] = true;

    // ── Pause toggle (P during "playing" phase only) ─────────
    if ((e.key === "p" || e.key === "P") && pong.phase === "playing") {
        pong.paused = !pong.paused;
        if (!pong.paused) {
            pong.lastTime = performance.now();
            pong.accumulator = 0;
        }
        renderPong();
        return;
    }

    // ── Difficulty select ────────────────────────────────────
    if (pong.phase === "difficulty") {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
            pongDifficulty = pongDifficulty > 1 ? pongDifficulty - 1 : 3;
            renderPong();
        } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
            pongDifficulty = pongDifficulty < 3 ? pongDifficulty + 1 : 1;
            renderPong();
        } else if (e.key === "Enter" || e.key === " ") {
            startPongGame();
        } else if (e.key === "1") { pongDifficulty = 1; startPongGame(); }
        else if (e.key === "2") { pongDifficulty = 2; startPongGame(); }
        else if (e.key === "3") { pongDifficulty = 3; startPongGame(); }
        return;
    }

    // ── Game over — replay ───────────────────────────────────
    if (e.key === "Enter" && pong.phase === "gameover") {
        if (pong.animId) cancelAnimationFrame(pong.animId);
        if (activeGame) activeGame();
        activeGame = initPong();
    }
}

/** Handle keyup events (release held keys for smooth movement). */
function handlePongKeyUp(e) {
    pong.keysDown[e.key] = false;
}
