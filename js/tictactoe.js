// ========== ASCII TIC TAC TOE ENGINE ==========

var TTT_W = 70;
var TTT_H = 30;
var TTT_WIN_SCORE = 3; // first to 3 wins the match

var ttt = {
    running: false,
    board: [0, 0, 0, 0, 0, 0, 0, 0, 0], // 0=empty, 1=X(player), 2=O(cpu)
    cursor: 4, // selected cell (0-8)
    turn: 1, // 1=player, 2=cpu
    phase: "playing", // playing | round_end | match_end
    roundEndTimer: null,
    cpuTimer: null,
    wins: { player: 0, cpu: 0 },
    round: 1,
    message: "",
    blinkOn: true,
    blinkTimer: null
};

// Winning combinations
var WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6]              // diags
];

function initTicTacToe() {
    resetAll();
    ttt.running = true;
    ttt.wins = { player: 0, cpu: 0 };
    ttt.round = 1;
    startNewRound();

    // Cursor blink
    ttt.blinkTimer = setInterval(function () {
        ttt.blinkOn = !ttt.blinkOn;
        if (ttt.phase === "playing") renderTTT();
    }, 400);

    return function stopTicTacToe() {
        ttt.running = false;
        if (ttt.roundEndTimer) clearTimeout(ttt.roundEndTimer);
        if (ttt.cpuTimer) clearTimeout(ttt.cpuTimer);
        if (ttt.blinkTimer) clearInterval(ttt.blinkTimer);
    };
}

function startNewRound() {
    ttt.board = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    ttt.cursor = 4;
    ttt.turn = 1;
    ttt.phase = "playing";
    ttt.message = "ROUND " + ttt.round + "  -  YOUR TURN (X)";
    renderTTT();
}

// ========== AI (MINIMAX) ==========
function tttCheckWinner(board) {
    for (var i = 0; i < WIN_LINES.length; i++) {
        var a = WIN_LINES[i][0], b = WIN_LINES[i][1], c = WIN_LINES[i][2];
        if (board[a] !== 0 && board[a] === board[b] && board[b] === board[c]) {
            return { winner: board[a], line: WIN_LINES[i] };
        }
    }
    // Check draw
    var full = true;
    for (var j = 0; j < 9; j++) {
        if (board[j] === 0) { full = false; break; }
    }
    if (full) return { winner: 0, line: null }; // draw
    return null; // game continues
}

function minimax(board, isMaximizing, depth) {
    var result = tttCheckWinner(board);
    if (result !== null) {
        if (result.winner === 2) return 10 - depth; // CPU wins
        if (result.winner === 1) return depth - 10; // Player wins
        return 0; // draw
    }

    if (isMaximizing) {
        var best = -Infinity;
        for (var i = 0; i < 9; i++) {
            if (board[i] === 0) {
                board[i] = 2;
                var score = minimax(board, false, depth + 1);
                board[i] = 0;
                if (score > best) best = score;
            }
        }
        return best;
    } else {
        var best2 = Infinity;
        for (var j = 0; j < 9; j++) {
            if (board[j] === 0) {
                board[j] = 1;
                var score2 = minimax(board, true, depth + 1);
                board[j] = 0;
                if (score2 < best2) best2 = score2;
            }
        }
        return best2;
    }
}

function cpuMove() {
    // Make CPU beatable: 30% chance of random move
    if (Math.random() < 0.30) {
        var empties = [];
        for (var i = 0; i < 9; i++) {
            if (ttt.board[i] === 0) empties.push(i);
        }
        if (empties.length > 0) {
            return empties[Math.floor(Math.random() * empties.length)];
        }
    }

    var bestScore = -Infinity;
    var bestMove = -1;
    for (var j = 0; j < 9; j++) {
        if (ttt.board[j] === 0) {
            ttt.board[j] = 2;
            var score = minimax(ttt.board, false, 0);
            ttt.board[j] = 0;
            if (score > bestScore) {
                bestScore = score;
                bestMove = j;
            }
        }
    }
    return bestMove;
}

// ========== GAME LOGIC ==========
function tttPlaceMove(cell) {
    if (ttt.board[cell] !== 0 || ttt.phase !== "playing") return;

    ttt.board[cell] = ttt.turn;

    var result = tttCheckWinner(ttt.board);
    if (result !== null) {
        endTTTRound(result);
        return;
    }

    // Switch turns
    if (ttt.turn === 1) {
        ttt.turn = 2;
        ttt.message = "CPU IS THINKING...";
        renderTTT();

        // CPU plays after a short delay
        ttt.cpuTimer = setTimeout(function () {
            if (!ttt.running || ttt.phase !== "playing") return;
            var move = cpuMove();
            if (move >= 0) {
                tttPlaceMove(move);
            }
        }, 400 + Math.random() * 400);
    } else {
        ttt.turn = 1;
        ttt.message = "YOUR TURN (X)";
        renderTTT();
    }
}

