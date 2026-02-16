/**
 * ============================================================================
 *  BINGO.JS — ASCII Bingo Game
 * ============================================================================
 *
 *  Classic 75-ball Bingo with two 5×5 cards (Player vs CPU).
 *  Best-of-3 match format with two play modes.
 *
 *  Column layout (standard Bingo):
 *    B = 1–15,  I = 16–30,  N = 31–45,  G = 46–60,  O = 61–75
 *    Center square (N column, row 3) is a free space.
 *
 *  Win condition:
 *    Any complete row, column, or diagonal on a card = BINGO.
 *
 *  Game modes:
 *    • Manual — Player must navigate cursor and mark called numbers
 *    • Auto   — Both cards auto-mark; pure luck speed race
 *
 *  Game flow:
 *    1. Mode select  — Choose Manual or Auto
 *    2. Playing       — Numbers called on a timer; player marks (manual)
 *    3. Round end     — Winner scores a point, next round starts
 *    4. Match end     — First to BINGO_WIN_SCORE wins the match
 *
 *  Controls:
 *    Arrows / WASD  — Navigate cursor (manual mode) / select mode
 *    Enter / Space  — Mark cell (manual) / confirm selection
 *    1 / 2          — Quick-select mode (mode select screen)
 *    ESC            — Return to menu
 *
 *  Depends on:  app.js (scores, increment, resetAll, recordMatchResult,
 *                        getPlayerName, updateDisplay)
 *               grid.js (ArcadeGrid)
 * ============================================================================
 */


/* ═══════════════════════════════════════════════════════════════════════════
   CONFIGURATION
   ═══════════════════════════════════════════════════════════════════════════ */

const BINGO_W = 70;                     // arena width (wider for two side-by-side cards)
const BINGO_H = 30;                     // arena height
const BINGO_COLS = [
    { letter: "B", min: 1,  max: 15 },
    { letter: "I", min: 16, max: 30 },
    { letter: "N", min: 31, max: 45 },
    { letter: "G", min: 46, max: 60 },
    { letter: "O", min: 61, max: 75 }
];
const MANUAL_CALL_INTERVAL = 3500;      // ms between calls in manual mode (slower)
const AUTO_CALL_INTERVAL = 1500;        // ms between calls in auto mode (faster)
const BINGO_WIN_SCORE = 3;              // rounds needed to win the match


/* ═══════════════════════════════════════════════════════════════════════════
   GAME STATE
   ═══════════════════════════════════════════════════════════════════════════ */

const bingoGrid = ArcadeGrid(BINGO_W, BINGO_H);

const bingo = {
    running: false,                      // game active flag
    phase: "mode_select",               // "mode_select" | "playing" | "round_end" | "match_end"
    mode: "manual",                      // "manual" | "auto"
    playerCard: [],                      // 5×5 array of {num, marked, free?}
    cpuCard: [],                         // 5×5 array of {num, marked, free?}
    pool: [],                            // shuffled draw pile (1–75)
    called: [],                          // numbers already called
    currentCall: null,                   // most recently called number
    cursorRow: 0,                        // player cursor row (manual mode)
    cursorCol: 0,                        // player cursor column (manual mode)
    callTimer: null,                     // setInterval handle for number calling
    roundEndTimer: null,                 // setTimeout handle for round transitions
    round: 1,                            // current round number
    modeSelectCursor: 0                  // mode select menu cursor (0=manual, 1=auto)
};


/* ═══════════════════════════════════════════════════════════════════════════
   INIT & LIFECYCLE
   ═══════════════════════════════════════════════════════════════════════════ */

/** Initialize the Bingo game. Returns a cleanup function. */
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


/* ═══════════════════════════════════════════════════════════════════════════
   CARD GENERATION — Build random 5×5 Bingo cards
   ═══════════════════════════════════════════════════════════════════════════ */

