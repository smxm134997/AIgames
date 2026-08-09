// 游戏库前端逻辑：与后端 REST API 交互，负责渲染、增删改查、搜索筛选
(() => {
  "use strict";

  const API = "/api/games";
  let meta = { genres: [], platforms: [], statuses: [] };
  let pendingDeleteId = null;

  // ---------- DOM 引用 ----------
  const $ = (id) => document.getElementById(id);
  const grid = $("grid");
  const empty = $("empty");
  const search = $("search");
  const filterGenre = $("filterGenre");
  const filterStatus = $("filterStatus");
  const btnAdd = $("btnAdd");

  const modal = $("modal");
  const modalTitle = $("modalTitle");
  const gameForm = $("gameForm");
  const formError = $("formError");
  const modalClose = $("modalClose");
  const modalCancel = $("modalCancel");

  const confirmModal = $("confirmModal");
  const confirmText = $("confirmText");
  const confirmOk = $("confirmOk");
  const confirmCancel = $("confirmCancel");

  const toast = $("toast");

  // 详情面板
  const detailModal = $("detailModal");
  const detailClose = $("detailClose");
  const detailCover = $("detailCover");
  const detailTitle = $("detailTitle");
  const detailGenre = $("detailGenre");
  const detailMeta = $("detailMeta");
  const detailDesc = $("detailDesc");
  const detailInfo = $("detailInfo");
  const detailEdit = $("detailEdit");
  const detailDel = $("detailDel");
  const detailPlay = $("detailPlay");
  let currentDetail = null;

  // ---------- 工具函数 ----------
  async function api(url, opts = {}) {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* 无 body */ }
    if (!res.ok) {
      const msg = (data && data.errors) ? data.errors.join("；") : (data && data.error) || "请求失败";
      throw new Error(msg);
    }
    return data;
  }

  function showToast(msg, type = "") {
    toast.textContent = msg;
    toast.className = "toast" + (type ? " " + type : "");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.add("hidden"), 2400);
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function coverHtml(game) {
    if (game.cover_url) {
      return `<img class="cover" src="${escapeHtml(game.cover_url)}" alt="封面" loading="lazy"
                onerror="this.outerHTML='<div class=\\'cover-fallback\\'>🎮</div>'" />`;
    }
    return `<div class="cover-fallback">🎮</div>`;
  }

  // ---------- 加载元信息 ----------
  async function loadMeta() {
    try {
      meta = await api("/api/meta");
    } catch (_) { meta = { genres: [], platforms: [], statuses: ["未玩", "在玩", "已通关"] }; }
    // 填充筛选下拉
    meta.genres.forEach((g) => {
      const o = document.createElement("option");
      o.value = g; o.textContent = g;
      filterGenre.appendChild(o);
    });
    // 填充表单下拉
    const fGenre = $("f_genre");
    const fPlatform = $("f_platform");
    meta.genres.forEach((g) => {
      const o = document.createElement("option");
      o.value = g; o.textContent = g;
      fGenre.appendChild(o);
    });
    meta.platforms.forEach((p) => {
      const o = document.createElement("option");
      o.value = p; o.textContent = p;
      fPlatform.appendChild(o);
    });
    // 可玩游戏类型下拉
    const fGameType = $("f_game_type");
    if (meta.game_types) {
      Object.entries(meta.game_types).forEach(([v, label]) => {
        const o = document.createElement("option");
        o.value = v; o.textContent = label;
        fGameType.appendChild(o);
      });
    }
  }

  // ---------- 渲染 ----------
  function renderGames(games) {
    if (!games.length) {
      grid.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");
    grid.innerHTML = games.map((g) => `
      <article class="card" data-id="${escapeHtml(g.id)}">
        ${coverHtml(g)}
        <div class="card-body">
          <h3 class="card-title">${escapeHtml(g.title)}</h3>
          <div class="card-meta">
            ${g.genre ? `<span class="tag genre">${escapeHtml(g.genre)}</span>` : ""}
            ${g.platform ? `<span>🎮 ${escapeHtml(g.platform)}</span>` : ""}
            ${g.release_year ? `<span>📅 ${escapeHtml(g.release_year)}</span>` : ""}
            ${g.developer ? `<span>👤 ${escapeHtml(g.developer)}</span>` : ""}
          </div>
          <div class="card-meta">
            ${g.rating ? `<span class="rating">★ ${escapeHtml(g.rating)}</span>` : ""}
            <span class="status-dot status-${escapeHtml(g.play_status)}">● ${escapeHtml(g.play_status)}</span>
          </div>
          ${g.description ? `<p class="card-desc">${escapeHtml(g.description)}</p>` : ""}
          <div class="card-foot">
            ${g.game_type ? '<button class="btn-play" data-act="play">▶ 开始游戏</button>' : '<span class="no-play">暂不可玩</span>'}
            <div class="card-foot-btns">
              <button class="icon-btn" data-act="edit" title="编辑">✏️</button>
              <button class="icon-btn" data-act="del" title="删除">🗑️</button>
            </div>
          </div>
        </div>
      </article>
    `).join("");
  }

  async function loadGames() {
    const params = new URLSearchParams();
    if (search.value.trim()) params.set("q", search.value.trim());
    if (filterGenre.value) params.set("genre", filterGenre.value);
    if (filterStatus.value) params.set("status", filterStatus.value);
    try {
      const games = await api(`${API}?${params}`);
      renderGames(games);
    } catch (e) {
      showToast(e.message, "error");
      renderGames([]);
    }
  }

  async function loadStats() {
    try {
      const s = await api("/api/stats");
      $("statTotal").textContent = s.total;
      $("statPlaying").textContent = s.by_status["在玩"] || 0;
      $("statFinished").textContent = s.by_status["已通关"] || 0;
      $("statAvg").textContent = s.avg_rating;
    } catch (_) { /* 忽略统计错误 */ }
  }

  async function refresh() {
    await Promise.all([loadGames(), loadStats()]);
  }

  // ---------- 模态框 ----------
  function openModal(game = null) {
    formError.textContent = "";
    // 关闭详情面板，避免叠加
    if (!detailModal.classList.contains("hidden")) closeDetail();
    if (game) {
      modalTitle.textContent = "编辑游戏";
      $("f_id").value = game.id;
      $("f_title").value = game.title || "";
      $("f_genre").value = game.genre || "";
      $("f_platform").value = game.platform || "";
      $("f_release_year").value = game.release_year || "";
      $("f_developer").value = game.developer || "";
      $("f_rating").value = game.rating ?? "";
      $("f_play_status").value = game.play_status || "未玩";
      $("f_cover_url").value = game.cover_url || "";
      $("f_description").value = game.description || "";
      $("f_game_type").value = game.game_type || "";
    } else {
      modalTitle.textContent = "添加游戏";
      gameForm.reset();
      $("f_id").value = "";
      $("f_play_status").value = "未玩";
    }
    modal.classList.remove("hidden");
    $("f_title").focus();
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  // ---------- 详情面板 ----------
  function renderDetail(game) {
    currentDetail = game;
    // 封面大图
    if (game.cover_url) {
      detailCover.innerHTML = `<img src="${escapeHtml(game.cover_url)}" alt="封面"
        onerror="this.outerHTML='<div class=\\'detail-cover-fallback\\'>🎮</div>'" />`;
    } else {
      detailCover.innerHTML = `<div class="detail-cover-fallback">🎮</div>`;
    }
    detailTitle.textContent = game.title || "未命名";
    if (game.genre) {
      detailGenre.textContent = game.genre;
      detailGenre.style.display = "";
    } else {
      detailGenre.style.display = "none";
    }
    // 元信息行
    const metaParts = [];
    if (game.platform) metaParts.push(`🎮 ${escapeHtml(game.platform)}`);
    if (game.release_year) metaParts.push(`📅 ${escapeHtml(game.release_year)}`);
    if (game.developer) metaParts.push(`👤 ${escapeHtml(game.developer)}`);
    if (game.rating) metaParts.push(`<span class="rating">★ ${escapeHtml(game.rating)}</span>`);
    if (game.play_status) metaParts.push(`<span class="status-dot status-${escapeHtml(game.play_status)}">● ${escapeHtml(game.play_status)}</span>`);
    detailMeta.innerHTML = metaParts.join("");
    // 简介
    if (game.description) {
      detailDesc.textContent = game.description;
      detailDesc.classList.remove("empty");
    } else {
      detailDesc.textContent = "暂无简介";
      detailDesc.classList.add("empty");
    }
    // 详细信息表
    const rows = [
      ["开发商", game.developer],
      ["发行年份", game.release_year],
      ["平台", game.platform],
      ["分类", game.genre],
      ["评分", game.rating != null ? `★ ${game.rating}` : ""],
      ["游玩状态", game.play_status],
      ["创建时间", game.created_at],
      ["更新时间", game.updated_at],
    ].filter(([, v]) => v !== "" && v != null);
    detailInfo.innerHTML = rows.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join("");
  }

  async function openDetail(id) {
    try {
      const game = await api(`${API}/${id}`);
      renderDetail(game);
      detailModal.classList.remove("hidden");
      const panel = detailModal.querySelector(".detail-modal");
      if (panel) panel.scrollTop = 0;
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  function closeDetail() {
    detailModal.classList.add("hidden");
    currentDetail = null;
  }

  async function submitForm(e) {
    e.preventDefault();
    formError.textContent = "";
    const id = $("f_id").value;
    const payload = {
      title: $("f_title").value,
      genre: $("f_genre").value,
      platform: $("f_platform").value,
      release_year: $("f_release_year").value,
      developer: $("f_developer").value,
      rating: $("f_rating").value,
      play_status: $("f_play_status").value,
      cover_url: $("f_cover_url").value,
      description: $("f_description").value,
      game_type: $("f_game_type").value,
    };
    try {
      if (id) {
        await api(`${API}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        showToast("已更新", "ok");
      } else {
        await api(API, { method: "POST", body: JSON.stringify(payload) });
        showToast("已添加", "ok");
      }
      closeModal();
      await refresh();
      // 若详情面板正展示该游戏，则刷新详情内容
      if (id && currentDetail && currentDetail.id === id) {
        await openDetail(id);
      }
    } catch (err) {
      formError.textContent = err.message;
    }
  }

  // ---------- 删除确认 ----------
  function askDelete(id, title) {
    pendingDeleteId = id;
    confirmText.textContent = `确定删除「${title}」吗？此操作不可撤销。`;
    confirmModal.classList.remove("hidden");
  }

  async function doDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    pendingDeleteId = null;
    confirmModal.classList.add("hidden");
    try {
      await api(`${API}/${id}`, { method: "DELETE" });
      showToast("已删除", "ok");
      if (currentDetail && currentDetail.id === id) closeDetail();
      await refresh();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  // ---------- 事件绑定 ----------
  // 网格事件委托：点按钮执行对应操作，点卡片其他区域打开详情
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;
    const btn = e.target.closest("[data-act]");
    if (btn) {
      if (btn.dataset.act === "play") {
        location.href = "/play.html?id=" + encodeURIComponent(id);
        return;
      }
      if (btn.dataset.act === "edit") {
        api(`${API}/${id}`).then(openModal).catch((err) => showToast(err.message, "error"));
      } else if (btn.dataset.act === "del") {
        const title = card.querySelector(".card-title").textContent;
        askDelete(id, title);
      }
      return;
    }
    openDetail(id);
  });

  btnAdd.addEventListener("click", () => openModal(null));
  modalClose.addEventListener("click", closeModal);
  modalCancel.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  gameForm.addEventListener("submit", submitForm);

  confirmOk.addEventListener("click", doDelete);
  confirmCancel.addEventListener("click", () => { pendingDeleteId = null; confirmModal.classList.add("hidden"); });
  confirmModal.addEventListener("click", (e) => { if (e.target === confirmModal) { pendingDeleteId = null; confirmModal.classList.add("hidden"); } });

  // 详情面板事件
  detailClose.addEventListener("click", closeDetail);
  detailModal.addEventListener("click", (e) => { if (e.target === detailModal) closeDetail(); });
  detailEdit.addEventListener("click", () => { if (currentDetail) openModal(currentDetail); });
  detailDel.addEventListener("click", () => { if (currentDetail) askDelete(currentDetail.id, currentDetail.title); });
  detailPlay.addEventListener("click", () => { if (currentDetail) location.href = "/play.html?id=" + encodeURIComponent(currentDetail.id); });

  // 搜索防抖
  let debounce;
  search.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(loadGames, 250);
  });
  filterGenre.addEventListener("change", loadGames);
  filterStatus.addEventListener("change", loadGames);

  // ESC 关闭
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!modal.classList.contains("hidden")) closeModal();
      if (!confirmModal.classList.contains("hidden")) { pendingDeleteId = null; confirmModal.classList.add("hidden"); }
      if (!detailModal.classList.contains("hidden")) closeDetail();
    }
  });

  // ---------- 初始化 ----------
  (async function init() {
    await loadMeta();
    await refresh();
  })();
})();