function endTTTRound(result) {
    ttt.phase = "round_end";

    if (result.winner === 1) {
        ttt.message = "** YOU WIN THIS ROUND! **";
        increment("a");
        ttt.wins.player++;
    } else if (result.winner === 2) {
        ttt.message = "** CPU WINS THIS ROUND! **";
        increment("b");
        ttt.wins.cpu++;
    } else {
        ttt.message = "** IT'S A DRAW! **";
    }

    renderTTT();

    // Check match end
    if (ttt.wins.player >= TTT_WIN_SCORE || ttt.wins.cpu >= TTT_WIN_SCORE) {
        if (typeof recordMatchResult === "function") recordMatchResult("ttt");
        ttt.roundEndTimer = setTimeout(function () {
            ttt.phase = "match_end";
            if (ttt.wins.player >= TTT_WIN_SCORE) {
                ttt.message = "=== YOU WIN THE MATCH! ===";
            } else {
                ttt.message = "=== CPU WINS THE MATCH! ===";
            }
            renderTTT();
        }, 1800);
    } else {
        ttt.roundEndTimer = setTimeout(function () {
            ttt.round++;
            startNewRound();
        }, 1800);
    }
}

// ========== BIG SYMBOLS ==========
var BIG_X = [
    "\\   /",
    " \\ / ",
    "  X  ",
    " / \\ ",
    "/   \\"
];

var BIG_O = [
    " --- ",
    "/   \\",
    "|   |",
    "\\   /",
    " --- "
];

var BIG_EMPTY = [
    "     ",
    "     ",
    "     ",
    "     ",
    "     "
];

function getBigSymbol(val) {
    if (val === 1) return BIG_X;
    if (val === 2) return BIG_O;
    return BIG_EMPTY;
}

// ========== RENDERING ==========
function makeTTTGrid() {
    var grid = [];
    for (var r = 0; r < TTT_H; r++) {
        grid[r] = [];
        for (var c = 0; c < TTT_W; c++) {
            grid[r][c] = " ";
        }
    }
    return grid;
}

function tttGridToString(grid) {
    var lines = [];
    for (var r = 0; r < TTT_H; r++) {
        lines.push(grid[r].join(""));
    }
    return lines.join("\n");
}

function drawTTTText(grid, text, row) {
    var startCol = Math.floor((TTT_W - text.length) / 2);
    for (var i = 0; i < text.length; i++) {
        var c = startCol + i;
        if (c >= 0 && c < TTT_W && row >= 0 && row < TTT_H) {
            grid[row][c] = text[i];
        }
    }
}

function drawBigSymbol(grid, symbol, startRow, startCol) {
    for (var r = 0; r < symbol.length; r++) {
        for (var c = 0; c < symbol[r].length; c++) {
            var gr = startRow + r;
            var gc = startCol + c;
            if (gr >= 0 && gr < TTT_H && gc >= 0 && gc < TTT_W) {
                if (symbol[r][c] !== " ") {
                    grid[gr][gc] = symbol[r][c];
                }
            }
        }
    }
}

