/**
 * ============================================================================
 *  TIMETRAVELER.JS — Time Traveler Text Adventure
 * ============================================================================
 *
 *  A fake 1981 IBM PC text adventure. All narrative paths funnel to the
 *  year 2026, then transition to the Dither Garden Score Keeper.
 *
 *  Game flow:
 *    1. Intro     — Title screen
 *    2. Basement  — Narrative text typed out, 3 choices
 *    3. Reaction  — Response to choice (all lead to 2026)
 *    4. Question  — YES/NO: engage temporal displacement?
 *    5. Jump      — Auto-advancing dramatic sequence
 *    6. Arrival   — Flash, arrival text, "computing survival index..."
 *    7. Dither    — Transition screen → opens Score Keeper
 *
 *  Controls:
 *    Arrows / 1-3   — Navigate choices (basement)
 *    Left/Right     — YES/NO selection (question)
 *    Enter          — Confirm / advance
 *    Any key        — Skip typewriter during typing
 *    ESC            — Return to menu (handled by app.js globalEsc)
 *
 *  Depends on:  grid.js (ArcadeGrid)
 * ============================================================================
 */


/* ═══════════════════════════════════════════════════════════════════════════
   CONFIGURATION & STATE
   ═══════════════════════════════════════════════════════════════════════════ */

const TT_W = 70;
const TT_H = 30;
const TT_TYPE_SPEED = 12;     // ms per character (matches boot.js)
const TT_LINE_DELAY = 60;     // ms between lines  (matches boot.js)

const ttGrid = ArcadeGrid(TT_W, TT_H);

const tt = {
    phase: "intro",        // "intro"|"basement"|"reaction"|"question"|"jump"|"arrival"|"dither"
    choice: 0,             // selected choice index (0-2) for basement
    yesNo: 0,              // 0 = YES, 1 = NO
    playerChoice: "",      // "pizza"|"2026"|"1995"
    typing: false,         // typewriter active?
    typeTimer: null,       // setTimeout handle for typewriter
    typeQueue: [],         // remaining lines to type
    typedLines: [],        // fully typed lines
    currentLine: "",       // line being typed
    charIndex: 0,          // position in currentLine
    onTypingDone: null,    // callback when typing completes
    autoTimer: null,       // setTimeout for auto-advance (jump/arrival)
    running: false,
    blinkOn: true,
    blinkTimer: null,
    ditherSel: 0           // 0 = Clown Town, 1 = Dither Garden
};


/* ═══════════════════════════════════════════════════════════════════════════
   NARRATIVE TEXT
   ═══════════════════════════════════════════════════════════════════════════ */

const TT_BASEMENT_TEXT = [
    "",
    "  12 NOV 1981  23:47",
    "",
    "  BASEMENT WORKSHOP",
    "",
    "  The television died with a soft pop",
    "  halfway through the late movie.",
    "",
    "  The room is now lit only by the green",
    "  glow of the oscilloscope and the orange",
    "  filaments of the tubes in the",
    "  Chrono-Shift 3000.",
    "",
    "  Six months of nights and weekends.",
    "  It is ready.",
    "",
    "  What do you do?"
];

const TT_REACTION_PIZZA = [
    "",
    "  You dial the number.",
    "  Large pepperoni, extra cheese.",
    "",
    "  While you wait, the machine's relays",
    "  start clicking in sequence,",
    "  faster and faster.",
    "",
    "  It does not like to be kept waiting.",
    "",
    "  The destination dial locks to: 2026."
];

const TT_REACTION_2026 = [
    "",
    "  Coordinates accepted.",
    "",
    "  The power meters climb steadily.",
    "",
    "  CHRONO-SHIFT 3000: ONLINE.",
    "  TEMPORAL BUFFER:   NOMINAL.",
    "  DESTINATION:       2026.",
    "",
    "  The machine hums with anticipation."
];

const TT_REACTION_1995 = [
    "",
    "  INPUT ACCEPTED.",
    "",
    "  TEMPORAL CALCULATION...",
    "",
    "  ERROR 47 -- 1995 VECTOR UNSTABLE",
    "",
    "  RECALCULATING TO NEAREST",
    "  STABLE EPOCH...",
    "",
    "  DESTINATION OVERRIDE: 2026"
];

