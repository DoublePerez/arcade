// ========== MAGIC 8 BALL ==========

const M8_W = 50;
const M8_H = 24;

const magic8Grid = ArcadeGrid(M8_W, M8_H);

const POSITIVE_ANSWERS = [
    "IT IS CERTAIN.",
    "IT IS DECIDEDLY SO.",
    "WITHOUT A DOUBT.",
    "YES, DEFINITELY.",
    "YOU MAY RELY ON IT.",
    "AS I SEE IT, YES.",
    "MOST LIKELY.",
    "OUTLOOK GOOD.",
    "YES.",
    "SIGNS POINT TO YES."
];

const NEUTRAL_ANSWERS = [
    "REPLY HAZY, TRY AGAIN.",
    "ASK AGAIN LATER.",
    "BETTER NOT TELL YOU NOW.",
    "CANNOT PREDICT NOW.",
    "CONCENTRATE AND ASK AGAIN."
];

const NEGATIVE_ANSWERS = [
    "DON'T COUNT ON IT.",
    "MY REPLY IS NO.",
    "MY SOURCES SAY NO.",
    "OUTLOOK NOT SO GOOD.",
    "VERY DOUBTFUL."
];

const ALL_ANSWERS = POSITIVE_ANSWERS.concat(NEUTRAL_ANSWERS, NEGATIVE_ANSWERS);

const m8 = {
    phase: "intro",       // "intro", "typing", "shaking", "answer"
    question: "",
    answer: "",
    answerType: "",       // "positive", "neutral", "negative"
    shakeFrames: 0,
    shakeTimer: null,
    blinkOn: true,
    blinkTimer: null
};

function initMagic8() {
    m8.phase = "intro";
    m8.question = "";
    m8.answer = "";
    m8.answerType = "";
    m8.shakeFrames = 0;
    m8.blinkOn = true;

    m8.blinkTimer = setInterval(function () {
        m8.blinkOn = !m8.blinkOn;
        renderMagic8();
    }, 500);

    renderMagic8();

    return function stopMagic8() {
        if (m8.shakeTimer) clearInterval(m8.shakeTimer);
        if (m8.blinkTimer) clearInterval(m8.blinkTimer);
    };
}

function shakeBall() {
    m8.phase = "shaking";
    m8.shakeFrames = 0;

    m8.shakeTimer = setInterval(function () {
        m8.shakeFrames++;
        renderMagic8();

        if (m8.shakeFrames >= 8) {
            clearInterval(m8.shakeTimer);
            m8.shakeTimer = null;
            revealAnswer();
        }
    }, 150);
}

function revealAnswer() {
    const roll = Math.random();
    let answer;
    if (roll < 0.50) {
        answer = POSITIVE_ANSWERS[Math.floor(Math.random() * POSITIVE_ANSWERS.length)];
        m8.answerType = "positive";
    } else if (roll < 0.75) {
        answer = NEUTRAL_ANSWERS[Math.floor(Math.random() * NEUTRAL_ANSWERS.length)];
        m8.answerType = "neutral";
    } else {
        answer = NEGATIVE_ANSWERS[Math.floor(Math.random() * NEGATIVE_ANSWERS.length)];
        m8.answerType = "negative";
    }

    m8.answer = answer;
    m8.phase = "answer";
    renderMagic8();
}

// ========== RENDERING ==========

// ASCII 8-ball art (centered within grid)
const BALL_ART = [
    "        .:::::::::.        ",
    "      :::::::::::::::.     ",
    "    ::::::::::::::::::::   ",
    "   ::::::: _______ ::::::  ",
    "  ::::::: /       \\ ::::::",
    "  :::::: |  {MSG}  | ::::::",
    "  ::::::: \\_______/ ::::::",
    "   ::::::::::::::::::::::  ",
    "    ::::::::::::::::::::   ",
    "      :::::::::::::::.     ",
    "        .:::::::::.        "
];

