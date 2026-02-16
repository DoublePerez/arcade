/**
 * ============================================================================
 *  TICTACTOE.JS — Tic Tac Toe Game
 * ============================================================================
 *
 *  Player (X) vs CPU (O) with minimax AI.
 *  Best-of series: first to TTT_WIN_SCORE (3) round wins takes the match.
 *
 *  Game flow:
 *    1. Intro         — Title screen with rules
 *    2. Playing       — Player places X, CPU responds with O
 *    3. Round end     — Winner/draw shown, next round auto-starts
 *    4. Match end     — Final score and return to menu
 *
 *  AI strategy:
 *    • 70% of moves use minimax (perfect play)
 *    • 30% of moves are random (to keep it fun)
 *
 *  Board representation:
 *    0 = empty, 1 = player (X), 2 = CPU (O)
 *    Cells indexed 0–8 in row-major order (top-left to bottom-right)
 *
 *  Controls:
 *    Arrows / WASD  — Move cursor on the 3x3 grid
 *    Enter / Space  — Place X on the selected cell
 *    ESC            — Return to menu
 *
 *  Depends on:  app.js (scores, resetAll, increment, recordMatchResult)
 *               grid.js (ArcadeGrid)
 * ============================================================================
 */


/* ═══════════════════════════════════════════════════════════════════════════
   CONFIGURATION
   ═══════════════════════════════════════════════════════════════════════════ */

const TTT_W = 70;           // arena width
const TTT_H = 30;           // arena height
const TTT_WIN_SCORE = 3;    // rounds needed to win the match


/* ═══════════════════════════════════════════════════════════════════════════
   GAME STATE
   ═══════════════════════════════════════════════════════════════════════════ */

const tttGrid = ArcadeGrid(TTT_W, TTT_H);

const ttt = {
    running: false,
    board: [0, 0, 0, 0, 0, 0, 0, 0, 0],   // 9-cell board (0=empty, 1=X, 2=O)
    cursor: 4,              // currently highlighted cell index (0–8)
    turn: 1,                // whose turn: 1=player, 2=CPU
    phase: "playing",       // "intro" | "playing" | "round_end" | "match_end"
    roundEndTimer: null,    // setTimeout handle for round-end pause
    cpuTimer: null,         // setTimeout handle for CPU "thinking" delay
    wins: { player: 0, cpu: 0 },
    round: 1,
    message: "",            // status message below the board
    blinkOn: true,          // cursor blink state
    blinkTimer: null        // setInterval handle for cursor blink
};

/** All possible winning lines (row/col/diagonal indices). */
const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],   // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8],   // columns
    [0, 4, 8], [2, 4, 6]               // diagonals
];


/* ═══════════════════════════════════════════════════════════════════════════
   INIT & LIFECYCLE
   ═══════════════════════════════════════════════════════════════════════════ */

