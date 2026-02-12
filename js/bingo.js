// ========== ASCII BINGO ENGINE ==========

const BINGO_W = 70;
const BINGO_H = 26;
const BINGO_COLS = [
    { letter: "B", min: 1,  max: 15 },
    { letter: "I", min: 16, max: 30 },
    { letter: "N", min: 31, max: 45 },
    { letter: "G", min: 46, max: 60 },
    { letter: "O", min: 61, max: 75 }
];
const MANUAL_CALL_INTERVAL = 3500;
const AUTO_CALL_INTERVAL = 1500;
const BINGO_WIN_SCORE = 3;

const bingoGrid = ArcadeGrid(BINGO_W, BINGO_H);

const bingo = {
    running: false,
    phase: "mode_select",
    mode: "manual",
    playerCard: [],
    cpuCard: [],
    pool: [],
    called: [],
    currentCall: null,
    cursorRow: 0,
    cursorCol: 0,
    callTimer: null,
    roundEndTimer: null,
    round: 1,
    modeSelectCursor: 0
};

// ========== INIT / CLEANUP ==========
function initBingo() {
    resetAll();
    bingo.running = true;
    bingo.phase = "mode_select";
    bingo.round = 1;
    bingo.cursorRow = 0;
    bingo.cursorCol = 0;
    bingo.modeSelectCursor = 0;
    renderBingoModeSelect();

    return function stopBingo() {
        bingo.running = false;
        if (bingo.callTimer) { clearInterval(bingo.callTimer); bingo.callTimer = null; }
        if (bingo.roundEndTimer) { clearTimeout(bingo.roundEndTimer); bingo.roundEndTimer = null; }
    };
}

// ========== CARD GENERATION ==========
function generateCard() {
    const card = [];
    for (let r = 0; r < 5; r++) card[r] = [];

    for (let col = 0; col < 5; col++) {
        const available = [];
        for (let n = BINGO_COLS[col].min; n <= BINGO_COLS[col].max; n++) available.push(n);
        for (let i = available.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [available[i], available[j]] = [available[j], available[i]];
        }
        for (let row = 0; row < 5; row++) {
            card[row][col] = { num: available[row], marked: false };
        }
    }

    card[2][2] = { num: 0, marked: true, free: true };
    return card;
}

