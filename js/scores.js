// ========== SCOREBOARD SCREEN ==========

let scoresMode = "view";
let nameBuffer = "";

const BOARD_W = 50;

function padLine(content) {
    let inner = "  " + content;
    if (inner.length < BOARD_W) inner += " ".repeat(BOARD_W - inner.length);
    if (inner.length > BOARD_W) inner = inner.substring(0, BOARD_W);
    return "  |" + inner + "|";
}

function centerPadLine(content) {
    var pad = Math.floor((BOARD_W - content.length) / 2);
    var inner = " ".repeat(pad) + content;
    if (inner.length < BOARD_W) inner += " ".repeat(BOARD_W - inner.length);
    if (inner.length > BOARD_W) inner = inner.substring(0, BOARD_W);
    return "  |" + inner + "|";
}

function emptyLine() { return padLine(""); }
function dividerLine() { return "  |" + "-".repeat(BOARD_W) + "|"; }
function barLine() { return "  +" + "=".repeat(BOARD_W) + "+"; }
function separatorLine() { return "  |" + "=".repeat(BOARD_W) + "|"; }

function initScoreboard() {
    scoresMode = "view";
    nameBuffer = "";
    const label = document.getElementById("ctrl-label-a");
    if (label) label.textContent = loadArcadeData().playerName + ":";
    renderScoreboard();
}

// DRY helpers for repeated section patterns
function renderMatchSection(lines, title, data, name) {
    lines.push(dividerLine());
    lines.push(emptyLine());
    lines.push(padLine(title));
    lines.push(emptyLine());

    const pw = data ? data.playerWins : 0;
    const cw = data ? data.cpuWins : 0;
    lines.push(padLine("TOTAL WINS:  " + name + " " + pw + "  -  " + cw + " CPU"));

    if (data && data.lastMatch) {
        const lm = data.lastMatch;
        lines.push(padLine("LAST MATCH:  " + name + " " + lm.playerScore + "  -  " + lm.cpuScore + " CPU"));
        const winText = lm.winner === "player" ? name + " WINS!" : "CPU WINS!";
        lines.push(padLine("             " + winText));
    } else {
        lines.push(padLine("LAST MATCH:  NO MATCHES YET"));
    }

    lines.push(emptyLine());
}

function renderSoloSection(lines, title, data) {
    lines.push(dividerLine());
    lines.push(emptyLine());
    lines.push(padLine(title));
    lines.push(emptyLine());

    const d = data || { bestScore: 0, gamesPlayed: 0, lastScore: 0 };
    lines.push(padLine("GAMES PLAYED:  " + d.gamesPlayed));
    lines.push(padLine("BEST SCORE:    " + d.bestScore));
    lines.push(padLine("LAST SCORE:    " + (d.lastScore > 0 ? d.lastScore : "NO GAMES YET")));

    lines.push(emptyLine());
}

function renderScoreboard() {
    const data = loadArcadeData();
    const name = data.playerName;
    const lines = [];

    lines.push("");
    lines.push(barLine());
    lines.push(emptyLine());
    lines.push(centerPadLine("S C O R E B O A R D"));
    lines.push(emptyLine());
    lines.push(separatorLine());

    // Player name / name entry
    if (scoresMode === "nameEntry") {
        lines.push(emptyLine());
        lines.push(padLine("ENTER NAME: " + nameBuffer + "_"));
        lines.push(padLine("(TYPE NAME, ENTER SAVE, ESC CANCEL)"));
        lines.push(emptyLine());
    } else {
        lines.push(emptyLine());
        lines.push(padLine("PLAYER:  " + name));
        lines.push(emptyLine());
    }

    // Live score
    lines.push(dividerLine());
    lines.push(emptyLine());
    lines.push(centerPadLine("CURRENT SCORE"));
    lines.push(emptyLine());
    const sa = String(scores.a).padStart(2, " ");
    const sb = String(scores.b).padStart(2, " ");
    lines.push(centerPadLine(name + "  " + sa + "  -  " + sb + "  CPU"));
    lines.push(emptyLine());

    // Game sections
    renderMatchSection(lines, "PONG", data.pong, name);
    renderMatchSection(lines, "TIC TAC TOE", data.ttt, name);
    renderMatchSection(lines, "BINGO", data.bingo, name);
    renderSoloSection(lines, "SNAKE", data.snake);
    renderSoloSection(lines, "SPACE INVADERS", data.invaders);

    lines.push(barLine());

    var output = lines.join("\n");
    output = output.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    output = output.replace(
        /^(  \|  )(PONG|TIC TAC TOE|BINGO|SNAKE|SPACE INVADERS)( +\|)$/gm,
        '$1<span class="green">$2</span>$3'
    );
    document.getElementById("scores-art").innerHTML = output;
}

// ========== INTERACTIVE BUTTON HANDLERS ==========
function scoreIncrement(team) { increment(team); renderScoreboard(); }
function scoreDecrement(team) { decrement(team); renderScoreboard(); }
function scoreReset(team) { reset(team); renderScoreboard(); }
function scoreResetAll() { resetAll(); renderScoreboard(); }

function enterNameMode() {
    scoresMode = "nameEntry";
    nameBuffer = "";
    renderScoreboard();
}

function resetStats() {
    resetArcadeData();
    renderScoreboard();
}

// ========== KEYBOARD INPUT ==========
function handleScoresKey(e) {
    if (scoresMode === "nameEntry") {
        e.preventDefault();

        if (e.key === "Enter") {
            const trimmed = nameBuffer.trim();
            if (trimmed.length > 0) {
                setPlayerName(trimmed.toUpperCase());
                const label = document.getElementById("ctrl-label-a");
                if (label) label.textContent = trimmed.toUpperCase() + ":";
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

    if (e.key === "n" || e.key === "N") {
        enterNameMode();
    } else if (e.key === "r" || e.key === "R") {
        resetStats();
    } else if (e.key === "Escape") {
        showScreen("screen-menu");
    }
}
