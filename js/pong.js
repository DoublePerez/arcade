// ========== ASCII PONG ENGINE ==========

var PONG_W = 60;
var PONG_H = 25;
var PADDLE_H = 5;
var WIN_SCORE = 7;

// Difficulty presets: [ballSpeed, playerSpeed, aiSpeed, label]
var PONG_DIFFICULTIES = {
    1: { ball: 0.30, player: 0.40, ai: 0.16, label: "EASY",   paddleBonus: 1 },
    2: { ball: 0.40, player: 0.48, ai: 0.22, label: "MEDIUM", paddleBonus: 0 },
    3: { ball: 0.52, player: 0.52, ai: 0.28, label: "HARD",   paddleBonus: 0 }
};

var BALL_SPEED = 0.40;
var PLAYER_SPEED = 0.48;
var AI_SPEED = 0.22;
var pongDifficulty = 2; // default medium

// Pre-allocate grid buffer (reused every frame)
var pongGrid = [];
for (var _r = 0; _r < PONG_H; _r++) {
    pongGrid[_r] = new Array(PONG_W);
}

var pong = {
    playerY: 12,
    aiY: 12,
    ballX: 30,
    ballY: 12,
    ballDX: 1,
    ballDY: 0.5,
    running: false,
    animId: null,
    lastTime: 0,
    phase: "difficulty", // difficulty | countdown | playing | point | gameover
    countdown: 3,
    countdownTimer: null,
    pointTimer: null,
    keysDown: {}
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
    var d = PONG_DIFFICULTIES[level];
    BALL_SPEED = d.ball;
    PLAYER_SPEED = d.player;
    AI_SPEED = d.ai;
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
            pong.animId = requestAnimationFrame(pongLoop);
        }
        renderPong();
    }, 800);
}

function pongLoop(timestamp) {
    if (!pong.running) return;

    var dt = timestamp - pong.lastTime;
    pong.lastTime = timestamp;
    if (dt > 50) dt = 50;
    if (dt < 1) dt = 1;

    if (pong.phase === "playing") {
        updatePongPlayer(dt);
        updatePongAI(dt);
        updatePongBall(dt);
    }

    renderPong();

    if (pong.phase === "playing") {
        pong.animId = requestAnimationFrame(pongLoop);
    } else {
        pong.animId = null;
    }
}

function updatePongPlayer(dt) {
    var move = PLAYER_SPEED * dt * 0.06;
    if (pong.keysDown["w"] || pong.keysDown["W"] || pong.keysDown["ArrowUp"]) {
        pong.playerY -= move;
    }
    if (pong.keysDown["s"] || pong.keysDown["S"] || pong.keysDown["ArrowDown"]) {
        pong.playerY += move;
    }
    var half = Math.floor(PADDLE_H / 2);
    pong.playerY = Math.max(half + 1, Math.min(PONG_H - half - 2, pong.playerY));
}

function updatePongAI(dt) {
    var targetY = pong.ballY;
    var diff = targetY - pong.aiY;

    if (pong.ballDX > 0 && pong.ballX > PONG_W * 0.3) {
        if (Math.abs(diff) > 1.5) {
            pong.aiY += Math.sign(diff) * AI_SPEED * dt * 0.06;
        }
    } else {
        var centerDiff = PONG_H / 2 - pong.aiY;
        if (Math.abs(centerDiff) > 2) {
            pong.aiY += Math.sign(centerDiff) * AI_SPEED * dt * 0.03;
        }
    }

    var half = Math.floor(PADDLE_H / 2);
    pong.aiY = Math.max(half + 1, Math.min(PONG_H - half - 2, pong.aiY));
}

function updatePongBall(dt) {
    var speed = BALL_SPEED * dt * 0.06;
    pong.ballX += pong.ballDX * speed;
    pong.ballY += pong.ballDY * speed;

    // Top/bottom wall bounce
    if (pong.ballY <= 1) {
        pong.ballY = 1;
        pong.ballDY = Math.abs(pong.ballDY);
    }
    if (pong.ballY >= PONG_H - 2) {
        pong.ballY = PONG_H - 2;
        pong.ballDY = -Math.abs(pong.ballDY);
    }

    // Player paddle collision (left side, col 2)
    var half = Math.floor(PADDLE_H / 2);
    if (pong.ballDX < 0 && pong.ballX <= 3.5 && pong.ballX >= 2) {
        var py = Math.round(pong.playerY);
        if (pong.ballY >= py - half - 0.5 && pong.ballY <= py + half + 0.5) {
            pong.ballX = 3.5;
            pong.ballDX = Math.abs(pong.ballDX);
            var hitPos = (pong.ballY - pong.playerY) / half;
            pong.ballDY = hitPos * 1.2;
        }
    }

    // AI paddle collision (right side)
    if (pong.ballDX > 0 && pong.ballX >= PONG_W - 4.5 && pong.ballX <= PONG_W - 3) {
        var ay = Math.round(pong.aiY);
        if (pong.ballY >= ay - half - 0.5 && pong.ballY <= ay + half + 0.5) {
            pong.ballX = PONG_W - 4.5;
            pong.ballDX = -Math.abs(pong.ballDX);
            var hitPos2 = (pong.ballY - pong.aiY) / half;
            pong.ballDY = hitPos2 * 1.2;
        }
    }

    // Scoring
    if (pong.ballX <= 0) {
        increment("b");
        pongPointScored();
    }
    if (pong.ballX >= PONG_W - 1) {
        increment("a");
        pongPointScored();
    }
}