function shufflePool() {
    const pool = [];
    for (let i = 1; i <= 75; i++) pool.push(i);
    for (let k = pool.length - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        [pool[k], pool[j]] = [pool[j], pool[k]];
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

    const interval = bingo.mode === "manual" ? MANUAL_CALL_INTERVAL : AUTO_CALL_INTERVAL;
    bingo.callTimer = setInterval(function () {
        if (bingo.phase === "playing") callNextNumber();
    }, interval);
}

// ========== NUMBER CALLING ==========
function getLetterForNumber(num) {
    for (let i = 0; i < BINGO_COLS.length; i++) {
        if (num >= BINGO_COLS[i].min && num <= BINGO_COLS[i].max) {
            return BINGO_COLS[i].letter;
        }
    }
    return "?";
}

function callNextNumber() {
    if (bingo.pool.length === 0) return;

    const num = bingo.pool.pop();
    bingo.currentCall = num;
    bingo.called.push(num);

    markCardNumber(bingo.cpuCard, num);
    if (bingo.mode === "auto") markCardNumber(bingo.playerCard, num);

    const playerBingo = checkBingo(bingo.playerCard);
    const cpuBingo = checkBingo(bingo.cpuCard);

    if (playerBingo || cpuBingo) {
        if (bingo.callTimer) { clearInterval(bingo.callTimer); bingo.callTimer = null; }
        bingoRoundWon(playerBingo ? "player" : "cpu");
        return;
    }

    renderBingo();
}

function markCardNumber(card, num) {
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
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

    const cell = bingo.playerCard[bingo.cursorRow][bingo.cursorCol];
    if (cell.marked || cell.free) return;

    if (bingo.called.indexOf(cell.num) !== -1) {
        cell.marked = true;
        if (checkBingo(bingo.playerCard)) {
            if (bingo.callTimer) { clearInterval(bingo.callTimer); bingo.callTimer = null; }
            bingoRoundWon("player");
            return;
        }
        renderBingo();
    }
}

// ========== BINGO CHECK ==========
function checkBingo(card) {
    for (let r = 0; r < 5; r++) {
        if (card[r].every(cell => cell.marked)) return true;
    }
    for (let c = 0; c < 5; c++) {
        let colComplete = true;
        for (let r = 0; r < 5; r++) {
            if (!card[r][c].marked) { colComplete = false; break; }
        }
        if (colComplete) return true;
    }
    let diag1 = true, diag2 = true;
    for (let d = 0; d < 5; d++) {
        if (!card[d][d].marked) diag1 = false;
        if (!card[d][4 - d].marked) diag2 = false;
    }
    return diag1 || diag2;
}

// ========== ROUND / MATCH MANAGEMENT ==========
function bingoRoundWon(winner) {
    bingo.phase = "round_end";
    increment(winner === "player" ? "a" : "b");
    renderBingo();

    const matchOver = scores.a >= BINGO_WIN_SCORE || scores.b >= BINGO_WIN_SCORE;

    if (matchOver) {
        recordMatchResult("bingo");
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
function renderBingoModeSelect() {
    const g = bingoGrid;
    g.clear();

    g.text("B  I  N  G  O", 1);
    g.text("=".repeat(40), 3);
    g.text("SELECT GAME MODE:", 5);

    const m1 = bingo.modeSelectCursor === 0;
    const m2 = bingo.modeSelectCursor === 1;

    const line1 = (m1 ? ">> " : "   ") + "[1]  MANUAL MARK";
    g.text(line1, 8);
    if (m1) {
        const col = Math.floor((BINGO_W - line1.length) / 2);
        g.setGreen(8, col, ">");
        g.setGreen(8, col + 1, ">");
    }
    g.text("     Move cursor with WASD / Arrows", 9);
    g.text("     Press ENTER or SPACE to mark", 10);
    g.text("     Find & mark numbers yourself!", 11);

    const line2 = (m2 ? ">> " : "   ") + "[2]  AUTO MARK";
    g.text(line2, 14);
    if (m2) {
        const col = Math.floor((BINGO_W - line2.length) / 2);
        g.setGreen(14, col, ">");
        g.setGreen(14, col + 1, ">");
    }
    g.text("     Both cards auto-mark", 15);
    g.text("     Pure luck speed race!", 16);

    g.text("=".repeat(40), 19);
    g.text("Arrows to browse, Enter to select", 21);
    g.text("1-2 to quick-select    [ESC] MENU", 23);

    g.render("bingo-arena");
}

function formatCardCell(cell, isCpu, isCursor) {
    if (cell.free) return " * ";
    if (isCpu) return cell.marked ? " X " : " . ";
    if (cell.marked) return " X ";
    const numStr = cell.num < 10 ? " " + cell.num : "" + cell.num;
    return isCursor ? ">" + numStr : " " + numStr;
}

function renderBingo() {
    const g = bingoGrid;
    g.clear();

    const name = getPlayerName();
    const shortName = name.length > 8 ? name.substring(0, 8) : name;

    g.text("B  I  N  G  O", 0);
    g.text("ROUND " + bingo.round + "  |  FIRST TO " + BINGO_WIN_SCORE, 1);

    // Current call
    if (bingo.currentCall) {
        const letter = getLetterForNumber(bingo.currentCall);
        let callStr = "CALLED:  [ " + letter + "-" + bingo.currentCall + " ]";
        if (bingo.called.length > 1) {
            callStr += "     LAST:";
            for (let h = bingo.called.length - 2; h >= Math.max(0, bingo.called.length - 6); h--) {
                callStr += " " + getLetterForNumber(bingo.called[h]) + bingo.called[h];
            }
        }
        g.text(callStr, 3, 3);
        var bracketStr = "[ " + letter + "-" + bingo.currentCall + " ]";
        g.textGreen(bracketStr, 3, 12);
    } else {
        g.text("WAITING FOR FIRST CALL...", 3);
    }

    g.text("-".repeat(64), 5, 3);

    const playerStartCol = 6;
    const cpuStartCol = 43;
    const headerStr = "  B   I   N   G   O";
    const sep = "+---+---+---+---+---+";
    const cardStartRow = 9;

    g.text(shortName + "'S CARD", 7, playerStartCol);
    g.text("CPU CARD", 7, cpuStartCol);
    g.text(headerStr, 8, playerStartCol);
    g.text(headerStr, 8, cpuStartCol);

    for (let r = 0; r < 5; r++) {
        const sepRow = cardStartRow + r * 2;

        g.text(sep, sepRow, playerStartCol);
        g.text(sep, sepRow, cpuStartCol);

        let pLine = "|";
        let cLine = "|";
        for (let c = 0; c < 5; c++) {
            const isCursor = (bingo.mode === "manual" && r === bingo.cursorRow && c === bingo.cursorCol);
            pLine += formatCardCell(bingo.playerCard[r][c], false, isCursor) + "|";
            cLine += formatCardCell(bingo.cpuCard[r][c], true, false) + "|";
        }

        g.text(pLine, sepRow + 1, playerStartCol);
        g.text(cLine, sepRow + 1, cpuStartCol);
    }

    g.text(sep, cardStartRow + 10, playerStartCol);
    g.text(sep, cardStartRow + 10, cpuStartCol);

    if (bingo.mode === "manual" && bingo.phase === "playing") {
        var cursorRow = cardStartRow + bingo.cursorRow * 2 + 1;
        var cursorCol = playerStartCol + 1 + bingo.cursorCol * 4;
        g.setGreen(cursorRow, cursorCol, ">");
    }

    g.text("X = MARKED    * = FREE    . = CPU HIDDEN", 21);

    if (bingo.mode === "manual") {
        g.text("WASD/ARROWS: MOVE      ENTER/SPACE: MARK", 23);
    } else {
        g.text("AUTO MODE  -  WATCH THE ACTION!", 23);
    }

    g.text(shortName + " " + scores.a + "  |  CPU " + scores.b, 24, 3);
    g.text("[ESC] MENU", 24, BINGO_W - 14);

    // Phase overlays
    if (bingo.phase === "round_end") {
        g.text("* * *  B I N G O !  * * *", 21);
        g.text("NEXT ROUND STARTING...", 23);
    }

    if (bingo.phase === "match_end") {
        const matchWinner = scores.a > scores.b ? shortName : "CPU";
        g.text("===  " + matchWinner + " WINS THE MATCH!  ===", 21);
        g.text("FINAL: " + shortName + " " + scores.a + "  -  " + scores.b + " CPU", 23);
        g.text("PRESS ENTER FOR MENU", 24);
    }

    g.render("bingo-arena");
}

// ========== INPUT ==========
function handleBingoKey(e) {
    if (!bingo.running) return;

    if (bingo.phase === "mode_select") {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" ||
            e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
            e.preventDefault();
            bingo.modeSelectCursor = bingo.modeSelectCursor === 0 ? 1 : 0;
            renderBingoModeSelect();
        } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            bingo.mode = bingo.modeSelectCursor === 0 ? "manual" : "auto";
            startBingoRound();
        } else if (e.key === "1") { bingo.mode = "manual"; startBingoRound(); }
        else if (e.key === "2") { bingo.mode = "auto"; startBingoRound(); }
        return;
    }

    if (bingo.phase === "match_end") {
        if (e.key === "Enter") showScreen("screen-menu");
        return;
    }

    if (bingo.phase === "playing" && bingo.mode === "manual") {
        if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") {
            bingo.cursorRow = Math.max(0, bingo.cursorRow - 1); renderBingo();
        } else if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") {
            bingo.cursorRow = Math.min(4, bingo.cursorRow + 1); renderBingo();
        } else if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") {
            bingo.cursorCol = Math.max(0, bingo.cursorCol - 1); renderBingo();
        } else if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") {
            bingo.cursorCol = Math.min(4, bingo.cursorCol + 1); renderBingo();
        } else if (e.key === "Enter" || e.key === " ") {
            tryMarkPlayerCell();
        }
    }
}
