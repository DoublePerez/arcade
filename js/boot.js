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
    "             - T E R M I N A L -",
    "",
    "  ==========================================",
    "     (C) 2026 RETRO ARCADE SYSTEMS INC.",
    "             ALL RIGHTS RESERVED",
    "  ==========================================",
    "",
    "                SYSTEM READY.",
    ""
];

const TYPING_SPEED = 12;
const LINE_DELAY = 60;
let bootComplete = false;
let bootTimeoutId = null;
let bootPhase = "booting"; // "booting", "nameEntry", "done"
let bootNameBuffer = "";

function initBoot() {
    const output = document.getElementById("boot-output");
    const prompt = document.getElementById("boot-prompt");
    output.textContent = "";
    prompt.classList.add("hidden");
    bootComplete = false;
    bootPhase = "booting";
    bootNameBuffer = "";

    typeBootSequence(output, 0, 0, function () {
        bootComplete = true;
        var p = document.getElementById("boot-prompt");
        if (getPlayerName() === "PLAYER") {
            bootPhase = "nameEntry";
            p.textContent = "ENTER YOUR NAME: _";
            p.classList.remove("blink");
        } else {
            bootPhase = "done";
            p.textContent = "PRESS ENTER TO START";
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
    document.getElementById("boot-output").textContent = BOOT_LINES.join("\n") + "\n";
    bootComplete = true;

    var p = document.getElementById("boot-prompt");
    if (getPlayerName() === "PLAYER") {
        bootPhase = "nameEntry";
        p.textContent = "ENTER YOUR NAME: _";
        p.classList.remove("blink");
    } else {
        bootPhase = "done";
        p.textContent = "PRESS ENTER TO START";
        p.classList.add("blink");
    }
    p.classList.remove("hidden");
}

function handleBootKey(e) {
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
            p.textContent = "PRESS ENTER TO START";
            p.classList.add("blink");
        } else if (e.key === "Escape") {
            bootPhase = "done";
            var p2 = document.getElementById("boot-prompt");
            p2.textContent = "PRESS ENTER TO START";
            p2.classList.add("blink");
        } else if (e.key === "Backspace") {
            bootNameBuffer = bootNameBuffer.slice(0, -1);
            document.getElementById("boot-prompt").textContent = "ENTER YOUR NAME: " + bootNameBuffer + "_";
        } else if (e.key.length === 1 && bootNameBuffer.length < 12) {
            bootNameBuffer += e.key.toUpperCase();
            document.getElementById("boot-prompt").textContent = "ENTER YOUR NAME: " + bootNameBuffer + "_";
        }
        return;
    }

    // Boot sequence - skip or proceed
    if (e.key === "Enter" || e.key === "Escape") {
        if (bootComplete && bootPhase === "done") {
            showScreen("screen-menu");
        } else if (!bootComplete) {
            skipBoot();
        }
    }
}

// Start boot on load
initBoot();
