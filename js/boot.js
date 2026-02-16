/**
 * ============================================================================
 *  BOOT.JS — Terminal Boot Sequence
 * ============================================================================
 *
 *  Recreates an authentic IBM PC 5150 power-on experience:
 *
 *  Phase 1  "ibm"        — IBM logo splash with hardware specs
 *  Phase 2  "dos"        — BIOS POST + DOS loading (typed line-by-line)
 *  Phase 3  "splash"     — Game title art + version info
 *  Phase 4  "nameEntry"  — First-time player name prompt
 *  Phase 5  "ready"      — "Press ENTER to start" → menu
 *
 *  On return visits (hasBootedOnce), phases 1–2 are skipped.
 *
 *  Depends on:  app.js (getPlayerName, setPlayerName, showScreen)
 * ============================================================================
 */


/* ═══════════════════════════════════════════════════════════════════════════
   BIOS POST TEXT — Typed character-by-character during the DOS phase
   ═══════════════════════════════════════════════════════════════════════════ */

const DOS_LINES = [
    "  ARCAD3 PC BIOS v3.9  (MODEL 5160-XT)",
    "  (C) 2026 ARCAD3 SYSTEMS INC.",
    "",
    "  BASE MEMORY:  128K ............ OK",
    "  EXT. MEMORY:  640K ............ OK",
    "  KEYBOARD ...................... OK",
    "  VIDEO ADAPTER (CGA) ........... OK",
    "  FLOPPY DISK A: ................ OK",
    "",
    "  ==========================================",
    "",
    "  Starting MS-DOS 3.3...",
    "",
    "  C:\\ARCAD3>TERMINAL.EXE",
    "",
    "  LOADING ARCAD3.SYS ............ OK",
    "  SCANNING PERIPHERALS .......... OK",
    "  INITIALIZING SOUND DRIVER ..... OK",
    "",
    "  SYSTEM READY.",
    ""
];


/* ═══════════════════════════════════════════════════════════════════════════
   CONFIGURATION
   ═══════════════════════════════════════════════════════════════════════════ */

/** Wrap the word "ENTER" in a green <span> for visual emphasis. */
function greenEnter(text) {
    return text.replace(/ENTER/g, '<span class="green">ENTER</span>');
}

const TYPING_SPEED = 12;   // ms per character during DOS phase
const LINE_DELAY = 60;     // ms pause between lines during DOS phase

let bootTimeoutId = null;
let bootPhase = "ibm";     // current phase: "ibm" | "dos" | "splash" | "nameEntry" | "ready"
let bootNameBuffer = "";   // accumulates typed characters during name entry
let hasBootedOnce = false;  // skip IBM + DOS phases on subsequent visits


/* ═══════════════════════════════════════════════════════════════════════════
   INIT — Entry point (called by screen manager)
   ═══════════════════════════════════════════════════════════════════════════ */

/** Initialize the boot screen. Skips to splash if already booted once. */
function initBoot() {
    const output = document.getElementById("boot-output");
    const prompt = document.getElementById("boot-prompt");
    output.textContent = "";
    prompt.classList.add("hidden");
    bootNameBuffer = "";

    if (hasBootedOnce) {
        showSplash();
    } else {
        showIBM();
    }
}


/* ═══════════════════════════════════════════════════════════════════════════
   PHASE 2: DOS — BIOS POST typed output
   ═══════════════════════════════════════════════════════════════════════════ */

/** Begin the DOS typing sequence (clears screen, types POST lines). */
function startDosSequence() {
    if (bootTimeoutId) clearTimeout(bootTimeoutId);
    const output = document.getElementById("boot-output");
    const prompt = document.getElementById("boot-prompt");
    const screen = document.getElementById("screen-boot");
    const splashImg = document.getElementById("splash-img");
    const ibmImg = document.getElementById("ibm-logo-img");
    if (splashImg) splashImg.classList.add("hidden");
    if (ibmImg) ibmImg.classList.add("hidden");
    output.classList.remove("hidden");
    output.textContent = "";
    output.style.textAlign = "";
    screen.classList.remove("ibm-phase");
    screen.classList.remove("splash-phase");
    prompt.classList.add("hidden");
    bootPhase = "dos";

    typeDosLines(output, 0, 0, function () {
        hasBootedOnce = true;
        bootTimeoutId = setTimeout(showSplash, 800);
    });
}

