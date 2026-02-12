// ========== ASCII SPACE INVADERS ENGINE ==========

var INV_W = 60;
var INV_H = 25;

// Alien sprites per type row
var ALIEN_SPRITES = ["{O}", "<H>", "[M]", "/V\\"];
var ALIEN_POINTS  = [10, 20, 30, 40];
var ALIEN_ROWS = 4;
var ALIEN_COLS = 8;
var ALIEN_SPACING = 4;  // chars between alien centers
var ALIEN_START_COL = 6;

// Player sprite
var PLAYER_SPRITE = "/A\\";
var PLAYER_ROW = 22; // inside border

// Pre-allocate grid buffer (reused every frame)
var invGrid = [];
for (var _ir = 0; _ir < INV_H; _ir++) {
    invGrid[_ir] = new Array(INV_W);
}

var inv = {
    running: false,
    phase: "countdown",   // countdown | playing | wave_clear | gameover
    countdown: 3,
    countdownTimer: null,
    animId: null,
    lastTime: 0,

    // Player
    playerX: 30,
    lives: 3,
    score: 0,
    bestScore: 0,
    bullet: null,          // {x, y} or null
    keysDown: {},

    // Aliens
    aliens: [],            // [{row, col, alive, type, points, baseX, baseY}]
    alienDir: 1,           // 1=right, -1=left
    alienOffsetX: 0,
    alienOffsetY: 0,
    alienBaseSpeed: 600,
    alienSpeed: 600,
    alienLastTick: 0,
    totalAliens: 0,
    aliveCount: 0,
    enemyBullets: [],      // [{x, y}]

    // Wave
    wave: 1,
    waveTimer: null,

    // Invincibility after hit
    invincible: false,
    invincibleTimer: null
};

function initInvaders() {
    inv.running = true;
    inv.phase = "countdown";
    inv.score = 0;
    inv.lives = 3;
    inv.wave = 1;
    inv.keysDown = {};
    inv.bullet = null;
    inv.enemyBullets = [];
    inv.playerX = Math.floor(INV_W / 2);
    inv.invincible = false;

    var data = loadArcadeData();
    inv.bestScore = (data.invaders && data.invaders.bestScore) || 0;

    startInvadersWave();
    invadersCountdown();

    return function stopInvaders() {
        inv.running = false;
        if (inv.animId) cancelAnimationFrame(inv.animId);
        if (inv.countdownTimer) clearInterval(inv.countdownTimer);
        if (inv.waveTimer) clearTimeout(inv.waveTimer);
        if (inv.invincibleTimer) clearTimeout(inv.invincibleTimer);
    };
}

function startInvadersWave() {
    inv.aliens = [];
    inv.alienDir = 1;
    inv.alienOffsetX = 0;
    inv.alienOffsetY = 0;
    inv.bullet = null;
    inv.enemyBullets = [];

    // Each new wave aliens start 1 row lower, speed base decreases
    var startRow = 3 + Math.min(inv.wave - 1, 5);
    inv.alienBaseSpeed = Math.max(300, 600 - (inv.wave - 1) * 30);
    inv.alienSpeed = inv.alienBaseSpeed;

    for (var r = 0; r < ALIEN_ROWS; r++) {
        for (var c = 0; c < ALIEN_COLS; c++) {
            inv.aliens.push({
                row: r,
                col: c,
                alive: true,
                type: r,
                points: ALIEN_POINTS[r],
                baseX: ALIEN_START_COL + c * ALIEN_SPACING,
                baseY: startRow + r * 2
            });
        }
    }

    inv.totalAliens = inv.aliens.length;
    inv.aliveCount = inv.totalAliens;
    inv.alienLastTick = 0;

    // Update score display
    scores.a = inv.score;
    scores.b = inv.lives;
    updateDisplay();
}

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

function invadersLoop(timestamp) {
    if (!inv.running || inv.phase !== "playing") return;

    var dt = timestamp - inv.lastTime;
    inv.lastTime = timestamp;
    if (dt > 50) dt = 50;
    if (dt < 1) dt = 1;

    // Player movement (continuous, like Pong)
    updateInvadersPlayer(dt);

    // Move player bullet (every frame for smooth movement)
    updatePlayerBullet();

    // Alien tick (time-based)
    if (timestamp - inv.alienLastTick >= inv.alienSpeed) {
        inv.alienLastTick = timestamp;
        alienTick();
    }

    // Move enemy bullets every frame for smooth fall
    updateEnemyBullets();

    // Check collisions
    checkInvadersCollisions();

    // Check if aliens reached player row
    checkAliensReachedBottom();

    // Check wave clear
    if (inv.aliveCount <= 0 && inv.phase === "playing") {
        invadersWaveCleared();
        return;
    }

    renderInvaders();

    if (inv.phase === "playing") {
        inv.animId = requestAnimationFrame(invadersLoop);
    }
}

