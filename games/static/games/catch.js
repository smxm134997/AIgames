// 接水果游戏引擎
// 接口：window.GAMES.catch(container, opts) => { restart, destroy }
// opts: { onScore(score), onGameOver(score) }
window.GAMES = window.GAMES || {};
window.GAMES.catch = (container, opts) => {
  const onScore = opts.onScore || (() => {});
  const onGameOver = opts.onGameOver || (() => {});
  let canvas, ctx, W, H, basket, items, score, lives, running, rafId, over, spawnTimer, speedMul;
  const keys = {};
  const FRUITS = ["🍎", "🍊", "🍇", "🍓", "🍉", "🍒", "🥝", "🍑"];
  const BOMB = "💣";

  function setup() {
    container.innerHTML = "";
    canvas = document.createElement("canvas");
    W = container.clientWidth || 440;
    H = 440;
    canvas.width = W; canvas.height = H;
    canvas.style.maxWidth = "100%";
    canvas.style.borderRadius = "10px";
    canvas.style.display = "block";
    canvas.style.background = "#0d1018";
    container.appendChild(canvas);
    ctx = canvas.getContext("2d");
  }

  function reset() {
    basket = { x: W / 2 - 50, y: H - 40, w: 100, h: 18, speed: 7 };
    items = [];
    score = 0; lives = 3; over = false; running = true;
    spawnTimer = 0; speedMul = 1;
    onScore(0);
  }

  function spawn() {
    const isBomb = Math.random() < 0.18;
    items.push({
      x: 10 + Math.random() * (W - 30),
      y: -30,
      r: 18,
      vy: (1.8 + Math.random() * 2) * speedMul,
      emoji: isBomb ? BOMB : FRUITS[(Math.random() * FRUITS.length) | 0],
      bomb: isBomb,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.1,
    });
  }

  function update() {
    if (!running || over) return;
    if (keys.ArrowLeft || keys.a || keys.A) basket.x -= basket.speed;
    if (keys.ArrowRight || keys.d || keys.D) basket.x += basket.speed;
    basket.x = Math.max(0, Math.min(W - basket.w, basket.x));
    spawnTimer++;
    const spawnEvery = Math.max(16, 36 - speedMul * 3);
    if (spawnTimer >= spawnEvery) { spawnTimer = 0; spawn(); }
    speedMul += 0.004;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.y += it.vy; it.rot += it.vr;
      // 落底
      if (it.y - it.r > H) {
        items.splice(i, 1);
        if (!it.bomb) { lives--; if (lives <= 0) { over = true; onGameOver(score); } }
        continue;
      }
      // 接住
      if (it.y + it.r >= basket.y && it.y - it.r <= basket.y + basket.h &&
          it.x >= basket.x && it.x <= basket.x + basket.w) {
        items.splice(i, 1);
        if (it.bomb) { lives--; if (lives <= 0) { over = true; onGameOver(score); } }
        else { score += 10; onScore(score); }
      }
    }
  }

  function draw() {
    ctx.fillStyle = "#0d1018"; ctx.fillRect(0, 0, W, H);
    // 地面
    ctx.fillStyle = "#1a1f2e"; ctx.fillRect(0, H - 10, W, 10);
    // 物品
    ctx.font = "28px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const it of items) {
      ctx.save();
      ctx.translate(it.x, it.y); ctx.rotate(it.rot);
      ctx.fillText(it.emoji, 0, 0);
      ctx.restore();
    }
    // 篮子
    ctx.fillStyle = "#8b6f47";
    ctx.beginPath();
    ctx.moveTo(basket.x, basket.y);
    ctx.lineTo(basket.x + basket.w, basket.y);
    ctx.lineTo(basket.x + basket.w - 10, basket.y + basket.h);
    ctx.lineTo(basket.x + 10, basket.y + basket.h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#a0825a";
    ctx.fillRect(basket.x, basket.y, basket.w, 4);
    // HUD
    ctx.fillStyle = "#9aa0b0"; ctx.font = "13px sans-serif"; ctx.textAlign = "left";
    ctx.fillText("生命: " + lives, 12, 24);
    ctx.textAlign = "right"; ctx.fillText("分数: " + score, W - 12, 24);
    if (!running && !over) {
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff"; ctx.font = "18px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("已暂停 — 按空格继续", W / 2, H / 2);
    }
    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff"; ctx.font = "22px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("游戏结束", W / 2, H / 2 - 10);
      ctx.font = "14px sans-serif"; ctx.fillText("得分 " + score, W / 2, H / 2 + 18);
    }
  }

  function loop() { update(); draw(); rafId = requestAnimationFrame(loop); }

  function onKey(e) {
    if (e.key === " ") { e.preventDefault(); if (!over) running = !running; return; }
    if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(e.key)) keys[e.key] = true;
  }
  function onKeyUp(e) { if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(e.key)) keys[e.key] = false; }

  setup(); reset(); rafId = requestAnimationFrame(loop);
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    basket.x = ((e.clientX - rect.left) / rect.width) * W - basket.w / 2;
    basket.x = Math.max(0, Math.min(W - basket.w, basket.x));
  });
  canvas.addEventListener("touchmove", (e) => {
    if (!e.touches[0]) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    basket.x = ((e.touches[0].clientX - rect.left) / rect.width) * W - basket.w / 2;
    basket.x = Math.max(0, Math.min(W - basket.w, basket.x));
  }, { passive: false });

  return {
    restart() { cancelAnimationFrame(rafId); reset(); rafId = requestAnimationFrame(loop); },
    destroy() { cancelAnimationFrame(rafId); window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); container.innerHTML = ""; }
  };
};
