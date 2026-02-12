# RETRO ARCADE TERMINAL

```
 ____  _____ _____ ____   ___
|  _ \| ____|_   _|  _ \ / _ \
| |_) |  _|   | | | |_) | | | |
|  _ <| |___  | | |  _ <| |_| |
|_| \_\_____| |_| |_| \_\\___/
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

---

## Flow

1. **Boot Screen** -- Fake terminal POST sequence with typing animation
2. **Press ENTER** -- Skip or wait for the boot to finish
3. **Main Menu** -- Select a game or view the scoreboard
4. **Play** -- Scores update automatically during games
5. **ESC** -- Return to menu at any time

---

## Games

### [1] ASCII PONG

Classic paddle tennis. Player (left) vs CPU (right). First to 7 wins.

| Key | Action |
|-----|--------|
| W / Arrow Up | Move paddle up |
| S / Arrow Down | Move paddle down |
| ENTER | Replay after game over |
| ESC | Return to menu |

### [2] TIC TAC TOE

Classic X vs O against CPU. WASD/Arrows to move cursor, Enter/Space to place. First to 3 wins.

| Key | Action |
|-----|--------|
| WASD / Arrows | Move cursor |
| Enter / Space | Place mark |
| ESC | Return to menu |

### [3] BINGO

Classic 5x5 bingo vs CPU. Manual or Auto mark mode. First to 3 wins.

| Key | Action |
|-----|--------|
| WASD / Arrows | Move cursor (manual mode) |
| Enter / Space | Mark cell (manual mode) |
| 1 / 2 | Select mode (manual / auto) |
| ESC | Return to menu |

### [4] SCORE BOARD

View and manually edit Player / CPU scores. Scores persist via localStorage.

---

## Score Keeper

- **Team A** = PLAYER, **Team B** = CPU
- Scores update automatically when points are scored in games
- A compact HUD bar appears at the top during gameplay
- The standalone scoreboard (option 3) allows manual +1 / -1 / Reset
- All scores persist in `localStorage` across browser sessions

---

## File Structure

```
index.html          -- Single-page app shell
css/
  style.css         -- Retro terminal theme + CRT effects
js/
  app.js            -- Score keeper core + screen manager
  boot.js           -- Terminal boot sequence animation
  menu.js           -- Game selection menu
  pong.js           -- ASCII Pong engine
  tictactoe.js      -- Tic Tac Toe engine
  bingo.js          -- Bingo engine
  scores.js         -- Scoreboard screen
  keeper.js         -- Score keeper screen
readme.md           -- This file
```

---

## Tech

- Pure HTML / CSS / JavaScript -- no dependencies
- "Press Start 2P" pixel font via Google Fonts
- CRT scan-line overlay via CSS pseudo-element
- Game rendering via `<pre>` elements with `textContent` (no canvas)
- `requestAnimationFrame` game loops with delta-time
- `localStorage` for score persistence
