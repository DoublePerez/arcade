# RETRO ARCADE TERMINAL

```
 ____  _____ _____ ____   ___
|  _ \| ____|_   _|  _ \ / _ \
| |_) |  _|   | | | |_) | | | |
|  _ <| |___  | | |  _ <| |_| |
|_| \_\_____| |_| |_| \_\___/
    / \  |  _ \ / ___|/ \  |  _ \ | ____|
   / _ \ | |_) | |   / _ \ | | | ||  _|
  / ___ \|  _ <| |__/ ___ \| |_| || |___
 /_/   \_\_| \_\___/_/   \_\____/ |_____|

  T  E  R  M  I  N  A  L
```

A retro terminal-style arcade built with pure HTML, CSS, and JavaScript.
No frameworks. No build tools. Just ASCII and pixels.

Inspired by Blade Runner LAPD terminals, ACiD BBS art, and CRT scan-line displays.

---

## How to Run

Open `index.html` in any modern web browser. No server required.

Desktop only -- phones and tablets are blocked with a retro "Smartphones did not exist in 1981" message.

---

## Flow

1. **Boot Screen** -- Fake terminal POST sequence with typing animation
2. **Name Entry** -- First-time players enter their name
3. **Press ENTER** -- Skip or wait for the boot to finish
4. **Main Menu** -- Select a game with arrows or number keys (10 items)
5. **Intro Screen** -- Each game shows controls before starting
6. **Play** -- Scores update automatically during games
7. **ESC** -- Return to menu at any time

---

## Games

### [1] ASCII PONG

Classic paddle tennis. Player (left) vs CPU (right). First to 7 wins. Three difficulty levels.

| Key | Action |
|-----|--------|
| W/S or Arrows | Move paddle |
| 1/2/3 | Quick-select difficulty |
| ENTER | Start / Replay |
| ESC | Return to menu |

### [2] TIC TAC TOE

Classic X vs O against CPU (minimax AI with 30% random). Best of 5 rounds.

| Key | Action |
|-----|--------|
| WASD / Arrows | Move cursor |
| Enter / Space | Place mark |
| ESC | Return to menu |

### [3] BINGO

5x5 bingo vs CPU. Manual mark mode (find & mark numbers yourself) or Auto mode (pure luck race). First to 3.

| Key | Action |
|-----|--------|
| WASD / Arrows | Move cursor (manual mode) |
| Enter / Space | Mark cell |
| 1 / 2 | Select mode (manual / auto) |
| ESC | Return to menu |

### [4] SNAKE

Classic arcade snake. Eat food to grow, don't hit walls or yourself. Speed increases as you grow.

| Key | Action |
|-----|--------|
| WASD / Arrows | Steer |
| ENTER | Replay |
| ESC | Return to menu |

### [5] SPACE INVADERS

Classic alien shooter. 4 rows of aliens, enemy fire, waves that get faster. Invincibility frames on hit.

| Key | Action |
|-----|--------|
| A/D or Arrows | Move ship |
| Space | Fire |
| ENTER | Replay |
| ESC | Return to menu |

### [6] MAGIC 8 BALL

Ask a yes/no question, shake the ball, get your fortune. 20 classic responses (positive, neutral, negative).

| Key | Action |
|-----|--------|
| Type | Enter question |
| Enter | Ask / Ask again |
| ESC | Return to menu |

### [7] TIME TRAVELER

A 1981-themed text adventure. Explore a mysterious basement, make choices, and get pulled through a temporal displacement to the year 2026. Typewriter-style text with branching narrative paths.

| Key | Action |
|-----|--------|
| 1/2/3 | Choose option |
| Left / Right | Yes / No |
| Enter | Confirm |
| Any key | Skip typewriter effect |
| ESC | Return to menu |

---

## Utilities

### [8] SCORE KEEPER

Manual score tracker with big ASCII digit display. Two teams, +1/-1/reset per team.

