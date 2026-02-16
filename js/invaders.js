/**
 * ============================================================================
 *  INVADERS.JS — Space Invaders Game
 * ============================================================================
 *
 *  Classic Space Invaders in ASCII art. Defend against waves of descending
 *  aliens using your ship (/A\). Score points by shooting aliens.
 *
 *  Alien types (top to bottom, increasing difficulty):
 *    {O} = 10 pts,  <H> = 20 pts,  [M] = 30 pts,  /V\ = 40 pts
 *
 *  Game flow:
 *    1. Intro       — Title screen with controls
 *    2. Countdown   — "3… 2… 1…" before each wave
 *    3. Playing     — Real-time action (requestAnimationFrame loop)
 *    4. Wave clear  — Brief pause, then next wave starts
 *    5. Game over   — Final score, best score tracking
 *
 *  Wave system:
 *    • Aliens start lower and move faster with each wave
 *    • Base speed decreases by 30 ms per wave (min 300 ms)
 *    • Alien speed also increases as more aliens are killed within a wave
 *
 *  Player mechanics:
 *    • 3 lives per game
 *    • 1.5s invincibility after being hit (ship blinks)
 *    • One bullet on screen at a time
 *    • Continuous movement via keyDown/keyUp tracking
 *
 *  Controls:
 *    Arrows / A,D   — Move ship left/right
 *    Space          — Fire bullet
 *    Enter          — Start / replay
 *    ESC            — Return to menu
 *
 *  Depends on:  app.js (loadArcadeData, saveArcadeData, getPlayerName,
 *                        scores, updateDisplay)
 *               grid.js (ArcadeGrid)
 * ============================================================================
 */


/* ═══════════════════════════════════════════════════════════════════════════
   CONFIGURATION
   ═══════════════════════════════════════════════════════════════════════════ */

const INV_W = 70;                        // arena width
const INV_H = 30;                        // arena height

const ALIEN_SPRITES = ["{O}", "<H>", "[M]", "/V\\"];   // sprites by row type
const ALIEN_POINTS  = [10, 20, 30, 40];                // points by row type
const ALIEN_ROWS = 4;                    // rows of aliens per wave
const ALIEN_COLS = 8;                    // columns of aliens per wave
const ALIEN_SPACING = 5;                 // horizontal spacing between aliens
const ALIEN_START_COL = 8;               // left-edge starting column

const PLAYER_SPRITE = "/A\\";            // player ship (3 chars wide)
const PLAYER_ROW = 27;                   // fixed row for the player ship


/* ═══════════════════════════════════════════════════════════════════════════
   GAME STATE
   ═══════════════════════════════════════════════════════════════════════════ */

const invGrid = ArcadeGrid(INV_W, INV_H);

const inv = {
    running: false,                      // game active flag
    phase: "countdown",                  // "intro" | "countdown" | "playing" | "wave_clear" | "gameover"
    countdown: 3,                        // countdown value
    countdownTimer: null,                // setInterval handle for countdown
    animId: null,                        // requestAnimationFrame handle
    lastTime: 0,                         // previous frame timestamp (for delta time)

    // ── Player ─────────────────────────────────────────────────
    playerX: 30,                         // player X position (float for smooth movement)
    lives: 3,                            // remaining lives
    score: 0,                            // current score
    bestScore: 0,                        // all-time best score
    bullet: null,                        // player bullet {x, y} or null
    keysDown: {},                        // currently held keys (for continuous movement)

    // ── Aliens ─────────────────────────────────────────────────
    aliens: [],                          // array of alien objects {row, col, alive, type, points, baseX, baseY}
    alienDir: 1,                         // horizontal move direction (+1 right, -1 left)
    alienOffsetX: 0,                     // cumulative horizontal offset from base positions
    alienOffsetY: 0,                     // cumulative vertical offset (aliens drop when reversing)
    alienBaseSpeed: 600,                 // base tick interval for this wave (ms)
    alienSpeed: 600,                     // current tick interval (decreases as aliens die)
    alienLastTick: 0,                    // timestamp of last alien movement tick
    totalAliens: 0,                      // total aliens spawned this wave
    aliveCount: 0,                       // aliens still alive this wave
    enemyBullets: [],                    // array of enemy bullets {x, y}

    // ── Wave progression ───────────────────────────────────────
    wave: 1,                             // current wave number
    waveTimer: null,                     // setTimeout handle for wave transitions

    // ── Invincibility ──────────────────────────────────────────
    invincible: false,                   // true during post-hit invincibility
    invincibleTimer: null,               // setTimeout handle for invincibility duration
    paused: false                        // pause toggle (P key during "playing" phase)
};


