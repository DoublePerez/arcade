// ========== ASCII SNAKE ENGINE ==========

const SNAKE_W = 50;
const SNAKE_H = 22;
const SNAKE_INITIAL_SPEED = 130;
const SNAKE_MIN_SPEED = 55;
const SNAKE_SPEED_DECREASE = 2;

const snakeGrid = ArcadeGrid(SNAKE_W, SNAKE_H);

const snk = {
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
    snk.phase = "intro";
    snk.speed = SNAKE_INITIAL_SPEED;

    const data = loadArcadeData();
    snk.bestScore = (data.snake && data.snake.bestScore) || 0;

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
    snk.moveTimer = setTimeout(snakeTick, snk.speed);
}

function snakeTick() {
    if (!snk.running || snk.phase !== "playing") return;

    snk.dir.x = snk.nextDir.x;
    snk.dir.y = snk.nextDir.y;

    const head = snk.body[0];
    const newHead = { x: head.x + snk.dir.x, y: head.y + snk.dir.y };

    // Wall collision
    if (newHead.x <= 0 || newHead.x >= SNAKE_W - 1 || newHead.y <= 0 || newHead.y >= SNAKE_H - 1) {
        snakeGameOver();
        return;
    }

    // Self collision
    for (let i = 0; i < snk.body.length; i++) {
        if (snk.body[i].x === newHead.x && snk.body[i].y === newHead.y) {
            snakeGameOver();
            return;
        }
    }

    snk.body.unshift(newHead);

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

function renderSnake() {
    const g = snakeGrid;
    g.clear();
    g.borders();

    // Score in top border
    const pName = getPlayerName();
    g.borderText(" " + pName + ": " + snk.score + "  BEST: " + snk.bestScore + " ", 0);

    // Length in bottom border
    g.borderText(" LENGTH: " + snk.body.length + " ", SNAKE_H - 1);

    // Only draw game elements during active play
    if (snk.phase === "playing") {
        // Food
        g.setGreen(snk.food.y, snk.food.x, "*");

        // Snake body (tail first so head overwrites)
        for (let i = snk.body.length - 1; i >= 0; i--) {
            const seg = snk.body[i];
            g.set(seg.y, seg.x, i === 0 ? "@" : "#");
        }
    }

    // Phase overlays
    const midRow = Math.floor(SNAKE_H / 2);

    if (snk.phase === "intro") {
        const w = SNAKE_W;
        g.textInner("S N A K E", midRow - 6);
        g.textInner("=".repeat(28), midRow - 4);
        g.textInner("CONTROLS", midRow - 2);
        g.textInner("WASD / ARROWS:  STEER", midRow);
        g.textInner("OBJECTIVE", midRow + 2);
        // "EAT * TO GROW" with * in green (centered)
        const eatLine = "EAT * TO GROW";
        const startCol = Math.floor((w - eatLine.length) / 2);
        g.textInner("EAT ", midRow + 3, startCol);
        g.setGreen(midRow + 3, startCol + 4, "*");
        g.textInner(" TO GROW", midRow + 3, startCol + 5);
        g.textInner("AVOID WALLS AND YOUR TAIL!", midRow + 5);
        g.textInner("=".repeat(28), midRow + 7);
        g.textInner("PRESS ENTER TO START", midRow + 9);
    }

    if (snk.phase === "countdown") {
        g.textInner("GET READY!", midRow - 1);
        g.textInner(String(snk.countdown), midRow + 1);
    }

    if (snk.phase === "gameover") {
        g.textInner("====================", midRow - 3);
        g.textInner("G A M E   O V E R", midRow - 1);
        g.textInner("====================", midRow + 1);
        g.textInner("SCORE: " + snk.score + "  LENGTH: " + snk.body.length, midRow + 3);
        if (snk.score > 0 && snk.score >= snk.bestScore) {
            g.textInner("** NEW BEST! **", midRow + 5);
        }
        g.textInner("[ENTER] REPLAY", midRow + 7);
    }

    g.render("snake-arena");
}

// ========== INPUT ==========
function handleSnakeKey(e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) !== -1) {
        e.preventDefault();
    }

    if (snk.phase === "intro" && (e.key === "Enter" || e.key === " ")) {
        startSnakeCountdown();
        return;
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
        if (activeGame) activeGame();
        activeGame = initSnake();
    }
}
