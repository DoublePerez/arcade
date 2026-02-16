/**
 * ============================================================================
 *  MENU.JS — Game Selection Menu
 * ============================================================================
 *
 *  The main hub of the arcade. Renders an ASCII-art bordered menu with:
 *    • GAMES section  — 7 playable games (Pong, TTT, Bingo, Snake, Invaders, Magic 8, Time Traveler)
 *    • TOOLS section  — 3 utilities (Time Machine 2026, Score Keeper, Scoreboard)
 *
 *  Navigation:
 *    Arrow keys / WASD — move cursor
 *    Number keys 1–0   — jump directly to a game/tool
 *    Enter / Space      — launch highlighted item
 *    ESC               — return to boot screen
 *
 *  Depends on:  app.js (showScreen)
 * ============================================================================
 */


/* ═══════════════════════════════════════════════════════════════════════════
   MENU ITEM DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════════ */

const MENU_ITEMS = [
    { key: "1", label: "ASCII PONG",      screen: "screen-pong" },
    { key: "2", label: "TIC TAC TOE",     screen: "screen-ttt" },
    { key: "3", label: "B I N G O",       screen: "screen-bingo" },
    { key: "4", label: "S N A K E",       screen: "screen-snake" },
    { key: "5", label: "SPACE INVADERS",  screen: "screen-invaders" },
    { key: "6", label: "MAGIC 8 BALL",    screen: "screen-magic8" },
    { key: "7", label: "TIME TRAVELER",   screen: "screen-timetraveler" },
    { key: "8", label: "SCORE KEEPER",    screen: "screen-keeper" },
    { key: "9", label: "SCORE BOARD",     screen: "screen-scores" },
    { key: "0", label: "TIME MACHINE > 2026", screen: "screen-timemachine" }
];

let menuCursor = 0;


/* ═══════════════════════════════════════════════════════════════════════════
   ASCII LAYOUT HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

/** Center a string within a fixed-width field, padding with spaces. */
function centerInBox(str, width) {
    if (str.length >= width) return str.substring(0, width);
    const pad = Math.ceil((width - str.length) / 2);
    let line = " ".repeat(pad) + str;
    while (line.length < width) line += " ";
    return line;
}

/** Build one row of the menu list. Highlighted row gets green ">>" arrows. */
function menuRow(idx, lp, W) {
    const item = MENU_ITEMS[idx];
    const sel = (idx === menuCursor);
    const tag = "[" + item.key + "]  " + item.label;
    const visLen = lp + 3 + tag.length;
    const pad = Math.max(0, W - visLen);

    if (sel) {
        return "  |" + " ".repeat(lp) +
            '<span class="green">&gt;&gt; ' + tag + '</span>' +
            " ".repeat(pad) + "|";
    }
    return "  |" + " ".repeat(lp) + "   " + tag + " ".repeat(pad) + "|";
}


/* ═══════════════════════════════════════════════════════════════════════════
   MENU BUILDER — Assembles the full ASCII menu frame
   ═══════════════════════════════════════════════════════════════════════════ */

/** Generate the complete menu art as an HTML string. */
function buildMenuText() {
    const W = 44;       // inner width of the menu box
    const empty = "  |" + " ".repeat(W) + "|";
    const LP = 4;       // left padding for menu items
    const lines = [];

    // ── Title ────────────────────────────────────────────────
    lines.push("  +" + "=".repeat(W) + "+");
    lines.push(empty);
    lines.push("  |" + centerInBox("R E T R O   A R C A D E", W) + "|");
    lines.push("  |" + centerInBox("T E R M I N A L", W) + "|");
    lines.push(empty);

    // ── Games section ────────────────────────────────────────
    let lbl = "[ G A M E S ]";
    const lp = 3;
    lines.push("  |" + "=".repeat(lp) + lbl + "=".repeat(W - lp - lbl.length) + "|");
    lines.push(empty);

    for (let i = 0; i < 7; i++) {
        lines.push(menuRow(i, LP, W));
    }
    lines.push(empty);

    // ── Tools section ────────────────────────────────────────
    lbl = "[ T O O L S ]";
    lines.push("  |" + "-".repeat(lp) + lbl + "-".repeat(W - lp - lbl.length) + "|");
    lines.push(empty);

    for (let i = 7; i < MENU_ITEMS.length; i++) {
        lines.push(menuRow(i, LP, W));
    }
    lines.push(empty);

    // ── Footer ───────────────────────────────────────────────
    lines.push("  +" + "-".repeat(W) + "+");
    lines.push("  |" + centerInBox("ARROWS browse   ENTER play   ESC back", W) + "|");
    lines.push("  |" + centerInBox("M: MUTE SOUNDS", W) + "|");
    lines.push("  +" + "=".repeat(W) + "+");

    return lines.join("\n");
}


/* ═══════════════════════════════════════════════════════════════════════════
   RENDER & INIT
   ═══════════════════════════════════════════════════════════════════════════ */

/** Flush the menu art to the DOM. */
function renderMenu() {
    document.getElementById("menu-art").innerHTML = buildMenuText();
}

/** Called by the screen manager when entering the menu screen. */
function initMenu() {
    renderMenu();
}


/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD HANDLER
   ═══════════════════════════════════════════════════════════════════════════ */

/** Launch a menu item — internal screen or external URL. */
function launchMenuItem(item) {
    if (item.url) {
        window.location.href = item.url;
    } else {
        showScreen(item.screen);
    }
}

/** Handle keyboard navigation and selection within the menu. */
function handleMenuKey(e) {
    // Direct number-key selection (1–0)
    const idx = MENU_ITEMS.findIndex(m => m.key === e.key);
    if (idx !== -1) {
        menuCursor = idx;
        launchMenuItem(MENU_ITEMS[idx]);
        return;
    }

    // Cursor movement
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        menuCursor = (menuCursor - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
        sfx(330, 30);
        renderMenu();
        return;
    }
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        menuCursor = (menuCursor + 1) % MENU_ITEMS.length;
        sfx(330, 30);
        renderMenu();
        return;
    }

    // Confirm selection
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        launchMenuItem(MENU_ITEMS[menuCursor]);
    }
}
