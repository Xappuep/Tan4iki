window.SR = window.SR || {};

SR.Shop = {
  open: false,
  selected: 0,
  game: null,
  onContinue: null,
  hits: [],

  ITEMS: [
    { id: "repair", name: "РЕМКОМПЛЕКТ ШТАБА", desc: "Полностью чинит базу", cost: 250 },
    { id: "shield", name: "БРОНЕПЛАСТИНЫ", desc: "Щит на следующий рубеж", cost: 350 },
    { id: "speed", name: "ФОРСАЖ ДВИГАТЕЛЯ", desc: "+10% скорости, до 2 ур.", cost: 450 },
    { id: "reload", name: "МЕХАНИЗМ ЗАРЯЖАНИЯ", desc: "−12% перезарядки, до 2 ур.", cost: 500 },
    { id: "ammo", name: "УСИЛЕННЫЙ БОЕПРИПАС", desc: "+1 урон в участок стены", cost: 600 },
    { id: "life", name: "ДОПОЛНИТЕЛЬНАЯ ЖИЗНЬ", desc: "Ещё одна машина, макс. 5", cost: 750 },
    { id: "emp", name: "РЕЗЕРВНЫЙ ИМПУЛЬС", desc: "Заряд EMP, клавиша E", cost: 550 }
  ],

  active: function () {
    return this.open;
  },

  status: function (game, item) {
    if (item.id === "repair") {
      if (game.baseHp >= game.baseMaxHp) return "locked";
    } else if (item.id === "shield") {
      if ((game.shieldRanks || 0) >= 2) return "max";
    } else if (item.id === "speed") {
      if ((game.speedRanks || 0) >= 2) return "max";
    } else if (item.id === "reload") {
      if ((game.reloadRanks || 0) >= 2) return "max";
    } else if (item.id === "ammo") {
      if (game.ammoBoost) return "max";
    } else if (item.id === "life") {
      if ((game.lives || 0) >= 5) return "locked";
    } else if (item.id === "emp") {
      if ((game.empCharges || 0) >= 1) return "max";
    }
    if ((game.supply || 0) < item.cost) return "poor";
    return "ok";
  },

  extra: function (game, item) {
    if (item.id === "speed") return "ур. " + (game.speedRanks || 0) + "/2";
    if (item.id === "reload") return "ур. " + (game.reloadRanks || 0) + "/2";
    if (item.id === "shield") return (game.shieldRanks || 0) + "/2";
    if (item.id === "ammo") return game.ammoBoost ? "куплено" : "1 ур.";
    if (item.id === "emp") return (game.empCharges || 0) ? "есть заряд" : "нет";
    if (item.id === "life") return (game.lives || 0) + "/5";
    if (item.id === "repair") return game.baseHp >= game.baseMaxHp ? "база цела" : "база повреждена";
    return "";
  },

  label: function (st) {
    if (st === "ok") return "КУПИТЬ";
    if (st === "poor") return "МАЛО СНАБЖЕНИЯ";
    if (st === "max") return "КУПЛЕНО";
    return "НЕДОСТУПНО";
  },

  buy: function (id) {
    const game = this.game;
    const item = this.ITEMS.filter(function (it) { return it.id === id; })[0];
    if (!game || !item) return;
    const st = this.status(game, item);
    if (st !== "ok") return;
    game.supply -= item.cost;
    if (id === "repair") game.baseHp = game.baseMaxHp;
    if (id === "shield") game.shieldRanks = Math.min(2, (game.shieldRanks || 0) + 1);
    if (id === "speed") game.speedRanks = Math.min(2, (game.speedRanks || 0) + 1);
    if (id === "reload") game.reloadRanks = Math.min(2, (game.reloadRanks || 0) + 1);
    if (id === "ammo") game.ammoBoost = 1;
    if (id === "life") game.lives = Math.min(5, (game.lives || 0) + 1);
    if (id === "emp") game.empCharges = 1;
    if (game.player && !game.player.dead) game.player.applyLevel(game.tankLevel);
    try { SR.Audio.buy(); } catch (err) {}
    this.refresh();
    game.updateHud();
  },

  show: function (game, info) {
    this.game = game;
    this.open = true;
    this.selected = 0;
    info = info || {};
    const root = document.getElementById("shop");
    const lead = document.getElementById("shop-lead");
    if (lead) {
      lead.textContent = "Рубеж " + ((info.index || 0) + 1) + " удержан. Награда снабжения: " + (info.reward || 0);
    }
    if (root) root.classList.remove("hidden");
    this.refresh();
    this.drawTank();
  },

  hide: function () {
    this.open = false;
    const root = document.getElementById("shop");
    if (root) root.classList.add("hidden");
  },

  refresh: function () {
    const game = this.game;
    const list = document.getElementById("shop-list");
    const funds = document.getElementById("shop-supply");
    if (funds && game) funds.textContent = String(game.supply || 0);
    if (!list || !game) return;
    list.innerHTML = "";
    this.hits = [];
    for (let i = 0; i < this.ITEMS.length; i++) {
      const item = this.ITEMS[i];
      const st = this.status(game, item);
      const row = document.createElement("div");
      row.className = "shop-row" + (this.selected === i ? " selected" : "") + (st !== "ok" ? " dim" : "");
      row.setAttribute("data-id", item.id);
      const icon = document.createElement("canvas");
      icon.width = 28;
      icon.height = 28;
      icon.className = "shop-icon";
      this.drawIcon(icon.getContext("2d"), item.id);
      const body = document.createElement("div");
      body.className = "shop-body";
      body.innerHTML = "<strong>" + item.name + "</strong><span>" + item.desc + " · " + this.extra(game, item) + "</span>";
      const side = document.createElement("div");
      side.className = "shop-side";
      const price = document.createElement("div");
      price.className = "shop-price";
      price.textContent = String(item.cost);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = this.label(st);
      btn.disabled = st !== "ok";
      (function (shop, id) {
        btn.addEventListener("click", function () { shop.buy(id); });
        row.addEventListener("click", function () { shop.selected = shop.ITEMS.map(function (it) { return it.id; }).indexOf(id); shop.refresh(); });
      })(this, item.id);
      side.appendChild(price);
      side.appendChild(btn);
      row.appendChild(icon);
      row.appendChild(body);
      row.appendChild(side);
      list.appendChild(row);
    }
    const next = document.getElementById("btn-next-level");
    if (next) next.classList.toggle("selected", this.selected >= this.ITEMS.length);
  },

  drawIcon: function (ctx, id) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#1a160c";
    ctx.fillRect(0, 0, 28, 28);
    if (id === "repair") {
      ctx.fillStyle = "#d4a017";
      ctx.fillRect(6, 18, 16, 6);
      ctx.fillStyle = "#c45c26";
      ctx.fillRect(10, 6, 8, 12);
    } else if (id === "shield") {
      ctx.fillStyle = "#3a8bdc";
      ctx.fillRect(8, 6, 12, 16);
      ctx.fillStyle = "#8cd0ff";
      ctx.fillRect(10, 8, 8, 4);
    } else if (id === "speed") {
      ctx.fillStyle = "#e09028";
      ctx.fillRect(4, 12, 18, 6);
      ctx.fillStyle = "#f4c450";
      ctx.fillRect(20, 10, 6, 10);
    } else if (id === "reload") {
      ctx.fillStyle = "#c8d4e0";
      ctx.fillRect(8, 4, 6, 20);
      ctx.fillStyle = "#f4c430";
      ctx.fillRect(14, 10, 10, 8);
    } else if (id === "ammo") {
      ctx.fillStyle = "#f4c430";
      ctx.fillRect(12, 4, 6, 16);
      ctx.fillStyle = "#c45c26";
      ctx.fillRect(10, 18, 10, 6);
    } else if (id === "life") {
      ctx.fillStyle = "#3dba4c";
      ctx.fillRect(8, 8, 12, 12);
      ctx.fillRect(10, 4, 8, 4);
    } else if (id === "emp") {
      ctx.fillStyle = "#b45aff";
      ctx.fillRect(6, 6, 16, 16);
      ctx.fillStyle = "#f0d0ff";
      ctx.fillRect(12, 8, 4, 12);
    }
  },

  drawTank: function () {
    const canvas = document.getElementById("shop-tank");
    if (!canvas || !SR.Render) return;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#2a2412";
    ctx.fillRect(0, 0, 96, 96);
    ctx.save();
    ctx.translate(34, 34);
    const pal = SR.Render.colorsFor("player", { tankLevel: (this.game && this.game.tankLevel) || 1 });
    SR.Render.drawT34(ctx, pal, (this.game && this.game.tankLevel) || 1);
    ctx.restore();
  },

  handleKey: function (event) {
    if (!this.open) return false;
    const down = event.code === "KeyS" || event.code === "ArrowDown" || event.key === "s" || event.key === "ы";
    const up = event.code === "KeyW" || event.code === "ArrowUp" || event.key === "w" || event.key === "ц";
    const go = event.code === "Enter" || event.code === "Space" || event.key === " ";
    if (down || up || go) event.preventDefault();
    if (down && !event.repeat) {
      this.selected = Math.min(this.ITEMS.length, this.selected + 1);
      try { SR.Audio.nav(); } catch (err) {}
      this.refresh();
    }
    if (up && !event.repeat) {
      this.selected = Math.max(0, this.selected - 1);
      try { SR.Audio.nav(); } catch (err) {}
      this.refresh();
    }
    if (go && !event.repeat) {
      if (this.selected >= this.ITEMS.length) this.continue();
      else this.buy(this.ITEMS[this.selected].id);
    }
    return true;
  },

  continue: function () {
    if (!this.open) return;
    this.hide();
    if (this.onContinue) this.onContinue();
  }
};
