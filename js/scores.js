// ========== SCOREBOARD SCREEN ==========

var scoresMode = "view"; // "view" or "nameEntry"
var nameBuffer = "";

var BOARD_W = 50; // inner width of the ASCII box

function padLine(content) {
    var inner = "  " + content;
    while (inner.length < BOARD_W) {
        inner += " ";
    }
    if (inner.length > BOARD_W) {
        inner = inner.substring(0, BOARD_W);
    }
    return "  |" + inner + "|";
}

function emptyLine() {
    return padLine("");
}

function dividerLine() {
    return "  |" + "-".repeat(BOARD_W) + "|";
}

function barLine() {
    return "  +" + "=".repeat(BOARD_W) + "+";
}

function separatorLine() {
    return "  |" + "=".repeat(BOARD_W) + "|";
}

function initScoreboard() {
    scoresMode = "view";
    nameBuffer = "";
    // Update the player label on the controls
    var label = document.getElementById("ctrl-label-a");
    if (label) {
        var n = loadArcadeData().playerName;
        label.textContent = n + ":";
    }
    renderScoreboard();
}

function renderScoreboard() {
    var data = loadArcadeData();
    var name = data.playerName;
    var lines = [];

    lines.push("");
    lines.push(barLine());
    lines.push(emptyLine());
    lines.push(padLine("   S C O R E B O A R D"));
    lines.push(emptyLine());
    lines.push(separatorLine());

    // Player name section
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

    // ---- LIVE SCORE ----
    lines.push(dividerLine());
    lines.push(emptyLine());
    lines.push(padLine("CURRENT SCORE"));
    lines.push(emptyLine());
    var sa = String(scores.a).padStart(2, " ");
    var sb = String(scores.b).padStart(2, " ");
    lines.push(padLine("       " + name + "  " + sa + "  -  " + sb + "  CPU"));
    lines.push(emptyLine());

    // ---- PONG SECTION ----
    lines.push(dividerLine());
    lines.push(emptyLine());
    lines.push(padLine("PONG"));
    lines.push(emptyLine());

    var pw = data.pong.playerWins;
    var cw = data.pong.cpuWins;
    lines.push(padLine("TOTAL WINS:  " + name + " " + pw + "  -  " + cw + " CPU"));

    if (data.pong.lastMatch) {
        var lm = data.pong.lastMatch;
        lines.push(padLine("LAST MATCH:  " + name + " " + lm.playerScore + "  -  " + lm.cpuScore + " CPU"));
        var winText = lm.winner === "player" ? name + " WINS!" : "CPU WINS!";
        lines.push(padLine("             " + winText));
    } else {
        lines.push(padLine("LAST MATCH:  NO MATCHES YET"));
    }

    lines.push(emptyLine());

    // ---- TIC TAC TOE SECTION ----
    lines.push(dividerLine());
    lines.push(emptyLine());
    lines.push(padLine("TIC TAC TOE"));
    lines.push(emptyLine());

    var tpw = data.ttt ? data.ttt.playerWins : 0;
    var tcw = data.ttt ? data.ttt.cpuWins : 0;
    lines.push(padLine("TOTAL WINS:  " + name + " " + tpw + "  -  " + tcw + " CPU"));

    if (data.ttt && data.ttt.lastMatch) {
        var tlm = data.ttt.lastMatch;
        lines.push(padLine("LAST MATCH:  " + name + " " + tlm.playerScore + "  -  " + tlm.cpuScore + " CPU"));
        var tWinText = tlm.winner === "player" ? name + " WINS!" : "CPU WINS!";
        lines.push(padLine("             " + tWinText));
    } else {
        lines.push(padLine("LAST MATCH:  NO MATCHES YET"));
    }

    lines.push(emptyLine());

    // ---- BINGO SECTION ----
    lines.push(dividerLine());
    lines.push(emptyLine());
    lines.push(padLine("BINGO"));
    lines.push(emptyLine());

    var bpw = data.bingo ? data.bingo.playerWins : 0;
    var bcw = data.bingo ? data.bingo.cpuWins : 0;
    lines.push(padLine("TOTAL WINS:  " + name + " " + bpw + "  -  " + bcw + " CPU"));

    if (data.bingo && data.bingo.lastMatch) {
        var blm = data.bingo.lastMatch;
        lines.push(padLine("LAST MATCH:  " + name + " " + blm.playerScore + "  -  " + blm.cpuScore + " CPU"));
        var bWinText = blm.winner === "player" ? name + " WINS!" : "CPU WINS!";
        lines.push(padLine("             " + bWinText));
    } else {
        lines.push(padLine("LAST MATCH:  NO MATCHES YET"));
    }

    lines.push(emptyLine());

    // ---- SNAKE SECTION ----
    lines.push(dividerLine());
    lines.push(emptyLine());
    lines.push(padLine("SNAKE"));
    lines.push(emptyLine());

    var snakeData = data.snake || { bestScore: 0, gamesPlayed: 0, lastScore: 0 };
    lines.push(padLine("GAMES PLAYED:  " + snakeData.gamesPlayed));
    lines.push(padLine("BEST SCORE:    " + snakeData.bestScore));
    if (snakeData.lastScore > 0) {
        lines.push(padLine("LAST SCORE:    " + snakeData.lastScore));
    } else {
        lines.push(padLine("LAST SCORE:    NO GAMES YET"));
    }

    lines.push(emptyLine());
    lines.push(barLine());

    document.getElementById("scores-art").textContent = lines.join("\n");
}

// ========== INTERACTIVE BUTTON HANDLERS ==========
function scoreIncrement(team) {
    increment(team);
    renderScoreboard();
}

function scoreDecrement(team) {
    decrement(team);
    renderScoreboard();
}

function scoreReset(team) {
    reset(team);
    renderScoreboard();
}

function scoreResetAll() {
    resetAll();
    renderScoreboard();
}

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
            var trimmed = nameBuffer.trim();
            if (trimmed.length > 0) {
                setPlayerName(trimmed.toUpperCase());
                // Update the control label
                var label = document.getElementById("ctrl-label-a");
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

    // Normal view mode
    if (e.key === "n" || e.key === "N") {
        enterNameMode();
    } else if (e.key === "r" || e.key === "R") {
        resetStats();
    } else if (e.key === "Escape") {
        showScreen("screen-menu");
    }
}