function renderTTT() {
    var grid = makeTTTGrid();

    // Title
    drawTTTText(grid, "T I C   T A C   T O E", 1);

    // Score
    var pName = typeof getPlayerName === "function" ? getPlayerName() : "PLAYER";
    var scoreText = pName + "(X): " + ttt.wins.player + "  |  CPU(O): " + ttt.wins.cpu + "  |  First to " + TTT_WIN_SCORE;
    drawTTTText(grid, scoreText, 3);

    // Board dimensions: each cell is 7 wide x 7 tall, separators are 1 char
    var cellW = 7;
    var cellH = 7;
    var boardW = cellW * 3 + 2; // 23
    var boardH = cellH * 3 + 2; // 23
    var boardTop = 5;
    var boardLeft = Math.floor((TTT_W - boardW) / 2);

    // Draw grid lines
    for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 3; c++) {
            var cellTop = boardTop + r * (cellH + 1);
            var cellLeft = boardLeft + c * (cellW + 1);

            // Draw big symbol centered in cell
            var sym = getBigSymbol(ttt.board[r * 3 + c]);
            var symTop = cellTop + 1;
            var symLeft = cellLeft + 1;
            drawBigSymbol(grid, sym, symTop, symLeft);
        }
    }

    // Draw horizontal separators
    for (var sep = 0; sep < 2; sep++) {
        var sepRow = boardTop + (sep + 1) * cellH + sep;
        for (var x = boardLeft; x < boardLeft + boardW; x++) {
            if (sepRow < TTT_H && x < TTT_W) {
                grid[sepRow][x] = "-";
            }
        }
    }

    // Draw vertical separators
    for (var sep2 = 0; sep2 < 2; sep2++) {
        var sepCol = boardLeft + (sep2 + 1) * cellW + sep2;
        for (var y = boardTop; y < boardTop + boardH; y++) {
            if (y < TTT_H && sepCol < TTT_W) {
                if (grid[y][sepCol] === "-") {
                    grid[y][sepCol] = "+";
                } else {
                    grid[y][sepCol] = "|";
                }
            }
        }
    }

    // Draw cursor (blinking highlight around selected cell)
    if (ttt.phase === "playing" && ttt.turn === 1 && ttt.blinkOn) {
        var crow = Math.floor(ttt.cursor / 3);
        var ccol = ttt.cursor % 3;
        var curTop = boardTop + crow * (cellH + 1);
        var curLeft = boardLeft + ccol * (cellW + 1);

        // Draw corner brackets
        if (curTop >= 0 && curTop < TTT_H) {
            if (curLeft >= 0 && curLeft < TTT_W) grid[curTop][curLeft] = "[";
            if (curLeft + cellW - 1 < TTT_W) grid[curTop][curLeft + cellW - 1] = "]";
        }
        var botRow = curTop + cellH - 1;
        if (botRow >= 0 && botRow < TTT_H) {
            if (curLeft >= 0 && curLeft < TTT_W) grid[botRow][curLeft] = "[";
            if (curLeft + cellW - 1 < TTT_W) grid[botRow][curLeft + cellW - 1] = "]";
        }
    }

    // Highlight winning line
    if (ttt.phase === "round_end" || ttt.phase === "match_end") {
        var result = tttCheckWinner(ttt.board);
        if (result && result.line) {
            for (var w = 0; w < result.line.length; w++) {
                var wi = result.line[w];
                var wr = Math.floor(wi / 3);
                var wc = wi % 3;
                var winTop = boardTop + wr * (cellH + 1);
                var winLeft = boardLeft + wc * (cellW + 1);

                // Draw star markers in corners
                if (winTop >= 0 && winTop < TTT_H && winLeft >= 0 && winLeft < TTT_W) {
                    grid[winTop][winLeft] = "*";
                }
                if (winTop >= 0 && winTop < TTT_H && winLeft + cellW - 1 < TTT_W) {
                    grid[winTop][winLeft + cellW - 1] = "*";
                }
                var wBot = winTop + cellH - 1;
                if (wBot >= 0 && wBot < TTT_H && winLeft >= 0 && winLeft < TTT_W) {
                    grid[wBot][winLeft] = "*";
                }
                if (wBot >= 0 && wBot < TTT_H && winLeft + cellW - 1 < TTT_W) {
                    grid[wBot][winLeft + cellW - 1] = "*";
                }
            }
        }
    }

    // Message
    drawTTTText(grid, ttt.message, boardTop + boardH + 1);

    // Controls
    if (ttt.phase === "playing") {
        drawTTTText(grid, "WASD/ARROWS: MOVE    ENTER/SPACE: PLACE", boardTop + boardH + 3);
    } else if (ttt.phase === "match_end") {
        drawTTTText(grid, "FINAL: YOU " + ttt.wins.player + " - " + ttt.wins.cpu + " CPU", boardTop + boardH + 3);
        drawTTTText(grid, "ENTER: MENU", boardTop + boardH + 4);
    }

    document.getElementById("ttt-arena").textContent = tttGridToString(grid);
}

// ========== INPUT ==========
function handleTTTKey(e) {
    if (!ttt.running) return;

    // Prevent page scroll for game keys
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) !== -1) {
        e.preventDefault();
    }

    // Match end - enter returns to menu
    if (ttt.phase === "match_end" && e.key === "Enter") {
        showScreen("screen-menu");
        return;
    }

    // Only accept input during player turn
    if (ttt.phase !== "playing" || ttt.turn !== 1) return;

    var row = Math.floor(ttt.cursor / 3);
    var col = ttt.cursor % 3;

    switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
            if (row > 0) ttt.cursor -= 3;
            renderTTT();
            break;
        case "ArrowDown":
        case "s":
        case "S":
            if (row < 2) ttt.cursor += 3;
            renderTTT();
            break;
        case "ArrowLeft":
        case "a":
        case "A":
            if (col > 0) ttt.cursor -= 1;
            renderTTT();
            break;
        case "ArrowRight":
        case "d":
        case "D":
            if (col < 2) ttt.cursor += 1;
            renderTTT();
            break;
        case "Enter":
        case " ":
            tttPlaceMove(ttt.cursor);
            break;
    }
}
