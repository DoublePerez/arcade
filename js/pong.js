// ========== ASCII PONG ENGINE ==========

const PONG_W = 60;
const PONG_H = 25;
const PADDLE_H = 5;
const WIN_SCORE = 7;

const PONG_DIFFICULTIES = {
    1: { ball: 0.30, player: 0.40, ai: 0.16, label: "EASY",   paddleBonus: 1 },
    2: { ball: 0.40, player: 0.48, ai: 0.22, label: "MEDIUM", paddleBonus: 0 },
    3: { ball: 0.52, player: 0.52, ai: 0.28, label: "HARD",   paddleBonus: 0 }
};

let ballSpeed = 0.40;
let playerSpeed = 0.48;
let aiSpeed = 0.22;
let pongDifficulty = 2;

const pongGrid = ArcadeGrid(PONG_W, PONG_H);

const pong = {
    playerY: 12,
    aiY: 12,
    ballX: 30,
    ballY: 12,
    ballDX: 1,
    ballDY: 0.5,
    running: false,
    animId: null,
    lastTime: 0,
    phase: "difficulty",
    countdown: 3,
    countdownTimer: null,
    pointTimer: null,
    keysDown: {},
    accumulator: 0
};

function initPong() {
    resetAll();
    pong.playerY = 12;
    pong.aiY = 12;
    pong.running = true;
    pong.keysDown = {};
    pong.phase = "difficulty";
    resetBall();
    renderPong();

    return function stopPong() {
        pong.running = false;
        if (pong.animId) cancelAnimationFrame(pong.animId);
        if (pong.countdownTimer) clearInterval(pong.countdownTimer);
        if (pong.pointTimer) clearTimeout(pong.pointTimer);
    };
}

function applyPongDifficulty(level) {
    const d = PONG_DIFFICULTIES[level];
    ballSpeed = d.ball;
    playerSpeed = d.player;
    aiSpeed = d.ai;
    pongDifficulty = level;
}

function startPongGame() {
    applyPongDifficulty(pongDifficulty);
    pong.phase = "countdown";
    startPongCountdown();
}

function resetBall() {
    pong.ballX = PONG_W / 2;
    pong.ballY = PONG_H / 2;
    pong.ballDX = Math.random() > 0.5 ? 1 : -1;
    pong.ballDY = (Math.random() - 0.5) * 1.2;
}

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

const PONG_STEP = 16;

function pongLoop(timestamp) {
    if (!pong.running) return;

    let elapsed = timestamp - pong.lastTime;
    pong.lastTime = timestamp;
    if (elapsed > 100) elapsed = 100;

    if (pong.phase === "playing") {
        pong.accumulator += elapsed;
        while (pong.accumulator >= PONG_STEP) {
            updatePongPlayer(PONG_STEP);
            updatePongAI(PONG_STEP);
            updatePongBall(PONG_STEP);
            pong.accumulator -= PONG_STEP;
            if (pong.phase !== "playing") break;
        }
    }

    renderPong();

    if (pong.phase === "playing") {
        pong.animId = requestAnimationFrame(pongLoop);
    } else {
        pong.animId = null;
    }
}

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

function updatePongAI(dt) {
    const targetY = pong.ballY;
    const diff = targetY - pong.aiY;

    if (pong.ballDX > 0 && pong.ballX > PONG_W * 0.3) {
        if (Math.abs(diff) > 1.5) {
            pong.aiY += Math.sign(diff) * aiSpeed * dt * 0.06;
        }
    } else {
        const centerDiff = PONG_H / 2 - pong.aiY;
        if (Math.abs(centerDiff) > 2) {
            pong.aiY += Math.sign(centerDiff) * aiSpeed * dt * 0.03;
        }
    }

    const half = Math.floor(PADDLE_H / 2);
    pong.aiY = Math.max(half + 1, Math.min(PONG_H - half - 2, pong.aiY));
}

function updatePongBall(dt) {
    const speed = ballSpeed * dt * 0.06;
    pong.ballX += pong.ballDX * speed;
    pong.ballY += pong.ballDY * speed;

    if (pong.ballY <= 1) {
        pong.ballY = 1;
        pong.ballDY = Math.abs(pong.ballDY);
    }
    if (pong.ballY >= PONG_H - 2) {
        pong.ballY = PONG_H - 2;
        pong.ballDY = -Math.abs(pong.ballDY);
    }

    const half = Math.floor(PADDLE_H / 2);

    // Player paddle collision (left side, col 2)
    if (pong.ballDX < 0 && pong.ballX <= 3.5 && pong.ballX >= 2) {
        const py = Math.round(pong.playerY);
        if (pong.ballY >= py - half - 0.5 && pong.ballY <= py + half + 0.5) {
            pong.ballX = 3.5;
            pong.ballDX = Math.abs(pong.ballDX);
            pong.ballDY = Math.max(-1.0, Math.min(1.0, ((pong.ballY - pong.playerY) / half) * 0.7));
        }
    }

    // AI paddle collision (right side)
    if (pong.ballDX > 0 && pong.ballX >= PONG_W - 4.5 && pong.ballX <= PONG_W - 3) {
        const ay = Math.round(pong.aiY);
        if (pong.ballY >= ay - half - 0.5 && pong.ballY <= ay + half + 0.5) {
            pong.ballX = PONG_W - 4.5;
            pong.ballDX = -Math.abs(pong.ballDX);
            pong.ballDY = Math.max(-1.0, Math.min(1.0, ((pong.ballY - pong.aiY) / half) * 0.7));
        }
    }

    // Scoring
    if (pong.ballX <= 0) { increment("b"); pongPointScored(); }
    if (pong.ballX >= PONG_W - 1) { increment("a"); pongPointScored(); }
}