| Key | Action |
|-----|--------|
| A/D or Arrows | Select team |
| W/S | +1 / -1 |
| Q | Reset team |
| R | Reset all |
| ESC | Return to menu |

### [9] SCORE BOARD

View match history and stats for all games. Per-game win/loss records, best scores, last match results.

| Key | Action |
|-----|--------|
| N | Change player name |
| R | Reset all stats |
| ESC | Return to menu |

### [10] TIME MACHINE > 2026

A dramatic forward time-travel sequence (1981 → 2026) with auto-advancing status messages and a progress bar. Launches the Clown Town Score Keeper in a standalone page.

| Key | Action |
|-----|--------|
| ESC | Return to menu |

---

## Clown Town Score Keeper

Standalone score-keeping page (`clown-keeper.html`) accessed via the Time Machine. Themed as a futuristic "Clown Town" discovered 45 years ahead of the arcade's 1981 setting.

- Two-team score tracker with pixel-art digit display
- Clown illustration and circus music
- Point history dot visualization
- Lead status and total count

| Key | Action |
|-----|--------|
| Left / Right | Select team |
| Up / Down or W / S | Score +1 / -1 |
| R + R | Reset (double-tap confirm) |
| M | Mute / unmute music |
| ESC | Open leave overlay |

---

## File Structure

```
index.html           -- Single-page app shell
clown-keeper.html    -- Clown Town Score Keeper (standalone)
404.html             -- Retro-styled 404 error page
css/
  style.css          -- Retro terminal theme + CRT effects
js/
  grid.js            -- Shared ASCII grid rendering utility
  app.js             -- Score system, arcade data, screen manager
  boot.js            -- Terminal boot sequence + name entry
  menu.js            -- Game selection menu (10 items)
  pong.js            -- ASCII Pong engine
  tictactoe.js       -- Tic Tac Toe engine (minimax AI)
  bingo.js           -- Bingo engine
  snake.js           -- Snake engine
  invaders.js        -- Space Invaders engine
  magic8.js          -- Magic 8 Ball
  timetraveler.js    -- Time Traveler text adventure
  timemachine.js     -- Time Machine travel sequence
  scores.js          -- Scoreboard screen
  keeper.js          -- Score Keeper screen
assets/
  ibm_arcad3.png     -- IBM-style logo for boot screen
  ascii-art-text.png -- ASCII splash art for boot screen
  clown.png          -- Clown Town imagery
  clowntext.png      -- "CLOWN TOWN" pixel-art title
  payasito.svg       -- Clown illustration
  numbers/           -- Pixel-art score digits (0-9.png)
  music/             -- Circus music (public domain)
readme.md            -- This file
```

---

## Tech

- Pure HTML / CSS / JavaScript -- no dependencies
- "Press Start 2P" pixel font via Google Fonts
- CRT scan-line overlay via CSS pseudo-element
- Game rendering via `<pre>` elements with shared `ArcadeGrid` utility
- Green highlight system using `innerHTML` with HTML escaping
- `requestAnimationFrame` game loops with fixed-timestep physics (Pong)
- `setInterval` / `setTimeout` tick-based games (Snake, Bingo, Invaders)
- `localStorage` for score and player data persistence
- Mobile detection wall for phone/tablet visitors

---

## Architecture

Each game follows the same pattern:

1. **Init function** -- Sets up state, returns a cleanup function
2. **Render function** -- Draws to an `ArcadeGrid`, calls `grid.render(elementId)`
3. **Key handler** -- Processes keyboard input per game phase
4. **Phase state machine** -- Games move through phases (intro -> countdown -> playing -> gameover)

Adding a new game requires:
1. Create `js/newgame.js` with init, render, and key handler functions
2. Add a `<div class="screen game-screen">` with a `<pre class="game-arena">` to `index.html`
3. Add one line to the `SCREENS` registry in `app.js`
4. Add one line to `MENU_ITEMS` in `menu.js`
5. Add `<script src="js/newgame.js">` to `index.html`
