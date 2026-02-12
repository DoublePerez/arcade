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

// Big ASCII digits (5 lines tall, 7 chars wide each)
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

    // Top border + title + subtitle
    g.text("+" + "=".repeat(KEEPER_W - 2) + "+", 0);
    g.text("|" + " ".repeat(KEEPER_W - 2) + "|", 1);
    g.text("|" + " ".repeat(KEEPER_W - 2) + "|", 2);
    g.text("|" + " ".repeat(KEEPER_W - 2) + "|", 3);
    const title = "S C O R E   K E E P E R";
    const titleCol = 1 + Math.floor((KEEPER_W - 2 - title.length) / 2);
    g.text(title, 1, titleCol);
    const subtitle = "Track points for any game";
    const subCol = 1 + Math.floor((KEEPER_W - 2 - subtitle.length) / 2);
    g.text(subtitle, 3, subCol);
    g.text("|" + "=".repeat(KEEPER_W - 2) + "|", 4);

    const colA = Math.floor(KEEPER_W / 4);
    const colB = Math.floor(KEEPER_W * 3 / 4);

    // Side borders
    for (let r = 5; r < KEEPER_H - 1; r++) {
        g.set(r, 0, "|");
        g.set(r, KEEPER_W - 1, "|");
    }

    // Center divider
    const midCol = Math.floor(KEEPER_W / 2);
    for (let r = 5; r < 15; r++) {
        g.set(r, midCol, "|");
    }

    // Team labels
    const teamALabel = keeper.selected === "a" ? ">> TEAM  A <<" : "   TEAM  A   ";
    const teamBLabel = keeper.selected === "b" ? ">> TEAM  B <<" : "   TEAM  B   ";
    g.text(teamALabel, 6, colA - 6);
    g.text(teamBLabel, 6, colB - 6);
    if (keeper.selected === "a") {
        g.setGreen(6, colA - 6, ">");
        g.setGreen(6, colA - 5, ">");
    }
    if (keeper.selected === "b") {
        g.setGreen(6, colB - 6, ">");
        g.setGreen(6, colB - 5, ">");
    }

    // Big score numbers
    drawBigNumber(keeper.scores.a, 9, colA);
    drawBigNumber(keeper.scores.b, 9, colB);

    g.text("|" + "-".repeat(KEEPER_W - 2) + "|", 15);

    // Controls - two columns
    g.text("CONTROLS:", 17, 4);
    g.text("LEFT/RIGHT  Select Team", 19, 4);
    g.text("UP / W      +1 Point",    20, 4);
    g.text("DOWN / S    -1 Point",    21, 4);
    g.text("Q           Reset Team",  19, 33);
    g.text("R           Reset All",   20, 33);

    g.text("|" + "-".repeat(KEEPER_W - 2) + "|", 23);

    // ESC hint - centered
    g.text("|" + " ".repeat(KEEPER_W - 2) + "|", 24);
    g.text("|" + " ".repeat(KEEPER_W - 2) + "|", 25);
    g.text("|" + " ".repeat(KEEPER_W - 2) + "|", 26);
    const escText = "[ESC] BACK TO MENU";
    const escCol = Math.floor((KEEPER_W - escText.length) / 2);
    g.text(escText, 25, escCol);

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