/* ═══════════════════════════════════════════════════════════════════════════
   INIT & LIFECYCLE
   ═══════════════════════════════════════════════════════════════════════════ */

/** Initialize Space Invaders. Returns a cleanup function. */
function initInvaders() {
    inv.running = true;
    inv.phase = "intro";
    inv.score = 0;
    inv.lives = 3;
    inv.wave = 1;
    inv.keysDown = {};
    inv.bullet = null;
    inv.enemyBullets = [];
    inv.playerX = Math.floor(INV_W / 2);
    inv.invincible = false;
    inv.paused = false;
    inv.aliens = [];
    inv.alienDir = 1;
    inv.alienOffsetX = 0;
    inv.alienOffsetY = 0;
    inv.alienBaseSpeed = 600;
    inv.alienSpeed = 600;
    inv.animId = null;

    const data = loadArcadeData();
    inv.bestScore = (data.invaders && data.invaders.bestScore) || 0;

    renderInvaders();

    return function stopInvaders() {
        inv.running = false;
        if (inv.animId) cancelAnimationFrame(inv.animId);
        if (inv.countdownTimer) clearInterval(inv.countdownTimer);
        if (inv.waveTimer) clearTimeout(inv.waveTimer);
        if (inv.invincibleTimer) clearTimeout(inv.invincibleTimer);
    };
}


/* ═══════════════════════════════════════════════════════════════════════════
   WAVE SETUP — Spawn alien grid and configure wave difficulty
   ═══════════════════════════════════════════════════════════════════════════ */

/** Spawn the alien grid for the current wave. Higher waves start lower and faster. */
function startInvadersWave() {
    inv.aliens = [];
    inv.alienDir = 1;
    inv.alienOffsetX = 0;
    inv.alienOffsetY = 0;
    inv.bullet = null;
    inv.enemyBullets = [];

    // Each wave, aliens start 1 row lower (capped at +5)
    const startRow = 3 + Math.min(inv.wave - 1, 5);
    // Base speed increases with each wave (min 300 ms)
    inv.alienBaseSpeed = Math.max(300, 600 - (inv.wave - 1) * 30);
    inv.alienSpeed = inv.alienBaseSpeed;

    // Build the alien grid (4 rows × 8 columns)
    for (let r = 0; r < ALIEN_ROWS; r++) {
        for (let c = 0; c < ALIEN_COLS; c++) {
            inv.aliens.push({
                row: r, col: c, alive: true,
                type: r, points: ALIEN_POINTS[r],
                baseX: ALIEN_START_COL + c * ALIEN_SPACING,
                baseY: startRow + r * 2
            });
        }
    }

    inv.totalAliens = inv.aliens.length;
    inv.aliveCount = inv.totalAliens;
    inv.alienLastTick = 0;

    scores.a = inv.score;
    scores.b = inv.lives;
    updateDisplay();
}


/* ═══════════════════════════════════════════════════════════════════════════
   COUNTDOWN — "3… 2… 1…" before each wave
   ═══════════════════════════════════════════════════════════════════════════ */

/** Run a 3-second countdown, then start the game loop. */
function invadersCountdown() {
    inv.countdown = 3;
    inv.phase = "countdown";
    renderInvaders();

    inv.countdownTimer = setInterval(function () {
        inv.countdown--;
        if (inv.countdown <= 0) {
            clearInterval(inv.countdownTimer);
            inv.countdownTimer = null;
            inv.phase = "playing";
            inv.lastTime = performance.now();
            inv.alienLastTick = performance.now();
            inv.animId = requestAnimationFrame(invadersLoop);
        }
        renderInvaders();
    }, 700);
}


/* ═══════════════════════════════════════════════════════════════════════════
   GAME LOOP — requestAnimationFrame-based main loop
   ═══════════════════════════════════════════════════════════════════════════ */

/** Main game loop: update player, bullets, aliens, collisions, then render. */
function invadersLoop(timestamp) {
    if (!inv.running || inv.phase !== "playing") return;

    // Delta time with clamping to prevent physics jumps
    let dt = timestamp - inv.lastTime;
    inv.lastTime = timestamp;
    if (dt > 50) dt = 50;
    if (dt < 1) dt = 1;

    if (!inv.paused) {
        updateInvadersPlayer(dt);
        updatePlayerBullet();

        // Aliens move on a fixed tick interval (not every frame)
        if (timestamp - inv.alienLastTick >= inv.alienSpeed) {
            inv.alienLastTick = timestamp;
            alienTick();
        }

        updateEnemyBullets();
        checkInvadersCollisions();
        checkAliensReachedBottom();

        // Wave cleared?
        if (inv.aliveCount <= 0 && inv.phase === "playing") {
            invadersWaveCleared();
            return;
        }
    }

    renderInvaders();

    if (inv.phase === "playing") {
        inv.animId = requestAnimationFrame(invadersLoop);
    }
}