const TT_QUESTION_HEADER = [
    "",
    "  CHRONO-SHIFT 3000",
    "  ===================",
    "  STATUS:       NOMINAL",
    "  DESTINATION:  2026",
    "  FLUX CHARGE:  98.7%",
    "",
    "  Engage temporal displacement?"
];

const TT_JUMP_YES = [
    "  You throw the master switch.",
    "",
    "  The tubes flare white.",
    "",
    "  Ozone. Hot solder.",
    "",
    "  Everything goes silent",
    "  for half a second.",
    "",
    "  Then --"
];

const TT_JUMP_NO = [
    "  Your hand moves toward the",
    "  power toggle.",
    "",
    "  A relay snaps somewhere inside",
    "  the machine.",
    "",
    "  \"SAFETY INTERLOCK DISABLED.\"",
    "",
    "  Then --"
];

const TT_ARRIVAL_TEXT = [
    "",
    "  WHITE.",
    "",
    "  Then too much color.",
    "",
    "  The basement is gone.",
    "  The air is cool and smells",
    "  of nothing familiar.",
    "",
    "  Your machine now sits on the floor",
    "  as a simple black box, humming quietly.",
    "",
    "  A calm voice from the ceiling:",
    "",
    "  \"Temporal arrival confirmed.\""
];


/* ═══════════════════════════════════════════════════════════════════════════
   TYPEWRITER ENGINE
   ═══════════════════════════════════════════════════════════════════════════ */

/** Start typing a queue of lines. Calls onDone when complete. */
function ttStartTyping(lines, onDone) {
    tt.typing = true;
    tt.typeQueue = lines.slice();
    tt.typedLines = [];
    tt.currentLine = "";
    tt.charIndex = 0;
    tt.onTypingDone = onDone || null;
    ttTypeNext();
}

/** Recursive tick: type one character, schedule next. */
function ttTypeNext() {
    if (!tt.running) return;

    // Need a new line from the queue?
    if (tt.charIndex === 0 && tt.currentLine === "" && tt.typeQueue.length > 0) {
        tt.currentLine = tt.typeQueue.shift();
    }

    // Queue exhausted and no current line — done
    if (tt.currentLine === "" && tt.typeQueue.length === 0 && tt.charIndex === 0) {
        tt.typing = false;
        if (tt.onTypingDone) tt.onTypingDone();
        return;
    }

    if (tt.charIndex < tt.currentLine.length) {
        tt.charIndex++;
        renderTT();
        tt.typeTimer = setTimeout(ttTypeNext, TT_TYPE_SPEED);
    } else {
        // Line complete
        tt.typedLines.push(tt.currentLine);
        tt.currentLine = "";
        tt.charIndex = 0;
        renderTT();
        tt.typeTimer = setTimeout(ttTypeNext, TT_LINE_DELAY);
    }
}

/** Skip typewriter — show all remaining text instantly. */
function ttSkipTyping() {
    if (!tt.typing) return;
    if (tt.typeTimer) clearTimeout(tt.typeTimer);

    if (tt.currentLine !== "") {
        tt.typedLines.push(tt.currentLine);
    }
    while (tt.typeQueue.length > 0) {
        tt.typedLines.push(tt.typeQueue.shift());
    }
    tt.currentLine = "";
    tt.charIndex = 0;
    tt.typing = false;
    renderTT();
    if (tt.onTypingDone) tt.onTypingDone();
}


/* ═══════════════════════════════════════════════════════════════════════════
   INIT & CLEANUP
   ═══════════════════════════════════════════════════════════════════════════ */

/** Initialize the Time Traveler game. Returns a cleanup function. */
function initTimeTraveler() {
    tt.phase = "intro";
    tt.choice = 0;
    tt.yesNo = 0;
    tt.playerChoice = "";
    tt.typing = false;
    tt.typeQueue = [];
    tt.typedLines = [];
    tt.currentLine = "";
    tt.charIndex = 0;
    tt.onTypingDone = null;
    tt.running = true;
    tt.blinkOn = true;
    tt.ditherSel = 0;

    tt.blinkTimer = setInterval(function () {
        tt.blinkOn = !tt.blinkOn;
        renderTT();
    }, 500);

    renderTT();

    return function stopTimeTraveler() {
        tt.running = false;
        if (tt.typeTimer) clearTimeout(tt.typeTimer);
        if (tt.autoTimer) clearTimeout(tt.autoTimer);
        if (tt.blinkTimer) clearInterval(tt.blinkTimer);
    };
}


