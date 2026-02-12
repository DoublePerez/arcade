// ========== TERMINAL BOOT SEQUENCE ==========

var BOOT_LINES = [
    "BIOS v2.71 .............. OK",
    "MEMORY TEST: 640K ........ OK",
    "LOADING RETRO_ARCADE.SYS . OK",
    "SCANNING PERIPHERALS ..... OK",
    "",
    "      _.-'''''-._       ____  _____ _____ ____   ___",
    "    .'  _     _  '.    |  _ \\| ____|_   _|  _ \\ / _ \\",
    "   /   (_)   (_)   \\   | |_) |  _|   | | | |_) | | | |",
    "  |    _________    |  |  _ <| |___  | | |  _ <| |_| |",
    "  |   |         |   |  |_| \\_\\_____|_|_| |_| \\_\\\\___/",
    "   \\  |  READY  |  /",
    "    '.|_________|.'         / \\  |  _ \\ / ___|/ \\  |  _ \\ | ____|",
    "      |  || ||  |          / _ \\ | |_) | |   / _ \\ | | | ||  _|",
    "      |  || ||  |         / ___ \\|  _ <| |__/ ___ \\| |_| || |___",
    "     _|  || ||  |_       /_/   \\_\\_| \\_\\\\___/_/   \\_\\____/ |_____|",
    "    (_/  \\/ \\/  \\_)      T  E  R  M  I  N  A  L",
    "",
    "============================================",
    "  (C) 2026 RETRO ARCADE SYSTEMS INC.",
    "  ALL RIGHTS RESERVED",
    "============================================",
    "",
    "SYSTEM READY.",
    ""
];

var TYPING_SPEED = 12;
var LINE_DELAY = 60;
var bootComplete = false;
var bootTimeoutId = null;

function initBoot() {
    var output = document.getElementById("boot-output");
    var prompt = document.getElementById("boot-prompt");
    output.textContent = "";
    prompt.classList.add("hidden");
    bootComplete = false;

    typeBootSequence(output, 0, 0, function () {
        prompt.classList.remove("hidden");
        bootComplete = true;
    });
}

function typeBootSequence(outputEl, lineIdx, charIdx, onComplete) {
    if (lineIdx >= BOOT_LINES.length) {
        onComplete();
        return;
    }

    var line = BOOT_LINES[lineIdx];

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
    var output = document.getElementById("boot-output");
    output.textContent = BOOT_LINES.join("\n") + "\n";
    document.getElementById("boot-prompt").classList.remove("hidden");
    bootComplete = true;
}

function handleBootKey(e) {
    if (e.key === "Escape") {
        if (bootComplete) {
            showScreen("screen-menu");
        } else {
            skipBoot();
        }
    } else if (e.key === "Enter") {
        if (bootComplete) {
            showScreen("screen-menu");
        } else {
            skipBoot();
        }
    }
}

// Start boot on load
initBoot();