function updateInvadersPlayer(dt) {
    var speed = 0.35 * dt;
    if (inv.keysDown["a"] || inv.keysDown["A"] || inv.keysDown["ArrowLeft"]) {
        inv.playerX -= speed * 0.06;
    }
    if (inv.keysDown["d"] || inv.keysDown["D"] || inv.keysDown["ArrowRight"]) {
        inv.playerX += speed * 0.06;
    }
    // Clamp to inside borders (sprite is 3 chars wide, center at playerX)
    inv.playerX = Math.max(2, Math.min(INV_W - 3, inv.playerX));
}

function updatePlayerBullet() {
    if (!inv.bullet) return;
    inv.bullet.y -= 0.5; // move up half a row per frame for smooth travel
    if (inv.bullet.y < 1) {
        inv.bullet = null; // bullet left the arena
    }
}

function alienTick() {
    // Check if any alive alien would hit a wall after moving
    var needReverse = false;
    for (var i = 0; i < inv.aliens.length; i++) {
        var a = inv.aliens[i];
        if (!a.alive) continue;
        var screenX = a.baseX + inv.alienOffsetX + inv.alienDir;
        if (screenX <= 1 || screenX + 2 >= INV_W - 1) {
            needReverse = true;
            break;
        }
    }

    if (needReverse) {
        inv.alienDir *= -1;
        inv.alienOffsetY += 1;
    } else {
        inv.alienOffsetX += inv.alienDir;
    }

    // Alien firing: find bottom-most alive alien in each column, 3% chance to fire
    if (inv.enemyBullets.length < 3) {
        var bottomAliens = [];
        for (var c = 0; c < ALIEN_COLS; c++) {
            var bottom = null;
            for (var r = ALIEN_ROWS - 1; r >= 0; r--) {
                var idx = r * ALIEN_COLS + c;
                if (inv.aliens[idx] && inv.aliens[idx].alive) {
                    bottom = inv.aliens[idx];
                    break;
                }
            }
            if (bottom) bottomAliens.push(bottom);
        }

        for (var b = 0; b < bottomAliens.length; b++) {
            if (inv.enemyBullets.length >= 3) break;
            if (Math.random() < 0.03) {
                var ba = bottomAliens[b];
                inv.enemyBullets.push({
                    x: ba.baseX + inv.alienOffsetX + 1,
                    y: ba.baseY + inv.alienOffsetY + 1
                });
            }
        }
    }
}

function updateEnemyBullets() {
    for (var i = inv.enemyBullets.length - 1; i >= 0; i--) {
        inv.enemyBullets[i].y += 0.3;
        if (inv.enemyBullets[i].y >= INV_H - 1) {
            inv.enemyBullets.splice(i, 1);
        }
    }
}

function checkInvadersCollisions() {
    // Player bullet vs aliens
    if (inv.bullet) {
        var bx = Math.round(inv.bullet.x);
        var by = Math.round(inv.bullet.y);

        for (var i = 0; i < inv.aliens.length; i++) {
            var a = inv.aliens[i];
            if (!a.alive) continue;

            var ax = a.baseX + inv.alienOffsetX;
            var ay = a.baseY + inv.alienOffsetY;

            // Alien occupies 3 chars at (ax, ay) to (ax+2, ay)
            if (by === ay && bx >= ax && bx <= ax + 2) {
                a.alive = false;
                inv.aliveCount--;
                inv.score += a.points;
                inv.bullet = null;

                // Speed up remaining aliens
                inv.alienSpeed = Math.max(100, inv.alienBaseSpeed - (inv.totalAliens - inv.aliveCount) * 15);

                // Update HUD
                scores.a = inv.score;
                updateDisplay();
                break;
            }
        }
    }

    // Enemy bullets vs player
    if (!inv.invincible) {
        var px = Math.round(inv.playerX);
        for (var j = inv.enemyBullets.length - 1; j >= 0; j--) {
            var eb = inv.enemyBullets[j];
            var ebx = Math.round(eb.x);
            var eby = Math.round(eb.y);

            if (eby === PLAYER_ROW && ebx >= px - 1 && ebx <= px + 1) {
                inv.enemyBullets.splice(j, 1);
                playerHit();
                break;
            }
        }
    }
}

