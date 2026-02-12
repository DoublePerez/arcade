// ========== RETRO SCORE KEEPER ==========

var KEEPER_W = 60;
var KEEPER_H = 28;
var KEEPER_STORAGE = "keeperScores";

var keeper = {
    scores: { a: 0, b: 0 },
    selected: "a" // which team is selected
};

function loadKeeperScores() {
    try {
        var saved = localStorage.getItem(KEEPER_STORAGE);
        if (saved) {
            var parsed = JSON.parse(saved);
            keeper.scores.a = parsed.a || 0;
            keeper.scores.b = parsed.b || 0;
        }
    } catch (e) {
        keeper.scores.a = 0;
        keeper.scores.b = 0;
    }
}

function saveKeeperScores() {
    localStorage.setItem(KEEPER_STORAGE, JSON.stringify(keeper.scores));
}

function initKeeper() {
    loadKeeperScores();
    keeper.selected = "a";
    renderKeeper();

    return function stopKeeper() {
        // no timers to clean up
    };
}

// Big ASCII digits (5 lines tall, 5 chars wide each)
var BIG_DIGITS = {
    "0": [" ___ ", "|   |", "|   |", "|   |", "|___|"],
    "1": ["  _  ", " | | ", "   | ", "   | ", "  _|_"],
    "2": [" ___ ", "|   |", "  _/ ", " /   ", "|___|"],
    "3": [" ___ ", "    |", " ---|", "    |", " ___|"],
    "4": ["     ", "|   |", "|___|", "    |", "    |"],
    "5": [" ___ ", "|    ", "|___ ", "    |", " ___|"],
    "6": [" ___ ", "|    ", "|___ ", "|   |", "|___|"],
    "7": [" ___ ", "    |", "   / ", "  /  ", " /   "],
    "8": [" ___ ", "|   |", "|___|", "|   |", "|___|"],
    "9": [" ___ ", "|   |", "|___|", "    |", " ___|"]
};

function getDigitLines(num) {
    var str = String(num);
    // Build 5 rows by concatenating digit art side by side
    var rows = ["", "", "", "", ""];
    for (var i = 0; i < str.length; i++) {
        var d = BIG_DIGITS[str[i]];
        if (!d) d = BIG_DIGITS["0"];
        for (var r = 0; r < 5; r++) {
            rows[r] += d[r] + " ";
        }
    }
    return rows;
}

function makeKeeperGrid() {
    var grid = [];
    for (var r = 0; r < KEEPER_H; r++) {
        grid[r] = [];
        for (var c = 0; c < KEEPER_W; c++) {
            grid[r][c] = " ";
        }
    }
    return grid;
}

function keeperGridToString(grid) {
    var lines = [];
    for (var r = 0; r < KEEPER_H; r++) {
        lines.push(grid[r].join(""));
    }
    return lines.join("\n");
}

function drawKeeperText(grid, text, row, col) {
    var startCol = col !== undefined ? col : Math.floor((KEEPER_W - text.length) / 2);
    for (var i = 0; i < text.length; i++) {
        var c = startCol + i;
        if (c >= 0 && c < KEEPER_W && row >= 0 && row < KEEPER_H) {
            grid[row][c] = text[i];
        }
    }
}

function drawBigNumber(grid, num, startRow, centerCol) {
    var rows = getDigitLines(num);
    for (var r = 0; r < rows.length; r++) {
        var text = rows[r];
        var startC = centerCol - Math.floor(text.length / 2);
        for (var c = 0; c < text.length; c++) {
            var gc = startC + c;
            var gr = startRow + r;
            if (gr >= 0 && gr < KEEPER_H && gc >= 0 && gc < KEEPER_W) {
                grid[gr][gc] = text[c];
            }
        }
    }
}