/* ═══════════════════════════════════════════════════════════════════════════
   PHYSICS — Player, bullets, and alien movement
   ═══════════════════════════════════════════════════════════════════════════ */

/** Move the player ship based on held keys and delta time. */
function updateInvadersPlayer(dt) {
    const speed = 0.35 * dt;
    if (inv.keysDown["a"] || inv.keysDown["A"] || inv.keysDown["ArrowLeft"]) {
        inv.playerX -= speed * 0.06;
    }
    if (inv.keysDown["d"] || inv.keysDown["D"] || inv.keysDown["ArrowRight"]) {
        inv.playerX += speed * 0.06;
    }
    // Clamp to arena bounds
    inv.playerX = Math.max(2, Math.min(INV_W - 3, inv.playerX));
}

/** Advance the player's bullet upward; remove if off-screen. */
function updatePlayerBullet() {
    if (!inv.bullet) return;
    inv.bullet.y -= 0.5;
    if (inv.bullet.y < 1) inv.bullet = null;
}

/** One tick of alien grid movement: shift horizontally or reverse and drop. */
function alienTick() {
    // Check if any alive alien would go out of bounds
    let needReverse = false;
    for (let i = 0; i < inv.aliens.length; i++) {
        const a = inv.aliens[i];
        if (!a.alive) continue;
        const screenX = a.baseX + inv.alienOffsetX + inv.alienDir;
        if (screenX <= 1 || screenX + 2 >= INV_W - 1) {
            needReverse = true;
            break;
        }
    }

    if (needReverse) {
        inv.alienDir *= -1;          // reverse horizontal direction
        inv.alienOffsetY += 1;       // drop one row
    } else {
        inv.alienOffsetX += inv.alienDir;
    }

    // ── Alien firing ───────────────────────────────────────────
    if (inv.enemyBullets.length < 3) {
        // Find the bottom-most alive alien in each column
        const bottomAliens = [];
        for (let c = 0; c < ALIEN_COLS; c++) {
            for (let r = ALIEN_ROWS - 1; r >= 0; r--) {
                const idx = r * ALIEN_COLS + c;
                if (inv.aliens[idx] && inv.aliens[idx].alive) {
                    bottomAliens.push(inv.aliens[idx]);
                    break;
                }
            }
        }

        // Each bottom alien has a 3% chance to fire per tick
        for (let b = 0; b < bottomAliens.length; b++) {
            if (inv.enemyBullets.length >= 3) break;
            if (Math.random() < 0.03) {
                const ba = bottomAliens[b];
                inv.enemyBullets.push({
                    x: ba.baseX + inv.alienOffsetX + 1,
                    y: ba.baseY + inv.alienOffsetY + 1
                });
            }
        }
    }
}

/** Advance all enemy bullets downward; remove if off-screen. */
function updateEnemyBullets() {
    for (let i = inv.enemyBullets.length - 1; i >= 0; i--) {
        inv.enemyBullets[i].y += 0.3;
        if (inv.enemyBullets[i].y >= INV_H - 1) {
            inv.enemyBullets.splice(i, 1);
        }
    }
}


/* ═══════════════════════════════════════════════════════════════════════════
   COLLISION DETECTION
   ═══════════════════════════════════════════════════════════════════════════ */

/** Check player bullet vs aliens and enemy bullets vs player. */
function checkInvadersCollisions() {
    // ── Player bullet vs aliens ────────────────────────────────
    if (inv.bullet) {
        const bx = Math.round(inv.bullet.x);
        const by = Math.round(inv.bullet.y);

        for (let i = 0; i < inv.aliens.length; i++) {
            const a = inv.aliens[i];
            if (!a.alive) continue;

            const ax = a.baseX + inv.alienOffsetX;
            const ay = a.baseY + inv.alienOffsetY;

            // Alien sprite is 3 chars wide
            if (by === ay && bx >= ax && bx <= ax + 2) {
                a.alive = false;
                inv.aliveCount--;
                inv.score += a.points;
                inv.bullet = null;
                sfx(440, 80);
                // Remaining aliens speed up as their numbers thin
                inv.alienSpeed = Math.max(100, inv.alienBaseSpeed - (inv.totalAliens - inv.aliveCount) * 15);
                scores.a = inv.score;
                updateDisplay();
                break;
            }
        }
    }

    // ── Enemy bullets vs player ────────────────────────────────
    if (!inv.invincible) {
        const px = Math.round(inv.playerX);
        for (let j = inv.enemyBullets.length - 1; j >= 0; j--) {
            const eb = inv.enemyBullets[j];
            if (Math.round(eb.y) === PLAYER_ROW && Math.round(eb.x) >= px - 1 && Math.round(eb.x) <= px + 1) {
                inv.enemyBullets.splice(j, 1);
                playerHit();
                break;
            }
        }
    }
}