/* ═══════════════════════════════════════════════════════════════════════════
   RENDERING — Main dispatcher
   ═══════════════════════════════════════════════════════════════════════════ */

function renderTT() {
    var g = ttGrid;
    g.clear();

    switch (tt.phase) {
        case "intro":    renderTTIntro(g);    break;
        case "basement": renderTTBasement(g); break;
        case "reaction": renderTTReaction(g); break;
        case "question": renderTTQuestion(g); break;
        case "jump":     renderTTJump(g);     break;
        case "arrival":  renderTTArrival(g);  break;
        case "dither":   renderTTDither(g);   break;
    }

    g.render("tt-arena");
}


/* ═══════════════════════════════════════════════════════════════════════════
   RENDERING — Phase screens
   ═══════════════════════════════════════════════════════════════════════════ */

/** Intro / title screen (no borders). */
function renderTTIntro(g) {
    var mid = Math.floor(TT_H / 2);

    g.text("T I M E   T R A V E L E R", mid - 6);
    g.text("================================", mid - 4);
    g.text("YOU BUILT A TIME MACHINE.", mid - 2);
    g.text("THE CHRONO-SHIFT 3000.", mid);
    g.text("NOW WHAT?", mid + 1);
    g.text("================================", mid + 3);

    if (tt.blinkOn) {
        var line = "PRESS ENTER TO BEGIN";
        var col = Math.floor((TT_W - line.length) / 2);
        g.text("PRESS ", mid + 6, col);
        g.textGreen("ENTER", mid + 6, col + 6);
        g.text(" TO BEGIN", mid + 6, col + 11);
    }
}

/** Basement workshop — typewriter text + 3 choices. */
function renderTTBasement(g) {
    g.borders();
    g.borderText(" TIME TRAVELER ", 0);

    // Typed lines
    var startRow = 1;
    for (var i = 0; i < tt.typedLines.length && startRow + i < TT_H - 8; i++) {
        g.textInner(tt.typedLines[i], startRow + i, 1);
    }

    // Partially typed current line
    if (tt.currentLine !== "" && tt.charIndex > 0) {
        var partial = tt.currentLine.substring(0, tt.charIndex);
        g.textInner(partial, startRow + tt.typedLines.length, 1);
    }

    // Choices (only after typing finishes)
    if (!tt.typing) {
        var choiceRow = TT_H - 9;
        var choices = [
            "[1]  Call for a pizza",
            "[2]  Set destination 2026",
            "[3]  Set destination 1995"
        ];
        // Find longest choice for centering
        var maxLen = 0;
        for (var m = 0; m < choices.length; m++) {
            if ((">> " + choices[m]).length > maxLen) maxLen = (">> " + choices[m]).length;
        }
        var choiceCol = Math.floor((TT_W - maxLen) / 2);
        for (var c = 0; c < choices.length; c++) {
            if (c === tt.choice) {
                g.textGreen(">> " + choices[c], choiceRow + c * 2, choiceCol);
            } else {
                g.textInner("   " + choices[c], choiceRow + c * 2, choiceCol);
            }
        }
    }

    g.borderText(" ARROWS/1-3: CHOOSE   ENTER: SELECT   ESC: MENU ", TT_H - 1);
}

/** Reaction to player's choice — typewriter text + advance prompt. */
function renderTTReaction(g) {
    g.borders();
    g.borderText(" TIME TRAVELER ", 0);

    var startRow = 1;
    for (var i = 0; i < tt.typedLines.length && startRow + i < TT_H - 4; i++) {
        g.textInner(tt.typedLines[i], startRow + i, 1);
    }
    if (tt.currentLine !== "" && tt.charIndex > 0) {
        var partial = tt.currentLine.substring(0, tt.charIndex);
        g.textInner(partial, startRow + tt.typedLines.length, 1);
    }

    if (!tt.typing && tt.blinkOn) {
        g.textInner("Press any key to continue...", TT_H - 3);
    }

    g.borderText(" ESC: MENU ", TT_H - 1);
}

