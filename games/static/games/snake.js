// 贪吃蛇游戏引擎
// 接口：window.GAMES.snake(container, opts) => { restart, destroy }
// opts: { onScore(score), onGameOver(score) }
window.GAMES = window.GAMES || {};
window.GAMES.snake = (container, opts) => {
  const onScore = opts.onScore || (() => {});
  const onGameOver = opts.onGameOver || (() => {});
  const COLS = 20, ROWS = 20;
  let cell = 22;
  let canvas, ctx;
  let snake, dir, nextDir, food, score, dead, paused, speed, lastTick, rafId;

  function setup() {
    container.innerHTML = "";
    canvas = document.createElement("canvas");
    const w = container.clientWidth || 440;
    cell = Math.max(12, Math.floor(w / COLS));
    canvas.width = cell * COLS;
    canvas.height = cell * ROWS;
    canvas.style.maxWidth = "100%";
    canvas.style.borderRadius = "10px";
    canvas.style.display = "block";
    canvas.style.background = "#0d1018";
    container.appendChild(canvas);
    ctx = canvas.getContext("2d");
  }

  function reset() {
    snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    dead = false;
    paused = false;
    speed = 130;
    lastTick = 0;
    placeFood();
    onScore(0);
  }

  function placeFood() {
    while (true) {
      const f = { x: (Math.random() * COLS) | 0, y: (Math.random() * ROWS) | 0 };
      if (!snake.some((s) => s.x === f.x && s.y === f.y)) { food = f; return; }
    }
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

  function step() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return gameOver();
    if (snake.some((s) => s.x === head.x && s.y === head.y)) return gameOver();
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      onScore(score);
      if (speed > 60) speed -= 3;
      placeFood();
    } else {
      snake.pop();
    }
  }

  function gameOver() {
    dead = true;
    onGameOver(score);
  }

  function draw() {
    ctx.fillStyle = "#0d1018";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 1; i < COLS; i++) { ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, canvas.height); ctx.stroke(); }
    for (let j = 1; j < ROWS; j++) { ctx.beginPath(); ctx.moveTo(0, j * cell); ctx.lineTo(canvas.width, j * cell); ctx.stroke(); }
    // 食物
    ctx.fillStyle = "#ff5c7c";
    roundRect(food.x * cell + 2, food.y * cell + 2, cell - 4, cell - 4, 4); ctx.fill();
    // 蛇
    snake.forEach((s, i) => {
      const t = i / snake.length;
      ctx.fillStyle = i === 0 ? "#9a6bff" : `hsl(${255 - t * 40}, 70%, ${65 - t * 18}%)`;
      roundRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2, 5); ctx.fill();
    });
    if (paused && !dead) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff"; ctx.font = "16px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("已暂停 — 按空格继续", canvas.width / 2, canvas.height / 2);
    }
    if (dead) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff"; ctx.font = "22px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("游戏结束", canvas.width / 2, canvas.height / 2 - 8);
      ctx.font = "14px sans-serif";
      ctx.fillText("得分 " + score, canvas.width / 2, canvas.height / 2 + 18);
    }
  }

  function loop(ts) {
    if (dead) { draw(); return; }
    if (!lastTick) lastTick = ts;
    if (!paused && ts - lastTick >= speed) { step(); lastTick = ts; }
    draw();
    rafId = requestAnimationFrame(loop);
  }

  const keyMap = {
    ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
    W: { x: 0, y: -1 }, S: { x: 0, y: 1 }, A: { x: -1, y: 0 }, D: { x: 1, y: 0 },
  };

  function onKey(e) {
    if (e.key === " ") { e.preventDefault(); if (!dead) { paused = !paused; lastTick = 0; } return; }
    if (keyMap[e.key]) {
      e.preventDefault();
      const nd = keyMap[e.key];
      if (nd.x === -dir.x && nd.y === -dir.y) return;
      nextDir = nd;
    }
  }

  function start() { reset(); rafId = requestAnimationFrame(loop); }

  setup();
  start();
  window.addEventListener("keydown", onKey);

  return {
    restart() { cancelAnimationFrame(rafId); start(); },
    destroy() { cancelAnimationFrame(rafId); window.removeEventListener("keydown", onKey); container.innerHTML = ""; }
  };
};