function playerHit() {
    inv.lives--;
    scores.b = inv.lives;
    updateDisplay();

    if (inv.lives <= 0) {
        invadersGameOver();
        return;
    }

    // Brief invincibility
    inv.invincible = true;
    inv.invincibleTimer = setTimeout(function () {
        inv.invincible = false;
    }, 1500);
}

function checkAliensReachedBottom() {
    for (var i = 0; i < inv.aliens.length; i++) {
        var a = inv.aliens[i];
        if (!a.alive) continue;
        var ay = a.baseY + inv.alienOffsetY;
        if (ay >= PLAYER_ROW) {
            invadersGameOver();
            return;
        }
    }
}

function invadersWaveCleared() {
    inv.phase = "wave_clear";
    renderInvaders();

    inv.waveTimer = setTimeout(function () {
        inv.wave++;
        inv.bullet = null;
        inv.enemyBullets = [];
        startInvadersWave();
        invadersCountdown();
    }, 2000);
}

function invadersGameOver() {
    inv.phase = "gameover";
    if (inv.animId) {
        cancelAnimationFrame(inv.animId);
        inv.animId = null;
    }

    var data = loadArcadeData();
    if (!data.invaders) {
        data.invaders = { bestScore: 0, gamesPlayed: 0, lastScore: 0 };
    }
    data.invaders.gamesPlayed++;
    data.invaders.lastScore = inv.score;
    if (inv.score > data.invaders.bestScore) {
        data.invaders.bestScore = inv.score;
        inv.bestScore = inv.score;
    }
    saveArcadeData(data);

    renderInvaders();
}

function firePlayerBullet() {
    if (inv.bullet) return; // only one at a time
    inv.bullet = {
        x: Math.round(inv.playerX),
        y: PLAYER_ROW - 1
    };
}

// ========== RENDERING ==========