/** CHRONO-SHIFT 3000 status + YES/NO selector. */
function renderTTQuestion(g) {
    g.borders();
    g.borderText(" TIME TRAVELER ", 0);

    // Status text
    for (var i = 0; i < TT_QUESTION_HEADER.length; i++) {
        g.textInner(TT_QUESTION_HEADER[i], 2 + i, 1);
    }

    // YES / NO
    var selRow = 14;
    var yesText = "[ YES ]";
    var noText  = "[ NO ]";
    var gap = 10;
    var totalWidth = yesText.length + gap + noText.length;
    var startCol = Math.floor((TT_W - totalWidth) / 2);

    if (tt.yesNo === 0) {
        g.textGreen(yesText, selRow, startCol);
        g.text(noText, selRow, startCol + yesText.length + gap);
    } else {
        g.text(yesText, selRow, startCol);
        g.textGreen(noText, selRow, startCol + yesText.length + gap);
    }

    g.borderText(" LEFT/RIGHT: CHOOSE   ENTER: CONFIRM ", TT_H - 1);
}

/** Jump sequence — auto-advancing lines. */
function renderTTJump(g) {
    g.borders();
    g.borderText(" TIME TRAVELER ", 0);

    for (var i = 0; i < tt.typedLines.length; i++) {
        g.textInner(tt.typedLines[i], 2 + i, 1);
    }

    g.borderText(" TEMPORAL SHIFT IN PROGRESS ", TT_H - 1);
}

/** Arrival — typewriter text + "computing" animation. */
function renderTTArrival(g) {
    g.borders();
    g.borderText(" TIME TRAVELER ", 0);

    for (var i = 0; i < tt.typedLines.length; i++) {
        g.textInner(tt.typedLines[i], 2 + i, 1);
    }
    if (tt.currentLine !== "" && tt.charIndex > 0) {
        var partial = tt.currentLine.substring(0, tt.charIndex);
        g.textInner(partial, 2 + tt.typedLines.length, 1);
    }
}

/** Dither — two selectable destinations (matches Time Machine arrive). */
function renderTTDither(g) {
    g.borders();
    g.borderText(" TIME TRAVELER ", 0);

    var mid = Math.floor(TT_H / 2);

    g.textInner("SURVIVAL INDEX COMPUTED.", mid - 6);
    g.textInner("THE FUTURE AWAITS YOUR COMMAND.", mid - 4);
    g.textInner("================================", mid - 2);
    g.textInner("SELECT DESTINATION:", mid);

    // Option 0: Clown Town
    var lbl0 = "[1]  CLOWN TOWN";
    var col0 = Math.floor((TT_W - lbl0.length - 3) / 2);
    if (tt.ditherSel === 0) {
        g.textGreen(">> " + lbl0, mid + 2, col0);
    } else {
        g.textInner("   " + lbl0, mid + 2, col0);
    }

    // Option 1: Dither Garden
    var lbl1 = "[2]  DITHER GARDEN";
    var col1 = Math.floor((TT_W - lbl1.length - 3) / 2);
    if (tt.ditherSel === 1) {
        g.textGreen(">> " + lbl1, mid + 4, col1);
    } else {
        g.textInner("   " + lbl1, mid + 4, col1);
    }

    g.textInner("================================", mid + 6);

    if (tt.blinkOn) {
        var line = "[ENTER] GO";
        var col = Math.floor((TT_W - line.length) / 2);
        g.textGreen("[ENTER]", mid + 8, col);
        g.textInner(" GO", mid + 8, col + 7);
    }

    g.borderText(" ARROWS: SELECT   ENTER: GO   ESC: MENU ", TT_H - 1);
}


/* ═══════════════════════════════════════════════════════════════════════════
   AUTO-ADVANCE SEQUENCES (jump & arrival)
   ═══════════════════════════════════════════════════════════════════════════ */

/** Start the jump auto-advance sequence. */
function ttStartJump() {
    tt.phase = "jump";
    tt.typedLines = [];

    var lines = (tt.yesNo === 1) ? TT_JUMP_NO.slice() : TT_JUMP_YES.slice();

    renderTT();

    var index = 0;

    function advanceLine() {
        if (!tt.running) return;
        if (index >= lines.length) {
            tt.autoTimer = setTimeout(ttStartArrival, 2000);
            return;
        }
        tt.typedLines.push(lines[index]);
        index++;
        renderTT();
        var delay = lines[index - 1].trim() === "" ? 400 : 1200;
        tt.autoTimer = setTimeout(advanceLine, delay);
    }

    tt.autoTimer = setTimeout(advanceLine, 800);
}

