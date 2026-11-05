// ============================================================================
// 偉大航道七年級數學探險島 - 主互動控制器 (完全參照 JDPS-SS 3D 低多邊形海島體驗)
// ============================================================================

let currentStudent = null;
let currentStage = null;
let currentUnitId = 1; // 預設第一單元
let currentQuizIndex = 0;
let currentQuizAnswers = [];
let currentMatchState = {
  leftItems: [],
  shuffledOptions: [],
  userSlots: [] // 每個左側題目配對到的右側選項
};
let selectedOptionIdx = null; // 支援點選配對
let isTreasureSpawned = false; // 神秘寶箱是否出現中
let treasureSpawnTimer = null;
let quizTimerInterval = null;
let quizSeconds = 0;
let selectedLoginCharId = 'luffy';
let isBgmPlaying = false;

// ----------------------------------------------------------------------------
// 國中數學科教科書標準印刷格式排版引擎 (Textbook Math Typography Engine)
// ----------------------------------------------------------------------------
function renderTextbookMath(text) {
  if (!text) return '';
  let str = String(text);

  // 1. 若環境有載入 KaTeX 且字串含有 $...$ 則優先用 KaTeX 渲染
  if (typeof katex !== 'undefined') {
    str = str.replace(/\$([^\$]+)\$/g, (match, expr) => {
      try {
        return katex.renderToString(expr, { throwOnError: false, displayMode: false });
      } catch (e) {
        return match;
      }
    });
  }

  // 2. 次方上標轉換 (支援英文字母 a-z、幾何符號 △、□、○、★、及括號運算式)
  const supMap = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '-': '⁻', '+': '⁺', '=': '⁼', '(': '⁽', ')': '⁾',
    'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
    'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ',
    'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ',
    'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
    'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ'
  };

  // 2.1 支援 ^{...}
  str = str.replace(/\^\{([^\}]+)\}/g, (m, exp) => `<sup>${exp}</sup>`);

  // 2.2 支援 ^(...)
  str = str.replace(/\^\(([^)]+)\)/g, (m, exp) => `<sup>(${exp})</sup>`);

  // 2.3 支援幾何圖形上標 ^△, ^□, ^○, ^★, ^◇, ^■, ^▲
  str = str.replace(/\^([△□○★◇■▲])/g, (m, sym) => `<sup>${sym}</sup>`);

  // 2.4 支援常規字符上標 ^[0-9a-zA-Z+-=]
  str = str.replace(/\^([0-9a-zA-Z\+\-\=]+)/g, (m, exp) => {
    const allInMap = Array.from(exp).every(c => supMap[c]);
    if (allInMap) {
      return Array.from(exp).map(c => supMap[c]).join('');
    }
    return `<sup>${exp}</sup>`;
  });

  // 3. 乘除與正負運算符號標準教科書化 (保護 HTML 標籤屬性)
  str = str.replace(/(?![^<]*>)\s*\*\s*/g, ' × ');
  str = str.replace(/(?![^<]*>)\s*\+\s*/g, ' ＋ ');
  str = str.replace(/(?![^<]*>)\s*=\s*/g, ' ＝ ');
  str = str.replace(/(?![^<]*>)\s*!=\s*/g, ' ≠ ');
  str = str.replace(/(?![^<]*>)\s*<=\s*/g, ' ≦ ');
  str = str.replace(/(?![^<]*>)\s*>=\s*/g, ' ≧ ');

  // 4. 負號與括號標準教科書印刷化 (去掉多餘空格，如 ( - 4) -> (－4), - 152 -> －152)
  str = str.replace(/\(\s*-\s*([0-9a-zA-Z\.\/]+)\s*\)/g, '(－$1)');
  str = str.replace(/(^|[\s(＝+×÷])-\s*([0-9]+)/g, '$1－$2');
  str = str.replace(/(^|[\s(＝+×÷])－\s*([0-9]+)/g, '$1－$2');
  str = str.replace(/([0-9]+)\s*-\s*([0-9]+)/g, '$1 － $2');

  return str;
}

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  updateGasStatusDisplay();
  initSchoolDatalist();
  initCharacterPickers();

  currentStudent = dataService.getCurrentStudent();
  if (!currentStudent) {
    showStudentLoginModal();
  } else {
    refreshStudentProfileUI();
  }

  renderUnitTabs();
  renderLeftStagesList();
  render3DIslandMap();

  // 啟動航海神秘寶箱隨機觸發偵測器
  initTreasureRandomSpawner();
}

function updateGasStatusDisplay() {
  const isOnline = dataService.isGasConfigured();
  const textEl = document.getElementById('gasStatusText');
  const indicator = document.querySelector('#headerGasStatus .status-indicator');
  if (isOnline) {
    textEl.textContent = '🟢 已同步給老師 (GAS試算表)';
    if (indicator) indicator.style.background = '#059669';
  } else {
    textEl.textContent = '🟡 本機模式 (可設定GAS同步)';
    if (indicator) indicator.style.background = '#f59e0b';
  }
}

function initSchoolDatalist() {
  const dl = document.getElementById('schoolOptions');
  if (!dl) return;
  dl.innerHTML = PRESET_SCHOOLS.map(s => `<option value="${s}"></option>`).join('');
}

function initCharacterPickers() {
  const picker = document.getElementById('characterPicker');
  if (picker) {
    picker.innerHTML = ONE_PIECE_CHARACTERS.map(c => `
      <div class="char-btn ${currentStudent && currentStudent.characterId === c.id ? 'active' : ''}" onclick="changePartner('${c.id}')" title="${c.name} - ${c.title}">
        <div class="char-icon">${c.svgAvatar}</div>
        <div class="char-name">${c.name.split('・')[1] || c.name}</div>
      </div>
    `).join('');
  }

  const loginPicker = document.getElementById('loginCharSelector');
  if (loginPicker) {
    loginPicker.innerHTML = ONE_PIECE_CHARACTERS.map(c => `
      <div class="char-btn ${selectedLoginCharId === c.id ? 'active' : ''}" onclick="selectLoginCharacter('${c.id}')">
        <div class="char-icon">${c.svgAvatar}</div>
        <div class="char-name">${c.name.split('・')[1] || c.name}</div>
      </div>
    `).join('');
  }
}

function selectLoginCharacter(charId) {
  selectedLoginCharId = charId;
  const loginPicker = document.getElementById('loginCharSelector');
  loginPicker.querySelectorAll('.char-btn').forEach(btn => btn.classList.remove('active'));
  event.currentTarget.classList.add('active');
}

function changePartner(charId) {
  if (!currentStudent) return;
  currentStudent = dataService.updateStudentCharacter(charId);
  refreshStudentProfileUI();
  initCharacterPickers();
  updateSailingAvatar();
}

function refreshStudentProfileUI() {
  if (!currentStudent) return;
  document.getElementById('profileName').textContent = currentStudent.name;
  document.getElementById('profileSchoolClass').textContent = `${currentStudent.school}・${currentStudent.className}班 ${currentStudent.seatNo}號`;

  const exp = currentStudent.exp || 0;
  let rank = PIRATE_RANKS[0];
  for (let r of PIRATE_RANKS) {
    if (exp >= r.minExp) rank = r;
  }
  document.getElementById('profileRankTitle').textContent = `${rank.icon} ${rank.title}`;
  document.getElementById('statExp').textContent = exp;
  document.getElementById('statBounty').textContent = `฿ ${(currentStudent.bounty || 0).toLocaleString()}`;
  
  const completedCount = (currentStudent.completedStages || []).length;
  document.getElementById('statProgress').textContent = completedCount;
  
  // 計算星數加總
  let starsTotal = 0;
  const starsMap = currentStudent.stageStars || {};
  Object.values(starsMap).forEach(s => starsTotal += s);
  document.getElementById('statStarsSum').textContent = starsTotal;
  document.getElementById('topStarsCount').textContent = starsTotal;

  // 渲染學生已通過群島與下一站推薦島嶼
  renderStudentRecommendation();

  const partner = ONE_PIECE_CHARACTERS.find(c => c.id === currentStudent.characterId) || ONE_PIECE_CHARACTERS[0];
  document.getElementById('profileAvatar').innerHTML = partner.svgAvatar;

  updateSailingAvatar();
  renderLeftStagesList();
  render3DIslandMap();
}

