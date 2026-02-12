// ========== SHARED ASCII GRID UTILITY ==========

function ArcadeGrid(width, height) {
    const cells = [];
    const highlights = [];
    let hasHighlights = false;
    for (let r = 0; r < height; r++) {
        cells[r] = new Array(width);
        highlights[r] = new Array(width);
    }

    function clear() {
        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                cells[r][c] = " ";
                highlights[r][c] = false;
            }
        }
        hasHighlights = false;
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

    // Write text at (row, col). If col omitted, center in full grid width.
    function text(str, row, col) {
        if (col === undefined) col = Math.floor((width - str.length) / 2);
        for (let i = 0; i < str.length; i++) {
            set(row, col + i, str[i]);
        }
    }

    // Write text within inner bounds (1..w-2, rows 1..h-2) for bordered games.
    // If col omitted, center in full grid width.
    function textInner(str, row, col) {
        if (row < 1 || row > height - 2) return;
        if (col === undefined) col = Math.floor((width - str.length) / 2);
        for (let i = 0; i < str.length; i++) {
            const c = col + i;
            if (c >= 1 && c <= width - 2) {
                cells[row][c] = str[i];
            }
        }
    }

    // Write centered text in a border row, preserving corners (col 0 and col w-1).
    function borderText(str, row) {
        const startCol = Math.floor((width - str.length) / 2);
        for (let i = 0; i < str.length; i++) {
            const c = startCol + i;
            if (c > 0 && c < width - 1) {
                cells[row][c] = str[i];
            }
        }
    }

    // Draw standard +/-/| box border.
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
    function sprite(lines, startRow, startCol) {
        for (let r = 0; r < lines.length; r++) {
            const line = lines[r];
            for (let c = 0; c < line.length; c++) {
                if (line[c] !== " ") {
                    set(startRow + r, startCol + c, line[c]);
                }
            }
        }
    }

    function setGreen(row, col, ch) {
        set(row, col, ch);
        if (row >= 0 && row < height && col >= 0 && col < width) {
            highlights[row][col] = true;
            hasHighlights = true;
        }
    }

    function textGreen(str, row, col) {
        if (col === undefined) col = Math.floor((width - str.length) / 2);
        for (let i = 0; i < str.length; i++) {
            setGreen(row, col + i, str[i]);
        }
    }

    function textInnerGreen(str, row, col) {
        if (row < 1 || row > height - 2) return;
        if (col === undefined) col = Math.floor((width - str.length) / 2);
        for (let i = 0; i < str.length; i++) {
            const c = col + i;
            if (c >= 1 && c <= width - 2) {
                cells[row][c] = str[i];
                highlights[row][c] = true;
                hasHighlights = true;
            }
        }
    }

    function toString() {
        let out = "";
        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                out += cells[r][c];
            }
            if (r < height - 1) out += "\n";
        }
        return out;
    }

    function render(elementId) {
        const el = document.getElementById(elementId);
        if (!el) return;
        if (hasHighlights) {
            let html = "";
            for (let r = 0; r < height; r++) {
                let inGreen = false;
                for (let c = 0; c < width; c++) {
                    const ch = cells[r][c];
                    const esc = ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch === "&" ? "&amp;" : ch;
                    if (highlights[r][c] && !inGreen) {
                        html += '<span class="green">';
                        inGreen = true;
                    } else if (!highlights[r][c] && inGreen) {
                        html += '</span>';
                        inGreen = false;
                    }
                    html += esc;
                }
                if (inGreen) html += '</span>';
                if (r < height - 1) html += "\n";
            }
            el.innerHTML = html;
        } else {
            el.textContent = toString();
        }
    }

    clear();

    return {
        w: width, h: height, cells: cells,
        clear: clear, set: set, get: get,
        text: text, textInner: textInner, borderText: borderText,
        borders: borders, sprite: sprite,
        setGreen: setGreen, textGreen: textGreen, textInnerGreen: textInnerGreen,
        toString: toString, render: render
    };
}