/** Generate a random 5×5 Bingo card with a free center space. */
function generateCard() {
    const card = [];
    for (let r = 0; r < 5; r++) card[r] = [];

    // Each column draws from its designated number range (B=1-15, I=16-30, etc.)
    for (let col = 0; col < 5; col++) {
        const available = [];
        for (let n = BINGO_COLS[col].min; n <= BINGO_COLS[col].max; n++) available.push(n);

        // Fisher-Yates shuffle
        for (let i = available.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [available[i], available[j]] = [available[j], available[i]];
        }
        for (let row = 0; row < 5; row++) {
            card[row][col] = { num: available[row], marked: false };
        }
    }

    // Center space is always free and pre-marked
    card[2][2] = { num: 0, marked: true, free: true };
    return card;
}

/** Create a shuffled pool of numbers 1–75 for drawing. */
function shufflePool() {
    const pool = [];
    for (let i = 1; i <= 75; i++) pool.push(i);

    // Fisher-Yates shuffle
    for (let k = pool.length - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        [pool[k], pool[j]] = [pool[j], pool[k]];
    }
    return pool;
}


/* ═══════════════════════════════════════════════════════════════════════════
   ROUND START — Set up cards and begin calling numbers
   ═══════════════════════════════════════════════════════════════════════════ */

/** Deal new cards, reset the draw pool, and start the call timer. */
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


/* ═══════════════════════════════════════════════════════════════════════════
   NUMBER CALLING — Draw and process called numbers
   ═══════════════════════════════════════════════════════════════════════════ */

/** Get the B-I-N-G-O column letter for a given number. */
function getLetterForNumber(num) {
    for (let i = 0; i < BINGO_COLS.length; i++) {
        if (num >= BINGO_COLS[i].min && num <= BINGO_COLS[i].max) {
            return BINGO_COLS[i].letter;
        }
    }
    return "?";
}

/** Draw the next number from the pool and check for Bingo. */
function callNextNumber() {
    if (bingo.pool.length === 0) return;

    const num = bingo.pool.pop();
    bingo.currentCall = num;
    bingo.called.push(num);

    // CPU always auto-marks
    markCardNumber(bingo.cpuCard, num);
    // In auto mode, player also auto-marks
    if (bingo.mode === "auto") markCardNumber(bingo.playerCard, num);

    // Check both cards for Bingo
    const playerBingo = checkBingo(bingo.playerCard);
    const cpuBingo = checkBingo(bingo.cpuCard);

    if (playerBingo || cpuBingo) {
        if (bingo.callTimer) { clearInterval(bingo.callTimer); bingo.callTimer = null; }
        bingoRoundWon(playerBingo ? "player" : "cpu");
        return;
    }

    renderBingo();
}

/** Mark a number on a card if found. Returns true if the number was on the card. */
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


/* ═══════════════════════════════════════════════════════════════════════════
   PLAYER MANUAL MARK — Cursor-based cell marking
   ═══════════════════════════════════════════════════════════════════════════ */

/** Attempt to mark the cell under the player's cursor (manual mode only). */
function tryMarkPlayerCell() {
    if (bingo.mode !== "manual" || bingo.phase !== "playing") return;

    const cell = bingo.playerCard[bingo.cursorRow][bingo.cursorCol];
    if (cell.marked || cell.free) return;

    // Only allow marking if the number has been called
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


/* ═══════════════════════════════════════════════════════════════════════════
   BINGO CHECK — Win condition detection
   ═══════════════════════════════════════════════════════════════════════════ */

/** Check if a card has Bingo (complete row, column, or diagonal). */
function checkBingo(card) {
    // Check rows
    for (let r = 0; r < 5; r++) {
        if (card[r].every(cell => cell.marked)) return true;
    }

    // Check columns
    for (let c = 0; c < 5; c++) {
        let colComplete = true;
        for (let r = 0; r < 5; r++) {
            if (!card[r][c].marked) { colComplete = false; break; }
        }
        if (colComplete) return true;
    }

    // Check diagonals
    let diag1 = true, diag2 = true;
    for (let d = 0; d < 5; d++) {
        if (!card[d][d].marked) diag1 = false;
        if (!card[d][4 - d].marked) diag2 = false;
    }
    return diag1 || diag2;
}


/* ═══════════════════════════════════════════════════════════════════════════
   ROUND & MATCH MANAGEMENT — Scoring and transitions
   ═══════════════════════════════════════════════════════════════════════════ */

/** Handle a round win: update score, check for match end. */
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
        // Start next round after a brief pause
        bingo.roundEndTimer = setTimeout(function () {
            bingo.round++;
            startBingoRound();
        }, 2500);
    }
}


