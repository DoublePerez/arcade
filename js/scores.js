/**
 * ============================================================================
 *  SCORES.JS — Scoreboard Screen
 * ============================================================================
 *
 *  A full-screen stats dashboard showing:
 *
 *  1. LIVE SCORE     — Current match score with increment/decrement controls
 *  2. VS GAMES       — Win/loss records for Pong, Tic Tac Toe, Bingo
 *  3. SOLO GAMES     — High scores and play counts for Snake, Space Invaders
 *
 *  Also supports:
 *    • Player name editing (N key)
 *    • Full stats reset (R key)
 *    • Team selection with arrow keys for live score adjustment
 *
 *  Depends on:  app.js (scores, loadArcadeData, increment, decrement, etc.)
 *               grid.js (ArcadeGrid)
 * ============================================================================
 */


/* ═══════════════════════════════════════════════════════════════════════════
   CONFIGURATION & STATE
   ═══════════════════════════════════════════════════════════════════════════ */

let scoresMode = "view";    // "view" = normal display, "nameEntry" = typing name
let nameBuffer = "";        // accumulates typed characters during name editing
let scoresTeam = "a";       // which team is selected for live score controls

const SCORE_W = 70;
const SCORE_H = 30;
const scoreGrid = ArcadeGrid(SCORE_W, SCORE_H);


/* ═══════════════════════════════════════════════════════════════════════════
   INIT — Entry point (called by screen manager)
   ═══════════════════════════════════════════════════════════════════════════ */

/** Reset state and render the scoreboard. */
function initScoreboard() {
    scoresMode = "view";
    nameBuffer = "";
    scoresTeam = "a";
    renderScoreboard();
}


/* ═══════════════════════════════════════════════════════════════════════════
   LAYOUT HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Draw a section header across a row:  |---===[ TITLE ]===---|
 * Fills with dashes, overlays = signs around the centered label.
 */
function scoreSectionHeader(g, row, title) {
    var label = "[ " + title + " ]";

    for (var c = 1; c < SCORE_W - 1; c++) {
        g.set(row, c, "-");
    }
    var labelStart = Math.floor((SCORE_W - label.length) / 2);
    for (var i = labelStart - 3; i < labelStart; i++) {
        if (i > 0 && i < SCORE_W - 1) g.set(row, i, "=");
    }
    g.text(label, row, labelStart);
    for (var j = labelStart + label.length; j < labelStart + label.length + 3; j++) {
        if (j > 0 && j < SCORE_W - 1) g.set(row, j, "=");
    }
}


/* ═══════════════════════════════════════════════════════════════════════════
   RENDERING — Main scoreboard layout
   ═══════════════════════════════════════════════════════════════════════════ */

/** Build and render the full scoreboard grid. */
function renderScoreboard() {
    var g = scoreGrid;
    g.clear();
    g.borders();

    var data = loadArcadeData();
    var name = data.playerName;
    var shortName = name.length > 8 ? name.substring(0, 8) : name;

    // Title in top border
    g.borderText(" S C O R E B O A R D ", 0);

    // Title / name entry mode
    if (scoresMode === "nameEntry") {
        g.text("ENTER NAME: " + nameBuffer + "_", 3);
        g.text("TYPE NAME, ENTER TO SAVE, ESC TO CANCEL", 5);
    }

    // ── Live Score section ───────────────────────────────────
    scoreSectionHeader(g, 3, "L I V E   S C O R E");

    var sa = String(scores.a).padStart(2, "0");
    var sb = String(scores.b).padStart(2, "0");

    // >> cursor on the selected team
    var scoreLine;
    if (scoresTeam === "a") {
        scoreLine = ">> " + shortName + "  " + sa + "  -  " + sb + "  CPU";
    } else {
        scoreLine = "   " + shortName + "  " + sa + "  -  " + sb + "  CPU <<";
    }
    g.text(scoreLine, 6);

    // Green-highlight the >> or << cursor arrows
    var scoreCol = Math.floor((SCORE_W - scoreLine.length) / 2);
    if (scoresTeam === "a") {
        g.setGreen(6, scoreCol, ">");
        g.setGreen(6, scoreCol + 1, ">");
    } else {
        var endCol = scoreCol + scoreLine.length;
        g.setGreen(6, endCol - 2, "<");
        g.setGreen(6, endCol - 1, "<");
    }

    g.text("W/S: +/-    Q: RESET    R: RESET ALL", 8);

    // ── VS Games section ─────────────────────────────────────
    scoreSectionHeader(g, 11, "V S   G A M E S");

    renderVsLine(g, 14, "PONG", data.pong, shortName);
    renderVsLine(g, 16, "TIC TAC TOE", data.ttt, shortName);
    renderVsLine(g, 18, "BINGO", data.bingo, shortName);

    // ── Solo Games section ───────────────────────────────────
    scoreSectionHeader(g, 21, "S O L O   G A M E S");

    renderSoloLine(g, 24, "SNAKE", data.snake);
    renderSoloLine(g, 26, "SPACE INVADERS", data.invaders);

    // ── Footer ───────────────────────────────────────────────
    g.borderText(" [N] NAME   [R] RESET   [ESC] BACK ", SCORE_H - 1);

    g.render("scores-art");
}