/**
 * Recursive typewriter: types one character at a time, then advances to the next line.
 * @param {HTMLElement} outputEl — the <pre> element to type into
 * @param {number} lineIdx — current line index in DOS_LINES
 * @param {number} charIdx — current character index within the line
 * @param {Function} onComplete — callback when all lines are typed
 */
function typeDosLines(outputEl, lineIdx, charIdx, onComplete) {
    if (lineIdx >= DOS_LINES.length) {
        onComplete();
        return;
    }

    const line = DOS_LINES[lineIdx];

    if (charIdx < line.length) {
        outputEl.textContent += line[charIdx];
        bootTimeoutId = setTimeout(function () {
            typeDosLines(outputEl, lineIdx, charIdx + 1, onComplete);
        }, TYPING_SPEED);
    } else {
        outputEl.textContent += "\n";
        bootTimeoutId = setTimeout(function () {
            typeDosLines(outputEl, lineIdx + 1, 0, onComplete);
        }, LINE_DELAY);
    }
}


/* ═══════════════════════════════════════════════════════════════════════════
   PHASE 1: IBM — Hardware splash screen
   ═══════════════════════════════════════════════════════════════════════════ */

/** Show the IBM PC logo with model info and ROM details. */
function showIBM() {
    const output = document.getElementById("boot-output");
    const prompt = document.getElementById("boot-prompt");
    const screen = document.getElementById("screen-boot");
    const ibmImg = document.getElementById("ibm-logo-img");
    const splashImg = document.getElementById("splash-img");
    bootPhase = "ibm";

    screen.classList.remove("splash-phase");
    screen.classList.add("ibm-phase");

    const escHint = document.getElementById("global-esc-hint");
    if (escHint) escHint.textContent = "";

    // Show IBM logo image, hide splash
    if (splashImg) splashImg.classList.add("hidden");
    if (ibmImg) ibmImg.classList.remove("hidden");
    output.classList.add("hidden");
    output.textContent = "";

    // Static info below the logo image
    output.classList.remove("hidden");
    output.style.textAlign = "center";
    output.innerHTML = [
        '<span class="ibm-title">PERSONAL COMPUTER XT</span>',
        '<span class="ibm-dim">MODEL 5160  |  RELEASED 8 MAR 1983</span>',
        "",
        '<span class="ibm-dim">+====================================+</span>',
        '<span class="ibm-dim">|  BASE RAM:   128 KB               |</span>',
        '<span class="ibm-dim">|  EXPANDED:   640 KB   ......  OK  |</span>',
        '<span class="ibm-dim">|  ROM BIOS:   v3.9    8 KB         |</span>',
        '<span class="ibm-dim">|  FLOPPY A:   RETRO ARCAD3 1.0     |</span>',
        '<span class="ibm-dim">+====================================+</span>',
        "",
        '<span class="ibm-dim">(C) 2026 DOUBLE PEREZ / 2PP</span>',
        '<span class="ibm-dim">S/N 2PP-0260126</span>',
    ].join("\n");

    prompt.classList.remove("hidden");
    prompt.classList.add("blink");
    prompt.textContent = "Press any key to continue";
}


/* ═══════════════════════════════════════════════════════════════════════════
   PHASE 3: SPLASH — Game title + version info
   (also handles Phase 4: nameEntry and Phase 5: ready)
   ═══════════════════════════════════════════════════════════════════════════ */

