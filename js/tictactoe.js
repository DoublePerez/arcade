// ========== ASCII TIC TAC TOE ENGINE ==========

const TTT_W = 70;
const TTT_H = 30;
const TTT_WIN_SCORE = 3;

const tttGrid = ArcadeGrid(TTT_W, TTT_H);

const ttt = {
    running: false,
    board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    cursor: 4,
    turn: 1,
    phase: "playing",
    roundEndTimer: null,
    cpuTimer: null,
    wins: { player: 0, cpu: 0 },
    round: 1,
    message: "",
    blinkOn: true,
    blinkTimer: null
};

const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

function initTicTacToe() {
    resetAll();
    ttt.running = true;
    ttt.wins = { player: 0, cpu: 0 };
    ttt.round = 1;
    ttt.phase = "intro";
    renderTTT();

    ttt.blinkTimer = setInterval(function () {
        ttt.blinkOn = !ttt.blinkOn;
        if (ttt.phase === "playing" || ttt.phase === "intro") renderTTT();
    }, 400);

    return function stopTicTacToe() {
        ttt.running = false;
        if (ttt.roundEndTimer) clearTimeout(ttt.roundEndTimer);
        if (ttt.cpuTimer) clearTimeout(ttt.cpuTimer);
        if (ttt.blinkTimer) clearInterval(ttt.blinkTimer);
    };
}

function startNewRound() {
    ttt.board = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    ttt.cursor = 4;
    ttt.turn = 1;
    ttt.phase = "playing";
    ttt.message = "ROUND " + ttt.round + "  -  YOUR TURN (X)";
    renderTTT();
}

// ========== AI (MINIMAX) ==========
function tttCheckWinner(board) {
    for (let i = 0; i < WIN_LINES.length; i++) {
        const [a, b, c] = WIN_LINES[i];
        if (board[a] !== 0 && board[a] === board[b] && board[b] === board[c]) {
            return { winner: board[a], line: WIN_LINES[i] };
        }
    }
    if (board.every(cell => cell !== 0)) return { winner: 0, line: null };
    return null;
}

function minimax(board, isMaximizing, depth) {
    const result = tttCheckWinner(board);
    if (result !== null) {
        if (result.winner === 2) return 10 - depth;
        if (result.winner === 1) return depth - 10;
        return 0;
    }

    if (isMaximizing) {
        let best = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === 0) {
                board[i] = 2;
                best = Math.max(best, minimax(board, false, depth + 1));
                board[i] = 0;
            }
        }
        return best;
    } else {
        let best = Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === 0) {
                board[i] = 1;
                best = Math.min(best, minimax(board, true, depth + 1));
                board[i] = 0;
            }
        }
        return best;
    }
}