/* ═══════════════════════════════════════════════════════════════════════════
   RENDERING — Mode select screen
   ═══════════════════════════════════════════════════════════════════════════ */

/** Render the mode selection screen (Manual vs Auto). */
function renderBingoModeSelect() {
    const g = bingoGrid;
    g.clear();
    g.borders();
    g.borderText(" B  I  N  G  O ", 0);

    const midRow = Math.floor(BINGO_H / 2);

    g.textInner("SELECT GAME MODE", midRow - 4);

    // Manual mode option
    const m1 = bingo.modeSelectCursor === 0;
    const m2 = bingo.modeSelectCursor === 1;

    const line1 = (m1 ? ">> " : "   ") + "[1]  MANUAL MARK";
    g.textInner(line1, midRow - 2);
    if (m1) {
        const col1 = Math.floor((BINGO_W - line1.length) / 2);
        g.setGreen(midRow - 2, col1, ">");
        g.setGreen(midRow - 2, col1 + 1, ">");
    }
    g.textInner("You find & mark called numbers", midRow - 1);

    // Auto mode option
    const line2 = (m2 ? ">> " : "   ") + "[2]  AUTO MARK";
    g.textInner(line2, midRow + 1);
    if (m2) {
        const col2 = Math.floor((BINGO_W - line2.length) / 2);
        g.setGreen(midRow + 1, col2, ">");
        g.setGreen(midRow + 1, col2 + 1, ">");
    }
    g.textInner("Pure luck speed race", midRow + 2);

    // Footer controls
    g.textInner("============================", midRow + 4);
    const enterLine = "ARROWS/WASD:SELECT  ENTER:PLAY";
    const enterCol = Math.floor((BINGO_W - enterLine.length) / 2);
    g.textInner("ARROWS/WASD:SELECT  ", midRow + 6, enterCol);
    g.textGreen("ENTER", midRow + 6, enterCol + 20);
    g.textInner(":PLAY", midRow + 6, enterCol + 25);

    g.render("bingo-arena");
}


/* ═══════════════════════════════════════════════════════════════════════════
   RENDERING — Game screen (cards, calls, overlays)
   ═══════════════════════════════════════════════════════════════════════════ */

/** Format a single cell for display: "X" if marked, number or ">" cursor. */
function formatCardCell(cell, isCpu, isCursor) {
    if (cell.free) return " * ";
    if (isCpu) return cell.marked ? " X " : " . ";
    if (cell.marked) return " X ";
    const numStr = cell.num < 10 ? " " + cell.num : "" + cell.num;
    return isCursor ? ">" + numStr : " " + numStr;
}

