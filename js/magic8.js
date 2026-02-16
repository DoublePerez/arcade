/**
 * ============================================================================
 *  MAGIC8.JS — Magic 8 Ball
 * ============================================================================
 *
 *  A virtual Magic 8 Ball. Type a yes/no question, shake the ball,
 *  and receive a mystical answer from one of 20 classic responses.
 *
 *  Answer distribution:
 *    • 50% positive  (10 answers)
 *    • 25% neutral   (5 answers)
 *    • 25% negative  (5 answers)
 *
 *  Game flow:
 *    1. Intro    — Title screen with blinking "PRESS ENTER TO BEGIN"
 *    2. Typing   — Player types their question
 *    3. Shaking  — Ball shakes with visual offset animation (8 frames)
 *    4. Answer   — Ball displays YES/NO/~ symbol and the answer text
 *
 *  ASCII art:
 *    The 8-ball is rendered as a 13-line ASCII sprite with an
 *    11-character message window in the center.
 *
 *  Controls:
 *    Enter       — Begin / submit question / ask again
 *    Backspace   — Delete last character (typing phase)
 *    Any key     — Type question (typing phase, max 80 chars)
 *    ESC         — Return to menu
 *
 *  Depends on:  grid.js (ArcadeGrid)
 * ============================================================================
 */


/* ═══════════════════════════════════════════════════════════════════════════
   CONFIGURATION
   ═══════════════════════════════════════════════════════════════════════════ */

const M8_W = 70;                         // arena width
const M8_H = 30;                         // arena height

const magic8Grid = ArcadeGrid(M8_W, M8_H);


/* ═══════════════════════════════════════════════════════════════════════════
   ANSWER POOLS — Classic Magic 8 Ball responses
   ═══════════════════════════════════════════════════════════════════════════ */

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
    "SIGNS POINT TO YES.",
    "THE ANSWER AWAITS IN 1995.",
    "START THE POMODORO TIMER."
];

const NEUTRAL_ANSWERS = [
    "REPLY HAZY, TRY AGAIN.",
    "ASK AGAIN LATER.",
    "BETTER NOT TELL YOU NOW.",
    "CANNOT PREDICT NOW.",
    "CONCENTRATE AND ASK AGAIN.",
    "TRY AGAIN... IN 1995.",
    "25 MINUTES. THEN ASK AGAIN."
];

const NEGATIVE_ANSWERS = [
    "DON'T COUNT ON IT.",
    "MY REPLY IS NO.",
    "MY SOURCES SAY NO.",
    "OUTLOOK NOT SO GOOD.",
    "VERY DOUBTFUL.",
    "NOT NOW. MAYBE IN 1995."
];

const ALL_ANSWERS = POSITIVE_ANSWERS.concat(NEUTRAL_ANSWERS, NEGATIVE_ANSWERS);


/* ═══════════════════════════════════════════════════════════════════════════
   GAME STATE
   ═══════════════════════════════════════════════════════════════════════════ */

const m8 = {
    phase: "intro",                      // "intro" | "typing" | "shaking" | "answer"
    question: "",                        // player's typed question
    answer: "",                          // selected answer text
    answerType: "",                      // "positive" | "neutral" | "negative"
    shakeFrames: 0,                      // current frame of shake animation
    shakeTimer: null,                    // setInterval handle for shake animation
    blinkOn: true,                       // cursor blink state for "PRESS ENTER" prompts
    blinkTimer: null                     // setInterval handle for blink cycle
};


/* ═══════════════════════════════════════════════════════════════════════════
   INIT & LIFECYCLE
   ═══════════════════════════════════════════════════════════════════════════ */