/** Start the arrival sequence. */
function ttStartArrival() {
    tt.phase = "arrival";
    tt.typedLines = [];
    tt.currentLine = "";
    tt.charIndex = 0;
    renderTT();

    tt.autoTimer = setTimeout(function () {
        ttStartTyping(TT_ARRIVAL_TEXT, function () {
            ttSurvivalDots();
        });
    }, 1000);
}

/** Animated "Computing survival index..." dots, then transition to dither. */
function ttSurvivalDots() {
    var dotCount = 0;
    var baseLine = "  Computing survival index";
    var lineRow = 2 + tt.typedLines.length + 1;

    function tickDot() {
        if (!tt.running) return;
        dotCount++;
        var dots = "";
        for (var d = 0; d < ((dotCount % 4) + 1); d++) dots += ".";

        renderTT();
        ttGrid.textInner(baseLine + dots, lineRow, 1);
        ttGrid.render("tt-arena");

        if (dotCount >= 12) {
            tt.autoTimer = setTimeout(function () {
                tt.phase = "dither";
                renderTT();
            }, 1500);
            return;
        }
        tt.autoTimer = setTimeout(tickDot, 350);
    }

    tt.autoTimer = setTimeout(tickDot, 600);
}


/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD HANDLER
   ═══════════════════════════════════════════════════════════════════════════ */

/** Handle keyboard input for the Time Traveler game. */
function handleTimeTravelerKey(e) {
    // Prevent scrolling on arrow keys and space
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) !== -1) {
        e.preventDefault();
    }

    // ── Intro: ENTER to begin ────────────────────────────────
    if (tt.phase === "intro") {
        if (e.key === "Enter" || e.key === " ") {
            tt.phase = "basement";
            ttStartTyping(TT_BASEMENT_TEXT, function () {
                renderTT();
            });
        }
        return;
    }

    // ── During any typing: any key skips ─────────────────────
    if (tt.typing) {
        ttSkipTyping();
        return;
    }

    // ── Basement: navigate choices, confirm ──────────────────
    if (tt.phase === "basement") {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
            tt.choice = (tt.choice - 1 + 3) % 3;
            renderTT();
        } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
            tt.choice = (tt.choice + 1) % 3;
            renderTT();
        } else if (e.key === "1") {
            tt.choice = 0; renderTT();
        } else if (e.key === "2") {
            tt.choice = 1; renderTT();
        } else if (e.key === "3") {
            tt.choice = 2; renderTT();
        } else if (e.key === "Enter") {
            tt.playerChoice = ["pizza", "2026", "1995"][tt.choice];
            tt.phase = "reaction";
            var reactionText = {
                "pizza": TT_REACTION_PIZZA,
                "2026":  TT_REACTION_2026,
                "1995":  TT_REACTION_1995
            }[tt.playerChoice];
            ttStartTyping(reactionText, function () {
                renderTT();
            });
        }
        return;
    }

    // ── Reaction: any key advances to question ───────────────
    if (tt.phase === "reaction") {
        tt.phase = "question";
        tt.yesNo = 0;
        renderTT();
        return;
    }

    // ── Question: LEFT/RIGHT for YES/NO, Enter to confirm ────
    if (tt.phase === "question") {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
            tt.yesNo = 0;
            renderTT();
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
            tt.yesNo = 1;
            renderTT();
        } else if (e.key === "Enter") {
            ttStartJump();
        }
        return;
    }

    // ── Jump & Arrival: non-interactive (auto-advancing) ─────

    // ── Dither: navigate destinations and confirm ──────────
    if (tt.phase === "dither") {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
            tt.ditherSel = 0;
            sfx(330, 30);
            renderTT();
        } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
            tt.ditherSel = 1;
            sfx(330, 30);
            renderTT();
        } else if (e.key === "1") {
            tt.ditherSel = 0;
            renderTT();
        } else if (e.key === "2") {
            tt.ditherSel = 1;
            renderTT();
        } else if (e.key === "Enter" || e.key === " ") {
            if (tt.ditherSel === 0) {
                window.location.href = "clown-keeper.html";
            } else {
                window.open("https://dithergarden.com", "_blank");
            }
        }
        return;
    }
}
