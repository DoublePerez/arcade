// ========== SCORE KEEPER 2.0 - BBS TERMINAL DISPLAY ==========

var STORAGE_KEY = "scoreKeeper2";
var INNER = 51;   // inner width between left and right borders
var COL = 25;     // each team column width

var scores = { a: 0, b: 0 };

// ── DISPLAY HELPERS ──────────────────────────────

function center(text, width) {
    if (text.length >= width) return text.substring(0, width);
    var gap = width - text.length;
    var left = Math.floor(gap / 2);
    var right = gap - left;
    return " ".repeat(left) + text + " ".repeat(right);
}

function row(content) {
    return "\u2551" + content + "\u2551";
}

function blank() {
    return row(" ".repeat(INNER));
}

function cols(left, right) {
    return "\u2551" + left + "\u2551" + right + "\u2551";
}

function blankCols() {
    return cols(" ".repeat(COL), " ".repeat(COL));
}

function field(label, value) {
    var lbl = label;
    while (lbl.length < 10) lbl += " ";
    var val = value;
    while (val.length < 33) val += " ";
    if (val.length > 33) val = val.substring(0, 33);
    return "  " + lbl + "[ " + val + " ]  ";
}

function sectionHeader(title) {
    var prefix = "  \u2500\u2500 " + title + " ";
    var suffix = "  ";
    var dashes = INNER - prefix.length - suffix.length;
    if (dashes < 0) dashes = 0;
    var line = "";
    for (var i = 0; i < dashes; i++) line += "\u2500";
    return prefix + line + suffix;
}

// ── RENDER ───────────────────────────────────────

function renderDisplay() {
    var scoreA = String(scores.a);
    var scoreB = String(scores.b);

    var now = new Date();
    var mm = String(now.getMonth() + 1).padStart(2, "0");
    var dd = String(now.getDate()).padStart(2, "0");
    var yyyy = now.getFullYear();
    var dateStr = mm + "/" + dd + "/" + yyyy;

    var E = "\u2550"; // ═
    var D = "\u2500"; // ─

    var lines = [];

    // Top border
    lines.push("\u2554" + E.repeat(INNER) + "\u2557");

    // Title block
    lines.push(blank());
    lines.push(row(center("S C O R E   K E E P E R", INNER)));
    lines.push(blank());

    // Full-width divider
    lines.push("\u2560" + E.repeat(INNER) + "\u2563");

    // Release information section
    lines.push(blank());
    lines.push(row(sectionHeader("RELEASE INFORMATION")));
    lines.push(blank());
    lines.push(row(field("Title", "QUICK SCORE KEEPER")));
    lines.push(row(field("Version", "2.0")));
    lines.push(row(field("Author", "MYOA PILOT")));
    lines.push(row(field("Date", dateStr)));
    lines.push(blank());

    // Split into two columns
    lines.push("\u2560" + E.repeat(COL) + "\u2566" + E.repeat(COL) + "\u2563");

    // Team headers
    lines.push(blankCols());
    lines.push(cols(center("T E A M   A", COL), center("T E A M   B", COL)));
    lines.push(blankCols());

    // Thin dividers inside columns
    var thinDiv = "  " + D.repeat(COL - 4) + "  ";
    lines.push(cols(thinDiv, thinDiv));

    lines.push(blankCols());

    // Score values
    lines.push(cols(center(scoreA, COL), center(scoreB, COL)));

    lines.push(blankCols());

    // Merge back to full width
    lines.push("\u2560" + E.repeat(COL) + "\u2569" + E.repeat(COL) + "\u2563");

    // Notes section
    lines.push(blank());
    lines.push(row(sectionHeader("NOTES")));
    var n1 = "   Scores saved to browser localStorage.";
    var n2 = "   Use buttons below to adjust scores.";
    while (n1.length < INNER) n1 += " ";
    while (n2.length < INNER) n2 += " ";
    lines.push(row(n1));
    lines.push(row(n2));
    lines.push(blank());

    // Footer divider
    lines.push("\u2560" + E.repeat(INNER) + "\u2563");

    // Copyright
    lines.push(row(center("(C) 2026 MYOA PILOT  -  ALL RIGHTS RESERVED", INNER)));

    // Bottom border
    lines.push("\u255A" + E.repeat(INNER) + "\u255D");

    document.getElementById("display").textContent = lines.join("\n");
}

// ── SCORE OPERATIONS ─────────────────────────────

function increment(team) {
    scores[team] += 1;
    renderDisplay();
    save();
}

function decrement(team) {
    if (scores[team] > 0) {
        scores[team] -= 1;
    }
    renderDisplay();
    save();
}

function reset(team) {
    scores[team] = 0;
    renderDisplay();
    save();
}

function resetAll() {
    scores.a = 0;
    scores.b = 0;
    renderDisplay();
    save();
}

// ── PERSISTENCE ──────────────────────────────────

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
}

function load() {
    try {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            var parsed = JSON.parse(saved);
            if (typeof parsed.a === "number") scores.a = parsed.a;
            if (typeof parsed.b === "number") scores.b = parsed.b;
        }
    } catch (e) {
        // ignore corrupt data
    }
    renderDisplay();
}

// ── INIT ─────────────────────────────────────────
load();