/** Initialize the Magic 8 Ball. Returns a cleanup function. */
function initMagic8() {
    m8.phase = "intro";
    m8.question = "";
    m8.answer = "";
    m8.answerType = "";
    m8.shakeFrames = 0;
    m8.blinkOn = true;

    // Blinking cursor effect (toggles every 500 ms)
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


/* ═══════════════════════════════════════════════════════════════════════════
   SHAKE ANIMATION — Visual ball-shaking effect
   ═══════════════════════════════════════════════════════════════════════════ */

/** Start the shake animation (8 frames at 150 ms each). */
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


/* ═══════════════════════════════════════════════════════════════════════════
   ANSWER SELECTION — Weighted random pick
   ═══════════════════════════════════════════════════════════════════════════ */

/** Roll the dice and reveal an answer (50% positive, 25% neutral, 25% negative). */
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


/* ═══════════════════════════════════════════════════════════════════════════
   RENDERING — ASCII 8-ball art and phase screens
   ═══════════════════════════════════════════════════════════════════════════ */

/** ASCII 8-ball sprite (13 lines). {MSGPAD} is replaced with an 11-char message. */
const BALL_ART = [
    "            .::::::::::::.            ",
    "         .::::::::::::::::::.         ",
    "       ::::::::::::::::::::::::       ",
    "     :::::::::::::::::::::::::::.     ",
    "    :::::::::  _________  ::::::::    ",
    "   ::::::::  /           \\  :::::::   ",
    "   ::::::: |   {MSGPAD}   | :::::::   ",
    "   ::::::::  \\___________/  :::::::   ",
    "    ::::::::::::::::::::::::::::::    ",
    "     :::::::::::::::::::::::::::.     ",
    "       ::::::::::::::::::::::::       ",
    "         .::::::::::::::::::.         ",
    "            .::::::::::::.            "
];

const BALL_MSG_WIDTH = 11;

/** Draw the 8-ball ASCII art with a centered message in the window. */
function renderBallWithMessage(g, startRow, msg) {
    for (let r = 0; r < BALL_ART.length; r++) {
        let line = BALL_ART[r];
        if (line.indexOf("{MSGPAD}") !== -1) {
            // Pad or truncate message to fit the 11-char window
            const trimmed = msg.length > BALL_MSG_WIDTH ? msg.substring(0, BALL_MSG_WIDTH) : msg;
            const leftPad = Math.floor((BALL_MSG_WIDTH - trimmed.length) / 2);
            const rightPad = BALL_MSG_WIDTH - trimmed.length - leftPad;
            line = line.replace("{MSGPAD}", " ".repeat(leftPad) + trimmed + " ".repeat(rightPad));
        }
        const col = Math.floor((M8_W - line.length) / 2);
        g.text(line, startRow + r, col);
    }
}

/** Render the Magic 8 Ball screen based on the current phase. */
function renderMagic8() {
    const g = magic8Grid;
    g.clear();
    g.borders();
    g.borderText(" M A G I C   8   B A L L ", 0);

    // ── Intro phase ────────────────────────────────────────────
    if (m8.phase === "intro") {
        renderBallWithMessage(g, 3, "8");

        g.textInner("ASK A YES OR NO QUESTION", 18);
        g.textInner("THE BALL KNOWS ALL...", 20);
        g.textInner("================================", 22);
        if (m8.blinkOn) {
            const enterLine = "PRESS ENTER TO BEGIN";
            const enterCol = Math.floor((M8_W - enterLine.length) / 2);
            g.textInner("PRESS ", 25, enterCol);
            g.textGreen("ENTER", 25, enterCol + 6);
            g.textInner(" TO BEGIN", 25, enterCol + 11);
        }
        g.borderText(" ESC: MENU ", M8_H - 1);
    }

    // ── Typing phase ───────────────────────────────────────────
    if (m8.phase === "typing") {
        renderBallWithMessage(g, 3, "?");

        g.textInner("YOUR QUESTION:", 18);

        // Word-wrap long questions across two lines
        const display = m8.question + "_";
        if (display.length <= 58) {
            g.textInner(display, 20);
        } else {
            g.textInner(display.substring(0, 58), 20);
            g.textInner(display.substring(58), 21);
        }

        g.borderText(" TYPE QUESTION   ENTER: ASK   ESC: MENU ", M8_H - 1);
    }

    // ── Shaking phase ──────────────────────────────────────────
    if (m8.phase === "shaking") {
        // Random offset creates a "shaking" visual effect
        const offsetR = (m8.shakeFrames % 2 === 0) ? 0 : 1;
        const offsetC = [0, 1, -1, 2, -2, 1, -1, 0][m8.shakeFrames % 8];

        for (let sr = 0; sr < BALL_ART.length; sr++) {
            const line = BALL_ART[sr].replace("{MSGPAD}", "    ???    ");
            const col = Math.floor((M8_W - line.length) / 2) + offsetC;
            g.text(line, 3 + sr + offsetR, col);
        }

        g.textInner("* * *  S H A K I N G  * * *", 19);
        g.textInner("THE SPIRITS ARE CONSULTING...", 22);
    }

    // ── Answer phase ───────────────────────────────────────────
    if (m8.phase === "answer") {
        // Show ball with answer type symbol (YES / NO / ~)
        const symbol = m8.answerType === "positive" ? "YES" :
                     m8.answerType === "negative" ? "NO" : "~ ~ ~";
        renderBallWithMessage(g, 3, symbol);

        // Decorative divider
        g.textInner("================================", 18);

        // Answer centered
        g.textInner(m8.answer, 20);

        // Show truncated question as reminder
        const qDisplay = m8.question.length > 56 ? m8.question.substring(0, 53) + "..." : m8.question;
        g.textInner("Q: " + qDisplay, 23);

        if (m8.blinkOn) {
            const askLine = "[ENTER] ASK AGAIN";
            const askCol = Math.floor((M8_W - askLine.length) / 2);
            g.textGreen("[ENTER]", 26, askCol);
            g.textInner(" ASK AGAIN", 26, askCol + 7);
        }
        g.borderText(" ENTER: ASK AGAIN   ESC: MENU ", M8_H - 1);
    }

    g.render("magic8-arena");
}


/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD HANDLER
   ═══════════════════════════════════════════════════════════════════════════ */

/** Handle keyboard input for the Magic 8 Ball. */
function handleMagic8Key(e) {
    if (e.key === " " && m8.phase !== "typing") e.preventDefault();

    // ── Intro → begin typing ───────────────────────────────────
    if (m8.phase === "intro") {
        if (e.key === "Enter" || e.key === " ") {
            m8.phase = "typing";
            m8.question = "";
            renderMagic8();
        }
        return;
    }

    // ── Typing → submit question or edit text ──────────────────
    if (m8.phase === "typing") {
        e.preventDefault();
        if (e.key === "Enter") {
            if (m8.question.trim().length > 0) {
                shakeBall();
            }
        } else if (e.key === "Backspace") {
            m8.question = m8.question.slice(0, -1);
            renderMagic8();
        } else if (e.key.length === 1 && m8.question.length < 80) {
            m8.question += e.key.toUpperCase();
            renderMagic8();
        }
        return;
    }

    // ── Answer → ask again ─────────────────────────────────────
    if (m8.phase === "answer") {
        if (e.key === "Enter" || e.key === " ") {
            m8.phase = "typing";
            m8.question = "";
            m8.answer = "";
            renderMagic8();
        }
    }
}
