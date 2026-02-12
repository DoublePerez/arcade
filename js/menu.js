// ========== GAME SELECTION MENU ==========

var MENU_TEXT =
    "\n" +
    "  +============================================+\n" +
    "  |                                            |\n" +
    "  |      R E T R O   A R C A D E              |\n" +
    "  |      T E R M I N A L                       |\n" +
    "  |                                            |\n" +
    "  |============================================|\n" +
    "  |                                            |\n" +
    "  |   [1]  ASCII PONG                          |\n" +
    "  |        Classic paddle vs CPU               |\n" +
    "  |        Controls: W/S to move               |\n" +
    "  |        First to 7 wins!                    |\n" +
    "  |                                            |\n" +
    "  |--------------------------------------------|\n" +
    "  |                                            |\n" +
    "  |   [2]  TIC TAC TOE                         |\n" +
    "  |        Classic X vs O against CPU          |\n" +
    "  |        WASD/Arrows + Enter to play         |\n" +
    "  |        First to 3 wins!                    |\n" +
    "  |                                            |\n" +
    "  |--------------------------------------------|\n" +
    "  |                                            |\n" +
    "  |   [3]  B I N G O                           |\n" +
    "  |        Classic 5x5 vs CPU                  |\n" +
    "  |        Manual or Auto mark mode            |\n" +
    "  |                                            |\n" +
    "  |--------------------------------------------|\n" +
    "  |                                            |\n" +
    "  |   [4]  S N A K E                           |\n" +
    "  |        Classic arcade snake                |\n" +
    "  |        WASD/Arrows to steer                |\n" +
    "  |        Eat food, grow longer!              |\n" +
    "  |                                            |\n" +
    "  |--------------------------------------------|\n" +
    "  |                                            |\n" +
    "  |   [5]  SPACE INVADERS                      |\n" +
    "  |        Classic alien shooter               |\n" +
    "  |        A/D to move, SPACE to fire          |\n" +
    "  |        Survive the waves!                  |\n" +
    "  |                                            |\n" +
    "  |--------------------------------------------|\n" +
    "  |                                            |\n" +
    "  |   [6]  SCORE BOARD                         |\n" +
    "  |        View match history + stats          |\n" +
    "  |                                            |\n" +
    "  |--------------------------------------------|\n" +
    "  |                                            |\n" +
    "  |   [7]  SCORE KEEPER                        |\n" +
    "  |        Manual score tracker                |\n" +
    "  |        +1 / -1 / Reset per team            |\n" +
    "  |                                            |\n" +
    "  |--------------------------------------------|\n" +
    "  |                                            |\n" +
    "  |   Press 1-7 to select                      |\n" +
    "  |   ESC to return here from any game         |\n" +
    "  |                                            |\n" +
    "  +============================================+\n";

function initMenu() {
    var art = document.getElementById("menu-art");
    art.textContent = MENU_TEXT;
}

function handleMenuKey(e) {
    if (e.key === "1") {
        showScreen("screen-pong");
    } else if (e.key === "2") {
        showScreen("screen-ttt");
    } else if (e.key === "3") {
        showScreen("screen-bingo");
    } else if (e.key === "4") {
        showScreen("screen-snake");
    } else if (e.key === "5") {
        showScreen("screen-invaders");
    } else if (e.key === "6") {
        showScreen("screen-scores");
    } else if (e.key === "7") {
        showScreen("screen-keeper");
    }
}