function renderKeeper() {
    var grid = makeKeeperGrid();

    // Top border
    drawKeeperText(grid, "+" + "=".repeat(KEEPER_W - 2) + "+", 0);

    // Title
    drawKeeperText(grid, "|" + " ".repeat(KEEPER_W - 2) + "|", 1);
    drawKeeperText(grid, "S C O R E   K E E P E R", 1);
    drawKeeperText(grid, "|" + " ".repeat(KEEPER_W - 2) + "|", 2);

    // Separator
    drawKeeperText(grid, "|" + "=".repeat(KEEPER_W - 2) + "|", 3);

    // Team A header
    var teamALabel = keeper.selected === "a" ? ">> TEAM  A <<" : "   TEAM  A   ";
    var teamBLabel = keeper.selected === "b" ? ">> TEAM  B <<" : "   TEAM  B   ";

    var colA = Math.floor(KEEPER_W / 4);
    var colB = Math.floor(KEEPER_W * 3 / 4);

    // Side borders for rows 4-22
    for (var r = 4; r < KEEPER_H - 1; r++) {
        grid[r][0] = "|";
        grid[r][KEEPER_W - 1] = "|";
    }

    // Center divider
    var midCol = Math.floor(KEEPER_W / 2);
    for (var r2 = 4; r2 < 22; r2++) {
        grid[r2][midCol] = "|";
    }

    drawKeeperText(grid, teamALabel, 5, colA - 6);
    drawKeeperText(grid, teamBLabel, 5, colB - 6);

    // Big score numbers
    drawBigNumber(grid, keeper.scores.a, 8, colA);
    drawBigNumber(grid, keeper.scores.b, 8, colB);

    // Controls per team
    drawKeeperText(grid, "[W] +1  [S] -1", 15, colA - 7);
    drawKeeperText(grid, "[W] +1  [S] -1", 15, colB - 7);
    drawKeeperText(grid, "[Q] RESET", 16, colA - 4);
    drawKeeperText(grid, "[Q] RESET", 16, colB - 4);

    // Divider
    drawKeeperText(grid, "|" + "-".repeat(KEEPER_W - 2) + "|", 18);

    // Selector hint
    drawKeeperText(grid, "A/D or ARROWS: SELECT TEAM", 20);
    drawKeeperText(grid, "W/S: +1 / -1      Q: RESET TEAM", 21);
    drawKeeperText(grid, "R: RESET ALL      ESC: MENU", 22);

    // Bottom border
    drawKeeperText(grid, "|" + "-".repeat(KEEPER_W - 2) + "|", 24);
    drawKeeperText(grid, "|" + " ".repeat(KEEPER_W - 2) + "|", 25);
    drawKeeperText(grid, "C:\\SCORES>_", 25, 2);
    drawKeeperText(grid, "+" + "=".repeat(KEEPER_W - 2) + "+", KEEPER_H - 1);

    document.getElementById("keeper-arena").textContent = keeperGridToString(grid);
}

// ========== INPUT ==========
function handleKeeperKey(e) {
    e.preventDefault();

    var team = keeper.selected;

    switch (e.key) {
        // Select team
        case "ArrowLeft":
        case "a":
        case "A":
            keeper.selected = "a";
            break;
        case "ArrowRight":
        case "d":
        case "D":
            keeper.selected = "b";
            break;

        // Increment
        case "ArrowUp":
        case "w":
        case "W":
            keeper.scores[team] += 1;
            saveKeeperScores();
            break;

        // Decrement
        case "ArrowDown":
        case "s":
        case "S":
            if (keeper.scores[team] > 0) {
                keeper.scores[team] -= 1;
                saveKeeperScores();
            }
            break;

        // Reset selected team
        case "q":
        case "Q":
            keeper.scores[team] = 0;
            saveKeeperScores();
            break;

        // Reset all
        case "r":
        case "R":
            keeper.scores.a = 0;
            keeper.scores.b = 0;
            saveKeeperScores();
            break;

        // Back to menu
        case "Escape":
            showScreen("screen-menu");
            return;
    }

    renderKeeper();
}
