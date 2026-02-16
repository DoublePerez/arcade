/**
 * ============================================================================
 *  TIMEMACHINE.JS — Time Machine Forward Travel (1981 → 2026)
 * ============================================================================
 *
 *  Intermediate screen shown when the player selects "TIME MACHINE > 2026"
 *  from the arcade menu. Displays a dramatic forward time-travel sequence
 *  before redirecting to clown-keeper.html.
 *
 *  Flow:
 *    Phase 1  "intro"    — Title + description of Clown Town
 *    Phase 2  "travel"   — Auto-advancing status lines + progress bar
 *    Phase 3  "arrive"   — Arrival confirmation → redirect
 *
 *  Controls:
 *    ESC — Return to menu (handled by app.js globalEsc)
 *
 *  Depends on:  grid.js (ArcadeGrid), app.js (showScreen)
 * ============================================================================
 */


/* ═══════════════════════════════════════════════════════════════════════════
   CONFIGURATION & STATE
   ═══════════════════════════════════════════════════════════════════════════ */

const TM_W = 70;
const TM_H = 30;
const tmGrid = ArcadeGrid(TM_W, TM_H);

const tm = {
    phase: "intro",        // "intro" | "travel" | "arrive"
    running: false,
    blinkOn: true,
    blinkTimer: null,
    autoTimer: null,
    statusLines: [],       // accumulated status messages during travel
    barProgress: 0,        // 0–20 (progress bar width in chars)
    barTimer: null
};


/* ═══════════════════════════════════════════════════════════════════════════
   STATUS MESSAGES — Shown sequentially during travel phase
   ═══════════════════════════════════════════════════════════════════════════ */

const TM_STATUS_MESSAGES = [
    { text: "INITIALIZING TEMPORAL ENGINE",     delay: 600  },
    { text: "DISCONNECTING FROM 1981",          delay: 800  },
    { text: "CALCULATING FORWARD TRAJECTORY",   delay: 800  },
    { text: "BYPASSING PARADOX SAFEGUARDS",     delay: 700  },
    { text: "LOCKING COORDINATES — FEB 2026",   delay: 800  },
    { text: "STABILIZING TIMELINE",             delay: 700  },
    { text: "ARRIVING — 2026",                  delay: 600  }
];


/* ═══════════════════════════════════════════════════════════════════════════
   INIT & CLEANUP
   ═══════════════════════════════════════════════════════════════════════════ */

function initTimeMachine() {
    tm.phase = "intro";
    tm.running = true;
    tm.blinkOn = true;
    tm.statusLines = [];
    tm.barProgress = 0;

    tm.blinkTimer = setInterval(function () {
        tm.blinkOn = !tm.blinkOn;
        renderTM();
    }, 500);

    renderTM();

    return function stopTimeMachine() {
        tm.running = false;
        if (tm.blinkTimer) clearInterval(tm.blinkTimer);
        if (tm.autoTimer) clearTimeout(tm.autoTimer);
        if (tm.barTimer) clearTimeout(tm.barTimer);
    };
}


/* ═══════════════════════════════════════════════════════════════════════════
   RENDERING — Main dispatcher
   ═══════════════════════════════════════════════════════════════════════════ */

function renderTM() {
    var g = tmGrid;
    g.clear();

    switch (tm.phase) {
        case "intro":  renderTMIntro(g);  break;
        case "travel": renderTMTravel(g); break;
        case "arrive": renderTMArrive(g); break;
    }

    g.render("tm-arena");
}


/* ═══════════════════════════════════════════════════════════════════════════
   RENDERING — Phase screens
   ═══════════════════════════════════════════════════════════════════════════ */

/** Phase 1: Intro — forward scan results */
function renderTMIntro(g) {
    g.borders();
    g.borderText(" TIME MACHINE ", 0);

    var r = 2;
    var lp = 3;

    g.textInner("CHRONO-SHIFT 3000 -- FORWARD SCAN", r, lp);
    r += 2;
    g.textInner("DESTINATION:  FEB 2026", r, lp);
    g.textInner("DISTANCE:     16,436 DAYS", r + 1, lp);
    r += 3;
    g.textInner("SCAN RESULTS:", r, lp);
    r += 1;
    g.textInner("A structure was detected at the target", r, lp + 2);
    g.textInner("coordinates. Origin: unknown.", r + 1, lp + 2);
    g.textInner("Designation: CLOWN TOWN.", r + 2, lp + 2);
    r += 4;
    g.textInner("The structure appears to keep score.", r, lp + 2);
    g.textInner("Two teams. One tiny car.", r + 1, lp + 2);
    r += 3;
    g.textInner("WARNING: This destination is 45 years", r, lp);
    g.textInner("beyond your current timeline.", r + 1, lp);
    g.textInner("There is no return protocol.", r + 2, lp);

    if (tm.blinkOn) {
        var line = "[ENTER] PROCEED ANYWAY";
        var col = Math.floor((TM_W - line.length) / 2);
        g.textGreen("[ENTER]", TM_H - 4, col);
        g.textInner(" PROCEED ANYWAY", TM_H - 4, col + 7);
    }

    g.borderText(" ENTER: TRAVEL   ESC: MENU ", TM_H - 1);
}

