// 游戏游玩页主控：根据 ?id= 加载游戏信息并启动对应引擎
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  const HELP = {
    snake: "方向键或 WASD 控制方向，空格暂停。吃食物得分变长，撞墙或自身则游戏结束。",
    g2048: "方向键或 WASD 移动方块，相同数字合并。合成 2048 获胜，无法移动则结束。",
    breakout: "方向键 / AD 或鼠标移动挡板，空格暂停。打碎所有砖块通关，球落底丢生命。",
    memory: "点击卡片翻开，找出所有配对的图案。用时越短、步数越少，得分越高。",
    dodge: "方向键或 WASD 移动角色，空格暂停。躲避下落的彩色方块，碰到扣命，三命耗尽结束。",
    catch: "方向键 / AD 或鼠标移动篮子，空格暂停。接住水果得分，接到炸弹或漏接水果扣命。",
  };

  let controller = null;
  let currentType = null;

  const setScore = (s) => { $("score").textContent = s; };

  function startGame(type) {
    if (controller) { controller.destroy(); controller = null; }
    $("gameOverlay").classList.add("hidden");
    $("noGame").classList.add("hidden");
    const container = $("gameContainer");
    container.classList.remove("hidden");
    currentType = type;
    controller = window.GAMES[type](container, {
      onScore: setScore,
      onGameOver: (s) => showOver(s),
    });
  }

  function showOver(score) {
    $("overlayTitle").textContent = "本局结束";
    $("overlayScore").textContent = "得分 " + score;
    $("gameOverlay").classList.remove("hidden");
  }

  function restart() {
    if (controller) controller.restart();
    $("gameOverlay").classList.add("hidden");
    setScore(0);
  }

  function showNotPlayable(text) {
    $("gameContainer").classList.add("hidden");
    $("gameOverlay").classList.add("hidden");
    $("btnRestart").style.display = "none";
    $("btnRestart2").style.display = "none";
    $("playHelp").textContent = "";
    $("noGameText").textContent = text;
    $("noGame").classList.remove("hidden");
  }

  function showError(msg) {
    $("gameTitle").textContent = "出错了";
    $("gameMeta").textContent = "";
    showNotPlayable(msg);
  }

  async function init() {
    $("btnRestart").addEventListener("click", restart);
    $("btnRestart2").addEventListener("click", restart);
    if (!id) { showError("缺少游戏参数"); return; }
    try {
      const res = await fetch("/api/games/" + encodeURIComponent(id));
      if (!res.ok) throw new Error("游戏不存在");
      const game = await res.json();
      $("gameTitle").textContent = game.title || "未命名";
      const meta = [game.genre, game.platform, game.developer].filter(Boolean);
      $("gameMeta").textContent = meta.join(" · ");
      document.title = "游玩：" + (game.title || "游戏");

      const type = game.game_type;
      if (!type || !window.GAMES || !window.GAMES[type]) {
        showNotPlayable("该游戏暂未提供可在线游玩的版本。");
        return;
      }
      $("playHelp").textContent = HELP[type] || "";
      startGame(type);
    } catch (e) {
      showError(e.message || "加载失败");
    }
  }

  // 页面卸载时清理引擎
  window.addEventListener("beforeunload", () => { if (controller) controller.destroy(); });

  init();
})();
