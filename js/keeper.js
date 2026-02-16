/**
 * ============================================================================
 *  KEEPER.JS — Retro Score Keeper Tool
 * ============================================================================
 *
 *  A split-screen manual score counter with big ASCII digit display.
 *  Designed for keeping score during real-world games or activities.
 *
 *  Game flow:
 *    1. Intro          — Title screen with ASCII trophy and instructions
 *    2. Keeping score  — Split-screen with big digits, score history bar,
 *                        win leader indicator, and controls
 *
 *  Layout (score screen):
 *    Top border      — Title
 *    Row 3           — Team labels with >> selection arrows (green)
 *    Row 5-9         — Big ASCII digit scores (5 rows tall)
 *    Row 11          — "VS" centered with === separators
 *    Row 13          — Score difference / lead indicator
 *    Row 15          — Score history bar (visual timeline)
 *    Row 17-20       — Match stats (total points, lead changes)
 *    Bottom border   — Controls hint
 *
 *  Controls:
 *    Left/Right (A/D)  — Select team
 *    Up/Down (W/S)     — Increment/decrement selected team
 *    Q                 — Reset selected team
 *    R                 — Reset all scores
 *    ESC               — Return to menu
 *
 *  Depends on:  app.js (scores, increment, decrement, reset, resetAll, getPlayerName)
 *               grid.js (ArcadeGrid)
 * ============================================================================
 */


/* ═══════════════════════════════════════════════════════════════════════════
   CONFIGURATION & STATE
   ═══════════════════════════════════════════════════════════════════════════ */

const KEEPER_W = 70;
const KEEPER_H = 30;

const keeperGrid = ArcadeGrid(KEEPER_W, KEEPER_H);

const KEEPER_HISTORY_KEY = "keeperHistory";

const keeper = {
    phase: "intro",      // "intro" | "score"
    selected: "a",       // currently selected team: "a" (player) or "b" (cpu)
    history: [],         // array of "a" or "b" — tracks who scored each point
    totalPoints: 0       // total points scored across both teams
};