/** Render the main Bingo game screen with both cards and phase overlays. */
function renderBingo() {
    const g = bingoGrid;
    g.clear();
    g.borders();

    const name = getPlayerName();
    const shortName = name.length > 8 ? name.substring(0, 8) : name;

    // ── Top border info ────────────────────────────────────────
    if (bingo.phase === "match_end") {
        g.borderText(" B  I  N  G  O ", 0);
    } else {
        g.borderText(" R" + bingo.round + "  " + scores.a + "-" + scores.b + "  First to " + BINGO_WIN_SCORE + " ", 0);
    }

    // ── Current call display ───────────────────────────────────
    if (bingo.currentCall) {
        const letter = getLetterForNumber(bingo.currentCall);
        const callStr = "CALLED:  [ " + letter + "-" + bingo.currentCall + " ]";
        g.textInner(callStr, 3);
        const bracketStr = "[ " + letter + "-" + bingo.currentCall + " ]";
        const callCol = Math.floor((BINGO_W - callStr.length) / 2);
        const bracketOffset = callStr.indexOf("[");
        g.textGreen(bracketStr, 3, callCol + bracketOffset);
    } else {
        g.textInner("WAITING FOR FIRST CALL...", 3);
    }

    // ── Separator ──────────────────────────────────────────────
    for (let sc = 1; sc < BINGO_W - 1; sc++) g.set(6, sc, "-");

    // ── Player and CPU cards (side by side) ────────────────────
    const playerStartCol = 10;
    const cpuStartCol = 39;
    const headerStr = "  B   I   N   G   O";
    const sep = "+---+---+---+---+---+";
    const cardStartRow = 11;

    // Card labels
    g.textInner(shortName, 8, playerStartCol);
    g.textInner("CPU", 8, cpuStartCol);

    // Column headers (B I N G O)
    g.textInner(headerStr, 10, playerStartCol);
    g.textInner(headerStr, 10, cpuStartCol);

    // Card grid rows
    for (let r = 0; r < 5; r++) {
        const sepRow = cardStartRow + r * 2;

        g.textInner(sep, sepRow, playerStartCol);
        g.textInner(sep, sepRow, cpuStartCol);

        let pLine = "|";
        let cLine = "|";
        for (let c = 0; c < 5; c++) {
            const isCursor = (bingo.mode === "manual" && r === bingo.cursorRow && c === bingo.cursorCol);
            pLine += formatCardCell(bingo.playerCard[r][c], false, isCursor) + "|";
            cLine += formatCardCell(bingo.cpuCard[r][c], true, false) + "|";
        }

        g.textInner(pLine, sepRow + 1, playerStartCol);
        g.textInner(cLine, sepRow + 1, cpuStartCol);
    }

    // Bottom card separators
    g.textInner(sep, cardStartRow + 10, playerStartCol);
    g.textInner(sep, cardStartRow + 10, cpuStartCol);

    // Green cursor highlight (manual mode)
    if (bingo.mode === "manual" && bingo.phase === "playing") {
        const cursorRow = cardStartRow + bingo.cursorRow * 2 + 1;
        const cursorCol = playerStartCol + 1 + bingo.cursorCol * 4;
        g.setGreen(cursorRow, cursorCol, ">");
    }

    // Controls in bottom border
    if (bingo.mode === "manual" && bingo.phase === "playing") {
        g.borderText(" ARROWS/WASD: MOVE   ENTER: MARK   ESC: MENU ", BINGO_H - 1);
    } else {
        g.borderText(" ESC: MENU ", BINGO_H - 1);
    }

    // ── Phase overlays ─────────────────────────────────────────
    if (bingo.phase === "round_end") {
        g.textInner("* * *  B I N G O !  * * *", 23);
        g.textInner("NEXT ROUND STARTING...", 25);
    } else if (bingo.phase === "match_end") {
        const matchWinner = scores.a > scores.b ? shortName + " WINS!" : "CPU WINS!";
        g.textInner("====================", 22);
        g.textInner(matchWinner, 23);
        g.textInner("====================", 24);
        g.textInner("FINAL: " + shortName + " " + scores.a + "  -  " + scores.b + " CPU", 25);
        const menuLine = "[ENTER] MENU";
        const menuCol = Math.floor((BINGO_W - menuLine.length) / 2);
        g.textGreen("[ENTER]", 26, menuCol);
        g.textInner(" MENU", 26, menuCol + 7);
    }

    g.render("bingo-arena");
}


/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD HANDLER
   ═══════════════════════════════════════════════════════════════════════════ */

/** Handle keyboard input for Bingo. */
function handleBingoKey(e) {
    if (!bingo.running) return;

    // ── Mode select screen ─────────────────────────────────────
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

    // ── Match end → return to menu ─────────────────────────────
    if (bingo.phase === "match_end") {
        if (e.key === "Enter") showScreen("screen-menu");
        return;
    }

    // ── Manual mode gameplay controls ──────────────────────────
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