/**
 * Render one line for a versus game (Pong, TTT, Bingo).
 * Shows win/loss record and last match result.
 */
function renderVsLine(g, row, title, data, name) {
    var pw = data ? data.playerWins : 0;
    var cw = data ? data.cpuWins : 0;

    var padded = title;
    while (padded.length < 16) padded += " ";

    var line = padded + "W " + pw + "-" + cw + " L";

    if (data && data.lastMatch) {
        var lm = data.lastMatch;
        var winner = lm.winner === "player" ? name + " WINS" : "CPU WINS";
        line += "    LAST: " + lm.playerScore + "-" + lm.cpuScore + " " + winner;
    } else {
        line += "    NO MATCHES YET";
    }

    g.text(line, row, 3);
}

/**
 * Render one line for a solo game (Snake, Invaders).
 * Shows games played, best score, and last score.
 */
function renderSoloLine(g, row, title, data) {
    var d = data || { bestScore: 0, gamesPlayed: 0, lastScore: 0 };

    var padded = title;
    while (padded.length < 16) padded += " ";

    var lastStr = d.gamesPlayed > 0 ? String(d.lastScore) : "---";
    var line = padded + "PLAYED: " + d.gamesPlayed + "  BEST: " + d.bestScore + "  LAST: " + lastStr;

    g.text(line, row, 3);
}


/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD HANDLER
   ═══════════════════════════════════════════════════════════════════════════ */

/** Handle keyboard input for the scoreboard screen. */
function handleScoresKey(e) {
    // ── Name entry mode ──────────────────────────────────────
    if (scoresMode === "nameEntry") {
        e.preventDefault();

        if (e.key === "Enter") {
            var trimmed = nameBuffer.trim();
            if (trimmed.length > 0) {
                setPlayerName(trimmed.toUpperCase());
            }
            scoresMode = "view";
            renderScoreboard();
        } else if (e.key === "Escape") {
            scoresMode = "view";
            nameBuffer = "";
            renderScoreboard();
        } else if (e.key === "Backspace") {
            nameBuffer = nameBuffer.slice(0, -1);
            renderScoreboard();
        } else if (e.key.length === 1 && nameBuffer.length < 12) {
            nameBuffer += e.key.toUpperCase();
            renderScoreboard();
        }
        return;
    }

    // ── Live score controls ──────────────────────────────────
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        scoresTeam = "a";
        renderScoreboard();
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        scoresTeam = "b";
        renderScoreboard();
    } else if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") {
        e.preventDefault();
        increment(scoresTeam);
        renderScoreboard();
    } else if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") {
        e.preventDefault();
        if (scores[scoresTeam] > 0) {
            decrement(scoresTeam);
        }
        renderScoreboard();
    } else if (e.key === "q" || e.key === "Q") {
        reset(scoresTeam);
        renderScoreboard();
    } else if (e.key === "r" || e.key === "R") {
        resetArcadeData();
        renderScoreboard();
    } else if (e.key === "n" || e.key === "N") {
        scoresMode = "nameEntry";
        nameBuffer = "";
        renderScoreboard();
    } else if (e.key === "Escape") {
        showScreen("screen-menu");
    }
}
