// 躲避障碍游戏引擎
// 接口：window.GAMES.dodge(container, opts) => { restart, destroy }
// opts: { onScore(score), onGameOver(score) }
window.GAMES = window.GAMES || {};
window.GAMES.dodge = (container, opts) => {
  const onScore = opts.onScore || (() => {});
  const onGameOver = opts.onGameOver || (() => {});
  let canvas, ctx, W, H, player, obstacles, score, lives, running, rafId, over, spawnTimer, speedMul;
  const keys = {};

  function setup() {
    container.innerHTML = "";
    canvas = document.createElement("canvas");
    W = container.clientWidth || 440;
    H = 420;
    canvas.width = W; canvas.height = H;
    canvas.style.maxWidth = "100%";
    canvas.style.borderRadius = "10px";
    canvas.style.display = "block";
    canvas.style.background = "#0d1018";
    container.appendChild(canvas);
    ctx = canvas.getContext("2d");
  }

  function reset() {
    player = { x: W / 2 - 16, y: H - 50, w: 32, h: 32, speed: 5 };
    obstacles = [];
    score = 0; lives = 3; over = false; running = true;
    spawnTimer = 0;
    speedMul = 1;
    onScore(0);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function spawn() {
    const size = 14 + Math.random() * 18;
    obstacles.push({
      x: Math.random() * (W - size),
      y: -size,
      w: size, h: size,
      vy: (2 + Math.random() * 2) * speedMul,
      color: ["#ff5c7c", "#f5b945", "#4cc9f0", "#2dd4a7"][(Math.random() * 4) | 0]
    });
  }

  function update() {
    if (!running || over) return;
    if (keys.ArrowLeft || keys.a || keys.A) player.x -= player.speed;
    if (keys.ArrowRight || keys.d || keys.D) player.x += player.speed;
    if (keys.ArrowUp || keys.w || keys.W) player.y -= player.speed;
    if (keys.ArrowDown || keys.s || keys.S) player.y += player.speed;
    player.x = Math.max(0, Math.min(W - player.w, player.x));
    player.y = Math.max(0, Math.min(H - player.h, player.y));
    spawnTimer++;
    const spawnEvery = Math.max(18, 40 - speedMul * 4);
    if (spawnTimer >= spawnEvery) { spawnTimer = 0; spawn(); }
    speedMul += 0.003;
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.y += o.vy;
      if (o.y > H) { obstacles.splice(i, 1); score += 5; onScore(score); continue; }
      // 碰撞
      if (player.x < o.x + o.w && player.x + player.w > o.x &&
          player.y < o.y + o.h && player.y + player.h > o.y) {
        obstacles.splice(i, 1);
        lives--;
        if (lives <= 0) { over = true; onGameOver(score); }
        else score = Math.max(0, score - 10);
        onScore(score);
      }
    }
  }

  function draw() {
    ctx.fillStyle = "#0d1018"; ctx.fillRect(0, 0, W, H);
    // 网格
    ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // 障碍物
    for (const o of obstacles) { ctx.fillStyle = o.color; roundRect(o.x, o.y, o.w, o.h, 4); ctx.fill(); }
    // 玩家
    ctx.fillStyle = "#7c5cff"; roundRect(player.x, player.y, player.w, player.h, 6); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("◉", player.x + player.w / 2, player.y + player.h / 2 + 6);
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
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "d", "w", "s", "A", "D", "W", "S"].includes(e.key)) keys[e.key] = true;
  }
  function onKeyUp(e) { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "d", "w", "s", "A", "D", "W", "S"].includes(e.key)) keys[e.key] = false; }

  setup(); reset(); rafId = requestAnimationFrame(loop);
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKeyUp);

  return {
    restart() { cancelAnimationFrame(rafId); reset(); rafId = requestAnimationFrame(loop); },
    destroy() { cancelAnimationFrame(rafId); window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); container.innerHTML = ""; }
  };
};