function cpuMove() {
    if (Math.random() < 0.30) {
        const empties = [];
        for (let i = 0; i < 9; i++) {
            if (ttt.board[i] === 0) empties.push(i);
        }
        if (empties.length > 0) {
            return empties[Math.floor(Math.random() * empties.length)];
        }
    }

    let bestScore = -Infinity;
    let bestMove = -1;
    for (let i = 0; i < 9; i++) {
        if (ttt.board[i] === 0) {
            ttt.board[i] = 2;
            const score = minimax(ttt.board, false, 0);
            ttt.board[i] = 0;
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }
    return bestMove;
}

// ========== GAME LOGIC ==========
function tttPlaceMove(cell) {
    if (ttt.board[cell] !== 0 || ttt.phase !== "playing") return;

    ttt.board[cell] = ttt.turn;

    const result = tttCheckWinner(ttt.board);
    if (result !== null) {
        endTTTRound(result);
        return;
    }

    if (ttt.turn === 1) {
        ttt.turn = 2;
        ttt.message = "CPU IS THINKING...";
        renderTTT();
        ttt.cpuTimer = setTimeout(function () {
            if (!ttt.running || ttt.phase !== "playing") return;
            const move = cpuMove();
            if (move >= 0) tttPlaceMove(move);
        }, 400 + Math.random() * 400);
    } else {
        ttt.turn = 1;
        ttt.message = "YOUR TURN (X)";
        renderTTT();
    }
}

function endTTTRound(result) {
    ttt.phase = "round_end";

    if (result.winner === 1) {
        ttt.message = "** YOU WIN THIS ROUND! **";
        increment("a");
        ttt.wins.player++;
    } else if (result.winner === 2) {
        ttt.message = "** CPU WINS THIS ROUND! **";
        increment("b");
        ttt.wins.cpu++;
    } else {
        ttt.message = "** IT'S A DRAW! **";
    }

    renderTTT();

    if (ttt.wins.player >= TTT_WIN_SCORE || ttt.wins.cpu >= TTT_WIN_SCORE) {
        recordMatchResult("ttt");
        ttt.roundEndTimer = setTimeout(function () {
            ttt.phase = "match_end";
            ttt.message = ttt.wins.player >= TTT_WIN_SCORE
                ? "=== YOU WIN THE MATCH! ==="
                : "=== CPU WINS THE MATCH! ===";
            renderTTT();
        }, 1800);
    } else {
        ttt.roundEndTimer = setTimeout(function () {
            ttt.round++;
            startNewRound();
        }, 1800);
    }
}

// ========== BIG SYMBOLS ==========
const BIG_X = [
    "\\   /",
    " \\ / ",
    "  X  ",
    " / \\ ",
    "/   \\"
];

const BIG_O = [
    " --- ",
    "/   \\",
    "|   |",
    "\\   /",
    " --- "
];

const BIG_EMPTY = [
    "     ",
    "     ",
    "     ",
    "     ",
    "     "
];

function getBigSymbol(val) {
    if (val === 1) return BIG_X;
    if (val === 2) return BIG_O;
    return BIG_EMPTY;
}

// ========== RENDERING ==========
function renderTTT() {
    const g = tttGrid;
    g.clear();

    // Intro screen - clean grid, no board behind it
    if (ttt.phase === "intro") {
        const midRow = Math.floor(TTT_H / 2);
        g.text("T I C   T A C   T O E", midRow - 6);
        g.text("=".repeat(40), midRow - 4);
        g.text("YOU (X)  vs  CPU (O)", midRow - 2);
        g.text("FIRST TO " + TTT_WIN_SCORE + " WINS THE MATCH!", midRow);
        g.text("=".repeat(40), midRow + 2);
        g.text("WASD / ARROWS:  MOVE CURSOR", midRow + 5);
        g.text("ENTER / SPACE:  PLACE YOUR X", midRow + 7);
        g.text("ESC:            BACK TO MENU", midRow + 9);
        if (ttt.blinkOn) {
            g.text("PRESS ENTER TO START", midRow + 12);
        }
        g.render("ttt-arena");
        return;
    }

    g.text("T I C   T A C   T O E", 1);

    const pName = getPlayerName();
    g.text(pName + "(X): " + ttt.wins.player + "  |  CPU(O): " + ttt.wins.cpu + "  |  First to " + TTT_WIN_SCORE, 3);

    const cellW = 7;
    const cellH = 7;
    const boardW = cellW * 3 + 2;
    const boardH = cellH * 3 + 2;
    const boardTop = 5;
    const boardLeft = Math.floor((TTT_W - boardW) / 2);

    // Draw big symbols in cells
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const sym = getBigSymbol(ttt.board[r * 3 + c]);
            g.sprite(sym, boardTop + r * (cellH + 1) + 1, boardLeft + c * (cellW + 1) + 1);
        }
    }

    // Horizontal separators
    for (let sep = 0; sep < 2; sep++) {
        const sepRow = boardTop + (sep + 1) * cellH + sep;
        for (let x = boardLeft; x < boardLeft + boardW; x++) {
            if (sepRow < TTT_H && x < TTT_W) g.set(sepRow, x, "-");
        }
    }

    // Vertical separators
    for (let sep = 0; sep < 2; sep++) {
        const sepCol = boardLeft + (sep + 1) * cellW + sep;
        for (let y = boardTop; y < boardTop + boardH; y++) {
            if (y < TTT_H && sepCol < TTT_W) {
                g.set(y, sepCol, g.get(y, sepCol) === "-" ? "+" : "|");
            }
        }
    }

    // Blinking cursor
    if (ttt.phase === "playing" && ttt.turn === 1 && ttt.blinkOn) {
        const crow = Math.floor(ttt.cursor / 3);
        const ccol = ttt.cursor % 3;
        const curTop = boardTop + crow * (cellH + 1);
        const curLeft = boardLeft + ccol * (cellW + 1);

        g.set(curTop, curLeft, "[");
        g.set(curTop, curLeft + cellW - 1, "]");
        const botRow = curTop + cellH - 1;
        g.set(botRow, curLeft, "[");
        g.set(botRow, curLeft + cellW - 1, "]");
    }

    // Winning line highlight
    if (ttt.phase === "round_end" || ttt.phase === "match_end") {
        const result = tttCheckWinner(ttt.board);
        if (result && result.line) {
            for (let w = 0; w < result.line.length; w++) {
                const wi = result.line[w];
                const wr = Math.floor(wi / 3);
                const wc = wi % 3;
                const winTop = boardTop + wr * (cellH + 1);
                const winLeft = boardLeft + wc * (cellW + 1);

                g.set(winTop, winLeft, "*");
                g.set(winTop, winLeft + cellW - 1, "*");
                g.set(winTop + cellH - 1, winLeft, "*");
                g.set(winTop + cellH - 1, winLeft + cellW - 1, "*");
            }
        }
    }

    // Message + controls
    g.text(ttt.message, boardTop + boardH + 1);

    if (ttt.phase === "playing") {
        g.text("WASD/ARROWS: MOVE    ENTER/SPACE: PLACE X", boardTop + boardH + 3);
    } else if (ttt.phase === "match_end") {
        g.text("FINAL: YOU " + ttt.wins.player + " - " + ttt.wins.cpu + " CPU", boardTop + boardH + 3);
        g.text("ENTER: MENU", boardTop + boardH + 4);
    }

    g.render("ttt-arena");
}

// ========== INPUT ==========
function handleTTTKey(e) {
    if (!ttt.running) return;

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) !== -1) {
        e.preventDefault();
    }

    if (ttt.phase === "intro" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        startNewRound();
        return;
    }

    if (ttt.phase === "match_end" && e.key === "Enter") {
        showScreen("screen-menu");
        return;
    }

    if (ttt.phase !== "playing" || ttt.turn !== 1) return;

    const row = Math.floor(ttt.cursor / 3);
    const col = ttt.cursor % 3;

    switch (e.key) {
        case "ArrowUp": case "w": case "W":
            if (row > 0) ttt.cursor -= 3;
            renderTTT();
            break;
        case "ArrowDown": case "s": case "S":
            if (row < 2) ttt.cursor += 3;
            renderTTT();
            break;
        case "ArrowLeft": case "a": case "A":
            if (col > 0) ttt.cursor -= 1;
            renderTTT();
            break;
        case "ArrowRight": case "d": case "D":
            if (col < 2) ttt.cursor += 1;
            renderTTT();
            break;
        case "Enter": case " ":
            tttPlaceMove(ttt.cursor);
            break;
    }
}