/** Show the game title splash with version/copyright and name prompt. */
function showSplash() {
    const output = document.getElementById("boot-output");
    const prompt = document.getElementById("boot-prompt");
    const screen = document.getElementById("screen-boot");
    bootPhase = "splash";
    hasBootedOnce = true;

    screen.classList.remove("ibm-phase");
    screen.classList.add("splash-phase");

    const escHint = document.getElementById("global-esc-hint");
    if (escHint) escHint.textContent = "";

    // Show splash image, hide IBM logo
    const splashImg = document.getElementById("splash-img");
    const ibmImg = document.getElementById("ibm-logo-img");
    if (ibmImg) ibmImg.classList.add("hidden");
    if (splashImg) splashImg.classList.remove("hidden");

    // Title info below the splash image
    output.classList.remove("hidden");
    output.style.textAlign = "center";
    output.innerHTML = [
        "",
        '<span class="splash-rule">===============================</span>',
        "",
        '<span class="splash-title">7 GAMES  +  2 TOOLS</span>',
        "",
        '<span class="splash-rule">===============================</span>',
        "",
        "",
        '<span class="splash-footer">v1.0  |  S/N 2PP-0260126-RA</span>',
        '<span class="splash-footer">(C) 2026 DOUBLE PEREZ / 2PP</span>',
    ].join("\n");

    // First-time visitors get a name entry prompt; returning players skip to "ready"
    if (getPlayerName() === "PLAYER") {
        bootPhase = "nameEntry";
        prompt.innerHTML = '<span class="green">ENTER YOUR NAME:</span> _';
        prompt.classList.remove("blink");
    } else {
        bootPhase = "ready";
        prompt.innerHTML = greenEnter("Press ENTER to start");
        prompt.classList.add("blink");
    }
    prompt.classList.remove("hidden");
}


/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD HANDLER — Registered in the screen registry (app.js)
   ═══════════════════════════════════════════════════════════════════════════ */

/** Route keyboard input based on the current boot phase. */
function handleBootKey(e) {
    // ESC at any point = skip straight to menu
    if (e.key === "Escape") {
        if (bootTimeoutId) clearTimeout(bootTimeoutId);
        hasBootedOnce = true;
        showScreen("screen-menu");
        return;
    }

    // Phase 1: IBM splash — any key advances to DOS sequence
    if (bootPhase === "ibm") {
        if (bootTimeoutId) clearTimeout(bootTimeoutId);
        startDosSequence();
        return;
    }

    // Phase 2: DOS typing — any key skips to splash
    if (bootPhase === "dos") {
        if (bootTimeoutId) clearTimeout(bootTimeoutId);
        showSplash();
        return;
    }

    // Phase 4: Name entry — type, backspace, or confirm with Enter
    if (bootPhase === "nameEntry") {
        e.preventDefault();
        if (e.key === "Enter") {
            const trimmed = bootNameBuffer.trim();
            if (trimmed.length > 0) {
                setPlayerName(trimmed.toUpperCase());
            }
            bootPhase = "ready";
            const p = document.getElementById("boot-prompt");
            p.innerHTML = greenEnter("Press ENTER to continue");
            p.classList.add("blink");
        } else if (e.key === "Backspace") {
            bootNameBuffer = bootNameBuffer.slice(0, -1);
            document.getElementById("boot-prompt").innerHTML = '<span class="green">ENTER YOUR NAME:</span> ' + bootNameBuffer + "_";
        } else if (e.key.length === 1 && bootNameBuffer.length < 12) {
            bootNameBuffer += e.key.toUpperCase();
            document.getElementById("boot-prompt").innerHTML = '<span class="green">ENTER YOUR NAME:</span> ' + bootNameBuffer + "_";
        }
        return;
    }

    // Phase 5: Ready — only ENTER proceeds to menu
    if (bootPhase === "ready") {
        if (e.key === "Enter") {
            showScreen("screen-menu");
        }
    }
}


/* ═══════════════════════════════════════════════════════════════════════════
   AUTO-START — Kick off the boot sequence on page load
   ═══════════════════════════════════════════════════════════════════════════ */

initBoot();
