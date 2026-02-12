// ========== SHARED ASCII GRID UTILITY ==========
// Factory for creating and manipulating character grids used by all games.
// Usage: const grid = ArcadeGrid(width, height);

function ArcadeGrid(width, height) {
    const cells = [];
    for (let r = 0; r < height; r++) {
        cells[r] = new Array(width);
    }

    function clear() {
        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                cells[r][c] = " ";
            }
        }
    }

    function set(row, col, ch) {
        if (row >= 0 && row < height && col >= 0 && col < width) {
            cells[row][col] = ch;
        }
    }

    function get(row, col) {
        if (row >= 0 && row < height && col >= 0 && col < width) {
            return cells[row][col];
        }
        return " ";
    }

    // Draw text. Centered if col is omitted. Full bounds.
    function text(str, row, col) {
        const start = (col !== undefined) ? col : Math.floor((width - str.length) / 2);
        for (let i = 0; i < str.length; i++) {
            set(row, start + i, str[i]);
        }
    }

    // Draw text inside borders only (rows 1..h-2, cols 1..w-2).
    function textInner(str, row, col) {
        const start = (col !== undefined) ? col : Math.floor((width - str.length) / 2);
        for (let i = 0; i < str.length; i++) {
            const c = start + i;
            if (c > 0 && c < width - 1 && row > 0 && row < height - 1) {
                cells[row][c] = str[i];
            }
        }
    }

    // Draw centered text with column bounds restricted (preserves corner chars).
    function borderText(str, row) {
        const start = Math.floor((width - str.length) / 2);
        for (let i = 0; i < str.length; i++) {
            const c = start + i;
            if (c > 0 && c < width - 1 && row >= 0 && row < height) {
                cells[row][c] = str[i];
            }
        }
    }

    // Draw standard box border (+, -, |).
    function borders() {
        for (let c = 0; c < width; c++) {
            cells[0][c] = "-";
            cells[height - 1][c] = "-";
        }
        for (let r = 0; r < height; r++) {
            cells[r][0] = "|";
            cells[r][width - 1] = "|";
        }
        cells[0][0] = "+";
        cells[0][width - 1] = "+";
        cells[height - 1][0] = "+";
        cells[height - 1][width - 1] = "+";
    }

    // Draw multi-line ASCII art. Spaces are skipped (transparent).
    function sprite(art, startRow, startCol) {
        for (let r = 0; r < art.length; r++) {
            for (let c = 0; c < art[r].length; c++) {
                if (art[r][c] !== " ") {
                    set(startRow + r, startCol + c, art[r][c]);
                }
            }
        }
    }

    function toString() {
        const lines = [];
        for (let r = 0; r < height; r++) {
            lines[r] = cells[r].join("");
        }
        return lines.join("\n");
    }

    function render(elementId) {
        document.getElementById(elementId).textContent = toString();
    }

    return {
        w: width,
        h: height,
        cells: cells,
        clear: clear,
        set: set,
        get: get,
        text: text,
        textInner: textInner,
        borderText: borderText,
        borders: borders,
        sprite: sprite,
        toString: toString,
        render: render
    };
}
