// ========== RETRO SCORE KEEPER ==========

const KEEPER_W = 60;
const KEEPER_H = 28;
const KEEPER_STORAGE = "keeperScores";

const keeperGrid = ArcadeGrid(KEEPER_W, KEEPER_H);

const keeper = {
    scores: { a: 0, b: 0 },
    selected: "a"
};

function loadKeeperScores() {
    try {
        const saved = localStorage.getItem(KEEPER_STORAGE);
        if (saved) {
            const parsed = JSON.parse(saved);
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
    return function stopKeeper() {};
}

// Big ASCII digits (5 lines tall, 5 chars wide each)
const BIG_DIGITS = {
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
    const str = String(num);
    const rows = ["", "", "", "", ""];
    for (let i = 0; i < str.length; i++) {
        const d = BIG_DIGITS[str[i]] || BIG_DIGITS["0"];
        for (let r = 0; r < 5; r++) {
            rows[r] += d[r] + " ";
        }
    }
    return rows;
}

function drawBigNumber(num, startRow, centerCol) {
    const rows = getDigitLines(num);
    for (let r = 0; r < rows.length; r++) {
        const startC = centerCol - Math.floor(rows[r].length / 2);
        keeperGrid.text(rows[r], startRow + r, startC);
    }
}

function renderKeeper() {
    const g = keeperGrid;
    g.clear();

    // Top border + title
    g.text("+" + "=".repeat(KEEPER_W - 2) + "+", 0);
    g.text("|" + " ".repeat(KEEPER_W - 2) + "|", 1);
    g.text("S C O R E   K E E P E R", 1);
    g.text("|" + " ".repeat(KEEPER_W - 2) + "|", 2);
    g.text("|" + "=".repeat(KEEPER_W - 2) + "|", 3);

    const colA = Math.floor(KEEPER_W / 4);
    const colB = Math.floor(KEEPER_W * 3 / 4);

    // Side borders
    for (let r = 4; r < KEEPER_H - 1; r++) {
        g.set(r, 0, "|");
        g.set(r, KEEPER_W - 1, "|");
    }

    // Center divider
    const midCol = Math.floor(KEEPER_W / 2);
    for (let r = 4; r < 22; r++) {
        g.set(r, midCol, "|");
    }

    // Team labels
    const teamALabel = keeper.selected === "a" ? ">> TEAM  A <<" : "   TEAM  A   ";
    const teamBLabel = keeper.selected === "b" ? ">> TEAM  B <<" : "   TEAM  B   ";
    g.text(teamALabel, 5, colA - 6);
    g.text(teamBLabel, 5, colB - 6);
    if (keeper.selected === "a") {
        g.setGreen(5, colA - 6, ">");
        g.setGreen(5, colA - 5, ">");
    }
    if (keeper.selected === "b") {
        g.setGreen(5, colB - 6, ">");
        g.setGreen(5, colB - 5, ">");
    }

    // Big score numbers
    drawBigNumber(keeper.scores.a, 8, colA);
    drawBigNumber(keeper.scores.b, 8, colB);

    // Controls per team
    g.text("[W] +1  [S] -1", 15, colA - 7);
    g.text("[W] +1  [S] -1", 15, colB - 7);
    g.text("[Q] RESET", 16, colA - 4);
    g.text("[Q] RESET", 16, colB - 4);

    g.text("|" + "-".repeat(KEEPER_W - 2) + "|", 18);

    g.text("A/D or ARROWS: SELECT TEAM", 20);
    g.text("W/S: +1 / -1      Q: RESET TEAM", 21);
    g.text("R: RESET ALL      ESC: MENU", 22);

    g.text("|" + "-".repeat(KEEPER_W - 2) + "|", 24);
    g.text("|" + " ".repeat(KEEPER_W - 2) + "|", 25);
    g.text("C:\\SCORES>_", 25, 2);
    g.text("+" + "=".repeat(KEEPER_W - 2) + "+", KEEPER_H - 1);

    g.render("keeper-arena");
}

// ========== INPUT ==========
function handleKeeperKey(e) {
    e.preventDefault();

    const team = keeper.selected;

    switch (e.key) {
        case "ArrowLeft": case "a": case "A":
            keeper.selected = "a"; break;
        case "ArrowRight": case "d": case "D":
            keeper.selected = "b"; break;
        case "ArrowUp": case "w": case "W":
            keeper.scores[team] += 1; saveKeeperScores(); break;
        case "ArrowDown": case "s": case "S":
            if (keeper.scores[team] > 0) { keeper.scores[team] -= 1; saveKeeperScores(); }
            break;
        case "q": case "Q":
            keeper.scores[team] = 0; saveKeeperScores(); break;
        case "r": case "R":
            keeper.scores.a = 0; keeper.scores.b = 0; saveKeeperScores(); break;
        case "Escape":
            showScreen("screen-menu"); return;
    }

    renderKeeper();
}
