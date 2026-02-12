// ========== ASCII SNAKE ENGINE ==========

var SNAKE_W = 50;
var SNAKE_H = 22;
var SNAKE_INITIAL_SPEED = 130;
var SNAKE_MIN_SPEED = 55;
var SNAKE_SPEED_DECREASE = 2;

var snakeGrid = [];
for (var _sr = 0; _sr < SNAKE_H; _sr++) {
    snakeGrid[_sr] = new Array(SNAKE_W);
}

var snk = {
    body: [],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: { x: 0, y: 0 },
    score: 0,
    bestScore: 0,
    speed: SNAKE_INITIAL_SPEED,
    running: false,
    phase: "countdown",
    countdown: 3,
    countdownTimer: null,
    moveTimer: null
};

function initSnake() {
    snk.running = true;
    snk.score = 0;
    snk.phase = "countdown";
    snk.speed = SNAKE_INITIAL_SPEED;

    var data = loadArcadeData();
    snk.bestScore = (data.snake && data.snake.bestScore) || 0;

    var cx = Math.floor(SNAKE_W / 2);
    var cy = Math.floor(SNAKE_H / 2);
    snk.body = [
        { x: cx, y: cy },
        { x: cx - 1, y: cy },
        { x: cx - 2, y: cy }
    ];
    snk.dir = { x: 1, y: 0 };
    snk.nextDir = { x: 1, y: 0 };

    spawnSnakeFood();
    startSnakeCountdown();

    return function stopSnake() {
        snk.running = false;
        if (snk.countdownTimer) clearInterval(snk.countdownTimer);
        if (snk.moveTimer) clearTimeout(snk.moveTimer);
    };
}

function spawnSnakeFood() {
    var valid = false;
    var attempts = 0;
    while (!valid && attempts < 1000) {
        snk.food.x = 1 + Math.floor(Math.random() * (SNAKE_W - 2));
        snk.food.y = 1 + Math.floor(Math.random() * (SNAKE_H - 2));
        valid = true;
        for (var i = 0; i < snk.body.length; i++) {
            if (snk.body[i].x === snk.food.x && snk.body[i].y === snk.food.y) {
                valid = false;
                break;
            }
        }
        attempts++;
    }
}

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

function scheduleSnakeMove() {
    if (!snk.running || snk.phase !== "playing") return;
    snk.moveTimer = setTimeout(function () {
        snakeTick();
    }, snk.speed);
}

function snakeTick() {
    if (!snk.running || snk.phase !== "playing") return;

    snk.dir.x = snk.nextDir.x;
    snk.dir.y = snk.nextDir.y;

    var head = snk.body[0];
    var newHead = {
        x: head.x + snk.dir.x,
        y: head.y + snk.dir.y
    };

    // Wall collision
    if (newHead.x <= 0 || newHead.x >= SNAKE_W - 1 || newHead.y <= 0 || newHead.y >= SNAKE_H - 1) {
        snakeGameOver();
        return;
    }

    // Self collision
    for (var i = 0; i < snk.body.length; i++) {
        if (snk.body[i].x === newHead.x && snk.body[i].y === newHead.y) {
            snakeGameOver();
            return;
        }
    }

    snk.body.unshift(newHead);

    // Food check
    if (newHead.x === snk.food.x && newHead.y === snk.food.y) {
        snk.score++;
        snk.speed = Math.max(SNAKE_MIN_SPEED, snk.speed - SNAKE_SPEED_DECREASE);
        spawnSnakeFood();
    } else {
        snk.body.pop();
    }

    renderSnake();
    scheduleSnakeMove();
}

function snakeGameOver() {
    snk.phase = "gameover";

    var data = loadArcadeData();
    if (!data.snake) {
        data.snake = { bestScore: 0, gamesPlayed: 0, lastScore: 0 };
    }
    data.snake.gamesPlayed++;
    data.snake.lastScore = snk.score;
    if (snk.score > data.snake.bestScore) {
        data.snake.bestScore = snk.score;
        snk.bestScore = snk.score;
    }
    saveArcadeData(data);

    renderSnake();
}

