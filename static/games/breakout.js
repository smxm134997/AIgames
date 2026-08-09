// 打砖块游戏引擎
// 接口：window.GAMES.breakout(container, opts) => { restart, destroy }
// opts: { onScore(score), onGameOver(score) }
window.GAMES = window.GAMES || {};
window.GAMES.breakout = (container, opts) => {
  const onScore = opts.onScore || (() => {});
  const onGameOver = opts.onGameOver || (() => {});
  let canvas, ctx, W = 440, H = 460;
  let paddle, ball, bricks, score, lives, running, rafId, over, won;
  const keys = {};

  function setup() {
    container.innerHTML = "";
    canvas = document.createElement("canvas");
    W = container.clientWidth || 440;
    H = 460;
    canvas.width = W; canvas.height = H;
    canvas.style.maxWidth = "100%";
    canvas.style.borderRadius = "10px";
    canvas.style.display = "block";
    canvas.style.background = "#0d1018";
    container.appendChild(canvas);
    ctx = canvas.getContext("2d");
  }

  function reset() {
    paddle = { x: W / 2 - 45, y: H - 26, w: 90, h: 12, speed: 7 };
    ball = { x: W / 2, y: H - 44, r: 7, dx: 3.2, dy: -3.2 };
    score = 0; lives = 3; over = false; won = false; running = true;
    bricks = [];
    const rows = 5, cols = 9, bw = (W - 30) / cols, bh = 18, pad = 6, top = 44;
    const palette = ["#ff5c7c", "#f5b945", "#2dd4a7", "#4cc9f0", "#7c5cff"];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      bricks.push({ x: 15 + c * bw, y: top + r * (bh + pad), w: bw - pad, h: bh, alive: true, color: palette[r] });
    }
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

  function update() {
    if (!running || over) return;
    if (keys.ArrowLeft || keys.a || keys.A) paddle.x -= paddle.speed;
    if (keys.ArrowRight || keys.d || keys.D) paddle.x += paddle.speed;
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
    ball.x += ball.dx; ball.y += ball.dy;
    if (ball.x < ball.r || ball.x > W - ball.r) ball.dx = -ball.dx;
    if (ball.y < ball.r) ball.dy = -ball.dy;
    if (ball.y + ball.r >= paddle.y && ball.y + ball.r <= paddle.y + paddle.h + 8 &&
        ball.x >= paddle.x && ball.x <= paddle.x + paddle.w && ball.dy > 0) {
      ball.dy = -Math.abs(ball.dy);
      const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      ball.dx = hit * 4.5;
    }
    for (const b of bricks) {
      if (!b.alive) continue;
      if (ball.x > b.x && ball.x < b.x + b.w && ball.y - ball.r < b.y + b.h && ball.y + ball.r > b.y) {
        b.alive = false; ball.dy = -ball.dy; score += 10; onScore(score);
      }
    }
    if (ball.y - ball.r > H) {
      lives--;
      if (lives <= 0) { over = true; onGameOver(score); }
      else { ball.x = W / 2; ball.y = H - 44; ball.dx = 3.2 * (Math.random() < 0.5 ? 1 : -1); ball.dy = -3.2; }
    }
    if (bricks.every((b) => !b.alive)) { won = true; over = true; onGameOver(score); }
  }

  function draw() {
    ctx.fillStyle = "#0d1018"; ctx.fillRect(0, 0, W, H);
    bricks.forEach((b) => { if (!b.alive) return; ctx.fillStyle = b.color; roundRect(b.x, b.y, b.w, b.h, 4); ctx.fill(); });
    ctx.fillStyle = "#7c5cff"; roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6); ctx.fill();
    ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#9aa0b0"; ctx.font = "13px sans-serif"; ctx.textAlign = "left";
    ctx.fillText("生命: " + lives, 12, 26);
    ctx.textAlign = "right"; ctx.fillText("分数: " + score, W - 12, 26);
    if (!running && !over) {
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff"; ctx.font = "18px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("已暂停 — 按空格继续", W / 2, H / 2);
    }
    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff"; ctx.font = "22px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(won ? "🎉 通关！" : "游戏结束", W / 2, H / 2 - 10);
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
    const scale = W / rect.width;
    paddle.x = (e.clientX - rect.left) * scale - paddle.w / 2;
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
  });
  canvas.addEventListener("touchmove", (e) => {
    if (!e.touches[0]) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scale = W / rect.width;
    paddle.x = (e.touches[0].clientX - rect.left) * scale - paddle.w / 2;
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
  }, { passive: false });

  return {
    restart() { cancelAnimationFrame(rafId); reset(); rafId = requestAnimationFrame(loop); },
    destroy() { cancelAnimationFrame(rafId); window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); container.innerHTML = ""; }
  };
};