/** Initialize the Tic Tac Toe game. Returns a cleanup function. */
function initTicTacToe() {
    resetAll();
    ttt.running = true;
    ttt.wins = { player: 0, cpu: 0 };
    ttt.round = 1;
    ttt.phase = "intro";
    renderTTT();

    // Cursor blink timer (400 ms toggle)
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

/** Reset the board and start a new round. */
function startNewRound() {
    ttt.board = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    ttt.cursor = 4;
    ttt.turn = 1;
    ttt.phase = "playing";
    ttt.message = "ROUND " + ttt.round + "  -  YOUR TURN (X)";
    renderTTT();
}


/* ═══════════════════════════════════════════════════════════════════════════
   AI — Minimax with random fallback
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Check the board for a winner or draw.
 * @returns {Object|null} — { winner: 1|2|0, line: [indices]|null } or null if ongoing
 */
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

/**
 * Minimax algorithm for optimal CPU play.
 * @param {Array} board — current board state (mutated then restored)
 * @param {boolean} isMaximizing — true when evaluating CPU's best move
 * @param {number} depth — recursion depth (used for move ordering)
 * @returns {number} — evaluation score (positive = CPU advantage)
 */
function minimax(board, isMaximizing, depth) {
    const result = tttCheckWinner(board);
    if (result !== null) {
        if (result.winner === 2) return 10 - depth;     // CPU wins (prefer faster wins)
        if (result.winner === 1) return depth - 10;      // player wins
        return 0;                                         // draw
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

/**
 * Determine the CPU's move.
 * 30% chance of a random move (to keep the game winnable).
 */
function cpuMove() {
    // Random move (30% chance)
    if (Math.random() < 0.30) {
        const empties = [];
        for (let i = 0; i < 9; i++) {
            if (ttt.board[i] === 0) empties.push(i);
        }
        if (empties.length > 0) {
            return empties[Math.floor(Math.random() * empties.length)];
        }
    }

    // Minimax optimal move
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


/* ═══════════════════════════════════════════════════════════════════════════
   GAME LOGIC — Place moves and handle round transitions
   ═══════════════════════════════════════════════════════════════════════════ */

/** Place a move on the board and advance the game state. */
function tttPlaceMove(cell) {
    if (ttt.board[cell] !== 0 || ttt.phase !== "playing") return;

    ttt.board[cell] = ttt.turn;
    sfx(440, 40);

    const result = tttCheckWinner(ttt.board);
    if (result !== null) {
        endTTTRound(result);
        return;
    }

    if (ttt.turn === 1) {
        // Switch to CPU turn with a brief "thinking" delay
        ttt.turn = 2;
        ttt.message = "CPU IS THINKING...";
        renderTTT();
        ttt.cpuTimer = setTimeout(function () {
            if (!ttt.running || ttt.phase !== "playing") return;
            const move = cpuMove();
            if (move >= 0) tttPlaceMove(move);
        }, 400 + Math.random() * 400);
    } else {
        // Switch back to player turn
        ttt.turn = 1;
        ttt.message = "YOUR TURN (X)";
        renderTTT();
    }
}

/** Handle the end of a round (win or draw). */
function endTTTRound(result) {
    if (ttt.cpuTimer) { clearTimeout(ttt.cpuTimer); ttt.cpuTimer = null; }
    ttt.phase = "round_end";
    sfx(880, 200);

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

    // Check for match win
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
        // Start next round after a brief pause
        ttt.roundEndTimer = setTimeout(function () {
            ttt.round++;
            startNewRound();
        }, 1800);
    }
}


/* ═══════════════════════════════════════════════════════════════════════════
   BIG ASCII SYMBOLS — 5x5 character X, O, and empty cell
   ═══════════════════════════════════════════════════════════════════════════ */

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

/** Get the 5-line ASCII art for a board value (1=X, 2=O, 0=empty). */
function getBigSymbol(val) {
    if (val === 1) return BIG_X;
    if (val === 2) return BIG_O;
    return BIG_EMPTY;
}


/* ═══════════════════════════════════════════════════════════════════════════
   RENDERING
   ═══════════════════════════════════════════════════════════════════════════ */

/** Render the full Tic Tac Toe screen based on the current phase. */
function renderTTT() {
    const g = tttGrid;
    g.clear();

    // ── Intro screen (no borders) ────────────────────────────
    if (ttt.phase === "intro") {
        const midRow = Math.floor(TTT_H / 2);
        g.text("===  T I C   T A C   T O E  ===", midRow - 7);
        g.text("YOU (X)  vs  CPU (O)", midRow - 5);
        g.text("FIRST TO " + TTT_WIN_SCORE + " WINS THE MATCH", midRow - 4);
        g.text("============================", midRow - 2);
        g.text("ARROWS/WASD:MOVE  ENTER:PLACE", midRow + 1);
        if (ttt.blinkOn) {
            const enterLine = "PRESS ENTER TO START";
            const enterCol = Math.floor((TTT_W - enterLine.length) / 2);
            g.text("PRESS ", midRow + 4, enterCol);
            g.textGreen("ENTER", midRow + 4, enterCol + 6);
            g.text(" TO START", midRow + 4, enterCol + 11);
        }
        g.render("ttt-arena");
        return;
    }

    // ── Bordered arena ───────────────────────────────────────
    g.borders();

    // Round + score in top border (switch to title during match_end to avoid double info)
    if (ttt.phase === "match_end") {
        g.borderText(" T I C   T A C   T O E ", 0);
    } else {
        g.borderText(" R" + ttt.round + "  " + scores.a + "-" + scores.b + "  First to " + TTT_WIN_SCORE + " ", 0);
    }

    // Controls in bottom border
    g.borderText(" WASD: MOVE   ENTER: PLACE   M: MUTE   ESC: MENU ", TTT_H - 1);

    // ── Board layout ─────────────────────────────────────────
    const cellW = 7;        // width of each cell in characters
    const cellH = 5;        // height of each cell in rows
    const boardW = cellW * 3 + 2;   // total board width (3 cells + 2 separators)
    const boardH = cellH * 3 + 2;   // total board height
    const boardTop = 3;
    const boardLeft = Math.floor((TTT_W - boardW) / 2);

    // Draw big X/O symbols in each cell
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const sym = getBigSymbol(ttt.board[r * 3 + c]);
            g.sprite(sym, boardTop + r * (cellH + 1), boardLeft + c * (cellW + 1) + 1);
        }
    }

    // Horizontal separators
    for (let sep = 0; sep < 2; sep++) {
        const sepRow = boardTop + (sep + 1) * cellH + sep;
        for (let x = boardLeft; x < boardLeft + boardW; x++) {
            if (sepRow < TTT_H - 1 && x < TTT_W - 1) g.set(sepRow, x, "-");
        }
    }

    // Vertical separators (with "+" at intersections)
    for (let sep = 0; sep < 2; sep++) {
        const sepCol = boardLeft + (sep + 1) * cellW + sep;
        for (let y = boardTop; y < boardTop + boardH; y++) {
            if (y < TTT_H - 1 && sepCol < TTT_W - 1) {
                g.set(y, sepCol, g.get(y, sepCol) === "-" ? "+" : "|");
            }
        }
    }

    // ── Blinking cursor (green brackets around selected cell) ─
    if (ttt.phase === "playing" && ttt.turn === 1 && ttt.blinkOn) {
        const crow = Math.floor(ttt.cursor / 3);
        const ccol = ttt.cursor % 3;
        const curTop = boardTop + crow * (cellH + 1);
        const curLeft = boardLeft + ccol * (cellW + 1);

        g.setGreen(curTop, curLeft, "[");
        g.setGreen(curTop, curLeft + cellW - 1, "]");
        const botRow = curTop + cellH - 1;
        g.setGreen(botRow, curLeft, "[");
        g.setGreen(botRow, curLeft + cellW - 1, "]");
    }

    // ── Winning line highlight (asterisks at corners of winning cells) ─
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

    // ── Status message below the board ───────────────────────
    g.textInner(ttt.message, boardTop + boardH + 1);

    if (ttt.phase === "match_end") {
        g.textInner("FINAL: YOU " + ttt.wins.player + " - " + ttt.wins.cpu + " CPU", boardTop + boardH + 2);
        const menuLine = "[ENTER] MENU";
        const menuCol = Math.floor((TTT_W - menuLine.length) / 2);
        g.textGreen("[ENTER]", boardTop + boardH + 3, menuCol);
        g.textInner(" MENU", boardTop + boardH + 3, menuCol + 7);
    }

    g.render("ttt-arena");
}


/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD HANDLER
   ═══════════════════════════════════════════════════════════════════════════ */

/** Handle keyboard input for Tic Tac Toe. */
function handleTTTKey(e) {
    if (!ttt.running) return;

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) !== -1) {
        e.preventDefault();
    }

    // Intro → start game
    if (ttt.phase === "intro" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        startNewRound();
        return;
    }

    // Match end → return to menu
    if (ttt.phase === "match_end" && e.key === "Enter") {
        showScreen("screen-menu");
        return;
    }

    // Only accept input during player's turn
    if (ttt.phase !== "playing" || ttt.turn !== 1) return;

    // Cursor movement on the 3x3 grid
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
