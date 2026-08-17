window.SR = window.SR || {};

SR.main = function () {
  const canvas = document.getElementById("game");
  const menu = document.getElementById("menu");
  const end = document.getElementById("end");
  const menuBest = document.getElementById("menu-best");
  const hudBest = document.getElementById("best");

  const game = new SR.Game(canvas, {
    score: document.getElementById("score"),
    best: hudBest,
    lives: document.getElementById("lives"),
    enemies: document.getElementById("enemies"),
    status: document.getElementById("status")
  });

  function showBest() {
    const best = SR.Game.loadBest();
    menuBest.textContent = String(best);
    hudBest.textContent = String(best);
  }

  function unlockAudio() {
    SR.Audio.init();
    if (game.state === "menu") SR.Audio.playTheme();
  }

  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);

  function showMenu() {
    game.stop();
    end.classList.add("hidden");
    menu.classList.remove("hidden");
    showBest();
    SR.Audio.playTheme();
  }

  function startGame() {
    SR.Audio.init();
    SR.Audio.stopTheme();
    menu.classList.add("hidden");
    end.classList.add("hidden");
    game.start();
  }

  game.onEnd = function (result, text, score) {
    document.getElementById("end-title").textContent = result === "win" ? "Победа" : "Поражение";
    document.getElementById("end-text").textContent = text;
    document.getElementById("end-score").textContent = String(score);
    end.classList.remove("hidden");
    showBest();
  };

  document.getElementById("btn-start").addEventListener("click", startGame);
  document.getElementById("btn-again").addEventListener("click", startGame);
  document.getElementById("btn-menu").addEventListener("click", showMenu);

  const dirStack = [];
  const keyMap = {
    KeyW: 0,
    KeyA: 2,
    KeyS: 3,
    KeyD: 1,
    ArrowUp: 0,
    ArrowDown: 2,
    ArrowLeft: 3,
    ArrowRight: 1
  };

  function syncDir() {
    game.input.dir = dirStack.length ? dirStack[dirStack.length - 1] : null;
  }

  window.addEventListener("keydown", function (event) {
    if (event.code === "Space") {
      event.preventDefault();
      game.input.fire = true;
      return;
    }
    if (!(event.code in keyMap)) return;
    event.preventDefault();
    const dir = keyMap[event.code];
    const idx = dirStack.indexOf(dir);
    if (idx >= 0) dirStack.splice(idx, 1);
    dirStack.push(dir);
    syncDir();
  });

  window.addEventListener("keyup", function (event) {
    if (event.code === "Space") {
      game.input.fire = false;
      return;
    }
    if (!(event.code in keyMap)) return;
    const dir = keyMap[event.code];
    const idx = dirStack.indexOf(dir);
    if (idx >= 0) dirStack.splice(idx, 1);
    syncDir();
  });

  function bindHold(el, on, off) {
    const start = function (event) {
      event.preventDefault();
      el.classList.add("active");
      on();
    };
    const stop = function (event) {
      event.preventDefault();
      el.classList.remove("active");
      off();
    };
    el.addEventListener("pointerdown", start);
    el.addEventListener("pointerup", stop);
    el.addEventListener("pointerleave", stop);
    el.addEventListener("pointercancel", stop);
  }

  const padDirs = { up: 0, down: 2, left: 3, right: 1 };
  const pads = document.querySelectorAll(".pad");
  for (let i = 0; i < pads.length; i++) {
    (function (btn) {
      const dir = padDirs[btn.getAttribute("data-dir")];
      bindHold(btn, function () {
        const idx = dirStack.indexOf(dir);
        if (idx >= 0) dirStack.splice(idx, 1);
        dirStack.push(dir);
        syncDir();
      }, function () {
        const idx = dirStack.indexOf(dir);
        if (idx >= 0) dirStack.splice(idx, 1);
        syncDir();
      });
    })(pads[i]);
  }

  bindHold(document.getElementById("btn-fire"), function () {
    game.input.fire = true;
  }, function () {
    game.input.fire = false;
  });

  showBest();
  SR.session = game;
  game.loop();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", SR.main);
} else {
  SR.main();
}