function renderSnake() {
    var r, c;

    for (r = 0; r < SNAKE_H; r++) {
        for (c = 0; c < SNAKE_W; c++) {
            snakeGrid[r][c] = " ";
        }
    }

    // Borders
    for (c = 0; c < SNAKE_W; c++) {
        snakeGrid[0][c] = "-";
        snakeGrid[SNAKE_H - 1][c] = "-";
    }
    for (r = 0; r < SNAKE_H; r++) {
        snakeGrid[r][0] = "|";
        snakeGrid[r][SNAKE_W - 1] = "|";
    }
    snakeGrid[0][0] = "+";
    snakeGrid[0][SNAKE_W - 1] = "+";
    snakeGrid[SNAKE_H - 1][0] = "+";
    snakeGrid[SNAKE_H - 1][SNAKE_W - 1] = "+";

    // Score in top border
    var pName = typeof getPlayerName === "function" ? getPlayerName() : "PLAYER";
    var scoreText = " " + pName + ": " + snk.score + "  BEST: " + snk.bestScore + " ";
    var scoreStart = Math.floor((SNAKE_W - scoreText.length) / 2);
    for (var s = 0; s < scoreText.length; s++) {
        if (scoreStart + s > 0 && scoreStart + s < SNAKE_W - 1) {
            snakeGrid[0][scoreStart + s] = scoreText[s];
        }
    }

    // Length in bottom border
    var lenText = " LENGTH: " + snk.body.length + " ";
    var lenStart = Math.floor((SNAKE_W - lenText.length) / 2);
    for (var l = 0; l < lenText.length; l++) {
        if (lenStart + l > 0 && lenStart + l < SNAKE_W - 1) {
            snakeGrid[SNAKE_H - 1][lenStart + l] = lenText[l];
        }
    }

    // Food
    if (snk.food.y > 0 && snk.food.y < SNAKE_H - 1 && snk.food.x > 0 && snk.food.x < SNAKE_W - 1) {
        snakeGrid[snk.food.y][snk.food.x] = "*";
    }

    // Snake body (tail first so head overwrites)
    for (var i = snk.body.length - 1; i >= 0; i--) {
        var seg = snk.body[i];
        if (seg.y > 0 && seg.y < SNAKE_H - 1 && seg.x > 0 && seg.x < SNAKE_W - 1) {
            snakeGrid[seg.y][seg.x] = (i === 0) ? "@" : "#";
        }
    }

    // Phase overlays
    if (snk.phase === "countdown") {
        drawSnakeText(snakeGrid, "GET READY!", Math.floor(SNAKE_H / 2) - 1);
        drawSnakeText(snakeGrid, String(snk.countdown), Math.floor(SNAKE_H / 2) + 1);
    }

    if (snk.phase === "gameover") {
        drawSnakeText(snakeGrid, "===================", Math.floor(SNAKE_H / 2) - 3);
        drawSnakeText(snakeGrid, "G A M E  O V E R", Math.floor(SNAKE_H / 2) - 1);
        drawSnakeText(snakeGrid, "===================", Math.floor(SNAKE_H / 2));
        drawSnakeText(snakeGrid, "SCORE: " + snk.score + "  LENGTH: " + snk.body.length, Math.floor(SNAKE_H / 2) + 2);
        if (snk.score > 0 && snk.score >= snk.bestScore) {
            drawSnakeText(snakeGrid, "** NEW BEST! **", Math.floor(SNAKE_H / 2) + 4);
        }
        drawSnakeText(snakeGrid, "[ENTER] REPLAY  [ESC] MENU", Math.floor(SNAKE_H / 2) + 6);
    }

    var lines = [];
    for (r = 0; r < SNAKE_H; r++) {
        lines[r] = snakeGrid[r].join("");
    }
    document.getElementById("snake-arena").textContent = lines.join("\n");
}

function drawSnakeText(grid, text, row) {
    var startCol = Math.floor((SNAKE_W - text.length) / 2);
    for (var i = 0; i < text.length; i++) {
        if (startCol + i > 0 && startCol + i < SNAKE_W - 1 && row > 0 && row < SNAKE_H - 1) {
            grid[row][startCol + i] = text[i];
        }
    }
}

// ========== INPUT ==========
function handleSnakeKey(e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) !== -1) {
        e.preventDefault();
    }

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

    if (e.key === "Enter" && snk.phase === "gameover") {
        if (snk.moveTimer) clearTimeout(snk.moveTimer);
        activeGame = initSnake();
    }
}
