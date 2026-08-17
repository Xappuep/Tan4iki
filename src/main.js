window.SR = window.SR || {};

SR.main = function () {
  const canvas = document.getElementById("game");
  const app = document.getElementById("app");
  const end = document.getElementById("end");
  const hudBest = document.getElementById("best");
  const touch = document.getElementById("touch");

  const game = new SR.Game(canvas, {
    score: document.getElementById("score"),
    best: hudBest,
    lives: document.getElementById("lives"),
    enemies: document.getElementById("enemies"),
    status: document.getElementById("status"),
    tankLevel: document.getElementById("tank-level"),
    tankBars: document.getElementById("tank-bars"),
    effects: document.getElementById("effects"),
    shield: document.getElementById("shield"),
    killed: document.getElementById("killed")
  });

  function setPregame(on) {
    if (on) app.classList.add("pregame");
    else app.classList.remove("pregame");
    if (touch) {
      if (on) touch.classList.add("hidden");
      else touch.classList.remove("hidden");
    }
  }

  function showBest() {
    hudBest.textContent = String(SR.Game.loadBest());
  }

  function unlockAudio() {
    SR.Audio.init();
  }

  function showMenu() {
    game.stop();
    end.classList.add("hidden");
    setPregame(true);
    showBest();
    SR.Title.showMenu();
  }

  function startGame() {
    SR.Audio.init();
    SR.Title.close();
    end.classList.add("hidden");
    setPregame(false);
    game.input.dir = null;
    game.input.fire = false;
    game.start();
  }

  SR.Title.onStart = startGame;

  game.onEnd = function (result, text, score) {
    document.getElementById("end-title").textContent = result === "win" ? "Победа" : "Поражение";
    document.getElementById("end-text").textContent = text;
    document.getElementById("end-score").textContent = String(score);
    end.classList.remove("hidden");
    showBest();
  };

  document.getElementById("btn-again").addEventListener("click", startGame);
  document.getElementById("btn-menu").addEventListener("click", showMenu);

  const held = [];
  const tokenDir = {
    KeyW: 0,
    KeyA: 3,
    KeyS: 2,
    KeyD: 1,
    ArrowUp: 0,
    ArrowDown: 2,
    ArrowLeft: 3,
    ArrowRight: 1,
    pad_up: 0,
    pad_down: 2,
    pad_left: 3,
    pad_right: 1
  };

  function tokenFromEvent(event) {
    if (event.code && tokenDir[event.code] !== undefined) return event.code;
    const key = (event.key || "").toLowerCase();
    if (key === "w" || key === "ц") return "KeyW";
    if (key === "a" || key === "ф") return "KeyA";
    if (key === "s" || key === "ы") return "KeyS";
    if (key === "d" || key === "в") return "KeyD";
    if (key === "arrowup") return "ArrowUp";
    if (key === "arrowdown") return "ArrowDown";
    if (key === "arrowleft") return "ArrowLeft";
    if (key === "arrowright") return "ArrowRight";
    return null;
  }

  function syncDir() {
    game.input.dir = held.length ? tokenDir[held[held.length - 1]] : null;
  }

  function pressToken(token) {
    if (!token || tokenDir[token] === undefined) return;
    const idx = held.indexOf(token);
    if (idx >= 0) held.splice(idx, 1);
    held.push(token);
    syncDir();
  }

  function releaseToken(token) {
    if (!token) return;
    const idx = held.indexOf(token);
    if (idx >= 0) held.splice(idx, 1);
    syncDir();
  }

  window.addEventListener("keydown", function (event) {
    unlockAudio();
    if (SR.Title.active()) {
      SR.Title.handleKey(event);
      return;
    }
    if (event.code === "Space" || event.key === " ") {
      event.preventDefault();
      game.input.fire = true;
      return;
    }
    const token = tokenFromEvent(event);
    if (!token) return;
    event.preventDefault();
    if (!event.repeat) pressToken(token);
  });

  window.addEventListener("keyup", function (event) {
    if (SR.Title.active()) return;
    if (event.code === "Space" || event.key === " ") {
      game.input.fire = false;
      return;
    }
    releaseToken(tokenFromEvent(event));
  });

  window.addEventListener("pointerdown", function (event) {
    unlockAudio();
    if (!SR.Title.active()) return;
    SR.Title.handlePointer(canvas, event);
  });

  canvas.addEventListener("pointermove", function (event) {
    if (SR.Title.active()) SR.Title.handleMove(canvas, event);
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
      const token = "pad_" + btn.getAttribute("data-dir");
      bindHold(btn, function () { pressToken(token); }, function () { releaseToken(token); });
    })(pads[i]);
  }

  bindHold(document.getElementById("btn-fire"), function () {
    game.input.fire = true;
  }, function () {
    game.input.fire = false;
  });

  showBest();
  setPregame(true);
  SR.Title.begin();
  SR.session = game;
  game.loop();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", SR.main);
} else {
  SR.main();
}