function pongPointScored() {
    if (scores.a >= WIN_SCORE || scores.b >= WIN_SCORE) {
        pong.phase = "gameover";
        if (typeof recordMatchResult === "function") recordMatchResult("pong");
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
    var r, c;

    // Clear grid (reuse pre-allocated buffer)
    for (r = 0; r < PONG_H; r++) {
        for (c = 0; c < PONG_W; c++) {
            pongGrid[r][c] = " ";
        }
    }

    // Borders
    for (c = 0; c < PONG_W; c++) {
        pongGrid[0][c] = "-";
        pongGrid[PONG_H - 1][c] = "-";
    }
    for (r = 0; r < PONG_H; r++) {
        pongGrid[r][0] = "|";
        pongGrid[r][PONG_W - 1] = "|";
    }
    pongGrid[0][0] = "+";
    pongGrid[0][PONG_W - 1] = "+";
    pongGrid[PONG_H - 1][0] = "+";
    pongGrid[PONG_H - 1][PONG_W - 1] = "+";

    // Center dashed line
    var mid = Math.floor(PONG_W / 2);
    for (r = 1; r < PONG_H - 1; r++) {
        if (r % 2 === 0) pongGrid[r][mid] = ":";
    }

    // Player paddle (left, col 2-3)
    var half = Math.floor(PADDLE_H / 2);
    var py = Math.round(pong.playerY);
    for (var i = -half; i <= half; i++) {
        var pr = py + i;
        if (pr > 0 && pr < PONG_H - 1) {
            pongGrid[pr][2] = "#";
            pongGrid[pr][3] = "#";
        }
    }

    // AI paddle (right)
    var ay = Math.round(pong.aiY);
    for (var j = -half; j <= half; j++) {
        var ar = ay + j;
        if (ar > 0 && ar < PONG_H - 1) {
            pongGrid[ar][PONG_W - 3] = "#";
            pongGrid[ar][PONG_W - 4] = "#";
        }
    }

    // Ball
    var bx = Math.round(pong.ballX);
    var by = Math.round(pong.ballY);
    if (bx > 0 && bx < PONG_W - 1 && by > 0 && by < PONG_H - 1) {
        pongGrid[by][bx] = "O";
    }

    // Score text in top border
    var pName = typeof getPlayerName === "function" ? getPlayerName() : "PLAYER";
    var diffLabel = PONG_DIFFICULTIES[pongDifficulty].label;
    var scoreText = pName + " " + scores.a + "  -  " + scores.b + " CPU  [" + diffLabel + "]";
    var scoreStart = Math.floor((PONG_W - scoreText.length) / 2);
    for (var s = 0; s < scoreText.length; s++) {
        if (scoreStart + s > 0 && scoreStart + s < PONG_W - 1) {
            pongGrid[0][scoreStart + s] = scoreText[s];
        }
    }

    // Phase overlays
    if (pong.phase === "difficulty") {
        var midRow = Math.floor(PONG_H / 2);
        drawPongText(pongGrid, "SELECT DIFFICULTY", midRow - 5);
        drawPongText(pongGrid, "==================", midRow - 4);

        var labels = ["[1]  EASY   - Chill rally", "[2]  MEDIUM - Classic", "[3]  HARD   - Lightning"];
        for (var li = 0; li < labels.length; li++) {
            var marker = (pongDifficulty === li + 1) ? "> " : "  ";
            drawPongText(pongGrid, marker + labels[li], midRow - 2 + li * 2);
        }

        drawPongText(pongGrid, "PRESS 1, 2, OR 3", midRow + 6);
    }

    if (pong.phase === "countdown") {
        drawPongText(pongGrid, String(pong.countdown), Math.floor(PONG_H / 2));
    }

    if (pong.phase === "point") {
        drawPongText(pongGrid, "POINT!", Math.floor(PONG_H / 2));
    }

    if (pong.phase === "gameover") {
        var winner = scores.a >= WIN_SCORE ? pName + " WINS!" : "CPU WINS!";
        drawPongText(pongGrid, winner, Math.floor(PONG_H / 2) - 1);
        drawPongText(pongGrid, "ENTER TO REPLAY", Math.floor(PONG_H / 2) + 1);
        drawPongText(pongGrid, "ESC FOR MENU", Math.floor(PONG_H / 2) + 2);
    }

    // Build output string
    var lines = [];
    for (r = 0; r < PONG_H; r++) {
        lines[r] = pongGrid[r].join("");
    }
    document.getElementById("pong-arena").textContent = lines.join("\n");
}

function drawPongText(grid, text, row) {
    var startCol = Math.floor((PONG_W - text.length) / 2);
    for (var i = 0; i < text.length; i++) {
        if (startCol + i > 0 && startCol + i < PONG_W - 1 && row > 0 && row < PONG_H - 1) {
            grid[row][startCol + i] = text[i];
        }
    }
}

// ========== INPUT ==========
function handlePongKey(e) {
    // Prevent page scroll for game keys
    if (["ArrowUp", "ArrowDown", " "].indexOf(e.key) !== -1) {
        e.preventDefault();
    }

    pong.keysDown[e.key] = true;

    // Difficulty selection
    if (pong.phase === "difficulty") {
        if (e.key === "1") { pongDifficulty = 1; renderPong(); }
        if (e.key === "2") { pongDifficulty = 2; renderPong(); }
        if (e.key === "3") { pongDifficulty = 3; renderPong(); }
        if (e.key === "1" || e.key === "2" || e.key === "3") {
            startPongGame();
        }
        return;
    }

    if (e.key === "Enter" && pong.phase === "gameover") {
        if (pong.animId) cancelAnimationFrame(pong.animId);
        activeGame = initPong();
    }
}

function handlePongKeyUp(e) {
    pong.keysDown[e.key] = false;
}