/** Phase 2: Travel — auto-advancing status + progress bar */
function renderTMTravel(g) {
    g.borders();
    g.borderText(" TIME MACHINE ", 0);

    g.textInner("2 0 2 6", 3);
    g.textInner("TRAVELING FORWARD IN TIME", 5);

    // Progress bar
    var barRow = 8;
    var barWidth = 30;
    var barStart = Math.floor((TM_W - barWidth - 2) / 2);
    var filled = Math.min(tm.barProgress, barWidth);
    var barStr = "[";
    for (var i = 0; i < barWidth; i++) {
        barStr += (i < filled) ? "#" : ".";
    }
    barStr += "]";
    g.textInner(barStr, barRow, barStart);

    // Status lines
    var statusStart = 11;
    for (var s = 0; s < tm.statusLines.length; s++) {
        var statusText = "  " + tm.statusLines[s];
        if (s < tm.statusLines.length - 1) {
            statusText += " .......... OK";
        }
        g.textInner(statusText, statusStart + s, 1);
    }

    g.borderText(" TEMPORAL SHIFT IN PROGRESS ", TM_H - 1);
}

/** Phase 3: Arrive — confirmation + redirect */
function renderTMArrive(g) {
    g.borders();
    g.borderText(" TIME MACHINE ", 0);

    var mid = Math.floor(TM_H / 2);

    g.textInner("TEMPORAL ARRIVAL CONFIRMED.", mid - 5);
    g.textInner("FEB 2026.", mid - 3);

    g.textInner("================================", mid - 1);
    g.textGreen("C L O W N   T O W N", mid + 1);
    g.textInner("================================", mid + 3);

    g.textInner("It was waiting for you.", mid + 6);

    if (tm.blinkOn) {
        var line = "[ENTER] STEP INSIDE";
        var col = Math.floor((TM_W - line.length) / 2);
        g.textGreen("[ENTER]", mid + 9, col);
        g.textInner(" STEP INSIDE", mid + 9, col + 7);
    }

    g.borderText(" ENTER: CONTINUE   ESC: MENU ", TM_H - 1);
}


/* ═══════════════════════════════════════════════════════════════════════════
   TRAVEL SEQUENCE — Auto-advancing status messages + progress bar
   ═══════════════════════════════════════════════════════════════════════════ */

function tmStartTravel() {
    tm.phase = "travel";
    tm.statusLines = [];
    tm.barProgress = 0;
    renderTM();

    var msgIndex = 0;
    var totalMsgs = TM_STATUS_MESSAGES.length;
    var barStep = Math.ceil(30 / totalMsgs);

    function advanceStatus() {
        if (!tm.running) return;

        if (msgIndex >= totalMsgs) {
            // Mark last status line as done
            tm.barProgress = 30;
            renderTM();
            tm.autoTimer = setTimeout(function () {
                tm.phase = "arrive";
                renderTM();
            }, 1200);
            return;
        }

        // Mark previous as complete (add OK)
        tm.statusLines.push(TM_STATUS_MESSAGES[msgIndex].text);
        tm.barProgress = Math.min(30, (msgIndex + 1) * barStep);
        msgIndex++;
        renderTM();

        var delay = TM_STATUS_MESSAGES[msgIndex - 1].delay;
        tm.autoTimer = setTimeout(advanceStatus, delay);
    }

    tm.autoTimer = setTimeout(advanceStatus, 500);
}


/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD HANDLER
   ═══════════════════════════════════════════════════════════════════════════ */

function handleTimeMachineKey(e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) !== -1) {
        e.preventDefault();
    }

    // Intro: ENTER starts the travel sequence
    if (tm.phase === "intro") {
        if (e.key === "Enter" || e.key === " ") {
            tmStartTravel();
        }
        return;
    }

    // Travel: non-interactive (auto-advancing)
    if (tm.phase === "travel") {
        return;
    }

    // Arrive: ENTER goes to Clown Town
    if (tm.phase === "arrive") {
        if (e.key === "Enter" || e.key === " ") {
            window.location.href = "clown-keeper.html";
        }
        return;
    }
}
