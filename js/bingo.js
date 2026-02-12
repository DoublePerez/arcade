// ========== ASCII BINGO ENGINE ==========

var BINGO_W = 70;
var BINGO_H = 26;
var BINGO_COLS = [
    { letter: "B", min: 1, max: 15 },
    { letter: "I", min: 16, max: 30 },
    { letter: "N", min: 31, max: 45 },
    { letter: "G", min: 46, max: 60 },
    { letter: "O", min: 61, max: 75 }
];
var MANUAL_CALL_INTERVAL = 3500;
var AUTO_CALL_INTERVAL = 1500;
var BINGO_WIN_SCORE = 3;

var bingo = {
    running: false,
    phase: "mode_select", // mode_select | playing | round_end | match_end
    mode: "manual",

    playerCard: [],  // 5x5 of {num, marked}
    cpuCard: [],     // 5x5 of {num, marked}
    pool: [],        // shuffled remaining numbers
    called: [],      // all numbers called so far
    currentCall: null,

    cursorRow: 0,
    cursorCol: 0,

    callTimer: null,
    roundEndTimer: null,
    round: 1
};

// ========== INIT / CLEANUP ==========
function initBingo() {
    resetAll();

    bingo.running = true;
    bingo.phase = "mode_select";
    bingo.round = 1;
    bingo.cursorRow = 0;
    bingo.cursorCol = 0;

    renderBingoModeSelect();

    return function stopBingo() {
        bingo.running = false;
        if (bingo.callTimer) { clearInterval(bingo.callTimer); bingo.callTimer = null; }
        if (bingo.roundEndTimer) { clearTimeout(bingo.roundEndTimer); bingo.roundEndTimer = null; }
    };
}

// ========== CARD GENERATION ==========
function generateCard() {
    var card = [];
    for (var r = 0; r < 5; r++) {
        card[r] = [];
    }
    for (var col = 0; col < 5; col++) {
        var min = BINGO_COLS[col].min;
        var max = BINGO_COLS[col].max;
        var available = [];
        for (var n = min; n <= max; n++) available.push(n);
        // Fisher-Yates to pick 5
        for (var i = available.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = available[i]; available[i] = available[j]; available[j] = tmp;
        }
        for (var row = 0; row < 5; row++) {
            card[row][col] = { num: available[row], marked: false };
        }
    }
    // Center = FREE
    card[2][2] = { num: 0, marked: true, free: true };
    return card;
}

function shufflePool() {
    var pool = [];
    for (var i = 1; i <= 75; i++) pool.push(i);
    for (var k = pool.length - 1; k > 0; k--) {
        var j = Math.floor(Math.random() * (k + 1));
        var tmp = pool[k]; pool[k] = pool[j]; pool[j] = tmp;
    }
    return pool;
}

// ========== ROUND START ==========
function startBingoRound() {
    bingo.playerCard = generateCard();
    bingo.cpuCard = generateCard();
    bingo.pool = shufflePool();
    bingo.called = [];
    bingo.currentCall = null;
    bingo.cursorRow = 0;
    bingo.cursorCol = 0;
    bingo.phase = "playing";

    renderBingo();

    var interval = bingo.mode === "manual" ? MANUAL_CALL_INTERVAL : AUTO_CALL_INTERVAL;
    bingo.callTimer = setInterval(function () {
        if (bingo.phase === "playing") callNextNumber();
    }, interval);
}

// ========== NUMBER CALLING ==========
function getLetterForNumber(num) {
    for (var i = 0; i < BINGO_COLS.length; i++) {
        if (num >= BINGO_COLS[i].min && num <= BINGO_COLS[i].max) {
            return BINGO_COLS[i].letter;
        }
    }
    return "?";
}

function callNextNumber() {
    if (bingo.pool.length === 0) return;

    var num = bingo.pool.pop();
    bingo.currentCall = num;
    bingo.called.push(num);

    // Auto-mark CPU card
    markCardNumber(bingo.cpuCard, num);

    // Auto-mark player card in auto mode
    if (bingo.mode === "auto") {
        markCardNumber(bingo.playerCard, num);
    }

    // Check for BINGO
    var playerBingo = checkBingo(bingo.playerCard);
    var cpuBingo = checkBingo(bingo.cpuCard);

    if (playerBingo || cpuBingo) {
        if (bingo.callTimer) { clearInterval(bingo.callTimer); bingo.callTimer = null; }

        if (playerBingo && cpuBingo) {
            // Both at same time — player gets priority
            bingoRoundWon("player");
        } else if (playerBingo) {
            bingoRoundWon("player");
        } else {
            bingoRoundWon("cpu");
        }
        return;
    }

    renderBingo();
}

function markCardNumber(card, num) {
    for (var r = 0; r < 5; r++) {
        for (var c = 0; c < 5; c++) {
            if (card[r][c].num === num) {
                card[r][c].marked = true;
                return true;
            }
        }
    }
    return false;
}

