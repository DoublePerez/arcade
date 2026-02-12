// ========== GAME SELECTION MENU ==========

const MENU_ITEMS = [
    { key: "1", label: "ASCII PONG",      screen: "screen-pong" },
    { key: "2", label: "TIC TAC TOE",     screen: "screen-ttt" },
    { key: "3", label: "B I N G O",       screen: "screen-bingo" },
    { key: "4", label: "S N A K E",       screen: "screen-snake" },
    { key: "5", label: "SPACE INVADERS",  screen: "screen-invaders" },
    { key: "6", label: "MAGIC 8 BALL",    screen: "screen-magic8" },
    { key: "7", label: "SCORE BOARD",     screen: "screen-scores" },
    { key: "8", label: "SCORE KEEPER",    screen: "screen-keeper" }
];

let menuCursor = 0;

function padRight(str, len) {
    while (str.length < len) str += " ";
    return str;
}

function centerInBox(str, width) {
    if (str.length >= width) return str.substring(0, width);
    var pad = Math.floor((width - str.length) / 2);
    var line = " ".repeat(pad) + str;
    while (line.length < width) line += " ";
    return line;
}

function buildMenuText() {
    const W = 44; // inner width
    const empty = "  |" + " ".repeat(W) + "|";
    const sep   = "  |" + "-".repeat(W) + "|";
    let lines = [];

    lines.push("");
    lines.push("  +" + "=".repeat(W) + "+");
    lines.push(empty);
    lines.push("  |" + centerInBox("R E T R O   A R C A D E", W) + "|");
    lines.push("  |" + centerInBox("T E R M I N A L", W) + "|");
    lines.push(empty);
    lines.push("  |" + "=".repeat(W) + "|");

    for (let i = 0; i < MENU_ITEMS.length; i++) {
        const item = MENU_ITEMS[i];
        const sel = (i === menuCursor);
        const arrow = sel ? '<span class="green">&gt;&gt;</span>' : "  ";
        const label = "[" + item.key + "]  " + item.label;
        const plainLen = 2 + 2 + 1 + label.length; // "  " + arrow(2) + " " + label
        const pad = W - plainLen;
        lines.push(empty);
        lines.push("  |" + "  " + arrow + " " + label + (pad > 0 ? " ".repeat(pad) : "") + "|");
        if (i === 5) { lines.push(empty); lines.push(sep); }
    }

    lines.push(empty);
    lines.push(sep);
    lines.push(empty);
    lines.push("  |" + centerInBox("Arrows to browse, Enter to play", W) + "|");
    lines.push("  |" + centerInBox("1-8 to quick-select", W) + "|");
    lines.push("  |" + centerInBox("ESC to return here from any game", W) + "|");
    lines.push(empty);
    lines.push("  +" + "=".repeat(W) + "+");

    return lines.join("\n");
}

function renderMenu() {
    document.getElementById("menu-art").innerHTML = buildMenuText();
}

function initMenu() {
    renderMenu();
}

function handleMenuKey(e) {
    // number quick-select (existing behaviour)
    const idx = MENU_ITEMS.findIndex(m => m.key === e.key);
    if (idx !== -1) {
        menuCursor = idx;
        showScreen(MENU_ITEMS[idx].screen);
        return;
    }

    // arrow navigation
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        menuCursor = (menuCursor - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
        renderMenu();
        return;
    }
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        menuCursor = (menuCursor + 1) % MENU_ITEMS.length;
        renderMenu();
        return;
    }

    // confirm selection
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showScreen(MENU_ITEMS[menuCursor].screen);
    }
}