/** Load keeper history from localStorage. Returns array or null if invalid. */
function loadKeeperHistory() {
    try {
        var saved = localStorage.getItem(KEEPER_HISTORY_KEY);
        if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
}

/** Save keeper history to localStorage. */
function saveKeeperHistory() {
    localStorage.setItem(KEEPER_HISTORY_KEY, JSON.stringify(keeper.history));
}


/* ═══════════════════════════════════════════════════════════════════════════
   INIT — Entry point (called by screen manager)
   ═══════════════════════════════════════════════════════════════════════════ */

/** Initialize the score keeper. Returns a cleanup function. */
function initKeeper() {
    keeper.phase = "intro";
    keeper.selected = "a";
    keeper.totalPoints = scores.a + scores.b;

    // Try to load persisted history; validate counts match current scores
    var saved = loadKeeperHistory();
    if (saved && Array.isArray(saved)) {
        var countA = 0, countB = 0;
        for (var k = 0; k < saved.length; k++) {
            if (saved[k] === "a") countA++;
            else if (saved[k] === "b") countB++;
        }
        if (countA === scores.a && countB === scores.b) {
            keeper.history = saved;
        } else {
            // Scores were modified externally — rebuild as fallback
            keeper.history = [];
            for (var i = 0; i < scores.a; i++) keeper.history.push("a");
            for (var j = 0; j < scores.b; j++) keeper.history.push("b");
            saveKeeperHistory();
        }
    } else {
        keeper.history = [];
        for (var i2 = 0; i2 < scores.a; i2++) keeper.history.push("a");
        for (var j2 = 0; j2 < scores.b; j2++) keeper.history.push("b");
        saveKeeperHistory();
    }

    renderKeeper();
    return function stopKeeper() {};
}


/* ═══════════════════════════════════════════════════════════════════════════
   BIG ASCII DIGITS — 5 lines tall, 7 characters wide each
   ═══════════════════════════════════════════════════════════════════════════ */

const BIG_DIGITS = {
    "0": [" ##### ", "##   ##", "##   ##", "##   ##", " ##### "],
    "1": ["   ##  ", "  ###  ", "   ##  ", "   ##  ", " ##### "],
    "2": [" ##### ", "     ##", " ##### ", "##     ", " ##### "],
    "3": [" ##### ", "     ##", "  #### ", "     ##", " ##### "],
    "4": ["##   ##", "##   ##", " ######", "     ##", "     ##"],
    "5": [" ######", "##     ", " ##### ", "     ##", " ##### "],
    "6": [" ##### ", "##     ", " ######", "##   ##", " ##### "],
    "7": ["#######", "     ##", "    ## ", "   ##  ", "  ##   "],
    "8": [" ##### ", "##   ##", " ##### ", "##   ##", " ##### "],
    "9": [" ##### ", "##   ##", " ######", "     ##", " ##### "]
};

/** Build 5 lines of concatenated big digits for a number. */
function getDigitLines(num) {
    var str = String(num);
    var rows = ["", "", "", "", ""];
    for (var i = 0; i < str.length; i++) {
        var d = BIG_DIGITS[str[i]] || BIG_DIGITS["0"];
        for (var r = 0; r < 5; r++) {
            rows[r] += d[r] + " ";
        }
    }
    return rows;
}

/** Draw a big ASCII number centered at (startRow, centerCol). */
function drawBigNumber(num, startRow, centerCol) {
    var rows = getDigitLines(num);
    for (var r = 0; r < rows.length; r++) {
        var startC = centerCol - Math.floor(rows[r].length / 2);
        keeperGrid.text(rows[r], startRow + r, startC);
    }
}


/* ═══════════════════════════════════════════════════════════════════════════
   RENDERING — Intro screen
   ═══════════════════════════════════════════════════════════════════════════ */

/** Render the intro/title screen (no borders). */
function renderKeeperIntro() {
    var g = keeperGrid;
    g.clear();

    var midRow = Math.floor(KEEPER_H / 2);

    g.text("S C O R E   K E E P E R", midRow - 8);
    g.text("============================", midRow - 6);

    // ASCII trophy
    g.text("___________", midRow - 4);
    g.text("\\         /", midRow - 3);
    g.text(" \\  _ _  / ", midRow - 2);
    g.text("  \\ | | /  ", midRow - 1);
    g.text("   \\|_|/   ", midRow);
    g.text("    |_|    ", midRow + 1);
    g.text("   /___\\   ", midRow + 2);

    g.text("TRACK YOUR SCORE IN REAL TIME", midRow + 4);
    g.text("============================", midRow + 6);

    var enterLine = "PRESS ENTER TO START";
    var enterCol = Math.floor((KEEPER_W - enterLine.length) / 2);
    g.text("PRESS ", midRow + 8, enterCol);
    g.textGreen("ENTER", midRow + 8, enterCol + 6);
    g.text(" TO START", midRow + 8, enterCol + 11);

    g.render("keeper-arena");
}


/* ═══════════════════════════════════════════════════════════════════════════
   RENDERING — Score screen
   ═══════════════════════════════════════════════════════════════════════════ */

/** Build and render the score keeper layout. */
function renderKeeper() {
    if (keeper.phase === "intro") {
        renderKeeperIntro();
        return;
    }

    var g = keeperGrid;
    g.clear();
    g.borders();

    var name = getPlayerName();
    var shortName = name.length > 8 ? name.substring(0, 8) : name;

    // Title in top border
    g.borderText(" S C O R E   K E E P E R ", 0);

    // Column positions for the two halves
    var colA = Math.floor(KEEPER_W / 4);
    var colB = Math.floor(KEEPER_W * 3 / 4);
    var midCol = Math.floor(KEEPER_W / 2);

    // Center vertical divider (through the score area only)
    for (var rd = 1; rd < 15; rd++) {
        g.set(rd, midCol, "|");
    }

    // ── Team labels with >> << selection (row 3) ────────────
    var teamALabel = keeper.selected === "a" ? ">> " + shortName + " <<" : shortName;
    var teamBLabel = keeper.selected === "b" ? ">> CPU <<" : "CPU";

    var aLabelCol = colA - Math.floor(teamALabel.length / 2);
    var bLabelCol = colB - Math.floor(teamBLabel.length / 2);
    g.textInner(teamALabel, 3, aLabelCol);
    g.textInner(teamBLabel, 3, bLabelCol);

    // Green-highlight the >> << arrows on the selected team
    if (keeper.selected === "a") {
        g.setGreen(3, aLabelCol, ">");
        g.setGreen(3, aLabelCol + 1, ">");
        var aEndCol = aLabelCol + teamALabel.length;
        g.setGreen(3, aEndCol - 2, "<");
        g.setGreen(3, aEndCol - 1, "<");
    }
    if (keeper.selected === "b") {
        g.setGreen(3, bLabelCol, ">");
        g.setGreen(3, bLabelCol + 1, ">");
        var bEndCol = bLabelCol + teamBLabel.length;
        g.setGreen(3, bEndCol - 2, "<");
        g.setGreen(3, bEndCol - 1, "<");
    }

    // ── Big score numbers (rows 6-10) ───────────────────────
    drawBigNumber(scores.a, 6, colA);
    drawBigNumber(scores.b, 6, colB);

    // ── VS divider line (row 13) ────────────────────────────
    for (var sc = 1; sc < KEEPER_W - 1; sc++) {
        g.set(14, sc, "=");
    }
    g.text("[ VS ]", 14);

    // ── Lead indicator (row 16) ─────────────────────────────
    var diff = scores.a - scores.b;
    var leadText;
    if (diff > 0) {
        leadText = shortName + " LEADS BY " + diff;
    } else if (diff < 0) {
        leadText = "CPU LEADS BY " + Math.abs(diff);
    } else {
        leadText = "TIED!";
    }
    g.text(leadText, 16);

    // Green the lead text when someone is leading
    if (diff !== 0) {
        var leadCol = Math.floor((KEEPER_W - leadText.length) / 2);
        g.textGreen(leadText, 16, leadCol);
    }

    // ── Score timeline bar (row 18-19) ──────────────────────
    var barWidth = KEEPER_W - 10;
    var barStart = 5;
    var total = scores.a + scores.b;

    g.text("SCORE TIMELINE", 18);

    if (total > 0) {
        // Build a visual bar showing proportion
        var aWidth = Math.round((scores.a / total) * barWidth);
        var bWidth = barWidth - aWidth;
        if (aWidth < 1 && scores.a > 0) { aWidth = 1; bWidth = barWidth - 1; }
        if (bWidth < 1 && scores.b > 0) { bWidth = 1; aWidth = barWidth - 1; }

        var bar = "[";
        for (var bi = 0; bi < aWidth; bi++) bar += "#";
        for (var bj = 0; bj < bWidth; bj++) bar += ".";
        bar += "]";

        var barCol = Math.floor((KEEPER_W - bar.length) / 2);
        g.text(bar, 20, barCol);

        // Labels under the bar
        var aPercent = Math.round((scores.a / total) * 100);
        var bPercent = 100 - aPercent;
        var percentLine = shortName + " " + aPercent + "%";
        var percentRight = bPercent + "% CPU";
        g.text(percentLine, 21, barCol);
        g.text(percentRight, 21, barCol + bar.length - percentRight.length);
    } else {
        g.text("NO POINTS YET", 20);
    }

    // ── Stats summary (row 23) ──────────────────────────────
    var statsLine = "TOTAL: " + total + " PTS";
    if (total > 0) {
        statsLine += "   " + shortName + ": " + scores.a + "   CPU: " + scores.b;
    }
    g.text(statsLine, 23);

    // ── History dots — last 40 points (row 25) ──────────────
    if (keeper.history.length > 0) {
        var histLen = Math.min(keeper.history.length, 40);
        var histStart = keeper.history.length - histLen;
        var dots = "";
        for (var hi = histStart; hi < keeper.history.length; hi++) {
            dots += keeper.history[hi] === "a" ? "#" : ".";
        }
        var histLine = "LAST " + histLen + ": " + dots;
        g.text(histLine, 25);
    }

    // ── Controls in bottom border ───────────────────────────
    g.borderText(" W/S:+/-  A/D:SELECT  Q:RESET  R:RESET ALL  ESC:MENU ", KEEPER_H - 1);

    g.render("keeper-arena");
}


/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD HANDLER
   ═══════════════════════════════════════════════════════════════════════════ */

/** Handle keyboard input for the score keeper. */
function handleKeeperKey(e) {
    e.preventDefault();

    // ── Intro → start ───────────────────────────────────────
    if (keeper.phase === "intro") {
        if (e.key === "Enter" || e.key === " ") {
            keeper.phase = "score";
            renderKeeper();
        }
        return;
    }

    // ── Score screen controls ───────────────────────────────
    var team = keeper.selected;

    switch (e.key) {
        case "ArrowLeft": case "a": case "A":
            keeper.selected = "a"; break;
        case "ArrowRight": case "d": case "D":
            keeper.selected = "b"; break;
        case "ArrowUp": case "w": case "W":
            increment(team);
            keeper.history.push(team);
            keeper.totalPoints++;
            saveKeeperHistory();
            break;
        case "ArrowDown": case "s": case "S":
            if (scores[team] > 0) {
                decrement(team);
                // Remove the last occurrence of this team from history
                for (var i = keeper.history.length - 1; i >= 0; i--) {
                    if (keeper.history[i] === team) {
                        keeper.history.splice(i, 1);
                        break;
                    }
                }
                keeper.totalPoints = Math.max(0, keeper.totalPoints - 1);
                saveKeeperHistory();
            }
            break;
        case "q": case "Q":
            reset(team);
            // Remove all entries for this team from history
            keeper.history = keeper.history.filter(function (h) { return h !== team; });
            keeper.totalPoints = scores.a + scores.b;
            saveKeeperHistory();
            break;
        case "r": case "R":
            resetAll();
            keeper.history = [];
            keeper.totalPoints = 0;
            saveKeeperHistory();
            break;
        case "Escape":
            showScreen("screen-menu"); return;
    }

    renderKeeper();
}
