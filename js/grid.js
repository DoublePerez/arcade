/**
 * ============================================================================
 *  GRID.JS — Shared ASCII Grid Renderer
 * ============================================================================
 *
 *  Every game screen in the arcade draws into an ArcadeGrid.
 *  Think of it as a tiny framebuffer made of characters instead of pixels.
 *
 *  Usage:
 *    const g = ArcadeGrid(60, 25);   // 60 columns x 25 rows
 *    g.clear();
 *    g.borders();                     // draw a +═══+ box
 *    g.text("HELLO", 5);             // center "HELLO" on row 5
 *    g.setGreen(10, 20, "*");        // place a green-highlighted "*"
 *    g.render("my-arena");           // flush to <pre id="my-arena">
 *
 *  API summary:
 *    clear()                — fill every cell with " "
 *    set(row, col, ch)      — place a character
 *    get(row, col)           — read a character
 *    text(str, row, col?)   — write text (auto-centered if col omitted)
 *    textInner(str, row, col?) — like text() but clipped to inner border area
 *    borderText(str, row)   — center text on a border row, preserving corners
 *    borders()              — draw a standard +/═/| box frame
 *    sprite(lines, row, col)— draw multi-line ASCII art (spaces = transparent)
 *    setGreen(row, col, ch) — place a green-highlighted character
 *    textGreen(str, row, col?) — write an entire string in green
 *    toString()             — return the grid as a plain string
 *    render(elementId)      — flush to a DOM <pre>, with green <span>s if needed
 *
 *  Must be loaded before all other JS files (first <script> in index.html).
 * ============================================================================
 */

function ArcadeGrid(width, height) {

    /* ── Internal storage ─────────────────────────────────────────────── */

    const cells = [];           // 2D array of characters
    const highlights = [];      // 2D boolean array — true = render in green
    let hasHighlights = false;  // fast-path flag: skip HTML generation when no green

    for (let r = 0; r < height; r++) {
        cells[r] = new Array(width);
        highlights[r] = new Array(width);
    }

    /* ── Core cell operations ─────────────────────────────────────────── */

    /** Reset every cell to " " and clear all highlights. */
    function clear() {
        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                cells[r][c] = " ";
                highlights[r][c] = false;
            }
        }
        hasHighlights = false;
    }

    /** Place a single character at (row, col). Out-of-bounds writes are ignored. */
    function set(row, col, ch) {
        if (row >= 0 && row < height && col >= 0 && col < width) {
            cells[row][col] = ch;
        }
    }

    /** Read the character at (row, col). Returns " " if out of bounds. */
    function get(row, col) {
        if (row >= 0 && row < height && col >= 0 && col < width) {
            return cells[row][col];
        }
        return " ";
    }

    /* ── Text placement ───────────────────────────────────────────────── */

    /** Write a string starting at (row, col). If col is omitted, center horizontally. */
    function text(str, row, col) {
        if (col === undefined) col = Math.floor((width - str.length) / 2);
        for (let i = 0; i < str.length; i++) {
            set(row, col + i, str[i]);
        }
    }

    /**
     * Write text clipped to the inner border area (columns 1..w-2, rows 1..h-2).
     * Useful for placing text inside a bordered game arena.
     * If col is omitted, center horizontally across the full width.
     */
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

    /**
     * Center text on a border row while preserving the corner characters
     * at column 0 and column (width - 1).
     */
    function borderText(str, row) {
        const startCol = Math.floor((width - str.length) / 2);
        for (let i = 0; i < str.length; i++) {
            const c = startCol + i;
            if (c > 0 && c < width - 1) {
                cells[row][c] = str[i];
            }
        }
    }

    /* ── Border drawing ───────────────────────────────────────────────── */

    /** Draw a standard box border: + corners, = top/bottom, | sides. */
    function borders() {
        for (let c = 0; c < width; c++) {
            cells[0][c] = "=";
            cells[height - 1][c] = "=";
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

    /* ── Sprite drawing ───────────────────────────────────────────────── */

    /**
     * Draw multi-line ASCII art at (startRow, startCol).
     * Spaces in the sprite are transparent (underlying cells show through).
     */
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

    /* ── Green highlighting ───────────────────────────────────────────── */

    /** Place a character and mark it for green rendering. */
    function setGreen(row, col, ch) {
        set(row, col, ch);
        if (row >= 0 && row < height && col >= 0 && col < width) {
            highlights[row][col] = true;
            hasHighlights = true;
        }
    }

    /** Write a full string in green. Auto-centers if col is omitted. */
    function textGreen(str, row, col) {
        if (col === undefined) col = Math.floor((width - str.length) / 2);
        for (let i = 0; i < str.length; i++) {
            setGreen(row, col + i, str[i]);
        }
    }

    /* ── Output ───────────────────────────────────────────────────────── */

    /** Return the entire grid as a plain-text string (no HTML). */
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

    /**
     * Flush the grid to a DOM <pre> element.
     * If any cells are highlighted, generates HTML with <span class="green">.
     * Otherwise uses plain textContent for performance.
     */
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

    /* ── Initialize and return public API ─────────────────────────────── */

    clear();

    return {
        w: width, h: height, cells: cells,
        clear: clear, set: set, get: get,
        text: text, textInner: textInner, borderText: borderText,
        borders: borders, sprite: sprite,
        setGreen: setGreen, textGreen: textGreen,
        toString: toString, render: render
    };
}
