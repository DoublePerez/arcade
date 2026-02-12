// ========== TERMINAL BOOT SEQUENCE ==========

const BOOT_LINES = [
    "       BIOS v2.71 ............... OK",
    "       MEMORY TEST: 640K ......... OK",
    "       LOADING RETRO_ARCADE.SYS .. OK",
    "       SCANNING PERIPHERALS ...... OK",
    "",
    "                   #     #",
    "                  ## # # ##",
    "                 ###########",
    "                ## ####### ##",
    "                #############",
    "                # ######### #",
    "                # #       # #",
    "                   ##   ##",
    "",
    "      ####   #####  #####  ####    ###",
    "      #   #  #        #    #   #  #   #",
    "      ####   ####     #    ####   #   #",
    "      # #    #        #    # #    #   #",
    "      #   #  #####    #    #   #   ###",
    "",
    "   ###   ####    ####   ###   ####   #####",
    "  #   #  #   #  #      #   #  #   #  #",
    "  #####  ####   #      #####  #   #  ####",
    "  #   #  #  #   #      #   #  #   #  #",
    "  #   #  #   #   ####  #   #  ####   #####",
    "",
    "            - T E R M I N A L -",
    "",
    "  ==========================================",
    "     (C) 2026 RETRO ARCADE SYSTEMS INC.",
    "             ALL RIGHTS RESERVED",
    "  ==========================================",
    "",
    "                SYSTEM READY.",
    ""
];

function bootOutputHTML() {
    return BOOT_LINES.join("\n").replace(/OK/g, '<span class="green">OK</span>') + "\n";
}

function greenEnter(text) {
    return text.replace(/ENTER/g, '<span class="green">ENTER</span>');
}

const TYPING_SPEED = 12;
const LINE_DELAY = 60;
let bootComplete = false;
let bootTimeoutId = null;
let bootPhase = "splash"; // "splash", "booting", "nameEntry", "done"
let bootNameBuffer = "";

function initBoot() {
    const output = document.getElementById("boot-output");
    const prompt = document.getElementById("boot-prompt");
    const escHint = document.getElementById("global-esc-hint");
    if (escHint) escHint.textContent = "ESC to skip";
    output.textContent = "";
    prompt.classList.add("hidden");
    bootComplete = false;
    bootPhase = "splash";
    bootNameBuffer = "";
    renderSplash();
}

function renderSplash() {
    var output = document.getElementById("boot-output");
    var prompt = document.getElementById("boot-prompt");
    output.textContent = [
        "",
        "",
        "",
        "  ==========================================",
        "",
        "         R E T R O   A R C A D E",
        "              T E R M I N A L",
        "",
        "  ==========================================",
        "",
        ""
    ].join("\n");
    prompt.innerHTML = greenEnter("[ PRESS ENTER TO START ]");
    prompt.classList.add("blink");
    prompt.classList.remove("hidden");
}

function startBootSequence() {
    var output = document.getElementById("boot-output");
    var prompt = document.getElementById("boot-prompt");
    output.textContent = "";
    prompt.classList.add("hidden");
    bootComplete = false;
    bootPhase = "booting";

    typeBootSequence(output, 0, 0, function () {
        bootComplete = true;
        output.innerHTML = bootOutputHTML();
        var p = document.getElementById("boot-prompt");
        if (getPlayerName() === "PLAYER") {
            bootPhase = "nameEntry";
            p.textContent = "ENTER YOUR NAME: _";
            p.classList.remove("blink");
        } else {
            bootPhase = "done";
            p.innerHTML = greenEnter("PRESS ENTER TO START");
            p.classList.add("blink");
        }
        p.classList.remove("hidden");
    });
}

function typeBootSequence(outputEl, lineIdx, charIdx, onComplete) {
    if (lineIdx >= BOOT_LINES.length) {
        onComplete();
        return;
    }

    const line = BOOT_LINES[lineIdx];

    if (charIdx < line.length) {
        outputEl.textContent += line[charIdx];
        bootTimeoutId = setTimeout(function () {
            typeBootSequence(outputEl, lineIdx, charIdx + 1, onComplete);
        }, TYPING_SPEED);
    } else {
        outputEl.textContent += "\n";
        bootTimeoutId = setTimeout(function () {
            typeBootSequence(outputEl, lineIdx + 1, 0, onComplete);
        }, LINE_DELAY);
    }
}

function skipBoot() {
    if (bootTimeoutId) clearTimeout(bootTimeoutId);
    document.getElementById("boot-output").innerHTML = bootOutputHTML();
    bootComplete = true;

    var p = document.getElementById("boot-prompt");
    if (getPlayerName() === "PLAYER") {
        bootPhase = "nameEntry";
        p.textContent = "ENTER YOUR NAME: _";
        p.classList.remove("blink");
    } else {
        bootPhase = "done";
        p.innerHTML = greenEnter("PRESS ENTER TO START");
        p.classList.add("blink");
    }
    p.classList.remove("hidden");
}

function handleBootKey(e) {
    // ESC at any point = skip entire intro, go to menu
    if (e.key === "Escape") {
        if (bootTimeoutId) clearTimeout(bootTimeoutId);
        showScreen("screen-menu");
        return;
    }

    // Splash screen
    if (bootPhase === "splash") {
        if (e.key === "Enter" || e.key === " ") {
            startBootSequence();
        }
        return;
    }

    // Name entry mode
    if (bootPhase === "nameEntry") {
        e.preventDefault();
        if (e.key === "Enter") {
            var trimmed = bootNameBuffer.trim();
            if (trimmed.length > 0) {
                setPlayerName(trimmed.toUpperCase());
            }
            bootPhase = "done";
            var p = document.getElementById("boot-prompt");
            p.innerHTML = greenEnter("PRESS ENTER TO START");
            p.classList.add("blink");
        } else if (e.key === "Backspace") {
            bootNameBuffer = bootNameBuffer.slice(0, -1);
            document.getElementById("boot-prompt").textContent = "ENTER YOUR NAME: " + bootNameBuffer + "_";
        } else if (e.key.length === 1 && bootNameBuffer.length < 12) {
            bootNameBuffer += e.key.toUpperCase();
            document.getElementById("boot-prompt").textContent = "ENTER YOUR NAME: " + bootNameBuffer + "_";
        }
        return;
    }

    // Boot sequence - Enter to fast-forward or proceed
    if (e.key === "Enter") {
        if (bootComplete && bootPhase === "done") {
            showScreen("screen-menu");
        } else if (!bootComplete) {
            skipBoot();
        }
    }
}

// Start boot on load
initBoot();