// ----------------------------------------------------------------------------
// 渲染學生「已通過之群島(>=60分)」並推薦前往下一座島嶼 (需求 2)
// ----------------------------------------------------------------------------
function renderStudentRecommendation() {
  const container = document.getElementById('studentRecommendationCard');
  if (!container || !currentStudent) return;

  const completed = currentStudent.completedStages || [];
  const bestScores = currentStudent.stageBestScores || {};

  // 檢查各群島通過情況 (群島內關卡全部 >= 60 分)
  const passedUnits = [];
  ISLAND_UNITS.forEach(u => {
    const stagesInUnit = STAGES_DATA.filter(s => s.unitId === u.id);
    const passedStagesInUnit = stagesInUnit.filter(s => {
      const score = bestScores[s.id] || 0;
      return completed.includes(s.id) || score >= 60;
    });

    if (passedStagesInUnit.length === stagesInUnit.length && stagesInUnit.length > 0) {
      passedUnits.push(u);
    }
  });

  const nextStage = getNextAvailableStage();
  const nextUnit = nextStage ? (ISLAND_UNITS.find(u => u.id === nextStage.unitId) || ISLAND_UNITS[0]) : null;

  let passedUnitsHtml = '';
  if (passedUnits.length > 0) {
    passedUnitsHtml = `
      <div style="font-size:12px; color:#15803d; margin-bottom:4px;">
        <strong>🏆 已完全通關群島 (≥60分)：</strong>
        ${passedUnits.map(u => `<span style="background:#bbf7d0; color:#14532d; padding:2px 8px; border-radius:10px; font-weight:800; margin-right:4px;">${u.icon} ${u.name}</span>`).join('')}
      </div>
    `;
  } else {
    passedUnitsHtml = `
      <div style="font-size:12px; color:#64748b; margin-bottom:4px;">
        ⚓ 冒險剛啟航，加油通過第一座群島吧！
      </div>
    `;
  }

  let recommendHtml = '';
  if (nextStage) {
    recommendHtml = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-top:6px; background:#ffffff; padding:6px 10px; border-radius:8px; border:1px solid #86efac;">
        <div style="font-size:13px; color:#166534;">
          🧭 <strong>建議下一站：</strong><span style="font-weight:900; color:#b91c1c;">${nextStage.islandName}</span>（${nextStage.unitName}）
        </div>
        <button class="stage-action-pill next-stop" style="cursor:pointer;" onclick="openStageModal('${nextStage.id}')">
          前往挑戰 ➔
        </button>
      </div>
    `;
  } else {
    recommendHtml = `
      <div style="font-size:13px; font-weight:800; color:#15803d; margin-top:4px;">
        🎉 恭喜你！已成功制霸三大群島所有試煉！
      </div>
    `;
  }

  container.innerHTML = passedUnitsHtml + recommendHtml;
}

function updateSailingAvatar() {
  const avatarEl = document.getElementById('sailingShipAvatar');
  if (!avatarEl) return;
  const partner = ONE_PIECE_CHARACTERS.find(c => c.id === (currentStudent ? currentStudent.characterId : 'luffy')) || ONE_PIECE_CHARACTERS[0];
  avatarEl.innerHTML = partner.svgAvatar;

  // 定位在當前下一站關卡位置
  const nextStage = getNextAvailableStage();
  if (nextStage) {
    const parent = document.getElementById('mapCanvas');
    const w = parent.clientWidth || 900;
    const h = parent.clientHeight || 600;
    const px = (nextStage.mapPos.x / 1000) * w;
    const py = (nextStage.mapPos.y / 700) * h;
    avatarEl.style.left = `${px}px`;
    avatarEl.style.top = `${py + 30}px`;
  }
}

function getNextAvailableStage() {
  const completed = (currentStudent && currentStudent.completedStages) || [];
  return STAGES_DATA.find(s => !completed.includes(s.id)) || STAGES_DATA[0];
}

// ----------------------------------------------------------------------------
// 神秘寶箱隨機生成機制 (自然隨機出現，不常駐)
// ----------------------------------------------------------------------------
function initTreasureRandomSpawner() {
  hideTreasurePill();

  // 1. 學生剛進入時有 30% 機率直接觸發海面漂流寶箱
  if (Math.random() < 0.3) {
    spawnTreasurePill();
  }

  // 2. 在地圖探索時，每隔 45 ~ 90 秒隨機投擲一次寶箱
  clearInterval(treasureSpawnTimer);
  treasureSpawnTimer = setInterval(() => {
    if (!isTreasureSpawned && Math.random() < 0.45) {
      spawnTreasurePill();
    }
  }, 45000);
}

function spawnTreasurePill() {
  isTreasureSpawned = true;
  const pill = document.getElementById('mapTreasurePill');
  if (pill) {
    pill.style.display = 'flex';
  }
}

function hideTreasurePill() {
  isTreasureSpawned = false;
  const pill = document.getElementById('mapTreasurePill');
  if (pill) {
    pill.style.display = 'none';
  }
}

// ----------------------------------------------------------------------------
// 渲染四大群島按鈕 (仿照 JDPS-SS 上方 4 標籤)
// ----------------------------------------------------------------------------
function renderUnitTabs() {
  const container = document.getElementById('islandTabsContainer');
  if (!container) return;

  const completed = (currentStudent && currentStudent.completedStages) || [];

  container.innerHTML = ISLAND_UNITS.map(u => {
    const unitStages = STAGES_DATA.filter(s => s.unitId === u.id);
    const doneCount = unitStages.filter(s => completed.includes(s.id)).length;
    const isActive = u.id === currentUnitId;

    return `
      <div class="island-tab-btn ${isActive ? 'active' : ''}" onclick="selectUnit(${u.id})">
        <div class="tab-icon">${u.icon}</div>
        <div class="tab-name">${u.name}</div>
        <div class="tab-progress">${doneCount}/${unitStages.length}</div>
      </div>
    `;
  }).join('');
}

function selectUnit(unitId) {
  currentUnitId = unitId;
  const u = ISLAND_UNITS.find(item => item.id === unitId) || ISLAND_UNITS[0];
  document.getElementById('currentUnitTag').textContent = u.tag;
  document.getElementById('currentUnitTitle').textContent = `${u.name}・${u.subtitle}`;
  renderUnitTabs();
  renderLeftStagesList();
  render3DIslandMap();
}

// ----------------------------------------------------------------------------
// 渲染左側關卡條列卡片 (仿照 JDPS-SS)
// ----------------------------------------------------------------------------
function renderLeftStagesList() {
  const listEl = document.getElementById('stagesVerticalList');
  if (!listEl) return;

  const unitStages = STAGES_DATA.filter(s => s.unitId === currentUnitId);
  const completed = (currentStudent && currentStudent.completedStages) || [];
  const nextStage = getNextAvailableStage();

  listEl.innerHTML = unitStages.map(s => {
    const isDone = completed.includes(s.id);
    const isNext = nextStage && nextStage.id === s.id;
    let actionPillHtml = '';

    if (isDone) {
      actionPillHtml = `<span class="stage-action-pill" style="background:#e0f2fe; color:#0369a1; border-color:#bae6fd;">已通關 ★</span>`;
    } else if (isNext) {
      actionPillHtml = `<span class="stage-action-pill next-stop">下一站</span>`;
    } else {
      actionPillHtml = `<span class="stage-action-pill">可前往</span>`;
    }

    return `
      <div class="stage-list-card ${isDone ? 'done' : ''} ${isNext ? 'active' : ''}" onclick="openStageModal('${s.id}')">
        <div class="stage-card-left">
          <div class="stage-circle-num">${s.stageNum}</div>
          <div class="stage-info-text">
            <div class="st-name">${s.islandName}</div>
            <div class="st-unit">${s.unitName}</div>
          </div>
        </div>
        <div>
          ${actionPillHtml}
        </div>
      </div>
    `;
  }).join('');
}

// ----------------------------------------------------------------------------
// 渲染右側大地圖：12 座各自獨立幾何形狀的 3D 立體島嶼 (絕不重疊)
// ----------------------------------------------------------------------------
function getIslandSvgByShape(shape, isDone) {
  const topColor = isDone ? '#52b788' : '#74c69d';
  const rockDark = '#1b4332';
  const rockMid = '#2d6a4f';
  const rockLight = '#40916c';
  const sand = '#ffe8d6';

  switch (shape) {
    case 'hexagon': // 01 稻浪田園：六角形幾何島
      return `
        <svg class="island-3d-base" viewBox="0 0 160 100">
          <polygon points="40,35 120,35 150,55 120,80 40,80 10,55" fill="${sand}"/>
          <polygon points="10,55 40,80 120,80 150,55 145,70 115,92 45,92 15,70" fill="${rockMid}"/>
          <polygon points="45,40 115,40 140,55 115,75 45,75 20,55" fill="${topColor}"/>
          <!-- 梯田紋理 -->
          <line x1="45" y1="50" x2="115" y2="50" stroke="#40916c" stroke-width="2"/>
          <line x1="50" y1="62" x2="110" y2="62" stroke="#40916c" stroke-width="2"/>
          <polygon points="75,45 80,30 85,45" fill="${rockDark}"/>
        </svg>
      `;

    case 'rounded_rect': // 02 加工出口港：圓角工業幾何島
      return `
        <svg class="island-3d-base" viewBox="0 0 160 100">
          <rect x="20" y="35" width="120" height="45" rx="16" fill="${sand}"/>
          <path d="M20,60 L20,72 Q20,85 40,85 L120,85 Q140,85 140,72 L140,60 Z" fill="${rockMid}"/>
          <rect x="26" y="38" width="108" height="38" rx="12" fill="${topColor}"/>
          <!-- 工業港口起重機/庫房標誌 -->
          <rect x="45" y="44" width="20" height="15" fill="#f4a261"/>
          <rect x="70" y="42" width="24" height="17" fill="#e76f51"/>
          <line x1="105" y1="40" x2="105" y2="60" stroke="#1d3557" stroke-width="3"/>
          <line x1="100" y1="42" x2="115" y2="42" stroke="#1d3557" stroke-width="2"/>
        </svg>
      `;

    case 'diamond': // 03 十大建設大道：菱形科技幾何島
      return `
        <svg class="island-3d-base" viewBox="0 0 160 100">
          <polygon points="80,20 145,55 80,85 15,55" fill="${sand}"/>
          <polygon points="15,55 80,85 145,55 140,68 80,98 20,68" fill="${rockMid}"/>
          <polygon points="80,28 135,55 80,78 25,55" fill="${topColor}"/>
          <!-- 筆直高速大道線條 -->
          <polygon points="76,28 84,28 86,78 74,78" fill="#e2e8f0"/>
          <line x1="80" y1="32" x2="80" y2="74" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3 3"/>
        </svg>
      `;

    case 'octagon': // 04 鋼鐵港都：八角厚重幾何島
      return `
        <svg class="island-3d-base" viewBox="0 0 160 100">
          <polygon points="45,28 115,28 145,48 145,65 115,82 45,82 15,65 15,48" fill="${sand}"/>
          <polygon points="15,65 45,82 115,82 145,65 140,78 110,95 50,95 20,78" fill="${rockDark}"/>
          <polygon points="48,32 112,32 138,50 138,62 112,78 48,78 22,62 22,50" fill="#64748b"/>
          <!-- 鋼鐵熔爐煙囪 -->
          <rect x="55" y="38" width="14" height="20" fill="#334155"/>
          <rect x="75" y="35" width="16" height="23" fill="#475569"/>
          <rect x="97" y="40" width="12" height="18" fill="#334155"/>
        </svg>
      `;

    case 'triangle': // 05 晶片科學園區：三角形晶片島
      return `
        <svg class="island-3d-base" viewBox="0 0 160 100">
          <polygon points="80,18 145,75 15,75" fill="${sand}"/>
          <polygon points="15,75 145,75 140,90 20,90" fill="${rockMid}"/>
          <polygon points="80,26 135,70 25,70" fill="#0284c7"/>
          <!-- 積體電路晶片金色紋理 -->
          <rect x="68" y="42" width="24" height="20" rx="3" fill="#facc15" stroke="#ca8a04" stroke-width="1.5"/>
          <line x1="80" y1="28" x2="80" y2="42" stroke="#bae6fd" stroke-width="2"/>
          <line x1="50" y1="52" x2="68" y2="52" stroke="#bae6fd" stroke-width="2"/>
          <line x1="92" y1="52" x2="110" y2="52" stroke="#bae6fd" stroke-width="2"/>
        </svg>
      `;

    case 'oval': // 06 貨幣廣播港：流線橢圓雷達島
      return `
        <svg class="island-3d-base" viewBox="0 0 160 100">
          <ellipse cx="80" cy="52" rx="65" ry="32" fill="${sand}"/>
          <path d="M15,52 Q80,95 145,52 L140,66 Q80,105 20,66 Z" fill="${rockMid}"/>
          <ellipse cx="80" cy="50" rx="56" ry="26" fill="${topColor}"/>
          <!-- 廣播天線電波 -->
          <line x1="80" y1="25" x2="80" y2="52" stroke="#1e293b" stroke-width="3"/>
          <circle cx="80" cy="24" r="5" fill="#e63946"/>
          <path d="M70,22 A12,12 0 0,1 90,22" fill="none" stroke="#e63946" stroke-width="2"/>
          <path d="M64,18 A20,20 0 0,1 96,18" fill="none" stroke="#e63946" stroke-width="2"/>
        </svg>
      `;

    case 'cross': // 07 生技實驗室：十字生技島
      return `
        <svg class="island-3d-base" viewBox="0 0 160 100">
          <path d="M55,20 L105,20 L105,40 L145,40 L145,65 L105,65 L105,82 L55,82 L55,65 L15,65 L15,40 L55,40 Z" fill="${sand}"/>
          <path d="M15,65 L145,65 L140,78 L100,78 L100,94 L60,94 L60,78 L20,78 Z" fill="${rockMid}"/>
          <path d="M60,25 L100,25 L100,44 L138,44 L138,60 L100,60 L100,78 L60,78 L60,60 L22,60 L22,44 L60,44 Z" fill="#2dd4bf"/>
          <!-- 紅十字生技標誌 -->
          <rect x="74" y="38" width="12" height="26" rx="2" fill="#ffffff"/>
          <rect x="67" y="45" width="26" height="12" rx="2" fill="#ffffff"/>
          <rect x="76" y="40" width="8" height="22" rx="1" fill="#ef4444"/>
          <rect x="69" y="47" width="22" height="8" rx="1" fill="#ef4444"/>
        </svg>
      `;

    case 'star': // 08 綠能發電場：星芒旋風風車島
      return `
        <svg class="island-3d-base" viewBox="0 0 160 100">
          <polygon points="80,18 95,40 145,45 105,62 118,85 80,72 42,85 55,62 15,45 65,40" fill="${sand}"/>
          <polygon points="15,45 42,85 80,72 118,85 145,45 138,60 110,95 80,84 50,95 22,60" fill="${rockDark}"/>
          <polygon points="80,24 92,42 135,46 102,60 112,80 80,68 48,80 58,60 25,46 68,42" fill="#a7f3d0"/>
          <!-- 白色綠能三葉風車 -->
          <line x1="80" y1="36" x2="80" y2="60" stroke="#047857" stroke-width="3"/>
          <circle cx="80" cy="36" r="3" fill="#047857"/>
          <line x1="80" y1="36" x2="70" y2="24" stroke="#ffffff" stroke-width="3"/>
          <line x1="80" y1="36" x2="92" y2="30" stroke="#ffffff" stroke-width="3"/>
          <line x1="80" y1="36" x2="78" y2="48" stroke="#ffffff" stroke-width="3"/>
        </svg>
      `;

    case 'trapezoid': // 09 代數造船廠：梯形幾何碼頭島
      return `
        <svg class="island-3d-base" viewBox="0 0 160 100">
          <polygon points="50,30 110,30 145,75 15,75" fill="${sand}"/>
          <polygon points="15,75 145,75 138,92 22,92" fill="${rockMid}"/>
          <polygon points="55,35 105,35 136,70 24,70" fill="#f59e0b"/>
          <!-- 木棧道與船塢起重支架 -->
          <rect x="35" y="42" width="90" height="6" fill="#78350f"/>
          <line x1="45" y1="42" x2="45" y2="66" stroke="#78350f" stroke-width="2.5"/>
          <line x1="75" y1="42" x2="75" y2="66" stroke="#78350f" stroke-width="2.5"/>
          <line x1="105" y1="42" x2="105" y2="66" stroke="#78350f" stroke-width="2.5"/>
        </svg>
      `;

    case 'pillar': // 10 司法審判塔：柱狀正義幾何塔島
      return `
        <svg class="island-3d-base" viewBox="0 0 160 100">
          <ellipse cx="80" cy="65" rx="55" ry="24" fill="${sand}"/>
          <path d="M25,65 Q80,95 135,65 L130,78 Q80,105 30,78 Z" fill="${rockDark}"/>
          <ellipse cx="80" cy="62" rx="46" ry="18" fill="${topColor}"/>
          <!-- 聳立的正義審判高塔 -->
          <polygon points="70,62 90,62 86,22 74,22" fill="#1e293b"/>
          <polygon points="68,22 92,22 80,12" fill="#e63946"/>
          <circle cx="80" cy="34" r="3" fill="#facc15"/>
          <line x1="80" y1="37" x2="80" y2="50" stroke="#facc15" stroke-width="2"/>
        </svg>
      `;

    case 'ship':
    case 'ship_hull': // 11 千陽號船塢 / 段考複習島：巨船龍骨幾何島
      return `
        <svg class="island-3d-base" viewBox="0 0 160 100">
          <path d="M15,45 Q50,75 145,55 L140,70 Q50,95 20,60 Z" fill="${rockMid}"/>
          <path d="M20,42 Q80,68 145,50 Q120,30 20,42 Z" fill="#d97706"/>
          <!-- 千陽號經典獅子頭與甲板草皮 -->
          <circle cx="132" cy="46" r="12" fill="#f59e0b" stroke="#b45309" stroke-width="2"/>
          <circle cx="132" cy="46" r="6" fill="#e11d48"/>
          <!-- 船桅桿 -->
          <line x1="60" y1="20" x2="60" y2="52" stroke="#451a03" stroke-width="3"/>
          <polygon points="60,22 85,28 60,34" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
        </svg>
      `;

    case 'gem': // 段考三航島：八面紫金寶石島
      return `
        <svg class="island-3d-base" viewBox="0 0 160 100">
          <polygon points="40,30 120,30 145,55 80,88 15,55" fill="#a855f7"/>
          <polygon points="15,55 80,88 145,55 138,68 80,96 22,68" fill="#6b21a8"/>
          <polygon points="45,35 115,35 135,55 80,82 25,55" fill="#c084fc"/>
          <polygon points="80,35 105,55 80,78 55,55" fill="#f3e8ff"/>
        </svg>
      `;

    case 'crown': // 12 素養最終殿堂 / 一航試煉島：金色皇冠幾何殿堂島
      return `
        <svg class="island-3d-base" viewBox="0 0 160 100">
          <polygon points="35,32 125,32 150,55 125,82 35,82 10,55" fill="#fde047"/>
          <polygon points="10,55 35,82 125,82 150,55 142,70 118,95 42,95 18,70" fill="#ca8a04"/>
          <polygon points="40,36 120,36 140,55 120,76 40,76 20,55" fill="#7e22ce"/>
          <!-- 殿堂金色寶冠與寶石 -->
          <polygon points="60,52 65,34 74,45 80,30 86,45 95,34 100,52" fill="#fbbf24" stroke="#d97706" stroke-width="1.5"/>
          <circle cx="80" cy="30" r="3" fill="#ef4444"/>
          <circle cx="65" cy="34" r="2.5" fill="#3b82f6"/>
          <circle cx="95" cy="34" r="2.5" fill="#3b82f6"/>
        </svg>
      `;

    default:
      return `
        <svg class="island-3d-base" viewBox="0 0 160 100">
          <polygon points="20,50 80,85 140,50 80,20" fill="${sand}"/>
          <polygon points="30,48 80,78 130,48 80,26" fill="${topColor}"/>
        </svg>
      `;
  }
}

function render3DIslandMap() {
  const container = document.getElementById('islandLandmarksContainer');
  const svg = document.getElementById('seaRoutesSvg');
  if (!container || !svg) return;

  const completed = (currentStudent && currentStudent.completedStages) || [];
  const nextStage = getNextAvailableStage();

  // 若當前在段考特區 (unitId === 4)，呈現三次段考島，否則呈現前 12 座一般島嶼
  const isExamView = currentUnitId === 4;
  const targetStages = isExamView 
    ? STAGES_DATA.filter(s => s.unitId === 4)
    : STAGES_DATA.filter(s => s.unitId !== 4);

  // 繪製航道波浪線條
  let pathD = '';
  targetStages.forEach((s, idx) => {
    if (idx === 0) {
      pathD += `M ${s.mapPos.x} ${s.mapPos.y}`;
    } else {
      const prev = targetStages[idx - 1];
      const cx = (prev.mapPos.x + s.mapPos.x) / 2;
      const cy = (prev.mapPos.y + s.mapPos.y) / 2 - (isExamView ? 40 : 25);
      pathD += ` Q ${cx} ${cy} ${s.mapPos.x} ${s.mapPos.y}`;
    }
  });

  const routeStrokeColor = isExamView ? '#8b5cf6' : '#f4a261';

  svg.innerHTML = `
    <!-- 底層航海虛線 -->
    <path d="${pathD}" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-dasharray="10 8" opacity="0.85"/>
    <path d="${pathD}" fill="none" stroke="${routeStrokeColor}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="8 6"/>
  `;

  // 渲染立體海島
  const parent = document.getElementById('mapCanvas');
  const w = parent.clientWidth || 900;
  const h = parent.clientHeight || 600;

  container.innerHTML = targetStages.map(s => {
    const isDone = completed.includes(s.id);
    const isNext = nextStage && nextStage.id === s.id;
    const px = (s.mapPos.x / 1000) * w;
    const py = (s.mapPos.y / 700) * h;
    const islandSvg = getIslandSvgByShape(s.islandShape || 'hexagon', isDone);
    const pinClass = `pos-${s.pinPos || 'top'}`;

    return `
      <div class="island-landmark-node ${isNext ? 'active' : ''}" style="left: ${px}px; top: ${py}px;" onclick="openStageModal('${s.id}')">
        <!-- 3D 幾何立體島嶼底座 -->
        ${islandSvg}

        <!-- 懸浮地標膠囊卡片 (依據 pinPos 分散方位，絕不重疊) -->
        <div class="island-pin-card ${pinClass}">
          <div class="pin-num-badge" style="background:${isDone ? '#2a9d8f' : '#e63946'}">
            ${isDone ? '✓' : s.stageNum}
          </div>
          <div class="pin-info-box">
            <div class="pin-island-name">
              <span>${s.islandName}</span>
              ${isNext ? '<span style="font-size:10px; color:#16a34a; font-weight:800;">・下一站</span>' : ''}
            </div>
            <div class="pin-unit-name">
              ${s.unitName}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 視窗縮放時自適應地圖
window.addEventListener('resize', () => {
  render3DIslandMap();
  updateSailingAvatar();
});

// ----------------------------------------------------------------------------
// 學生登入管理
// ----------------------------------------------------------------------------
function showStudentLoginModal() {
  document.getElementById('studentLoginModal').style.display = 'flex';
}

async function submitStudentLogin() {
  const school = document.getElementById('loginSchool').value.trim() || '建德國中';
  const className = document.getElementById('loginClass').value.trim() || '701';
  const seatNo = document.getElementById('loginSeat').value.trim() || '01';
  const name = document.getElementById('loginName').value.trim();

  currentStudent = await dataService.loginStudent({
    school,
    className,
    seatNo,
    name,
    characterId: selectedLoginCharId
  });

  document.getElementById('studentLoginModal').style.display = 'none';
  refreshStudentProfileUI();
  initCharacterPickers();
}

// ----------------------------------------------------------------------------
// 關卡彈窗：閱讀講義與進入測驗
// ----------------------------------------------------------------------------
let currentQuizPaperKey = 'basic'; // 'basic' | 'adv' | 'review1' | 'review2' | 'guessBasic' | 'guessAdv'

function getCurrentQuestions() {
  if (!currentStage) return [];
  if (currentStage.papers) {
    const p = currentStage.papers[currentQuizPaperKey] || currentStage.papers['review1'];
    return p ? p.questions : [];
  }
  if (currentQuizPaperKey === 'adv') {
    return (currentStage.quizAdvanced && currentStage.quizAdvanced.length > 0)
      ? currentStage.quizAdvanced
      : (currentStage.quizBasic || currentStage.questions || []);
  }
  return currentStage.quizBasic || currentStage.questions || [];
}

function getCurrentPaperTitle() {
  if (!currentStage) return '';
  if (currentStage.papers) {
    const p = currentStage.papers[currentQuizPaperKey] || currentStage.papers['review1'];
    return p ? p.title : '段考複習卷';
  }
  return currentQuizPaperKey === 'adv' ? 'Best試卷(進階)' : 'Best試卷(基礎)';
}

function renderQuizPaperSelector() {
  const bar = document.getElementById('quizPaperSelectorBar');
  if (!bar || !currentStage) return;

  const isExam = Boolean(currentStage.papers);
  let buttonsHtml = '';

  if (isExam) {
    const paperOptions = [
      { key: 'review1', label: '📜 段考複習卷(一)' },
      { key: 'review2', label: '📑 段考複習卷(二)' },
      { key: 'guessBasic', label: '🎯 名師猜題卷(基礎)' },
      { key: 'guessAdv', label: '⚡ 名師猜題卷(進階)' }
    ];
    buttonsHtml = paperOptions.map(p => {
      const isActive = currentQuizPaperKey === p.key;
      return `
        <button type="button" class="paper-tab-btn ${isActive ? 'active' : ''}" 
                onclick="changeQuizPaper('${p.key}')" 
                style="padding: 7px 14px; border-radius: 6px; border: 1.5px solid ${isActive ? '#8b5cf6' : '#cbd5e1'}; background: ${isActive ? '#8b5cf6' : '#ffffff'}; color: ${isActive ? '#ffffff' : '#334155'}; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;">
          ${p.label}
        </button>
      `;
    }).join('');
  } else {
    const paperOptions = [
      { key: 'basic', label: '🟢 Best試卷(基礎)' },
      { key: 'adv', label: '🔥 Best試卷(進階)' }
    ];
    buttonsHtml = paperOptions.map(p => {
      const isActive = currentQuizPaperKey === p.key;
      const activeColor = p.key === 'adv' ? '#e63946' : '#2a9d8f';
      return `
        <button type="button" class="paper-tab-btn ${isActive ? 'active' : ''}" 
                onclick="changeQuizPaper('${p.key}')" 
                style="padding: 7px 16px; border-radius: 6px; border: 1.5px solid ${isActive ? activeColor : '#cbd5e1'}; background: ${isActive ? activeColor : '#ffffff'}; color: ${isActive ? '#ffffff' : '#334155'}; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;">
          ${p.label}
        </button>
      `;
    }).join('');
  }

  bar.innerHTML = buttonsHtml;
}

function changeQuizPaper(key) {
  if (currentQuizPaperKey === key) return;
  currentQuizPaperKey = key;
  startQuiz();
}

function openStageModal(stageId) {
  currentStage = STAGES_DATA.find(s => s.id === stageId);
  if (!currentStage) return;

  const isExamIsland = Boolean(currentStage.papers);
  currentQuizPaperKey = isExamIsland ? 'review1' : 'basic';

  document.getElementById('lessonTitle').textContent = `${currentStage.title} - ${currentStage.islandName}（${currentStage.unitName}）`;
  document.getElementById('lessonSummary').textContent = currentStage.lesson.summary;

  const conceptsBox = document.getElementById('lessonConceptsContainer');
  if (currentStage.lesson.concepts && currentStage.lesson.concepts.length > 0) {
    conceptsBox.innerHTML = currentStage.lesson.concepts.map(c => `
      <div style="background: #f8fafc; border-left: 4px solid var(--secondary-color); padding: 14px; border-radius: 6px; margin-bottom: 12px;">
        <h4 style="color: var(--dark-navy); margin-bottom: 6px;">${c.title}</h4>
        <div style="font-size: 14px; color: #334155; line-height: 1.6;">${c.content}</div>
      </div>
    `).join('');
  } else if (currentStage.lesson.tips && currentStage.lesson.tips.length > 0) {
    conceptsBox.innerHTML = currentStage.lesson.tips.map((t, idx) => `
      <div style="background: #f8fafc; border-left: 4px solid #8b5cf6; padding: 14px; border-radius: 6px; margin-bottom: 12px;">
        <h4 style="color: var(--dark-navy); margin-bottom: 6px;">💡 段考破題秘笈 #${idx + 1}</h4>
        <div style="font-size: 14px; color: #334155; line-height: 1.6;">${t}</div>
      </div>
    `).join('');
  } else {
    conceptsBox.innerHTML = '';
  }

  switchStageTab('lesson');
  document.getElementById('stageContentModal').style.display = 'flex';
}

function switchStageTab(tab) {
  const lessonView = document.getElementById('stageLessonView');
  const quizView = document.getElementById('stageQuizView');
  const resultView = document.getElementById('quizResultView');
  const tabLessonBtn = document.getElementById('tabLessonBtn');
  const tabQuizBtn = document.getElementById('tabQuizBtn');

  if (tab === 'lesson') {
    lessonView.style.display = 'block';
    quizView.style.display = 'none';
    resultView.style.display = 'none';
    tabLessonBtn.classList.add('active');
    tabQuizBtn.classList.remove('active');
    clearInterval(quizTimerInterval);
  } else {
    lessonView.style.display = 'none';
    quizView.style.display = 'block';
    resultView.style.display = 'none';
    tabQuizBtn.classList.add('active');
    tabLessonBtn.classList.remove('active');
    startQuiz();
  }
}

function closeStageModal() {
  clearInterval(quizTimerInterval);
  isQuizSubmitting = false;
  document.getElementById('stageContentModal').style.display = 'none';
  
  // 關閉視窗時再次確認全面刷新
  const latestStudent = dataService.getCurrentStudent();
  if (latestStudent) {
    currentStudent = latestStudent;
  }
  refreshStudentProfileUI();
  renderUnitTabs();
  renderLeftStagesList();
  render3DIslandMap();

  // 啟動航海神秘寶箱隨機觸發偵測器
  initTreasureRandomSpawner();
}

// ----------------------------------------------------------------------------
// 測驗挑戰流程
// ----------------------------------------------------------------------------
let isQuizSubmitting = false;

function startQuiz() {
  isQuizSubmitting = false;
  currentQuizIndex = 0;
  currentQuizAnswers = [];
  quizSeconds = 0;
  clearInterval(quizTimerInterval);
  
  quizTimerInterval = setInterval(() => {
    quizSeconds++;
    const m = String(Math.floor(quizSeconds / 60)).padStart(2, '0');
    const s = String(quizSeconds % 60).padStart(2, '0');
    document.getElementById('quizTimerText').textContent = `⏱️ ${m}:${s}`;
  }, 1000);

  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  renderQuizPaperSelector();

  const questions = getCurrentQuestions();
  if (!questions || questions.length === 0) {
    document.getElementById('quizQuestionArea').innerHTML = '<p style="padding:20px; color:#64748b;">該試卷目前尚無題目。</p>';
    return;
  }

  const q = questions[currentQuizIndex];
  document.getElementById('quizProgressBadge').textContent = `第 ${currentQuizIndex + 1} / ${questions.length} 題`;
  document.getElementById('quizStageName').textContent = `${currentStage.unitName}・${getCurrentPaperTitle()}`;
  document.getElementById('immediateFeedbackArea').style.display = 'none';
  
  const btnSubmit = document.getElementById('btnSubmitCurrentQ');
  const btnNext = document.getElementById('btnNextQ');
  if (btnSubmit) {
    btnSubmit.style.display = 'inline-block';
    btnSubmit.disabled = false;
  }
  if (btnNext) {
    btnNext.style.display = 'none';
    btnNext.disabled = false;
    btnNext.style.opacity = '1';
    btnNext.style.cursor = 'pointer';
  }

  const container = document.getElementById('quizQuestionArea');
  
  if (q.type === 'choice') {
    container.innerHTML = `
      <div class="question-card">
        <span class="q-badge">單選題・考點：${q.concept}</span>
        <div class="q-prompt">${renderTextbookMath(q.prompt)}</div>
        <div class="options-list">
          ${q.options.map(opt => `
            <div class="option-item" onclick="selectChoiceOption(this, '${opt}')">
              <input type="radio" name="optRadio" value="${opt}">
              <span>${renderTextbookMath(opt)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (q.type === 'fill') {
    container.innerHTML = `
      <div class="question-card">
        <span class="q-badge">填空題・考點：${q.concept}</span>
        <div class="q-prompt">${renderTextbookMath(q.prompt)}</div>
        
        <!-- 數學特殊符號虛擬鍵盤 -->
        <div class="math-keyboard">
          <span style="font-size:12px; color:#64748b; margin-right:4px; align-self:center;">符號工具：</span>
          <button type="button" class="sym-btn" onclick="insertSymbol('－')">－ (負號)</button>
          <button type="button" class="sym-btn" onclick="insertSymbol('＋')">＋</button>
          <button type="button" class="sym-btn" onclick="insertSymbol('×')">×</button>
          <button type="button" class="sym-btn" onclick="insertSymbol('÷')">÷</button>
          <button type="button" class="sym-btn" onclick="insertSymbol('/')">/ (分數)</button>
          <button type="button" class="sym-btn" onclick="insertSymbol('²')">² (平方)</button>
          <button type="button" class="sym-btn" onclick="insertSymbol('³')">³</button>
          <button type="button" class="sym-btn" onclick="insertSymbol('⁴')">⁴</button>
          <button type="button" class="sym-btn" onclick="insertSymbol('⁻')">⁻ (負指數)</button>
          <button type="button" class="sym-btn" onclick="insertSymbol('｜')">｜ (絕對值)</button>
          <button type="button" class="sym-btn" onclick="insertSymbol('＞')">＞</button>
          <button type="button" class="sym-btn" onclick="insertSymbol('＜')">＜</button>
          <button type="button" class="sym-btn" onclick="insertSymbol('x')">未知數 x</button>
        </div>

        <input type="text" id="fillAnswerInput" class="form-control" style="font-size: 18px; font-weight: 700; font-family: 'Cambria Math', 'Times New Roman', serif;" placeholder="${q.placeholder || '請輸入答案'}">
      </div>
    `;
  } else if (q.type === 'match') {
    // 拖曳配合題：隨機打亂右側答案，支援真實 HTML5 拖曳 與 雙向點選配對
    initMatchQuestion(q);
  }
}

function initMatchQuestion(q) {
  const container = document.getElementById('quizQuestionArea');
  
  // 隨機打亂右側選項順序
  const shuffled = q.pairs.map((p, idx) => ({ originalIdx: idx, text: p.right }));
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  currentMatchState = {
    leftItems: q.pairs.map(p => p.left),
    shuffledOptions: shuffled,
    userSlots: new Array(q.pairs.length).fill(null) // 存放每個題目放置的選項
  };
  selectedOptionIdx = null;

  renderMatchUI(q);
}

function renderMatchUI(q) {
  const container = document.getElementById('quizQuestionArea');
  const { leftItems, shuffledOptions, userSlots } = currentMatchState;

  // 檢查已被放置的選項索引
  const placedIndices = userSlots.filter(s => s !== null).map(s => s.originalIdx);

  container.innerHTML = `
    <div class="question-card">
      <span class="q-badge">拖曳配合題・考點：${q.concept}</span>
      <div class="q-prompt">${q.prompt}</div>
      <p style="font-size:13px; color:#64748b; margin-bottom:12px;">
        💡 <strong>操作說明：</strong>可直接「<strong>拖曳</strong>」右下方選項至對應目標格，或先「<strong>點選</strong>」選項再點選題目格完成配對！
      </p>

      <div class="match-container">
        <!-- 左側題目放置目標格 -->
        <div class="match-left">
          <h5 style="color:var(--dark-navy);">題目項（拖曳目標區）</h5>
          ${leftItems.map((item, idx) => {
            const placed = userSlots[idx];
            return `
              <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:10px;">
                <div style="font-weight:700; font-size:15px; margin-bottom:6px; color:#1e293b; font-family:'Cambria Math','Times New Roman',serif;">${renderTextbookMath(item)}</div>
                <div class="match-slot-card" 
                     ondragover="onMatchDragOver(event)" 
                     ondragleave="onMatchDragLeave(event)" 
                     ondrop="onMatchDrop(event, ${idx})" 
                     onclick="onMatchSlotClick(${idx})"
                     style="padding:10px 14px; border-radius:6px; min-height:46px; display:flex; align-items:center; justify-content:space-between;">
                  ${placed ? `
                    <span style="font-weight:800; color:var(--primary-color); font-size:15px; font-family:'Cambria Math','Times New Roman',serif;">👉 ${renderTextbookMath(placed.text)}</span>
                    <button type="button" onclick="clearMatchSlot(event, ${idx})" style="background:#fee2e2; border:none; color:#dc2626; border-radius:4px; padding:2px 8px; font-size:12px; cursor:pointer;">✕ 清除</button>
                  ` : `
                    <span style="color:#94a3b8; font-size:13px;">請拖曳或點選答案至此...</span>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- 右側待配對選項庫 (打亂後) -->
        <div class="match-right">
          <h5 style="color:var(--dark-navy);">待選答案卡（點選或拖曳）</h5>
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${shuffledOptions.map((opt, sIdx) => {
              const isPlaced = placedIndices.includes(opt.originalIdx);
              const isSelected = selectedOptionIdx === sIdx;

              if (isPlaced) {
                return `
                  <div class="match-card" style="opacity:0.35; background:#e2e8f0; border:1.5px dashed #94a3b8; cursor:not-allowed;">
                    <span style="text-decoration:line-through; font-family:'Cambria Math','Times New Roman',serif;">${renderTextbookMath(opt.text)}</span>
                    <span style="font-size:11px; color:#64748b; margin-left:auto;">(已放入)</span>
                  </div>
                `;
              }

              return `
                <div class="match-card match-option-card ${isSelected ? 'selected-source' : ''}" 
                     draggable="true" 
                     ondragstart="onMatchDragStart(event, ${sIdx})" 
                     onclick="selectMatchOption(${sIdx})">
                  <span style="font-weight:800; color:var(--dark-navy); font-size:15px; font-family:'Cambria Math','Times New Roman',serif;">🔹 ${renderTextbookMath(opt.text)}</span>
                  <span style="font-size:11px; color:#64748b; margin-left:auto;">${isSelected ? '選取中...' : '拖曳/點選'}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// 拖曳事件處理
function onMatchDragStart(e, optionIndex) {
  e.dataTransfer.setData('text/plain', optionIndex);
}

function onMatchDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function onMatchDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function onMatchDrop(e, slotIndex) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const optIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
  if (!isNaN(optIdx)) {
    assignOptionToSlot(optIdx, slotIndex);
  }
}

// 點選支援處理
function selectMatchOption(optionIndex) {
  if (selectedOptionIdx === optionIndex) {
    selectedOptionIdx = null; // 取消選取
  } else {
    selectedOptionIdx = optionIndex;
  }
  const qList = getCurrentQuestions();
  renderMatchUI(qList[currentQuizIndex]);
}

function onMatchSlotClick(slotIndex) {
  if (selectedOptionIdx !== null) {
    assignOptionToSlot(selectedOptionIdx, slotIndex);
    selectedOptionIdx = null;
  }
}

function assignOptionToSlot(optionIndex, slotIndex) {
  const chosen = currentMatchState.shuffledOptions[optionIndex];
  if (!chosen) return;

  // 若該選項已在其他格子，先移除
  for (let i = 0; i < currentMatchState.userSlots.length; i++) {
    if (currentMatchState.userSlots[i] && currentMatchState.userSlots[i].originalIdx === chosen.originalIdx) {
      currentMatchState.userSlots[i] = null;
    }
  }

  currentMatchState.userSlots[slotIndex] = chosen;
  const qList = getCurrentQuestions();
  renderMatchUI(qList[currentQuizIndex]);
}

function clearMatchSlot(e, slotIndex) {
  e.stopPropagation();
  currentMatchState.userSlots[slotIndex] = null;
  const qList = getCurrentQuestions();
  renderMatchUI(qList[currentQuizIndex]);
}

function selectChoiceOption(el, val) {
  el.parentElement.querySelectorAll('.option-item').forEach(item => item.classList.remove('selected'));
  el.classList.add('selected');
  el.querySelector('input[type="radio"]').checked = true;
}

function insertSymbol(sym) {
  const input = document.getElementById('fillAnswerInput');
  if (!input) return;
  const start = input.selectionStart || input.value.length;
  const end = input.selectionEnd || input.value.length;
  input.value = input.value.substring(0, start) + sym + input.value.substring(end);
  input.focus();
}

// ----------------------------------------------------------------------------
// 答案檢查與航海王及時逐步解析回饋 (核心功能)
// ----------------------------------------------------------------------------
function checkCurrentAnswer() {
  const qList = getCurrentQuestions();
  const q = qList[currentQuizIndex];
  let userAnswer = '';
  let isCorrect = false;

  if (q.type === 'choice') {
    const selected = document.querySelector('input[name="optRadio"]:checked');
    if (!selected) {
      alert('請先點選一個選項再提交作答喔！');
      return;
    }
    userAnswer = selected.value;
    isCorrect = (userAnswer === q.answer);
  } else if (q.type === 'fill') {
    const input = document.getElementById('fillAnswerInput');
    if (!input || !input.value.trim()) {
      alert('請輸入答案再提交喔！');
      return;
    }
    userAnswer = input.value.trim();
    const accepts = (q.acceptAnswers || [q.answer]).map(a => a.replace(/\s+/g, '').toLowerCase());
    isCorrect = accepts.includes(userAnswer.replace(/\s+/g, '').toLowerCase());
  } else if (q.type === 'match') {
    // 檢查是否所有題目都已配對
    const { userSlots, leftItems } = currentMatchState;
    const unplaced = userSlots.some(s => s === null);
    if (unplaced) {
      alert('請先將所有項目都完成配對再提交喔！');
      return;
    }

    // 依據原始索引核對正誤 (originalIdx 應與題目索引相同)
    let allCorrect = true;
    const userPairDescriptions = [];
    userSlots.forEach((slot, idx) => {
      if (!slot || slot.originalIdx !== idx) {
        allCorrect = false;
      }
      userPairDescriptions.push(`${leftItems[idx]} ➔ ${slot.text}`);
    });

    userAnswer = userPairDescriptions.join('； ');
    isCorrect = allCorrect;
  }

  currentQuizAnswers.push({
    qId: q.id,
    type: q.type,
    concept: q.concept,
    prompt: q.prompt,
    userAnswer: userAnswer,
    correctAnswer: q.answer || '全部配對正確',
    isCorrect: isCorrect
  });

  const partner = ONE_PIECE_CHARACTERS.find(c => c.id === currentStudent.characterId) || ONE_PIECE_CHARACTERS[0];
  const introArr = isCorrect ? partner.correctIntro : partner.wrongIntro;
  const randomIntro = introArr[Math.floor(Math.random() * introArr.length)];

  const feedbackEl = document.getElementById('immediateFeedbackArea');
  feedbackEl.style.display = 'block';
  feedbackEl.innerHTML = `
    <div class="feedback-box" style="border-left-color: ${isCorrect ? 'var(--success-green)' : 'var(--danger-red)'}; background: ${partner.accentBg};">
      <div class="feedback-character">
        <div style="width: 50px; height: 50px;">${partner.svgAvatar}</div>
        <div>
          <div style="font-weight: 800; color: ${partner.color}; font-size: 15px;">
            ${partner.name}（${partner.title}）：
          </div>
          <div class="feedback-speech">${randomIntro}</div>
        </div>
      </div>

      <div style="margin-top: 10px;">
        <div style="font-weight: 800; font-size: 14px; margin-bottom: 4px;">
          ${isCorrect ? '✅ 答對了！' : '❌ 答錯了！正確答案是：<strong style="color:var(--danger-red); font-family:\'Cambria Math\',serif;">' + renderTextbookMath(q.answer || '正確配對') + '</strong>'}
        </div>
        <div style="font-size: 13px; color: #475569;">以下為夥伴逐步拆解秘訣：</div>
        <ul class="feedback-steps">
          ${q.steps.map((st, i) => `
            <li><strong>${partner.stepPrefix[i] || `第 ${i+1} 步`}：</strong> ${renderTextbookMath(st)}</li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;

  document.getElementById('btnSubmitCurrentQ').style.display = 'none';
  const btnNext = document.getElementById('btnNextQ');
  btnNext.style.display = 'inline-block';
  btnNext.disabled = false;
  btnNext.style.opacity = '1';
  btnNext.style.cursor = 'pointer';

  const questions = getCurrentQuestions();
  const isLastQuestion = currentQuizIndex >= questions.length - 1;
  if (isLastQuestion) {
    btnNext.innerHTML = '🏁 完成測驗・交卷看成績 ➔';
    btnNext.style.maxWidth = '250px';
    btnNext.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    btnNext.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.35)';
  } else {
    btnNext.innerHTML = '下一題 ➔';
    btnNext.style.maxWidth = '180px';
    btnNext.style.background = '';
    btnNext.style.boxShadow = '';
  }
}

function goToNextQuestion() {
  if (isQuizSubmitting) return; // 鎖定防止連點

  const questions = getCurrentQuestions();
  if (currentQuizIndex < questions.length - 1) {
    currentQuizIndex++;
    renderCurrentQuestion();
  } else {
    finishQuizAndCalculate();
  }
}

// ----------------------------------------------------------------------------
// 測驗結算與送出資料庫 (GAS 雲端同步)
// ----------------------------------------------------------------------------
async function finishQuizAndCalculate() {
  if (isQuizSubmitting) return; // 徹底防止重複執行
  isQuizSubmitting = true;

  clearInterval(quizTimerInterval);

  const btnNext = document.getElementById('btnNextQ');
  if (btnNext) {
    btnNext.disabled = true;
    btnNext.style.opacity = '0.6';
    btnNext.style.cursor = 'not-allowed';
    btnNext.innerHTML = '⏳ 正在結算成績...';
  }

  const questions = getCurrentQuestions();
  let correctCount = currentQuizAnswers.filter(a => a.isCorrect).length;
  let total = questions.length || 5;
  let score = Math.round((correctCount / total) * 100);

  // 1. 關鍵優化：立即切換至結算畫面！零延遲呈現成績，徹底杜絕重複點擊與漫長等待感！
  document.getElementById('stageQuizView').style.display = 'none';
  document.getElementById('quizResultView').style.display = 'block';

  document.getElementById('resultScore').textContent = `${score} 分`;
  const summaryEl = document.getElementById('resultRewardSummary');
  if (summaryEl) {
    summaryEl.innerHTML = `答對 <strong>${correctCount} / ${total}</strong> 題 ｜ 正在同步成績至老師 Google 試算表... <span style="display:inline-block; width:12px; height:12px; border:2px solid #2a9d8f; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; vertical-align:middle; margin-left:4px;"></span>`;
  }

  if (score >= 60) {
    document.getElementById('resultEmoji').textContent = '🎉';
    document.getElementById('resultTitle').textContent = '恭喜通過島嶼試煉！';
  } else {
    document.getElementById('resultEmoji').textContent = '💪';
    document.getElementById('resultTitle').textContent = '差一點就及格囉！夥伴會陪你再接再厲！';
  }

  try {
    // 2. 背景同步提交並取得更新後的學生資料 (存入本機與 GAS 試算表)
    const result = await dataService.submitExamResult({
      stage: currentStage,
      score,
      correctCount,
      totalQuestions: total,
      durationSec: quizSeconds,
      answersDetail: currentQuizAnswers,
      paperKey: currentQuizPaperKey,
      paperTitle: getCurrentPaperTitle()
    });

    if (result && result.student) {
      currentStudent = result.student;
    }

    // 3. 雲端同步完成後，更新獲得懸賞金與經驗提示
    if (summaryEl) {
      summaryEl.textContent = 
        `獲得 ${result.expEarned} EXP ＆ ฿ ${result.bountyEarned.toLocaleString()} 懸賞金！` + 
        (result.syncedToCloud ? '（✅ 已即時登錄至老師的 Google 試算表）' : '（本機儲存中）');
    }

    if (score >= 60 && Math.random() < 0.65) {
      spawnTreasurePill();
    }

    // 4. 即時無縫重新渲染所有 UI（進度條、推薦卡、左側關卡狀態、地圖島嶼、航行船隻位置）
    refreshStudentProfileUI();
    renderUnitTabs();
    renderLeftStagesList();
    render3DIslandMap();

    // 啟動航海神秘寶箱隨機觸發偵測器
    initTreasureRandomSpawner();
  } catch (err) {
    console.error('結算提交發生例外：', err);
    if (summaryEl) {
      summaryEl.textContent = `測驗已完成（本地已記錄）`;
    }
  } finally {
    isQuizSubmitting = false;
  }
}

// ----------------------------------------------------------------------------
// 歷次成績試卷、錯題本、證書彈窗
// ----------------------------------------------------------------------------
function renderHistoryExamsList() {
  const exams = dataService.getStudentExams(currentStudent.studentKey, currentStudent);
  const container = document.getElementById('historyExamsList');
  if (!container) return;

  if (exams.length === 0) {
    container.innerHTML = '<p style="color:#64748b; padding:20px 0;">尚無測驗紀錄，快去地圖挑戰島嶼吧！</p>';
  } else {
    container.innerHTML = exams.map(e => `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 12px; background: #f8fafc;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <span style="font-weight:800; font-size:16px; color:var(--dark-navy);">${e.stageTitle}</span>
            <span style="font-size:12px; color:#64748b; margin-left:8px;">${e.timestamp}</span>
          </div>
          <div style="font-size: 20px; font-weight: 900; color: ${e.passed ? 'var(--primary-color)' : 'var(--danger-red)'};">
            ${e.score} 分
          </div>
        </div>
        <div style="font-size:13px; color:#475569;">
          答對題數：${e.correctCount} / ${e.totalQuestions} 題 ｜ 花費時間：${e.durationSec} 秒 ｜ 狀態：${e.passed ? '✅ 通過' : '❌ 未及格'}
        </div>
        <details style="margin-top: 10px;">
          <summary style="font-size:13px; font-weight:700; cursor:pointer; color:var(--secondary-color);">點此展開「完整作答卷」</summary>
          <div style="margin-top: 8px;">
            ${(e.answersDetail || []).map((a, i) => `
              <div class="review-item ${a.isCorrect ? 'correct' : 'wrong'}">
                <div style="font-weight:700; font-size:13px;">第 ${i+1} 題（${a.concept}）</div>
                <div style="font-size:15px; margin:6px 0; font-family:'Cambria Math','Times New Roman',serif; font-weight:600;">${renderTextbookMath(a.prompt)}</div>
                <div style="font-size:13px; font-family:'Cambria Math','Times New Roman',serif;">學生作答：<strong>${renderTextbookMath(a.userAnswer || '(未作答)')}</strong> ｜ 正確解答：<strong>${renderTextbookMath(a.correctAnswer)}</strong></div>
              </div>
            `).join('')}
          </div>
        </details>
      </div>
    `).join('');
  }
}

async function openHistoryExamsModal() {
  if (!currentStudent) return;
  renderHistoryExamsList();
  document.getElementById('historyExamsModal').style.display = 'flex';

  if (dataService.isGasConfigured()) {
    const ok = await dataService.syncStudentCloudData(currentStudent);
    if (ok) renderHistoryExamsList();
  }
}

function renderWrongQuestionsList() {
  const wrongs = dataService.getStudentWrongQuestions(currentStudent.studentKey, currentStudent);
  const container = document.getElementById('wrongQuestionsList');
  if (!container) return;

  if (wrongs.length === 0) {
    container.innerHTML = '<p style="color:#64748b; padding:20px 0;">太棒了！目前沒有未掌握的錯題！</p>';
  } else {
    container.innerHTML = wrongs.map(w => {
      const partner = ONE_PIECE_CHARACTERS.find(c => c.id === currentStudent.characterId) || ONE_PIECE_CHARACTERS[0];
      return `
        <div class="wrong-card ${w.mastered ? 'mastered' : ''}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <span class="q-badge">關卡：${w.stageId} ｜ 考點：${w.concept}</span>
            <span style="font-size:12px; color:#64748b;">${w.timestamp}</span>
          </div>

          <div style="font-size:16px; font-weight:700; color:var(--dark-navy); margin:10px 0; font-family:'Cambria Math','Times New Roman',serif;">
            ${renderTextbookMath(w.prompt)}
          </div>

          <div style="font-size:13px; color:#dc2626; margin-bottom:4px; font-family:'Cambria Math','Times New Roman',serif;">
            ❌ 你的作答：<strong>${renderTextbookMath(w.userAnswer || '(未作答)')}</strong>
          </div>
          <div style="font-size:13px; color:#16a34a; margin-bottom:12px; font-family:'Cambria Math','Times New Roman',serif;">
            ✅ 正確解答：<strong>${renderTextbookMath(w.correctAnswer)}</strong>
          </div>

          <div style="background:${partner.accentBg}; border-radius:8px; padding:12px; margin-bottom:12px;">
            <div style="font-weight:800; font-size:13px; color:${partner.color}; margin-bottom:6px;">
              ${partner.name} 的及時破題秘訣：
            </div>
            <div style="font-size:13px; color:#334155; line-height:1.6; font-family:'Cambria Math','Times New Roman',serif;">
              ${(w.steps || []).map(st => renderTextbookMath(st)).join('<br>')}
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end;">
            ${w.mastered ? `
              <span style="font-size:13px; font-weight:800; color:var(--success-green);">✓ 已掌握此考點</span>
            ` : `
              <button class="btn-sm-action" onclick="markMastered('${w.id}')">
                ✨ 我弄懂了！標記已掌握
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }
}

async function openWrongQuestionsModal() {
  if (!currentStudent) return;
  renderWrongQuestionsList();
  document.getElementById('wrongQuestionsModal').style.display = 'flex';

  if (dataService.isGasConfigured()) {
    const ok = await dataService.syncStudentCloudData(currentStudent);
    if (ok) renderWrongQuestionsList();
  }
}

function openCertificateModal() {
  if (!currentStudent) return;
  document.getElementById('certStudentName').textContent = currentStudent.name;
  document.getElementById('certSchoolClass').textContent = `${currentStudent.school} ${currentStudent.className}班 ${currentStudent.seatNo}號`;
  
  const partner = ONE_PIECE_CHARACTERS.find(c => c.id === currentStudent.characterId) || ONE_PIECE_CHARACTERS[0];
  document.getElementById('certPartnerName').textContent = partner.name;

  const count = (currentStudent.completedStages || []).length;
  document.getElementById('certStagesCount').textContent = `${count} 關`;
  document.getElementById('certBounty').textContent = `฿ ${(currentStudent.bounty || 0).toLocaleString()}`;

  let rank = PIRATE_RANKS[0];
  for (let r of PIRATE_RANKS) {
    if ((currentStudent.exp || 0) >= r.minExp) rank = r;
  }
  document.getElementById('certRank').textContent = rank.title;

  document.getElementById('certificateModal').style.display = 'flex';
}

async function openSecretTreasure() {
  if (!currentStudent) {
    alert('請先登入學生身分再開啟寶箱喔！');
    return;
  }

  // 隨機抽選寶物
  const treasure = treasureService.drawRandomTreasure();
  
  // 給予實質經驗值與懸賞金加成
  currentStudent = treasureService.applyTreasureReward(currentStudent, treasure);
  
  // 儲存並同步進度
  localStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT, JSON.stringify(currentStudent));
  const students = dataService.getLocalList(STORAGE_KEYS.STUDENTS_DB);
  const sIdx = students.findIndex(s => s.studentKey === currentStudent.studentKey);
  if (sIdx !== -1) {
    students[sIdx] = currentStudent;
    dataService.saveLocalList(STORAGE_KEYS.STUDENTS_DB, students);
  }
  dataService.postToGas('upsertStudent', { student: currentStudent });

  // 渲染寶物彈窗細節
  document.getElementById('trRarity').textContent = `${treasure.rarity} 等級・${treasure.category}`;
  document.getElementById('trRarity').style.background = treasure.color + '22';
  document.getElementById('trRarity').style.color = treasure.color;
  document.getElementById('trName').textContent = treasure.name;
  document.getElementById('trDesc').textContent = treasure.desc;
  document.getElementById('trEffect').textContent = `✨ 獲得獎勵：${treasure.effectText}`;
  document.getElementById('trQuoteChar').textContent = `💬 ${treasure.characterQuote.avatar} ${treasure.characterQuote.char} 說：`;
  document.getElementById('trQuoteText').textContent = `「${treasure.characterQuote.text}」`;

  // 顯示彈窗
  document.getElementById('treasureModal').style.display = 'flex';

  // 領取後隱藏寶箱，等待下一次隨機奇遇
  hideTreasurePill();

  // 即時更新左側 EXP 與懸賞金數據
  refreshStudentProfileUI();
}

function resetMapZoom() {
  render3DIslandMap();
  updateSailingAvatar();
}

function toggleBgm() {
  isBgmPlaying = !isBgmPlaying;
  alert(isBgmPlaying ? '🎶 背景航海冒險音樂已啟動！' : '🔇 已關閉音樂');
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

function openSystemSettings() {
  document.getElementById('settingGasUrl').value = dataService.getGasUrl();
  document.getElementById('systemSettingsModal').style.display = 'flex';
}

function saveSystemSettings() {
  const url = document.getElementById('settingGasUrl').value.trim();
  dataService.setGasUrl(url);
  updateGasStatusDisplay();
  closeModal('systemSettingsModal');
  alert(url ? 'Google Apps Script 網址已儲存！' : '已切換為純本機模式');
}
