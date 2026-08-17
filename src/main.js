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

  function showMenu() {
    game.stop();
    end.classList.add("hidden");
    menu.classList.remove("hidden");
    showBest();
  }

  function startGame() {
    SR.Audio.init();
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
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    KeyW: "up",
    KeyA: "left",
    KeyS: "down",
    KeyD: "right"
  };
  const dirValue = { up: 0, right: 1, down: 2, left: 3 };

  function syncDir() {
    game.input.dir = dirStack.length ? dirValue[dirStack[dirStack.length - 1]] : null;
  }

  function pressDir(name) {
    const idx = dirStack.indexOf(name);
    if (idx >= 0) dirStack.splice(idx, 1);
    dirStack.push(name);
    syncDir();
  }

  function releaseDir(name) {
    const idx = dirStack.indexOf(name);
    if (idx >= 0) dirStack.splice(idx, 1);
    syncDir();
  }

  window.addEventListener("keydown", function (event) {
    if (event.code === "Space") {
      event.preventDefault();
      game.input.fire = true;
      return;
    }
    const name = keyMap[event.code];
    if (!name) return;
    event.preventDefault();
    pressDir(name);
  });

  window.addEventListener("keyup", function (event) {
    if (event.code === "Space") {
      game.input.fire = false;
      return;
    }
    const name = keyMap[event.code];
    if (!name) return;
    releaseDir(name);
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

  const pads = document.querySelectorAll(".pad");
  for (let i = 0; i < pads.length; i++) {
    (function (btn) {
      const name = btn.getAttribute("data-dir");
      bindHold(btn, function () { pressDir(name); }, function () { releaseDir(name); });
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