// ========== PLAYER MANUAL MARK ==========
function tryMarkPlayerCell() {
    if (bingo.mode !== "manual" || bingo.phase !== "playing") return;

    var cell = bingo.playerCard[bingo.cursorRow][bingo.cursorCol];
    if (cell.marked || cell.free) return;

    // Check if this number has been called
    for (var i = 0; i < bingo.called.length; i++) {
        if (bingo.called[i] === cell.num) {
            cell.marked = true;

            // Check for BINGO after marking
            if (checkBingo(bingo.playerCard)) {
                if (bingo.callTimer) { clearInterval(bingo.callTimer); bingo.callTimer = null; }
                bingoRoundWon("player");
                return;
            }

            renderBingo();
            return;
        }
    }
}

// ========== BINGO CHECK ==========
function checkBingo(card) {
    // Check rows
    for (var r = 0; r < 5; r++) {
        var rowComplete = true;
        for (var c = 0; c < 5; c++) {
            if (!card[r][c].marked) { rowComplete = false; break; }
        }
        if (rowComplete) return true;
    }
    // Check columns
    for (var c2 = 0; c2 < 5; c2++) {
        var colComplete = true;
        for (var r2 = 0; r2 < 5; r2++) {
            if (!card[r2][c2].marked) { colComplete = false; break; }
        }
        if (colComplete) return true;
    }
    // Diagonals
    var diag1 = true, diag2 = true;
    for (var d = 0; d < 5; d++) {
        if (!card[d][d].marked) diag1 = false;
        if (!card[d][4 - d].marked) diag2 = false;
    }
    return diag1 || diag2;
}

// ========== ROUND / MATCH MANAGEMENT ==========
function bingoRoundWon(winner) {
    bingo.phase = "round_end";

    if (winner === "player") {
        increment("a");
    } else {
        increment("b");
    }

    renderBingo();

    // Check match end
    var matchOver = scores.a >= BINGO_WIN_SCORE || scores.b >= BINGO_WIN_SCORE;

    if (matchOver) {
        if (typeof recordMatchResult === "function") recordMatchResult("bingo");
        bingo.roundEndTimer = setTimeout(function () {
            bingo.phase = "match_end";
            renderBingo();
        }, 2000);
    } else {
        bingo.roundEndTimer = setTimeout(function () {
            bingo.round++;
            startBingoRound();
        }, 2500);
    }
}

// ========== RENDERING ==========
function makeBingoGrid() {
    var grid = [];
    for (var r = 0; r < BINGO_H; r++) {
        grid[r] = [];
        for (var c = 0; c < BINGO_W; c++) {
            grid[r][c] = " ";
        }
    }
    return grid;
}

function bingoGridToString(grid) {
    var lines = [];
    for (var r = 0; r < BINGO_H; r++) {
        lines.push(grid[r].join(""));
    }
    return lines.join("\n");
}

function drawBingoText(grid, text, row, col) {
    if (col === undefined) {
        // Center
        col = Math.floor((BINGO_W - text.length) / 2);
    }
    for (var i = 0; i < text.length; i++) {
        var cc = col + i;
        if (cc >= 0 && cc < BINGO_W && row >= 0 && row < BINGO_H) {
            grid[row][cc] = text[i];
        }
    }
}

function renderBingoModeSelect() {
    var grid = makeBingoGrid();

    drawBingoText(grid, "B  I  N  G  O", 1);
    drawBingoText(grid, "=".repeat(40), 3);

    drawBingoText(grid, "SELECT GAME MODE:", 5);

    drawBingoText(grid, "[1]  MANUAL MARK", 8);
    drawBingoText(grid, "     Move cursor with WASD / Arrows", 9);
    drawBingoText(grid, "     Press ENTER or SPACE to mark", 10);
    drawBingoText(grid, "     Find & mark numbers yourself!", 11);

    drawBingoText(grid, "[2]  AUTO MARK", 14);
    drawBingoText(grid, "     Both cards auto-mark", 15);
    drawBingoText(grid, "     Pure luck speed race!", 16);

    drawBingoText(grid, "=".repeat(40), 19);
    drawBingoText(grid, "PRESS 1 OR 2 TO START", 21);
    drawBingoText(grid, "[ESC] BACK TO MENU", 23);

    document.getElementById("bingo-arena").textContent = bingoGridToString(grid);
}

function formatCardCell(cell, isCpu, isCursor) {
    // Returns exactly 3 characters for each cell
    if (cell.free) return " * ";
    if (isCpu) {
        return cell.marked ? " X " : " . ";
    }
    if (cell.marked) return " X ";
    var numStr = cell.num < 10 ? " " + cell.num : "" + cell.num;
    if (isCursor) return ">" + numStr;
    return " " + numStr;
}