function renderBallWithMessage(g, startRow, msg) {
    for (let r = 0; r < BALL_ART.length; r++) {
        let line = BALL_ART[r];
        if (line.indexOf("{MSG}") !== -1) {
            const padded = msg.length > 7 ? msg.substring(0, 7) : msg;
            const leftPad = Math.floor((7 - padded.length) / 2);
            const rightPad = 7 - padded.length - leftPad;
            line = line.replace("{MSG}", " ".repeat(leftPad) + padded + " ".repeat(rightPad));
        }
        const col = Math.floor((M8_W - line.length) / 2);
        g.text(line, startRow + r, col);
    }
}

function renderMagic8() {
    const g = magic8Grid;
    g.clear();

    const midRow = Math.floor(M8_H / 2);

    if (m8.phase === "intro") {
        g.text("M A G I C   8   B A L L", 1);
        g.text("=".repeat(36), 3);

        renderBallWithMessage(g, 5, "  8  ");

        g.text("ASK A YES OR NO QUESTION", 17);
        g.text("THE BALL KNOWS ALL...", 19);
        if (m8.blinkOn) {
            g.text("PRESS ENTER TO BEGIN", 21);
        }
    }

    if (m8.phase === "typing") {
        g.text("M A G I C   8   B A L L", 1);
        g.text("-".repeat(36), 3);

        renderBallWithMessage(g, 5, "  ?  ");

        g.text("YOUR QUESTION:", 17);

        // Word-wrap the question to fit
        var display = m8.question + "_";
        if (display.length <= 40) {
            g.text(display, 19);
        } else {
            g.text(display.substring(0, 40), 19);
            g.text(display.substring(40), 20);
        }

        g.text("TYPE QUESTION, ENTER TO ASK", 22);
    }

    if (m8.phase === "shaking") {
        g.text("M A G I C   8   B A L L", 1);

        // Shake effect: offset the ball randomly
        var offsetR = (m8.shakeFrames % 2 === 0) ? 0 : 1;
        var offsetC = [0, 1, -1, 2, -2, 1, -1, 0][m8.shakeFrames % 8];

        for (var sr = 0; sr < BALL_ART.length; sr++) {
            var line = BALL_ART[sr].replace("{MSG}", "  ???  ");
            var col = Math.floor((M8_W - line.length) / 2) + offsetC;
            g.text(line, 5 + sr + offsetR, col);
        }

        g.text("* * * SHAKING * * *", 18);
        g.text("THE SPIRITS ARE CONSULTING...", 20);
    }

    if (m8.phase === "answer") {
        g.text("M A G I C   8   B A L L", 1);
        g.text("=".repeat(36), 3);

        // Show ball with answer symbol
        var symbol = m8.answerType === "positive" ? " YES " :
                     m8.answerType === "negative" ? "  NO " : "  ~  ";
        renderBallWithMessage(g, 5, symbol);

        // Show the answer in green
        var ansLen = m8.answer.length;
        var ansCol = Math.floor((M8_W - ansLen) / 2);
        g.textGreen(m8.answer, 17, ansCol);

        // Show truncated question
        var qDisplay = m8.question.length > 38 ? m8.question.substring(0, 35) + "..." : m8.question;
        g.text("Q: " + qDisplay, 19);

        if (m8.blinkOn) {
            g.text("ENTER: ASK AGAIN    ESC: MENU", 22);
        }
    }

    g.render("magic8-arena");
}

// ========== INPUT ==========
function handleMagic8Key(e) {
    if (e.key === " " && m8.phase !== "typing") e.preventDefault();

    if (m8.phase === "intro") {
        if (e.key === "Enter" || e.key === " ") {
            m8.phase = "typing";
            m8.question = "";
            renderMagic8();
        }
        return;
    }

    if (m8.phase === "typing") {
        e.preventDefault();
        if (e.key === "Enter") {
            if (m8.question.trim().length > 0) {
                shakeBall();
            }
        } else if (e.key === "Backspace") {
            m8.question = m8.question.slice(0, -1);
            renderMagic8();
        } else if (e.key.length === 1 && m8.question.length < 60) {
            m8.question += e.key.toUpperCase();
            renderMagic8();
        }
        return;
    }

    if (m8.phase === "answer") {
        if (e.key === "Enter" || e.key === " ") {
            m8.phase = "typing";
            m8.question = "";
            m8.answer = "";
            renderMagic8();
        }
    }
}