/** Handle the player getting hit: lose a life, trigger invincibility or game over. */
function playerHit() {
    inv.lives--;
    scores.b = inv.lives;
    sfx(180, 200);
    updateDisplay();

    if (inv.lives <= 0) {
        invadersGameOver();
        return;
    }

    // Brief invincibility period (ship blinks during this time)
    inv.invincible = true;
    inv.invincibleTimer = setTimeout(function () {
        inv.invincible = false;
    }, 1500);
}

/** Check if any alive alien has reached the player's row. */
function checkAliensReachedBottom() {
    for (let i = 0; i < inv.aliens.length; i++) {
        const a = inv.aliens[i];
        if (a.alive && a.baseY + inv.alienOffsetY >= PLAYER_ROW) {
            invadersGameOver();
            return;
        }
    }
}


/* ═══════════════════════════════════════════════════════════════════════════
   WAVE CLEAR & GAME OVER
   ═══════════════════════════════════════════════════════════════════════════ */

/** All aliens destroyed: show wave clear message, then start next wave. */
function invadersWaveCleared() {
    inv.phase = "wave_clear";
    sfx(660, 200);
    renderInvaders();

    inv.waveTimer = setTimeout(function () {
        inv.wave++;
        inv.bullet = null;
        inv.enemyBullets = [];
        startInvadersWave();
        invadersCountdown();
    }, 2000);
}

/** End the game: stop animation, save stats, show results. */
function invadersGameOver() {
    inv.phase = "gameover";
    sfx(180, 300);
    if (inv.animId) { cancelAnimationFrame(inv.animId); inv.animId = null; }

    const data = loadArcadeData();
    if (!data.invaders) data.invaders = { bestScore: 0, gamesPlayed: 0, lastScore: 0 };
    data.invaders.gamesPlayed++;
    data.invaders.lastScore = inv.score;
    if (inv.score > data.invaders.bestScore) {
        data.invaders.bestScore = inv.score;
        inv.bestScore = inv.score;
    }
    saveArcadeData(data);

    renderInvaders();
}

/** Fire a player bullet (only one bullet allowed on screen at a time). */
function firePlayerBullet() {
    if (inv.bullet) return;
    inv.bullet = { x: Math.round(inv.playerX), y: PLAYER_ROW - 1 };
    sfx(880, 30);
}


/* ═══════════════════════════════════════════════════════════════════════════
   RENDERING
   ═══════════════════════════════════════════════════════════════════════════ */