function renderBingo() {
    var grid = makeBingoGrid();
    var name = typeof getPlayerName === "function" ? getPlayerName() : "PLAYER";
    var shortName = name.length > 8 ? name.substring(0, 8) : name;

    // Title
    drawBingoText(grid, "B  I  N  G  O", 0);

    // Subtitle: round + target
    drawBingoText(grid, "ROUND " + bingo.round + "          FIRST TO " + BINGO_WIN_SCORE, 1);

    // Current call
    if (bingo.currentCall) {
        var letter = getLetterForNumber(bingo.currentCall);
        var callStr = "CALLED:  [ " + letter + "-" + bingo.currentCall + " ]";

        // Last 5 calls
        if (bingo.called.length > 1) {
            callStr += "     LAST:";
            for (var h = bingo.called.length - 2; h >= Math.max(0, bingo.called.length - 6); h--) {
                callStr += " " + getLetterForNumber(bingo.called[h]) + bingo.called[h];
            }
        }
        drawBingoText(grid, callStr, 3, 3);
    } else {
        drawBingoText(grid, "WAITING FOR FIRST CALL...", 3);
    }

    // Section divider
    drawBingoText(grid, "-".repeat(64), 5, 3);

    // Card positioning (3-char cells: +---+---+---+---+---+ = 21 chars)
    var playerStartCol = 11;
    var cpuStartCol = 40;

    // Card labels
    drawBingoText(grid, shortName + "'S CARD", 7, playerStartCol);
    drawBingoText(grid, "CPU CARD", 7, cpuStartCol);

    // Column headers aligned to cell centers
    var headerStr = "  B   I   N   G   O";
    drawBingoText(grid, headerStr, 8, playerStartCol);
    drawBingoText(grid, headerStr, 8, cpuStartCol);

    // Draw cards with 3-char cells
    var cardStartRow = 9;
    var sep = "+---+---+---+---+---+";

    for (var r = 0; r < 5; r++) {
        var sepRow = cardStartRow + r * 2;

        // Separator line
        drawBingoText(grid, sep, sepRow, playerStartCol);
        drawBingoText(grid, sep, sepRow, cpuStartCol);

        // Cell contents
        var cellRow = sepRow + 1;
        var pLine = "|";
        var cLine = "|";

        for (var c = 0; c < 5; c++) {
            var pCell = bingo.playerCard[r][c];
            var cCell = bingo.cpuCard[r][c];
            var isCursor = (bingo.mode === "manual" && r === bingo.cursorRow && c === bingo.cursorCol);

            pLine += formatCardCell(pCell, false, isCursor) + "|";
            cLine += formatCardCell(cCell, true, false) + "|";
        }

        drawBingoText(grid, pLine, cellRow, playerStartCol);
        drawBingoText(grid, cLine, cellRow, cpuStartCol);
    }

    // Bottom separator
    drawBingoText(grid, sep, cardStartRow + 10, playerStartCol);
    drawBingoText(grid, sep, cardStartRow + 10, cpuStartCol);

    // Legend (row 21)
    drawBingoText(grid, " X = MARKED     * = FREE     . = CPU HIDDEN", 21);

    // Controls (row 23)
    if (bingo.mode === "manual") {
        drawBingoText(grid, "WASD/ARROWS: MOVE      ENTER/SPACE: MARK", 23);
    } else {
        drawBingoText(grid, "AUTO MODE  -  WATCH THE ACTION!", 23);
    }

    // Score + escape (row 24)
    var scoreLine = shortName + " " + scores.a + "  |  CPU " + scores.b;
    drawBingoText(grid, scoreLine, 24, 3);
    drawBingoText(grid, "[ESC] MENU", 24, BINGO_W - 14);

    // Phase overlays
    if (bingo.phase === "round_end") {
        drawBingoText(grid, "* * *  B I N G O !  * * *", 21);
        drawBingoText(grid, "NEXT ROUND STARTING...", 23);
    }

    if (bingo.phase === "match_end") {
        var matchWinner = scores.a > scores.b ? shortName : "CPU";
        drawBingoText(grid, "===  " + matchWinner + " WINS THE MATCH!  ===", 21);
        drawBingoText(grid, "FINAL: " + shortName + " " + scores.a + "  -  " + scores.b + " CPU", 23);
        drawBingoText(grid, "PRESS ENTER FOR MENU", 24);
    }

    document.getElementById("bingo-arena").textContent = bingoGridToString(grid);
}

// ========== INPUT ==========
function handleBingoKey(e) {
    if (!bingo.running) return;

    if (bingo.phase === "mode_select") {
        if (e.key === "1") {
            bingo.mode = "manual";
            startBingoRound();
        } else if (e.key === "2") {
            bingo.mode = "auto";
            startBingoRound();
        }
        return;
    }

    if (bingo.phase === "match_end") {
        if (e.key === "Enter") {
            showScreen("screen-menu");
        }
        return;
    }

    if (bingo.phase === "playing" && bingo.mode === "manual") {
        // Cursor movement
        if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") {
            bingo.cursorRow = Math.max(0, bingo.cursorRow - 1);
            renderBingo();
        } else if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") {
            bingo.cursorRow = Math.min(4, bingo.cursorRow + 1);
            renderBingo();
        } else if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") {
            bingo.cursorCol = Math.max(0, bingo.cursorCol - 1);
            renderBingo();
        } else if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") {
            bingo.cursorCol = Math.min(4, bingo.cursorCol + 1);
            renderBingo();
        } else if (e.key === "Enter" || e.key === " ") {
            tryMarkPlayerCell();
        }
    }
}