function pongPointScored() {
    if (scores.a >= WIN_SCORE || scores.b >= WIN_SCORE) {
        pong.phase = "gameover";
        recordMatchResult("pong");
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

function renderPong() {
    const g = pongGrid;
    g.clear();
    g.borders();

    // Only draw game elements during active play
    if (pong.phase === "playing") {
        // Center dashed line
        const mid = Math.floor(PONG_W / 2);
        for (let r = 1; r < PONG_H - 1; r++) {
            if (r % 2 === 0) g.set(r, mid, ":");
        }

        // Player paddle (left, col 2-3)
        const half = Math.floor(PADDLE_H / 2);
        const py = Math.round(pong.playerY);
        for (let i = -half; i <= half; i++) {
            const pr = py + i;
            if (pr > 0 && pr < PONG_H - 1) {
                g.set(pr, 2, "#");
                g.set(pr, 3, "#");
            }
        }

        // AI paddle (right)
        const ay = Math.round(pong.aiY);
        for (let j = -half; j <= half; j++) {
            const ar = ay + j;
            if (ar > 0 && ar < PONG_H - 1) {
                g.set(ar, PONG_W - 3, "#");
                g.set(ar, PONG_W - 4, "#");
            }
        }

        // Ball
        const bx = Math.round(pong.ballX);
        const by = Math.round(pong.ballY);
        if (bx > 0 && bx < PONG_W - 1 && by > 0 && by < PONG_H - 1) {
            g.setGreen(by, bx, "O");
        }
    }

    // Score text in borders
    const pName = getPlayerName();
    const sa = String(scores.a).padStart(2, "0");
    const sb = String(scores.b).padStart(2, "0");
    g.borderText(" " + pName + " " + sa + " - " + sb + " CPU ", 0);
    const diffLabel = PONG_DIFFICULTIES[pongDifficulty].label;
    g.borderText(" " + diffLabel + " ", PONG_H - 1);

    // Phase overlays
    const midRow = Math.floor(PONG_H / 2);

    if (pong.phase === "difficulty") {
        g.textInner("SELECT DIFFICULTY", midRow - 5);
        g.textInner("==================", midRow - 4);

        const labels = ["[1]  EASY   - Chill rally", "[2]  MEDIUM - Classic", "[3]  HARD   - Lightning"];
        for (let li = 0; li < labels.length; li++) {
            const sel = (pongDifficulty === li + 1);
            const arrow = sel ? ">> " : "   ";
            const fullText = arrow + labels[li];
            const row = midRow - 2 + li * 2;
            g.textInner(fullText, row);
            if (sel) {
                const col = Math.floor((PONG_W - fullText.length) / 2);
                g.setGreen(row, col, ">");
                g.setGreen(row, col + 1, ">");
            }
        }

        g.textInner("Arrows/1-3 select, Enter to play", midRow + 6);
    }

    if (pong.phase === "countdown") {
        g.textInner("W/S or ARROWS: MOVE PADDLE", midRow - 2);
        g.textInner(String(pong.countdown), midRow);
    }

    if (pong.phase === "point") {
        g.textInner("POINT!", midRow);
    }

    if (pong.phase === "gameover") {
        const winner = scores.a >= WIN_SCORE ? pName + " WINS!" : "CPU WINS!";
        g.textInner("====================", midRow - 2);
        g.textInner(winner, midRow);
        g.textInner("====================", midRow + 2);
        g.textInner("[ENTER] REPLAY  [ESC] MENU", midRow + 4);
    }

    g.render("pong-arena");
}

// ========== INPUT ==========
function handlePongKey(e) {
    if (["ArrowUp", "ArrowDown", " "].indexOf(e.key) !== -1) {
        e.preventDefault();
    }

    pong.keysDown[e.key] = true;

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

    if (e.key === "Enter" && pong.phase === "gameover") {
        if (pong.animId) cancelAnimationFrame(pong.animId);
        if (activeGame) activeGame();
        activeGame = initPong();
    }
}

function handlePongKeyUp(e) {
    pong.keysDown[e.key] = false;
}
