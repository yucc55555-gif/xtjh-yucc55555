// ======================================================================
// Excel 函數大全速查手冊 - 互動應用程式主邏輯
// ======================================================================

// 整合全系列函數資料集 (優先使用包含406函數的總字典，若無則使用精選70)
const functionsData = (window.allExcelFunctions && window.allExcelFunctions.length > 0)
  ? window.allExcelFunctions
  : (window.top70Functions || []);

// 確保每一項都有正確的 cardImage 路徑
functionsData.forEach(item => {
  if (!item.cardImage) {
    item.cardImage = `cards/func-${item.id}.png`;
  }
  if (!item.image) {
    item.image = `cards/func-${item.id}.png`;
  }
});

// 當前篩選與檢視狀態
let currentCategory = 'all';
let searchQuery = '';
let currentView = 'cards'; // 'cards' | 'cardGallery'

// Modal 狀態
let currentModalFuncId = null;

// 應用程式初始化
document.addEventListener("DOMContentLoaded", () => {
  updateCategoryBadges();
  const statsEl = document.getElementById("searchStats");
  if (statsEl) {
    statsEl.textContent = `共收錄 ${functionsData.length} 個常用與專業 Excel 函數（全數配備 406 張獨立繁體中文高清圖卡）`;
  }
  renderSidebar();
  renderCards();
  renderCardGallery();
  initScrollSpy();
  initBackToTop();
});

// 動態更新各分類計數徽章
function updateCategoryBadges() {
  const counts = {
    all: functionsData.length,
    top70: functionsData.filter(f => f.isTop70).length,
    dynamic: functionsData.filter(f => f.cat === 'dynamic').length,
    lookup: functionsData.filter(f => f.cat === 'lookup').length,
    math: functionsData.filter(f => f.cat === 'math').length,
    stat: functionsData.filter(f => f.cat === 'stat').length,
    text: functionsData.filter(f => f.cat === 'text').length,
    logic: functionsData.filter(f => f.cat === 'logic').length,
    datetime: functionsData.filter(f => f.cat === 'datetime').length,
    finance: functionsData.filter(f => f.cat === 'finance').length,
    info: functionsData.filter(f => f.cat === 'info').length,
    db: functionsData.filter(f => f.cat === 'db').length,
    eng: functionsData.filter(f => f.cat === 'eng').length,
    web: functionsData.filter(f => f.cat === 'web').length,
    cube: functionsData.filter(f => f.cat === 'cube').length,
    compat: functionsData.filter(f => f.cat === 'compat').length
  };

  for (const [key, val] of Object.entries(counts)) {
    const el = document.getElementById(`badge-${key}`);
    if (el) el.textContent = val;
  }
}

// 渲染左側目錄索引
function renderSidebar() {
  const sidebarList = document.getElementById("sidebarList");
  if (!sidebarList) return;

  const filtered = getFilteredData();
  const sidebarCount = document.getElementById("sidebarCount");
  if (sidebarCount) sidebarCount.textContent = `${filtered.length} 個項目`;

  if (filtered.length === 0) {
    sidebarList.innerHTML = '<li style="padding:15px; color:#94a3b8; font-size:0.85rem; text-align:center;">無符合項目</li>';
    return;
  }

  sidebarList.innerHTML = filtered.map(item => `
    <li class="sidebar-item" id="sidebar-item-${item.id}" onclick="scrollToFunction(${item.id})">
      <div>
        <span style="color:#94a3b8; font-size:0.75rem; margin-right:4px;">#${String(item.id).padStart(3, '0')}</span>
        <span class="fn-name">${item.name}</span>
      </div>
      <span class="fn-tag">${(item.zh || '').split('/')[0].trim()}</span>
    </li>
  `).join('');
}