function renderInvaders() {
    var r, c;

    // Clear grid
    for (r = 0; r < INV_H; r++) {
        for (c = 0; c < INV_W; c++) {
            invGrid[r][c] = " ";
        }
    }

    // Borders
    for (c = 0; c < INV_W; c++) {
        invGrid[0][c] = "-";
        invGrid[INV_H - 1][c] = "-";
    }
    for (r = 0; r < INV_H; r++) {
        invGrid[r][0] = "|";
        invGrid[r][INV_W - 1] = "|";
    }
    invGrid[0][0] = "+";
    invGrid[0][INV_W - 1] = "+";
    invGrid[INV_H - 1][0] = "+";
    invGrid[INV_H - 1][INV_W - 1] = "+";

    // Score + lives in top border
    var pName = typeof getPlayerName === "function" ? getPlayerName() : "PLAYER";
    var scoreText = " " + pName + ": " + inv.score + "  BEST: " + inv.bestScore + "  LIVES: " + inv.lives + "  W" + inv.wave + " ";
    var scoreStart = Math.floor((INV_W - scoreText.length) / 2);
    for (var s = 0; s < scoreText.length; s++) {
        if (scoreStart + s > 0 && scoreStart + s < INV_W - 1) {
            invGrid[0][scoreStart + s] = scoreText[s];
        }
    }

    // Draw aliens
    for (var i = 0; i < inv.aliens.length; i++) {
        var a = inv.aliens[i];
        if (!a.alive) continue;

        var ax = a.baseX + inv.alienOffsetX;
        var ay = a.baseY + inv.alienOffsetY;
        var sprite = ALIEN_SPRITES[a.type];

        for (var sc = 0; sc < sprite.length; sc++) {
            var drawX = ax + sc;
            if (drawX > 0 && drawX < INV_W - 1 && ay > 0 && ay < INV_H - 1) {
                invGrid[ay][drawX] = sprite[sc];
            }
        }
    }

    // Draw player ship
    var px = Math.round(inv.playerX);
    // Blink when invincible
    var showPlayer = true;
    if (inv.invincible) {
        showPlayer = Math.floor(performance.now() / 100) % 2 === 0;
    }
    if (showPlayer) {
        for (var pc = 0; pc < PLAYER_SPRITE.length; pc++) {
            var ppx = px - 1 + pc;
            if (ppx > 0 && ppx < INV_W - 1 && PLAYER_ROW > 0 && PLAYER_ROW < INV_H - 1) {
                invGrid[PLAYER_ROW][ppx] = PLAYER_SPRITE[pc];
            }
        }
    }

    // Draw player bullet
    if (inv.bullet) {
        var bx = Math.round(inv.bullet.x);
        var by = Math.round(inv.bullet.y);
        if (bx > 0 && bx < INV_W - 1 && by > 0 && by < INV_H - 1) {
            invGrid[by][bx] = "^";
        }
    }

    // Draw enemy bullets
    for (var eb = 0; eb < inv.enemyBullets.length; eb++) {
        var ebx = Math.round(inv.enemyBullets[eb].x);
        var eby = Math.round(inv.enemyBullets[eb].y);
        if (ebx > 0 && ebx < INV_W - 1 && eby > 0 && eby < INV_H - 1) {
            invGrid[eby][ebx] = "v";
        }
    }

    // Controls hint in bottom border
    var ctrlText = " A/D:MOVE  SPACE:FIRE  ESC:MENU ";
    var ctrlStart = Math.floor((INV_W - ctrlText.length) / 2);
    for (var ct = 0; ct < ctrlText.length; ct++) {
        if (ctrlStart + ct > 0 && ctrlStart + ct < INV_W - 1) {
            invGrid[INV_H - 1][ctrlStart + ct] = ctrlText[ct];
        }
    }

    // Phase overlays
    if (inv.phase === "countdown") {
        drawInvText(invGrid, "WAVE " + inv.wave, Math.floor(INV_H / 2) - 2);
        drawInvText(invGrid, "GET READY!", Math.floor(INV_H / 2));
        drawInvText(invGrid, String(inv.countdown), Math.floor(INV_H / 2) + 2);
    }

    if (inv.phase === "wave_clear") {
        drawInvText(invGrid, "========================", Math.floor(INV_H / 2) - 1);
        drawInvText(invGrid, "W A V E  " + inv.wave + "  C L E A R !", Math.floor(INV_H / 2));
        drawInvText(invGrid, "========================", Math.floor(INV_H / 2) + 1);
        drawInvText(invGrid, "NEXT WAVE INCOMING...", Math.floor(INV_H / 2) + 3);
    }

    if (inv.phase === "gameover") {
        drawInvText(invGrid, "========================", Math.floor(INV_H / 2) - 4);
        drawInvText(invGrid, "G A M E  O V E R", Math.floor(INV_H / 2) - 2);
        drawInvText(invGrid, "========================", Math.floor(INV_H / 2) - 1);
        drawInvText(invGrid, "SCORE: " + inv.score + "  WAVES: " + inv.wave, Math.floor(INV_H / 2) + 1);
        if (inv.score > 0 && inv.score >= inv.bestScore) {
            drawInvText(invGrid, "** NEW BEST! **", Math.floor(INV_H / 2) + 3);
        } else {
            drawInvText(invGrid, "BEST: " + inv.bestScore, Math.floor(INV_H / 2) + 3);
        }
        drawInvText(invGrid, "[ENTER] REPLAY  [ESC] MENU", Math.floor(INV_H / 2) + 5);
    }

    // Build output string
    var lines = [];
    for (r = 0; r < INV_H; r++) {
        lines[r] = invGrid[r].join("");
    }
    document.getElementById("invaders-arena").textContent = lines.join("\n");
}

function drawInvText(grid, text, row) {
    var startCol = Math.floor((INV_W - text.length) / 2);
    for (var i = 0; i < text.length; i++) {
        if (startCol + i > 0 && startCol + i < INV_W - 1 && row > 0 && row < INV_H - 1) {
            grid[row][startCol + i] = text[i];
        }
    }
}

// ========== INPUT ==========

function handleInvadersKey(e) {
    if (["ArrowLeft", "ArrowRight", " "].indexOf(e.key) !== -1) {
        e.preventDefault();
    }

    inv.keysDown[e.key] = true;

    if (inv.phase === "playing") {
        if (e.key === " ") {
            firePlayerBullet();
        }
    }

    if (e.key === "Enter" && inv.phase === "gameover") {
        if (inv.animId) cancelAnimationFrame(inv.animId);
        activeGame = initInvaders();
    }
}

function handleInvadersKeyUp(e) {
    inv.keysDown[e.key] = false;
}