/** Render the Space Invaders game based on the current phase. */
function renderInvaders() {
    const g = invGrid;
    g.clear();

    // ── Intro screen ───────────────────────────────────────────
    if (inv.phase === "intro") {
        g.borders();
        g.borderText(" S P A C E   I N V A D E R S ", 0);
        const midRow = Math.floor(INV_H / 2);
        g.textInner("ARROWS/WASD:MOVE  SPACE:FIRE", midRow - 1);
        g.textInner("============================", midRow + 1);
        const enterLine = "PRESS ENTER TO START";
        const enterCol = Math.floor((INV_W - enterLine.length) / 2);
        g.textInner("PRESS ", midRow + 4, enterCol);
        g.textGreen("ENTER", midRow + 4, enterCol + 6);
        g.textInner(" TO START", midRow + 4, enterCol + 11);
        g.render("invaders-arena");
        return;
    }

    // ── Bordered arena ─────────────────────────────────────────
    g.borders();

    const pName = getPlayerName();
    if (inv.phase === "gameover") {
        g.borderText(" S P A C E   I N V A D E R S ", 0);
    } else {
        g.borderText(" " + pName + ": " + inv.score + "  BEST: " + inv.bestScore + "  LIVES: " + inv.lives + "  W" + inv.wave + " ", 0);
    }

    // ── Game elements (aliens, player, bullets) ────────────────
    const showField = (inv.phase === "playing" || inv.phase === "countdown" || inv.phase === "wave_clear");
    if (showField) {
        // Aliens
        for (let i = 0; i < inv.aliens.length; i++) {
            const a = inv.aliens[i];
            if (!a.alive) continue;

            const ax = a.baseX + inv.alienOffsetX;
            const ay = a.baseY + inv.alienOffsetY;
            const sprite = ALIEN_SPRITES[a.type];

            for (let sc = 0; sc < sprite.length; sc++) {
                const drawX = ax + sc;
                if (drawX > 0 && drawX < INV_W - 1 && ay > 0 && ay < INV_H - 1) {
                    g.set(ay, drawX, sprite[sc]);
                }
            }
        }

        // Player ship (blinks during invincibility)
        const px = Math.round(inv.playerX);
        let showPlayer = true;
        if (inv.invincible) {
            showPlayer = Math.floor(performance.now() / 100) % 2 === 0;
        }
        if (showPlayer) {
            for (let pc = 0; pc < PLAYER_SPRITE.length; pc++) {
                g.set(PLAYER_ROW, px - 1 + pc, PLAYER_SPRITE[pc]);
            }
        }

        // Player bullet (green "^")
        if (inv.bullet) {
            g.setGreen(Math.round(inv.bullet.y), Math.round(inv.bullet.x), "^");
        }

        // Enemy bullets ("v")
        for (let eb = 0; eb < inv.enemyBullets.length; eb++) {
            g.set(Math.round(inv.enemyBullets[eb].y), Math.round(inv.enemyBullets[eb].x), "v");
        }
    }

    // ── Phase overlays ─────────────────────────────────────────
    const midRow = Math.floor(INV_H / 2);

    // Controls in bottom border
    g.borderText(" WASD  SPACE: FIRE  P: PAUSE  M: MUTE  ESC: MENU ", INV_H - 1);

    if (inv.phase === "countdown") {
        g.textInner("WAVE " + inv.wave, midRow - 2);
        g.textInner("GET READY!", midRow);
        g.textInner(String(inv.countdown), midRow + 2);
    }

    if (inv.paused && inv.phase === "playing") {
        g.textInner("P  A  U  S  E  D", midRow - 1);
        var resumeLine = "[P] RESUME";
        var resumeCol = Math.floor((INV_W - resumeLine.length) / 2);
        g.textGreen("[P]", midRow + 1, resumeCol);
        g.textInner(" RESUME", midRow + 1, resumeCol + 3);
    }

    if (inv.phase === "wave_clear") {
        g.textInner("========================", midRow - 1);
        g.textInner("W A V E  " + inv.wave + "  C L E A R !", midRow);
        g.textInner("========================", midRow + 1);
        g.textInner("NEXT WAVE INCOMING...", midRow + 3);
    }

    if (inv.phase === "gameover") {
        g.textInner("====================", midRow - 3);
        g.textInner("G A M E   O V E R", midRow - 1);
        g.textInner("====================", midRow + 1);
        g.textInner("SCORE: " + inv.score + "  WAVES: " + inv.wave, midRow + 3);
        if (inv.score > 0 && inv.score >= inv.bestScore) {
            g.textInner("** NEW BEST! **", midRow + 5);
        } else {
            g.textInner("BEST: " + inv.bestScore, midRow + 5);
        }
        const replayLine = "[ENTER] REPLAY";
        const replayCol = Math.floor((INV_W - replayLine.length) / 2);
        g.textGreen("[ENTER]", midRow + 7, replayCol);
        g.textInner(" REPLAY", midRow + 7, replayCol + 7);
    }

    g.render("invaders-arena");
}


/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD HANDLER
   ═══════════════════════════════════════════════════════════════════════════ */

/** Handle keydown events for Space Invaders. */
function handleInvadersKey(e) {
    if (["ArrowLeft", "ArrowRight", " "].indexOf(e.key) !== -1) {
        e.preventDefault();
    }

    // Intro → start first wave
    if (inv.phase === "intro" && (e.key === "Enter" || e.key === " ")) {
        startInvadersWave();
        invadersCountdown();
        return;
    }

    // Track held keys for continuous movement
    inv.keysDown[e.key] = true;

    // Pause toggle (P during "playing" phase only)
    if ((e.key === "p" || e.key === "P") && inv.phase === "playing") {
        inv.paused = !inv.paused;
        if (!inv.paused) {
            inv.lastTime = performance.now();
            inv.alienLastTick = performance.now();
        }
        renderInvaders();
        return;
    }

    // Fire bullet (not while paused)
    if (inv.phase === "playing" && !inv.paused && e.key === " ") {
        firePlayerBullet();
    }

    // Game over → replay
    if (e.key === "Enter" && inv.phase === "gameover") {
        if (activeGame) activeGame();
        activeGame = initInvaders();
    }
}

/** Handle keyup events (release continuous movement keys). */
function handleInvadersKeyUp(e) {
    inv.keysDown[e.key] = false;
}