// 渲染卡片清單 (卡片詳解模式)
function renderCards() {
  const cardsGrid = document.getElementById("cardsGrid");
  const emptyState = document.getElementById("emptyState");
  if (!cardsGrid || !emptyState) return;

  const filtered = getFilteredData();

  if (filtered.length === 0) {
    cardsGrid.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  if (currentView === 'cards') {
    cardsGrid.style.display = "grid";
    emptyState.style.display = "none";
  }

  cardsGrid.innerHTML = filtered.map(item => {
    // 範例表格渲染 (適用於圖解重點函數)
    let tableHtml = '';
    if (item.tableHeader && item.tableRows && item.tableRows.length > 0) {
      tableHtml = `
        <div class="demo-table-wrapper">
          <table class="mini-excel-table">
            <thead>
              <tr>
                ${item.tableHeader.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${item.tableRows.map(row => `
                <tr>
                  ${row.map(cell => {
                    if (typeof cell === 'object') {
                      return `<td colspan="${cell.colspan || 1}" class="${cell.highlight ? 'highlight-cell' : ''}">${cell.text}</td>`;
                    }
                    return `<td>${cell}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    const isTop = !!item.isTop70;
    const tagBadgeHtml = isTop
      ? `<span class="badge-tag-pill badge-top70-tag">⭐ 精選70圖解</span>`
      : `<span class="badge-tag-pill badge-all-tag">${item.catName || 'Excel 函數'}</span>`;

    const footerRefHtml = isTop
      ? `<span style="color:#10b981; font-weight:600; font-size:0.8rem;">⭐ 核心精選</span>`
      : `<span style="color:#64748b; font-size:0.78rem;">✨ 官方標準函數</span>`;

    return `
      <article class="func-card" id="func-${item.id}">
        <div class="card-header">
          <div class="func-title-group">
            <span class="func-num">#${String(item.id).padStart(3, '0')}</span>
            <span class="func-title">${highlightText(item.name)}</span>
            <span class="func-zh">${highlightText(item.zh)}</span>
            ${tagBadgeHtml}
          </div>
          <div class="card-actions">
            <button class="icon-action-btn" title="查看高清獨立圖卡" onclick="openImageModalById(${item.id})">
              🖼️
            </button>
            <button class="icon-action-btn" title="複製公式" onclick="copyFormulaById(${item.id})">
              📋
            </button>
          </div>
        </div>

        <div class="card-body">
          <div class="func-desc-box">
            <span class="desc-label">💡 作用：</span>${highlightText(item.desc)}
          </div>

          <div class="formula-box">
            <span class="formula-code">${highlightText(item.formula)}</span>
            <button class="copy-btn" onclick="copyFormulaById(${item.id})">
              複製公式
            </button>
          </div>

          <div class="example-box">
            <div class="example-title">📌 範例說明</div>
            <div>${highlightText(item.example)}</div>
            ${tableHtml}
          </div>
        </div>

        <div class="card-footer">
          <span>類別：<strong>${item.catName || '其他'}</strong></span>
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn-card-img" onclick="openImageModalById(${item.id})">
              🖼️ 查看圖卡
            </button>
            ${footerRefHtml}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// 渲染406張獨立圖卡畫廊 (圖卡畫廊模式)
function renderCardGallery() {
  const container = document.getElementById("cardGalleryGrid");
  const emptyState = document.getElementById("emptyState");
  if (!container) return;

  const filtered = getFilteredData();

  if (filtered.length === 0) {
    container.style.display = "none";
    if (currentView === 'cardGallery' && emptyState) {
      emptyState.style.display = "block";
    }
    return;
  }

  if (currentView === 'cardGallery') {
    container.style.display = "grid";
    if (emptyState) emptyState.style.display = "none";
  }

  container.innerHTML = filtered.map(item => `
    <div class="gallery-img-card" id="gallery-card-${item.id}">
      <div class="img-thumb-wrap" onclick="openImageModalById(${item.id})">
        <img src="cards/func-${item.id}.png" alt="${item.name} (${item.zh})" loading="lazy">
        <div class="img-overlay-hover">
          <span>🔍 放大檢視圖卡</span>
        </div>
      </div>
      <div class="card-info-bar">
        <div style="display:flex; align-items:center; gap:6px; min-width:0; overflow:hidden;">
          <span class="func-num">#${String(item.id).padStart(3, '0')}</span>
          <strong style="font-family:Consolas, monospace; font-size:0.95rem; white-space:nowrap;">${highlightText(item.name)}</strong>
          <span style="font-size:0.8rem; color:#64748b; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${highlightText(item.zh)}</span>
        </div>
        <div style="display:flex; gap:6px; flex-shrink:0;">
          <button class="icon-action-btn" title="查看圖卡大圖" onclick="openImageModalById(${item.id})">🖼️</button>
          <button class="icon-action-btn" title="複製公式" onclick="copyFormulaById(${item.id})">📋</button>
        </div>
      </div>
    </div>
  `).join('');
}



// 取得過濾後的資料集
function getFilteredData() {
  return functionsData.filter(item => {
    // 分類過濾
    if (currentCategory === 'top70') {
      if (!item.isTop70) return false;
    } else if (currentCategory !== 'all') {
      if (item.cat !== currentCategory) return false;
    }

    // 搜尋過濾
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const target = (
        (item.name || '') + ' ' + 
        (item.zh || '') + ' ' + 
        (item.desc || '') + ' ' + 
        (item.formula || '') + ' ' + 
        (item.example || '') + ' ' + 
        (item.keywords || '') + ' ' +
        (item.catName || '')
      ).toLowerCase();

      // 支援多關鍵字以空白分隔
      const terms = q.split(/\s+/).filter(Boolean);
      return terms.every(term => target.includes(term));
    }

    return true;
  });
}

// 處理搜尋輸入
function handleSearch(val) {
  searchQuery = val;
  const clearBtn = document.getElementById("searchClearBtn");
  if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';

  const filtered = getFilteredData();
  const statsEl = document.getElementById("searchStats");
  if (statsEl) {
    statsEl.textContent = val.trim() 
      ? `🔍 搜尋「${val}」共找到 ${filtered.length} 個函數` 
      : `共收錄 ${functionsData.length} 個常用與專業 Excel 函數（全數配備 406 張獨立繁體中文高清圖卡）`;
  }

  renderSidebar();
  renderCards();
  renderCardGallery();
}

// 清除搜尋
function clearSearch() {
  const input = document.getElementById("searchInput");
  if (input) {
    input.value = '';
    input.focus();
  }
  handleSearch('');
}

// 設定分類篩選
function setCategory(cat, el) {
  currentCategory = cat;
  document.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("active"));
  if (el) el.classList.add("active");

  const titles = {
    'all': '📚 全部 Excel 函數完整清單 (共收錄 406 個)',
    'top70': '⭐ 必學 70 大核心圖解函數 (附完整範例表與獨立圖卡)',
    'dynamic': '⚡ 現代動態陣列與全新函數 (Excel 365 / 2021+ 強大新特性)',
    'lookup': '🔍 查找與引用函數 (VLOOKUP, XLOOKUP, INDEX, MATCH 等)',
    'math': '🔢 數學與三角運算函數',
    'stat': '📊 統計分析函數 (平均、極值、排名、常態分佈等)',
    'text': '📝 文字處理函數 (字串擷取、轉換、合併、替換)',
    'logic': '🔀 邏輯判斷函數 (IF, IFS, SWITCH, 條件閘)',
    'datetime': '📅 日期與時間函數 (天數計算、工作日、時間提取)',
    'finance': '💰 財務金融函數 (房貸年金、現值、終值、投資回報)',
    'info': 'ℹ️ 資訊檢測函數 (資料類型判斷、錯誤捕捉、儲存格屬性)',
    'db': '🗄️ 資料庫函數 (DSUM, DCOUNT 等結構化清單運算)',
    'eng': '⚙️ 工程換算函數 (單位轉換、進制換算)',
    'web': '🌐 網路 Web 函數 (API 資料擷取與 XML 解析)',
    'cube': '🧊 Cube 多維資料集函數',
    'compat': '🔄 舊版相容性函數 (向下相容舊版活頁簿)'
  };

  const titleEl = document.getElementById("currentSectionTitle");
  if (titleEl) {
    titleEl.innerHTML = `<span>${titles[cat] || '函數清單'}</span>`;
  }

  renderSidebar();
  renderCards();
  renderCardGallery();
}

// 重置所有條件回到首頁
function resetAllFilters() {
  searchQuery = '';
  const input = document.getElementById("searchInput");
  if (input) input.value = '';
  const clearBtn = document.getElementById("searchClearBtn");
  if (clearBtn) clearBtn.style.display = 'none';
  const statsEl = document.getElementById("searchStats");
  if (statsEl) {
    statsEl.textContent = `共收錄 ${functionsData.length} 個常用與專業 Excel 函數（全數配備 406 張獨立繁體中文高清圖卡）`;
  }
  setCategory('all', document.querySelector('.cat-pill'));
  switchView('cards');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 切換視圖 (卡片詳解模式 vs 406張圖卡模式)
function switchView(view) {
  currentView = view;
  const cardsGrid = document.getElementById("cardsGrid");
  const cardGalleryGrid = document.getElementById("cardGalleryGrid");
  const emptyState = document.getElementById("emptyState");

  const btnCards = document.getElementById("btnViewCards");
  const btnCardGallery = document.getElementById("btnViewCardGallery");

  if (!cardsGrid || !cardGalleryGrid || !emptyState) return;

  // 重置按鈕狀態
  if (btnCards) btnCards.classList.remove("active");
  if (btnCardGallery) btnCardGallery.classList.remove("active");

  if (view === 'cards') {
    cardsGrid.style.display = "grid";
    cardGalleryGrid.style.display = "none";
    if (btnCards) btnCards.classList.add("active");
    renderCards();
  } else if (view === 'cardGallery') {
    cardsGrid.style.display = "none";
    cardGalleryGrid.style.display = "grid";
    if (btnCardGallery) btnCardGallery.classList.add("active");
    renderCardGallery();
  }
}

// 點選目錄平滑滾動到目標函數卡片並高亮
function scrollToFunction(id) {
  if (currentView !== 'cards' && currentView !== 'cardGallery') {
    switchView('cards');
  }

  // 如果當前分類遮蔽了該項目，重設為全部
  const targetItem = functionsData.find(f => f.id === id);
  if (currentCategory !== 'all' && targetItem) {
    if (currentCategory === 'top70' && !targetItem.isTop70) {
      setCategory('all', document.querySelector('.cat-pill'));
    } else if (currentCategory !== 'top70' && targetItem.cat !== currentCategory) {
      setCategory('all', document.querySelector('.cat-pill'));
    }
  }

  const targetSelector = (currentView === 'cardGallery') ? `gallery-card-${id}` : `func-${id}`;
  const card = document.getElementById(targetSelector) || document.getElementById(`func-${id}`);
  if (card) {
    const navHeight = 135;
    const top = card.getBoundingClientRect().top + window.pageYOffset - navHeight;
    window.scrollTo({ top, behavior: 'smooth' });

    // 高亮動畫
    card.classList.add('highlight');
    setTimeout(() => {
      card.classList.remove('highlight');
    }, 2000);

    // 標記左側選中項目
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    const sidebarItem = document.getElementById(`sidebar-item-${id}`);
    if (sidebarItem) sidebarItem.classList.add('active');
  }
}

// 依 ID 複製公式
function copyFormulaById(id) {
  const item = functionsData.find(f => f.id === id);
  if (item && item.formula) {
    copyFormula(item.formula);
  }
}

// 複製公式至剪貼簿
function copyFormula(formula) {
  navigator.clipboard.writeText(formula).then(() => {
    showToast(`已複製公式：${formula}`);
  }).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = formula;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(`已複製公式：${formula}`);
  });
}

// 依 ID 打開獨立圖卡視窗
function openImageModalById(id) {
  currentModalFuncId = id;
  updateModalContent();
}

// Modal 內部切換上一個 / 下一個函數
function navigateModal(offset) {
  if (currentModalFuncId === null) return;
  const filtered = getFilteredData();
  const list = (filtered.length > 0) ? filtered : functionsData;
  const currentIndex = list.findIndex(f => f.id === currentModalFuncId);
  if (currentIndex === -1) return;

  let newIndex = currentIndex + offset;
  if (newIndex < 0) newIndex = list.length - 1;
  if (newIndex >= list.length) newIndex = 0;

  const newItem = list[newIndex];
  currentModalFuncId = newItem.id;
  updateModalContent();
}

// 更新 Modal 內容與介面
function updateModalContent() {
  const modal = document.getElementById("detailModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalSubtitle = document.getElementById("modalSubtitle");
  const modalBody = document.getElementById("modalBody");

  if (!modal || !modalTitle || !modalSubtitle || !modalBody || currentModalFuncId === null) return;

  const item = functionsData.find(f => f.id === currentModalFuncId);
  if (!item) return;

  const filtered = getFilteredData();
  const list = (filtered.length > 0) ? filtered : functionsData;
  const currentIndex = list.findIndex(f => f.id === currentModalFuncId);
  const prevItem = list[(currentIndex - 1 + list.length) % list.length];
  const nextItem = list[(currentIndex + 1) % list.length];

  const cardImgSrc = `cards/func-${item.id}.png`;

  modalTitle.textContent = `#${String(item.id).padStart(3, '0')} ${item.name} (${item.zh})`;
  modalSubtitle.textContent = `分類：${item.catName || 'Excel 函數'} ｜ 函數序號：${currentIndex + 1} / ${list.length}`;

  modalBody.innerHTML = `
    <div class="modal-img-container">
      <img src="${cardImgSrc}" alt="${item.name} (${item.zh})">
    </div>

    <div class="modal-footer-nav">
      <div class="modal-nav-btns">
        <button class="btn btn-outline" onclick="navigateModal(-1)" title="快捷鍵：鍵盤向左鍵 ←">
          ⬅ 上一個 (#${String(prevItem.id).padStart(3, '0')} ${prevItem.name})
        </button>
        <button class="btn btn-outline" onclick="navigateModal(1)" title="快捷鍵：鍵盤向右鍵 →">
          下一個 (#${String(nextItem.id).padStart(3, '0')} ${nextItem.name}) ➡
        </button>
      </div>

      <div class="modal-action-btns">
        <a href="${cardImgSrc}" target="_blank" download="func-${item.id}-${item.name}.png" class="btn btn-primary">
          ⬇ 下載此圖卡 (PNG)
        </a>
        <button class="btn btn-outline" onclick="copyFormulaById(${item.id})">
          📋 複製公式
        </button>
        <button class="btn btn-outline" onclick="closeModal(); scrollToFunction(${item.id})">
          🎯 在列表中定位
        </button>
      </div>
    </div>
  `;

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

// 彈出 Toast 訊息
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// 高亮搜尋關鍵字
function highlightText(text) {
  if (!searchQuery.trim() || !text) return text;
  const terms = searchQuery.trim().split(/\s+/).filter(Boolean);
  let pattern = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  return text.replace(regex, '<mark style="background:#fef08a; padding:1px 3px; border-radius:3px;">$1</mark>');
}

// 打開指定圖片檢視彈出視窗
function openImageModal(imgSrc, title) {
  const modal = document.getElementById("detailModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalSubtitle = document.getElementById("modalSubtitle");
  const modalBody = document.getElementById("modalBody");

  if (!modal || !modalTitle || !modalSubtitle || !modalBody) return;

  modalTitle.textContent = title;
  modalSubtitle.textContent = `對應圖片檔案：${imgSrc}`;
  modalBody.innerHTML = `
    <div class="modal-img-container">
      <img src="${imgSrc}" alt="${title}">
    </div>
    <div style="text-align:center; margin-top:14px;">
      <a href="${imgSrc}" target="_blank" class="btn btn-primary" download="${imgSrc}">
        ⬇ 下載 / 在新分頁檢視原圖
      </a>
    </div>
  `;

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

// 關閉 Modal
function closeModal(e) {
  const modal = document.getElementById("detailModal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
  }
}

// 鍵盤監聽事件 (ESC關閉、左右箭頭切換圖卡)
document.addEventListener("keydown", (e) => {
  const modal = document.getElementById("detailModal");
  const isModalActive = modal && modal.classList.contains("active");

  if (e.key === "Escape") {
    closeModal();
  } else if (isModalActive && e.key === "ArrowLeft") {
    navigateModal(-1);
  } else if (isModalActive && e.key === "ArrowRight") {
    navigateModal(1);
  }
});

// 初始化回頂部懸浮按鍵
function initBackToTop() {
  const btn = document.getElementById("backToTopBtn");
  if (!btn) return;
  window.addEventListener("scroll", () => {
    if (window.scrollY > 350) {
      btn.classList.add("show");
    } else {
      btn.classList.remove("show");
    }
  });
}

// 回到頂端 (回首頁)
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 目錄滾動監聽 (Scroll Spy)
function initScrollSpy() {
  let timeout;
  window.addEventListener("scroll", () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (currentView !== 'cards') return;
      const cards = document.querySelectorAll(".func-card");
      let currentId = null;

      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        if (rect.top <= 200 && rect.bottom >= 200) {
          currentId = card.id.replace("func-", "");
        }
      });

      if (currentId) {
        document.querySelectorAll(".sidebar-item").forEach(item => item.classList.remove("active"));
        const activeSidebar = document.getElementById(`sidebar-item-${currentId}`);
        if (activeSidebar) {
          activeSidebar.classList.add("active");
        }
      }
    }, 100);
  });
}
