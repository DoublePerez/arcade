// ========== ASCII SPACE INVADERS ENGINE ==========

const INV_W = 60;
const INV_H = 25;

const ALIEN_SPRITES = ["{O}", "<H>", "[M]", "/V\\"];
const ALIEN_POINTS  = [10, 20, 30, 40];
const ALIEN_ROWS = 4;
const ALIEN_COLS = 8;
const ALIEN_SPACING = 4;
const ALIEN_START_COL = 6;

const PLAYER_SPRITE = "/A\\";
const PLAYER_ROW = 22;

const invGrid = ArcadeGrid(INV_W, INV_H);

const inv = {
    running: false,
    phase: "countdown",
    countdown: 3,
    countdownTimer: null,
    animId: null,
    lastTime: 0,
    playerX: 30,
    lives: 3,
    score: 0,
    bestScore: 0,
    bullet: null,
    keysDown: {},
    aliens: [],
    alienDir: 1,
    alienOffsetX: 0,
    alienOffsetY: 0,
    alienBaseSpeed: 600,
    alienSpeed: 600,
    alienLastTick: 0,
    totalAliens: 0,
    aliveCount: 0,
    enemyBullets: [],
    wave: 1,
    waveTimer: null,
    invincible: false,
    invincibleTimer: null
};

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

function startInvadersWave() {
    inv.aliens = [];
    inv.alienDir = 1;
    inv.alienOffsetX = 0;
    inv.alienOffsetY = 0;
    inv.bullet = null;
    inv.enemyBullets = [];

    const startRow = 3 + Math.min(inv.wave - 1, 5);
    inv.alienBaseSpeed = Math.max(300, 600 - (inv.wave - 1) * 30);
    inv.alienSpeed = inv.alienBaseSpeed;

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

    let dt = timestamp - inv.lastTime;
    inv.lastTime = timestamp;
    if (dt > 50) dt = 50;
    if (dt < 1) dt = 1;

    updateInvadersPlayer(dt);
    updatePlayerBullet();

    if (timestamp - inv.alienLastTick >= inv.alienSpeed) {
        inv.alienLastTick = timestamp;
        alienTick();
    }

    updateEnemyBullets();
    checkInvadersCollisions();
    checkAliensReachedBottom();

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
    const speed = 0.35 * dt;
    if (inv.keysDown["a"] || inv.keysDown["A"] || inv.keysDown["ArrowLeft"]) {
        inv.playerX -= speed * 0.06;
    }
    if (inv.keysDown["d"] || inv.keysDown["D"] || inv.keysDown["ArrowRight"]) {
        inv.playerX += speed * 0.06;
    }
    inv.playerX = Math.max(2, Math.min(INV_W - 3, inv.playerX));
}

function updatePlayerBullet() {
    if (!inv.bullet) return;
    inv.bullet.y -= 0.5;
    if (inv.bullet.y < 1) inv.bullet = null;
}

function alienTick() {
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
        inv.alienDir *= -1;
        inv.alienOffsetY += 1;
    } else {
        inv.alienOffsetX += inv.alienDir;
    }

    // Alien firing
    if (inv.enemyBullets.length < 3) {
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

function updateEnemyBullets() {
    for (let i = inv.enemyBullets.length - 1; i >= 0; i--) {
        inv.enemyBullets[i].y += 0.3;
        if (inv.enemyBullets[i].y >= INV_H - 1) {
            inv.enemyBullets.splice(i, 1);
        }
    }
}

function checkInvadersCollisions() {
    // Player bullet vs aliens
    if (inv.bullet) {
        const bx = Math.round(inv.bullet.x);
        const by = Math.round(inv.bullet.y);

        for (let i = 0; i < inv.aliens.length; i++) {
            const a = inv.aliens[i];
            if (!a.alive) continue;

            const ax = a.baseX + inv.alienOffsetX;
            const ay = a.baseY + inv.alienOffsetY;

            if (by === ay && bx >= ax && bx <= ax + 2) {
                a.alive = false;
                inv.aliveCount--;
                inv.score += a.points;
                inv.bullet = null;
                inv.alienSpeed = Math.max(100, inv.alienBaseSpeed - (inv.totalAliens - inv.aliveCount) * 15);
                scores.a = inv.score;
                updateDisplay();
                break;
            }
        }
    }

    // Enemy bullets vs player
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

function playerHit() {
    inv.lives--;
    scores.b = inv.lives;
    updateDisplay();

    if (inv.lives <= 0) {
        invadersGameOver();
        return;
    }

    inv.invincible = true;
    inv.invincibleTimer = setTimeout(function () {
        inv.invincible = false;
    }, 1500);
}

function checkAliensReachedBottom() {
    for (let i = 0; i < inv.aliens.length; i++) {
        const a = inv.aliens[i];
        if (a.alive && a.baseY + inv.alienOffsetY >= PLAYER_ROW) {
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

function firePlayerBullet() {
    if (inv.bullet) return;
    inv.bullet = { x: Math.round(inv.playerX), y: PLAYER_ROW - 1 };
}

// ========== RENDERING ==========
function renderInvaders() {
    const g = invGrid;
    g.clear();
    g.borders();

    // Score in top border
    const pName = getPlayerName();
    g.borderText(" " + pName + ": " + inv.score + "  BEST: " + inv.bestScore + "  LIVES: " + inv.lives + "  W" + inv.wave + " ", 0);

    // Only draw game elements during active play
    if (inv.phase === "playing") {
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

        // Player ship
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

        // Player bullet
        if (inv.bullet) {
            g.setGreen(Math.round(inv.bullet.y), Math.round(inv.bullet.x), "^");
        }

        // Enemy bullets
        for (let eb = 0; eb < inv.enemyBullets.length; eb++) {
            g.set(Math.round(inv.enemyBullets[eb].y), Math.round(inv.enemyBullets[eb].x), "v");
        }
    }

    // Controls in bottom border
    g.borderText(" A/D:MOVE  SPACE:FIRE  ESC:MENU ", INV_H - 1);

    // Phase overlays
    const midRow = Math.floor(INV_H / 2);

    if (inv.phase === "intro") {
        g.textInner("S P A C E   I N V A D E R S", midRow - 6);
        g.textInner("=".repeat(36), midRow - 4);
        g.textInner("A / D  or  ARROWS:  MOVE", midRow - 2);
        g.textInner("SPACE:              FIRE", midRow);
        g.textInner("ESC:                MENU", midRow + 2);
        g.textInner("=".repeat(36), midRow + 4);
        g.textInner("PRESS ENTER TO START", midRow + 6);
    }

    if (inv.phase === "countdown") {
        g.textInner("WAVE " + inv.wave, midRow - 2);
        g.textInner("GET READY!", midRow);
        g.textInner(String(inv.countdown), midRow + 2);
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
        g.textInner("[ENTER] REPLAY  [ESC] MENU", midRow + 7);
    }

    g.render("invaders-arena");
}

// ========== INPUT ==========
function handleInvadersKey(e) {
    if (["ArrowLeft", "ArrowRight", " "].indexOf(e.key) !== -1) {
        e.preventDefault();
    }

    if (inv.phase === "intro" && (e.key === "Enter" || e.key === " ")) {
        startInvadersWave();
        invadersCountdown();
        return;
    }

    inv.keysDown[e.key] = true;

    if (inv.phase === "playing" && e.key === " ") {
        firePlayerBullet();
    }

    if (e.key === "Enter" && inv.phase === "gameover") {
        if (activeGame) activeGame();
        activeGame = initInvaders();
    }
}

function handleInvadersKeyUp(e) {
    inv.keysDown[e.key] = false;
}
