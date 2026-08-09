// 记忆翻牌游戏引擎
// 接口：window.GAMES.memory(container, opts) => { restart, destroy }
// opts: { onScore(score), onGameOver(score) }
window.GAMES = window.GAMES || {};
window.GAMES.memory = (container, opts) => {
  const onScore = opts.onScore || (() => {});
  const onGameOver = opts.onGameOver || (() => {});
  const EMOJIS = ["🎮", "🏆", "⭐", "🎯", "🎲", "🎴", "🎪", "🎨"];
  let cards, flipped, matched, moves, lockBoard, timer, seconds, finished;

  function setup() {
    container.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "memory-wrap";
    // 状态栏
    const bar = document.createElement("div");
    bar.className = "memory-bar";
    bar.innerHTML = `
      <span class="memory-stat">步数 <b id="memMoves">0</b></span>
      <span class="memory-stat">时间 <b id="memTimer">0</b>s</span>
    `;
    wrap.appendChild(bar);
    // 棋盘
    const board = document.createElement("div");
    board.className = "memory-board";
    for (let i = 0; i < 16; i++) {
      const c = document.createElement("div");
      c.className = "memory-card";
      c.dataset.index = i;
      c.addEventListener("click", () => onCardClick(i));
      board.appendChild(c);
    }
    wrap.appendChild(board);
    // 胜利遮罩
    const overlay = document.createElement("div");
    overlay.className = "memory-win hidden";
    overlay.innerHTML = `
      <div class="memory-win-inner">
        <h2>🎉 挑战成功！</h2>
        <p id="memWinText"></p>
        <button type="button" class="btn primary" id="memRestart">再来一局</button>
      </div>
    `;
    wrap.appendChild(overlay);
    container.appendChild(wrap);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function reset() {
    const deck = [...EMOJIS, ...EMOJIS];
    shuffle(deck);
    cards = deck;
    flipped = [];
    matched = 0;
    moves = 0;
    lockBoard = false;
    finished = false;
    seconds = 0;
    onScore(0);
    document.getElementById("memMoves").textContent = 0;
    document.getElementById("memTimer").textContent = 0;
    document.querySelector(".memory-win").classList.add("hidden");
    // 初始化卡片背面
    const cardEls = document.querySelectorAll(".memory-card");
    cardEls.forEach((el, i) => {
      el.classList.remove("flipped", "matched");
      el.innerHTML = "";
    });
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (finished) return;
      seconds++;
      document.getElementById("memTimer").textContent = seconds;
    }, 1000);
  }

  function onCardClick(i) {
    if (lockBoard || finished) return;
    const el = document.querySelectorAll(".memory-card")[i];
    if (el.classList.contains("flipped") || el.classList.contains("matched")) return;
    el.classList.add("flipped");
    el.textContent = cards[i];
    flipped.push({ i, el });
    if (flipped.length === 2) {
      moves++;
      document.getElementById("memMoves").textContent = moves;
      lockBoard = true;
      const [a, b] = flipped;
      if (cards[a.i] === cards[b.i]) {
        setTimeout(() => {
          a.el.classList.add("matched");
          b.el.classList.add("matched");
          matched += 2;
          flipped = [];
          lockBoard = false;
          onScore(matched / 2);
          if (matched === cards.length) win();
        }, 400);
      } else {
        setTimeout(() => {
          a.el.classList.remove("flipped");
          b.el.classList.remove("flipped");
          a.el.textContent = "";
          b.el.textContent = "";
          flipped = [];
          lockBoard = false;
        }, 800);
      }
    }
  }

  function win() {
    finished = true;
    clearInterval(timer);
    const score = Math.max(100 - moves * 3 - seconds, 0);
    onScore(score);
    document.getElementById("memWinText").textContent = `用时 ${seconds} 秒 / ${moves} 步 / 得分 ${score}`;
    document.querySelector(".memory-win").classList.remove("hidden");
    onGameOver(score);
  }

  setup();
  reset();
  document.getElementById("memRestart").addEventListener("click", reset);

  return {
    restart() { reset(); },
    destroy() { clearInterval(timer); container.innerHTML = ""; }
  };
};
