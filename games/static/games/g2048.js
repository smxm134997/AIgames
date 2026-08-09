// 2048 游戏引擎
// 接口：window.GAMES.g2048(container, opts) => { restart, destroy }
// opts: { onScore(score), onGameOver(score) }
window.GAMES = window.GAMES || {};
window.GAMES.g2048 = (container, opts) => {
  const onScore = opts.onScore || (() => {});
  const onGameOver = opts.onGameOver || (() => {});
  const SIZE = 4;
  let grid, score, won, over, board, cells;

  const COLORS = {
    2: "#3a4053", 4: "#464d68", 8: "#5b4cf0", 16: "#7c5cff", 32: "#9a4cf0",
    64: "#ff5c7c", 128: "#f5b945", 256: "#2dd4a7", 512: "#4cc9f0",
    1024: "#ffd166", 2048: "#ffd166",
  };

  function setup() {
    container.innerHTML = "";
    board = document.createElement("div");
    board.className = "g2048-board";
    cells = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      const c = document.createElement("div");
      c.className = "g2048-cell";
      board.appendChild(c);
      cells.push(c);
    }
    container.appendChild(board);
  }

  function reset() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    score = 0; won = false; over = false;
    addRandom(); addRandom();
    onScore(0);
    render();
  }

  function addRandom() {
    const empty = [];
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (grid[r][c] === 0) empty.push([r, c]);
    if (!empty.length) return;
    const [r, c] = empty[(Math.random() * empty.length) | 0];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function render() {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c];
      const cell = cells[r * SIZE + c];
      cell.textContent = v || "";
      cell.style.background = v ? (COLORS[v] || "#7c5cff") : "";
      cell.style.color = v >= 8 ? "#fff" : "#cfd3e0";
      cell.style.fontSize = v >= 1024 ? "22px" : v >= 128 ? "26px" : "30px";
    }
  }

  function slide(row) {
    const arr = row.filter((v) => v);
    let gained = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) { arr[i] *= 2; gained += arr[i]; arr.splice(i + 1, 1); }
    }
    while (arr.length < SIZE) arr.push(0);
    return { row: arr, gained };
  }

  const transpose = (m) => m[0].map((_, c) => m.map((r) => r[c]));
  const reverseRows = (m) => m.map((r) => r.slice().reverse());

  function move(dir) {
    if (over) return;
    let mg = grid.map((r) => r.slice());
    if (dir === 2) mg = reverseRows(mg);        // right
    if (dir === 1) mg = transpose(mg);          // up
    if (dir === 3) mg = reverseRows(transpose(mg)); // down
    let totalGain = 0;
    const newMg = mg.map((row) => { const res = slide(row); totalGain += res.gained; return res.row; });
    let result = newMg;
    if (dir === 2) result = reverseRows(result);
    if (dir === 1) result = transpose(result);
    if (dir === 3) result = transpose(reverseRows(result));
    let moved = false;
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (grid[r][c] !== result[r][c]) moved = true;
    if (!moved) return;
    grid = result;
    score += totalGain;
    onScore(score);
    if (!won && grid.flat().includes(2048)) won = true;
    addRandom();
    render();
    if (!canMove()) { over = true; onGameOver(score); }
  }

  function canMove() {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return true;
      if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return true;
      if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return true;
    }
    return false;
  }

  const keyMap = { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, ArrowDown: 3, a: 0, w: 1, d: 2, s: 3, A: 0, W: 1, D: 2, S: 3 };
  function onKey(e) {
    if (keyMap[e.key] !== undefined) { e.preventDefault(); move(keyMap[e.key]); }
  }

  setup();
  reset();
  window.addEventListener("keydown", onKey);

  return {
    restart() { reset(); },
    destroy() { window.removeEventListener("keydown", onKey); container.innerHTML = ""; }
  };
};
