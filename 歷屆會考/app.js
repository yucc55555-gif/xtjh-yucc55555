/**
 * 🌱 皮克敏歷屆會考數學 RPG 線上測驗系統 - 主程式 (app.js)
 * 支援：
 * 1. 皮克敏主題視覺、SVG 角色圖鑑、Web Audio 合成音效
 * 2. 115～106 年（由新到舊）RPG 闖關、答案選項隨機洗牌防作弊
 * 3. 皮克敏角色口氣「即時逐步解析回饋」+ 原卷完整紅字輔助線圖解
 * 4. 學生以學校、班級、座號登入，查詢歷史成績、作答完整卷、錯題複習特訓
 * 5. 教師首次登入註冊（每學年30班勾選最多5班 + 其他自訂最多5班），查詢任課班級學生成績與作答情形
 * 6. Google Apps Script (GAS) 雲端試算表即時同步 + 本地備援快取
 */

const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbwXulaW8HlZmnDAyEbAHahO85ai8ZQD0jJHiT_4XTzPX9Bx5uTt1bSPBD9JVWUSgHtm/exec";

const STORAGE_KEYS = {
  GAS_URL: "PIKMIN_MATH_GAS_URL",
  CURRENT_USER: "PIKMIN_MATH_CURRENT_USER",
  LOCAL_RECORDS: "PIKMIN_MATH_LOCAL_RECORDS",
  LOCAL_TEACHERS: "PIKMIN_MATH_LOCAL_TEACHERS",
  LOCAL_WRONG: "PIKMIN_MATH_LOCAL_WRONG",
  SOUND_ENABLED: "PIKMIN_MATH_SOUND"
};

const AppState = {
  gasUrl: DEFAULT_GAS_URL,
  soundEnabled: localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED) !== "false",
  user: null, // { role: 'student'|'teacher', school, className, seatNo, studentName } or teacher object
  portalMode: "student", // 'student' | 'teacher_login' | 'teacher_register'
  studentTab: "map", // 'map' | 'history' | 'wrong'
  teacherGradeTab: "7", // '7' | '8' | '9'
  teacherRegSelected: [], // max 5 from 701..930
  teacherRegShowCustom: false,
  teacherRegCustom: ["", "", "", "", ""], // max 5 custom inputs
  // Active Quiz State
  quiz: null,
  // Student History & Wrong Questions
  studentRecords: [],
  wrongQuestionsMap: {}, // qid -> { question, wrongCount, mastered, lastWrongAns }
  // Teacher Dashboard State
  teacherRecords: [],
  teacherFilterClass: "ALL",
  teacherFilterYear: "ALL",
  teacherSearchSeat: ""
};

/* ==========================================================================
   🎵 皮克敏風格音效合成器 (Web Audio API)
   ========================================================================== */
const PikminAudio = {
  ctx: null,
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },
  playTone(freq, type, duration, delay = 0, vol = 0.12) {
    if (!AppState.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime + delay;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (_) {}
  },
  pluck() {
    this.playTone(520, "sine", 0.09, 0, 0.12);
    this.playTone(780, "triangle", 0.12, 0.06, 0.14);
  },
  correct() {
    this.playTone(523.25, "triangle", 0.12, 0, 0.15);
    this.playTone(659.25, "triangle", 0.12, 0.1, 0.15);
    this.playTone(783.99, "triangle", 0.14, 0.2, 0.15);
    this.playTone(1046.5, "sine", 0.28, 0.3, 0.18);
  },
  wrong() {
    this.playTone(310, "sawtooth", 0.16, 0, 0.1);
    this.playTone(230, "sawtooth", 0.26, 0.14, 0.12);
  },
  whistle() {
    this.playTone(880, "sine", 0.12, 0, 0.12);
    this.playTone(1174.66, "sine", 0.22, 0.1, 0.14);
  },
  fanfare() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      this.playTone(f, "triangle", 0.22, i * 0.09, 0.15);
    });
  }
};

/* ==========================================================================
   🎨 皮克敏與探險隊長 SVG 角色圖鑑產生器
   ========================================================================== */
function getPikminSvg(type = "red", size = 48) {
  const configs = {
    red: { body: "#e53935", dark: "#b71c1c", feature: "nose", flower: "#ffffff", center: "#fdd835" },
    yellow: { body: "#fdd835", dark: "#f57f17", feature: "ears", flower: "#ffffff", center: "#fb8c00" },
    blue: { body: "#1e88e5", dark: "#0d47a1", feature: "mouth", flower: "#ffffff", center: "#fdd835" },
    purple: { body: "#8e24aa", dark: "#4a148c", feature: "hairs", flower: "#f48fb1", center: "#fdd835" },
    white: { body: "#f5f5f5", dark: "#bdbdbd", feature: "redeyes", flower: "#f48fb1", center: "#fdd835" },
    rock: { body: "#546e7a", dark: "#263238", feature: "rock", flower: "#ce93d8", center: "#fdd835" },
    Winged: { body: "#ec407a", dark: "#ad1457", feature: "wings", flower: "#ce93d8", center: "#fdd835" },
    ice: { body: "#26c6da", dark: "#00838f", feature: "ice", flower: "#fff59d", center: "#fb8c00" },
    glow: { body: "#9ccc65", dark: "#558b2f", feature: "glow", flower: "#fff59d", center: "#ff7043" },
    oatchi: { body: "#ffb300", dark: "#e65100", feature: "dog", flower: "#81c784", center: "#fff" }
  };
  const cfg = configs[type] || configs.red;

  if (cfg.feature === "dog") {
    // 搜救犬歐慶 (Oatchi)
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="36" r="22" fill="#ffe082" stroke="#5d4037" stroke-width="2.5"/>
      <ellipse cx="14" cy="34" rx="6" ry="11" transform="rotate(18 14 34)" fill="#fb8c00" stroke="#5d4037" stroke-width="2"/>
      <ellipse cx="50" cy="34" rx="6" ry="11" transform="rotate(-18 50 34)" fill="#fb8c00" stroke="#5d4037" stroke-width="2"/>
      <path d="M32 14 C32 7, 38 4, 42 7 C39 11, 35 13, 32 14Z" fill="#66bb6a" stroke="#2e7d32" stroke-width="2"/>
      <circle cx="23" cy="31" r="4.5" fill="#fff" stroke="#3e2723" stroke-width="2"/>
      <circle cx="24" cy="31" r="2.2" fill="#212121"/>
      <circle cx="41" cy="31" r="4.5" fill="#fff" stroke="#3e2723" stroke-width="2"/>
      <circle cx="40" cy="31" r="2.2" fill="#212121"/>
      <ellipse cx="32" cy="39" rx="6.5" ry="5" fill="#ef5350" stroke="#5d4037" stroke-width="2"/>
      <path d="M27 47 Q32 51 37 47" stroke="#5d4037" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`;
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- 莖與頭頂花朵/葉子 -->
    <path d="M32 22 Q33 11 38 7" stroke="#43a047" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="39" cy="7" r="6.5" fill="${cfg.flower}" stroke="#43a047" stroke-width="1.5"/>
    <circle cx="39" cy="7" r="3" fill="${cfg.center}"/>
    <!-- 耳朵或翅膀 -->
    ${cfg.feature === "ears" ? `<polygon points="8,32 18,26 18,40" fill="${cfg.body}" stroke="${cfg.dark}" stroke-width="2"/><polygon points="56,32 46,26 46,40" fill="${cfg.body}" stroke="${cfg.dark}" stroke-width="2"/>` : ""}
    ${cfg.feature === "wings" ? `<ellipse cx="15" cy="40" rx="8" ry="5" transform="rotate(-25 15 40)" fill="rgba(225,245,254,0.85)" stroke="#81d4fa" stroke-width="1.8"/><ellipse cx="49" cy="40" rx="8" ry="5" transform="rotate(25 49 40)" fill="rgba(225,245,254,0.85)" stroke="#81d4fa" stroke-width="1.8"/>` : ""}
    <!-- 頭部與身體 -->
    ${cfg.feature === "rock"
      ? `<polygon points="20,24 44,22 52,38 42,54 22,54 12,38" fill="${cfg.body}" stroke="${cfg.dark}" stroke-width="2.5"/>`
      : `<ellipse cx="32" cy="39" rx="${cfg.feature === 'hairs' ? 19 : 16}" ry="17" fill="${cfg.body}" stroke="${cfg.dark}" stroke-width="2.4"/>`
    }
    <!-- 眼睛 -->
    <circle cx="25" cy="35" r="4.8" fill="${cfg.feature === 'redeyes' ? '#e53935' : (cfg.feature === 'wings' ? '#29b6f6' : '#ffffff')}" stroke="#212121" stroke-width="1.8"/>
    <circle cx="25.8" cy="35" r="2.2" fill="${cfg.feature === 'redeyes' ? '#ffebee' : '#212121'}"/>
    <circle cx="39" cy="35" r="4.8" fill="${cfg.feature === 'redeyes' ? '#e53935' : (cfg.feature === 'wings' ? '#29b6f6' : '#ffffff')}" stroke="#212121" stroke-width="1.8"/>
    <circle cx="38.2" cy="35" r="2.2" fill="${cfg.feature === 'redeyes' ? '#ffebee' : '#212121'}"/>
    <!-- 特徵：紅皮克敏尖鼻 / 藍皮克敏嘴 / 紫皮克敏壯碩腮紅 -->
    ${cfg.feature === "nose" ? `<polygon points="31,38 35,41 29,45" fill="${cfg.body}" stroke="${cfg.dark}" stroke-width="2"/>` : ""}
    ${cfg.feature === "mouth" ? `<path d="M28 45 Q32 42 36 45" stroke="#0d47a1" stroke-width="2.4" stroke-linecap="round"/>` : ""}
    ${cfg.feature === "hairs" ? `<path d="M22 23 L19 18 M42 23 L45 18" stroke="#4a148c" stroke-width="2.4" stroke-linecap="round"/>` : ""}
  </svg>`;
}

/* ==========================================================================
   ☁️ GAS 雲端試算表 API 與本地快取同步層
   ========================================================================== */
async function callGasApi(action, payload = {}) {
  const bodyObj = Object.assign({ action }, payload);
  try {
    // 使用 text/plain 傳送 JSON 以避開瀏覽器對 Google Apps Script 的 CORS Preflight 阻擋
    const resp = await fetch(AppState.gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(bodyObj),
      redirect: "follow"
    });
    const text = await resp.text();
    const json = JSON.parse(text);
    return json;
  } catch (err) {
    console.warn("GAS API 呼叫改用本地備援:", err);
    return { ok: false, offline: true, error: String(err) };
  }
}

function getLocalRecords() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_RECORDS) || "[]"); }
  catch (_) { return []; }
}

function saveLocalRecord(rec) {
  const list = getLocalRecords();
  const idx = list.findIndex(r => r.recordId === rec.recordId);
  if (idx >= 0) list[idx] = rec;
  else list.unshift(rec);
  localStorage.setItem(STORAGE_KEYS.LOCAL_RECORDS, JSON.stringify(list.slice(0, 300)));
}

function getLocalTeachers() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_TEACHERS) || "[]"); }
  catch (_) { return []; }
}

function saveLocalTeacher(t) {
  const list = getLocalTeachers();
  const idx = list.findIndex(x => x.school.toLowerCase() === t.school.toLowerCase() && x.username.toLowerCase() === t.username.toLowerCase());
  if (idx >= 0) list[idx] = t;
  else list.push(t);
  localStorage.setItem(STORAGE_KEYS.LOCAL_TEACHERS, JSON.stringify(list));
}

function getLocalWrongMap(studentKey) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_WRONG) || "{}");
    return all[studentKey] || {};
  } catch (_) { return {}; }
}

function saveLocalWrongMap(studentKey, mapObj) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_WRONG) || "{}");
    all[studentKey] = mapObj;
    localStorage.setItem(STORAGE_KEYS.LOCAL_WRONG, JSON.stringify(all));
  } catch (_) {}
}

/* ==========================================================================
   🎲 答案選項隨機洗牌與會考等級計算
   ========================================================================== */
function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function calcCapGradeBadge(score) {
  if (score >= 93) return { grade: "A++", label: "精熟 A++ (傳奇皮克敏大師)", color: "#d32f2f" };
  if (score >= 85) return { grade: "A+", label: "精熟 A+ (皇家探險隊長)", color: "#e64a19" };
  if (score >= 76) return { grade: "A", label: "精熟 A (資深皮克敏指揮官)", color: "#f57c00" };
  if (score >= 67) return { grade: "B++", label: "基礎 B++ (菁英皮克敏隊員)", color: "#2e7d32" };
  if (score >= 56) return { grade: "B+", label: "基礎 B+ (開花皮克敏探險員)", color: "#388e3c" };
  if (score >= 40) return { grade: "B", label: "基礎 B (花苞皮克敏探險員)", color: "#0288d1" };
  return { grade: "C", label: "待加強 C (嫩葉皮克敏見習生)", color: "#7b1fa2" };
}

function showToast(msg, icon = "🌱") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const el = document.createElement("div");
  el.className = "pk-toast";
  el.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.3s ease";
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

/* ==========================================================================
   🖥️ 主畫面渲染與路由控制
   ========================================================================== */
function renderApp() {
  renderNavbar();
  const main = document.getElementById("app-main");
  if (!main) return;

  if (!AppState.user) {
    renderPortalView(main);
    return;
  }

  if (AppState.user.role === "student") {
    if (AppState.quiz) {
      renderQuizBattleView(main);
    } else {
      renderStudentDashboard(main);
    }
  } else if (AppState.user.role === "teacher") {
    renderTeacherDashboard(main);
  }
}

function renderNavbar() {
  const nav = document.getElementById("app-navbar");
  if (!nav) return;

  let userHtml = "";
  if (AppState.user) {
    if (AppState.user.role === "student") {
      userHtml = `
        <div class="pk-user-pill">
          ${getPikminSvg("red", 26)}
          <span>🎒 ${escapeHtml(AppState.user.school)}｜${escapeHtml(AppState.user.className)}班 ${escapeHtml(AppState.user.seatNo)}號 ${escapeHtml(AppState.user.studentName || "")}</span>
        </div>
        <button class="pk-btn pk-btn-yellow pk-btn-sm" onclick="switchStudentTab('map')">🗺️ 探險闖關</button>
        <button class="pk-btn pk-btn-cream pk-btn-sm" onclick="switchStudentTab('history')">📜 歷史成績與完整卷</button>
        <button class="pk-btn pk-btn-red pk-btn-sm" onclick="switchStudentTab('wrong')">🔄 錯題複習 (${getUnmasteredWrongCount()})</button>
        <button class="pk-btn pk-btn-cream pk-btn-sm" onclick="logoutUser()">🚪 登出</button>
      `;
    } else {
      userHtml = `
        <div class="pk-user-pill">
          ${getPikminSvg("oatchi", 26)}
          <span>👩‍🏫 ${escapeHtml(AppState.user.school)}｜${escapeHtml(AppState.user.teacherName)} 老師（任課 ${AppState.user.allClasses.length} 班）</span>
        </div>
        <button class="pk-btn pk-btn-yellow pk-btn-sm" onclick="openEditTeacherClassesModal()">🏫 修改任課班級</button>
        <button class="pk-btn pk-btn-cream pk-btn-sm" onclick="logoutUser()">🚪 登出</button>
      `;
    }
  }

  nav.innerHTML = `
    <div class="pk-navbar-inner">
      <div class="pk-brand" onclick="handleBrandClick()">
        <div class="pk-brand-logo">${getPikminSvg("red", 38)}</div>
        <div>
          <div class="pk-brand-title">🌱 皮克敏歷屆會考數學 RPG 探險島</div>
          <div class="pk-brand-sub">115～106年會考題庫 (由新到舊) × 即時逐步角色解析 × GAS 雲端試算表</div>
        </div>
      </div>
      <div class="pk-nav-actions">
        ${userHtml}
        <button class="pk-btn pk-btn-cream pk-btn-sm" onclick="toggleSound()" title="開關皮克敏音效">
          ${AppState.soundEnabled ? "🔊 音效開" : "🔇 音效關"}
        </button>
      </div>
    </div>
  `;
}

function handleBrandClick() {
  if (AppState.user && AppState.user.role === "student" && AppState.quiz) {
    if (confirm("確定要離開目前的探險關卡回到地圖嗎？")) {
      AppState.quiz = null;
      renderApp();
    }
  } else {
    renderApp();
  }
}

function toggleSound() {
  AppState.soundEnabled = !AppState.soundEnabled;
  localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(AppState.soundEnabled));
  if (AppState.soundEnabled) PikminAudio.pluck();
  renderNavbar();
}

function logoutUser() {
  PikminAudio.whistle();
  AppState.user = null;
  AppState.quiz = null;
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  renderApp();
}

/* ==========================================================================
   🚪 登入與教師註冊畫面 (Student Login / Teacher Login & Registration)
   ========================================================================== */
function renderPortalView(container) {
  const stages = window.EXAM_STAGES_DATA || [];
  const totalMc = stages.reduce((acc, s) => acc + (s.mcCount || 0), 0);
  const totalBoss = stages.reduce((acc, s) => acc + (s.bossCount || 0), 0);

  let rightPanelHtml = "";
  if (AppState.portalMode === "student") {
    // 產生 701..730, 801..830, 901..930 快速選項
    let classOptionsHtml = `<option value="">-- 可直接從下方選擇年級班級，或在右側自訂輸入 --</option>`;
    ["7", "8", "9"].forEach(g => {
      classOptionsHtml += `<optgroup label="${g}年級 (1～30班)">`;
      for (let c = 1; c <= 30; c++) {
        const code = `${g}${String(c).padStart(2, "0")}`;
        classOptionsHtml += `<option value="${code}">${code} (${g}年${c}班)</option>`;
      }
      classOptionsHtml += `</optgroup>`;
    });

    rightPanelHtml = `
      <form onsubmit="handleStudentLogin(event)">
        <div class="pk-form-group">
          <label class="pk-label">🏫 學校名稱（例如：溪頭國中 或 xtjh）</label>
          <input type="text" id="stu-school" class="pk-input" placeholder="請輸入學校名稱或代號" required value="溪頭國中" />
        </div>
        <div class="pk-form-group">
          <label class="pk-label">🚩 班級（可下拉選擇 701～930 或直接輸入班級代號）</label>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <select class="pk-select" onchange="if(this.value) document.getElementById('stu-class').value=this.value">
              ${classOptionsHtml}
            </select>
            <input type="text" id="stu-class" class="pk-input" placeholder="例如：901" required value="901" />
          </div>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="pk-form-group">
            <label class="pk-label">🔢 座號</label>
            <input type="number" id="stu-seat" class="pk-input" min="1" max="99" placeholder="例如：1" required value="1" />
          </div>
          <div class="pk-form-group">
            <label class="pk-label">🌱 探險家姓名（選填）</label>
            <input type="text" id="stu-name" class="pk-input" placeholder="例如：王小明" />
          </div>
        </div>
        <button type="submit" class="pk-btn pk-btn-green pk-btn-lg pk-btn-leaf" style="width:100%; margin-top:6px;">
          🚀 吹響哨子！開始皮克敏會考探險
        </button>
      </form>
    `;
  } else if (AppState.portalMode === "teacher_login") {
    rightPanelHtml = `
      <form onsubmit="handleTeacherLogin(event)">
        <div class="pk-form-group">
          <label class="pk-label">🏫 任教學校</label>
          <input type="text" id="tch-login-school" class="pk-input" placeholder="請輸入任教學校名稱" required value="溪頭國中" />
        </div>
        <div class="pk-form-group">
          <label class="pk-label">👤 教師帳號</label>
          <input type="text" id="tch-login-user" class="pk-input" placeholder="請輸入註冊時的教師帳號" required />
        </div>
        <div class="pk-form-group">
          <label class="pk-label">🔑 登入密碼</label>
          <input type="password" id="tch-login-pass" class="pk-input" placeholder="請輸入密碼" required />
        </div>
        <button type="submit" class="pk-btn pk-btn-blue pk-btn-lg pk-btn-leaf" style="width:100%; margin-top:6px;">
          👩‍🏫 登入教師指揮中心
        </button>
      </form>
    `;
  } else if (AppState.portalMode === "teacher_register") {
    rightPanelHtml = renderTeacherRegisterFormHtml();
  }

  const isSecretRegPage = Boolean(window.IS_TEACHER_REGISTER_PAGE) || new URLSearchParams(window.location.search).get("admin") === "teacher_reg_888";

  container.innerHTML = `
    <div class="portal-grid">
      <!-- 左側皮克敏世界觀與題庫介紹 -->
      <div class="hero-banner">
        <div class="pk-badge" style="background:#ffee58; color:#33691e; border-color:#fff; margin-bottom:12px;">
          🌟 收錄 115年～106年 共 10 屆完整國中教育會考數學科
        </div>
        <h1 style="font-size:2rem; font-weight:900; line-height:1.25; margin-bottom:10px; text-shadow:0 3px 6px rgba(0,0,0,0.28);">
          跟著皮克敏與歐慶，<br/>一步步破解歷屆會考數學寶物！
        </h1>
        <p style="font-size:1rem; line-height:1.65; color:#f1f8e9; font-weight:600;">
          由新到舊（115年 ➔ 106年）共 <strong>${stages.length} 大探險關卡、${totalMc} 道選擇題 + ${totalBoss} 道非選 BOSS 觀摩題</strong>！
          每題皆具備<strong>隨機選項防作弊機制</strong>，並由歐利瑪隊長、布蘭妮、阿爾福與皮克敏夥伴提供<strong>即時逐步解析回饋</strong>！
        </p>

        <div class="pikmin-parade">
          <div class="pikmin-char-figure">${getPikminSvg("red", 52)}<span style="font-size:0.75rem; font-weight:800;">紅皮克敏</span></div>
          <div class="pikmin-char-figure">${getPikminSvg("yellow", 52)}<span style="font-size:0.75rem; font-weight:800;">黃皮克敏</span></div>
          <div class="pikmin-char-figure">${getPikminSvg("blue", 52)}<span style="font-size:0.75rem; font-weight:800;">藍皮克敏</span></div>
          <div class="pikmin-char-figure">${getPikminSvg("purple", 52)}<span style="font-size:0.75rem; font-weight:800;">紫皮克敏</span></div>
          <div class="pikmin-char-figure">${getPikminSvg("white", 52)}<span style="font-size:0.75rem; font-weight:800;">白皮克敏</span></div>
          <div class="pikmin-char-figure">${getPikminSvg("rock", 52)}<span style="font-size:0.75rem; font-weight:800;">岩石皮克敏</span></div>
          <div class="pikmin-char-figure">${getPikminSvg("Winged", 52)}<span style="font-size:0.75rem; font-weight:800;">羽翅皮克敏</span></div>
          <div class="pikmin-char-figure">${getPikminSvg("ice", 52)}<span style="font-size:0.75rem; font-weight:800;">冰凍皮克敏</span></div>
          <div class="pikmin-char-figure">${getPikminSvg("oatchi", 56)}<span style="font-size:0.75rem; font-weight:800;">搜救犬歐慶</span></div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; margin-top:16px; font-size:0.88rem;">
          <div style="background:rgba(0,0,0,0.2); padding:10px 14px; border-radius:14px;">
            ✅ <strong>選項隨機防作弊</strong>：每次挑戰 A/B/C/D 順序皆重新洗牌
          </div>
          <div style="background:rgba(0,0,0,0.2); padding:10px 14px; border-radius:14px;">
            ✅ <strong>皮克敏逐步解說</strong>：角色口氣分步拆解算式與幾何輔助線
          </div>
          <div style="background:rgba(0,0,0,0.2); padding:10px 14px; border-radius:14px;">
            ✅ <strong>歷史成績與錯題營</strong>：隨時調閱完整作答卷並重練錯題
          </div>
          <div style="background:rgba(0,0,0,0.2); padding:10px 14px; border-radius:14px;">
            ✅ <strong>教師多班管理後台</strong>：勾選任課班級、即時掌握全班作答情形
          </div>
        </div>
      </div>

      <!-- 右側登入與註冊表單卡片 -->
      <div class="pk-card">
        <div class="role-tabs">
          <button type="button" class="role-tab ${AppState.portalMode === 'student' ? 'active' : ''}" onclick="setPortalMode('student')">
            🎒 學生登入測驗
          </button>
          <button type="button" class="role-tab ${AppState.portalMode === 'teacher_login' ? 'active' : ''}" onclick="setPortalMode('teacher_login')">
            👩‍🏫 老師登入查詢
          </button>
          ${isSecretRegPage ? `
            <button type="button" class="role-tab ${AppState.portalMode === 'teacher_register' ? 'active' : ''}" onclick="setPortalMode('teacher_register')">
              🔐 教師專屬註冊
            </button>
          ` : ""}
        </div>
        ${rightPanelHtml}
      </div>
    </div>
  `;
}

function setPortalMode(mode) {
  PikminAudio.pluck();
  AppState.portalMode = mode;
  renderApp();
}

/* ==========================================================================
   👩‍🏫 老師首次註冊：每個年級 30 個班級勾選 (最多5班) + 其他自訂 (最多5班)
   ========================================================================== */
function renderTeacherRegisterFormHtml(isModal = false) {
  const g = AppState.teacherGradeTab || "7";
  let gridHtml = "";
  for (let i = 1; i <= 30; i++) {
    const clsCode = `${g}${String(i).padStart(2, "0")}`;
    const isChecked = AppState.teacherRegSelected.includes(clsCode);
    gridHtml += `
      <div class="class-check-item ${isChecked ? 'checked' : ''}" onclick="toggleTeacherClassCheck('${clsCode}')">
        <span>${isChecked ? "🌺" : "🌱"}</span>
        <span>${clsCode}班</span>
      </div>
    `;
  }

  let customInputsHtml = "";
  if (AppState.teacherRegShowCustom) {
    customInputsHtml = `
      <div class="custom-classes-box">
        <div style="font-weight:800; color:#e65100; font-size:0.9rem;">
          ✏️ 其他自訂班級名稱（最多可輸入 5 個班級，例如：資優班、加強A班、931）：
        </div>
        <div class="custom-inputs-grid">
          ${AppState.teacherRegCustom.map((val, idx) => `
            <input type="text" class="pk-input" style="padding:7px 10px; font-size:0.9rem;"
              placeholder="自訂班級 ${idx + 1}"
              value="${escapeHtml(val)}"
              oninput="updateTeacherCustomClass(${idx}, this.value)" />
          `).join("")}
        </div>
      </div>
    `;
  }

  const nonEmptyCustom = AppState.teacherRegCustom.map(s => s.trim()).filter(Boolean);

  return `
    <form onsubmit="${isModal ? 'handleUpdateTeacherClassesSubmit(event)' : 'handleTeacherRegister(event)'}">
      ${!isModal ? `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="pk-form-group">
            <label class="pk-label">🏫 任教學校</label>
            <input type="text" id="reg-school" class="pk-input" placeholder="例如：溪頭國中" required value="溪頭國中" />
          </div>
          <div class="pk-form-group">
            <label class="pk-label">🏷️ 教師姓名 / 稱呼</label>
            <input type="text" id="reg-name" class="pk-input" placeholder="例如：林老師" required />
          </div>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="pk-form-group">
            <label class="pk-label">👤 設定登入帳號</label>
            <input type="text" id="reg-user" class="pk-input" placeholder="請設定英文或數字帳號" required />
          </div>
          <div class="pk-form-group">
            <label class="pk-label">🔑 設定登入密碼</label>
            <input type="password" id="reg-pass" class="pk-input" placeholder="請設定密碼" required />
          </div>
        </div>
      ` : ""}

      <div class="pk-form-group">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
          <label class="pk-label" style="margin:0;">
            📋 勾選上課班級（每學年提供 30 班，最多可勾選 5 班）
          </label>
          <span class="pk-badge" style="background:${AppState.teacherRegSelected.length >= 5 ? '#ffebee' : '#e8f5e9'}; color:${AppState.teacherRegSelected.length >= 5 ? '#c62828' : '#2e7d32'};">
            已勾選：${AppState.teacherRegSelected.length} / 5 班 ${AppState.teacherRegSelected.length ? `(${AppState.teacherRegSelected.join(', ')})` : ''}
          </span>
        </div>

        <div class="grade-tabs">
          <button type="button" class="grade-tab-btn ${g === '7' ? 'active' : ''}" onclick="switchTeacherGradeTab('7')">
            🌱 七年級 (701～730，共30班)
          </button>
          <button type="button" class="grade-tab-btn ${g === '8' ? 'active' : ''}" onclick="switchTeacherGradeTab('8')">
            🌿 八年級 (801～830，共30班)
          </button>
          <button type="button" class="grade-tab-btn ${g === '9' ? 'active' : ''}" onclick="switchTeacherGradeTab('9')">
            🌺 九年級 (901～930，共30班)
          </button>
          <button type="button" class="grade-tab-btn ${AppState.teacherRegShowCustom ? 'active' : ''}"
            style="border-color:#ffb300; ${AppState.teacherRegShowCustom ? 'background:#fb8c00; color:#fff;' : 'background:#fff8e1; color:#e65100;'}"
            onclick="toggleTeacherShowCustom()">
            ➕ 其他（自訂輸入，最多5班）${nonEmptyCustom.length ? `[已填 ${nonEmptyCustom.length}]` : ""}
          </button>
        </div>

        <div class="class-checkbox-grid" id="teacher-class-grid">
          ${gridHtml}
        </div>

        ${customInputsHtml}
      </div>

      <button type="submit" class="pk-btn pk-btn-green pk-btn-lg pk-btn-leaf" style="width:100%;">
        ${isModal ? "💾 儲存任課班級設定並同步至試算表" : "🎉 完成教師註冊並進入班級查詢後台"}
      </button>
    </form>
  `;
}

function switchTeacherGradeTab(g) {
  PikminAudio.pluck();
  AppState.teacherGradeTab = g;
  const modalBody = document.getElementById("edit-classes-modal-body");
  if (modalBody) {
    modalBody.innerHTML = renderTeacherRegisterFormHtml(true);
  } else {
    renderApp();
  }
}

function toggleTeacherClassCheck(clsCode) {
  const idx = AppState.teacherRegSelected.indexOf(clsCode);
  if (idx >= 0) {
    AppState.teacherRegSelected.splice(idx, 1);
    PikminAudio.pluck();
  } else {
    if (AppState.teacherRegSelected.length >= 5) {
      PikminAudio.wrong();
      showToast("每個帳號標準勾選最多 5 個班級！若有其他班級可使用「➕ 其他」自訂輸入喔！", "⚠️");
      return;
    }
    AppState.teacherRegSelected.push(clsCode);
    AppState.teacherRegSelected.sort();
    PikminAudio.pluck();
  }
  const modalBody = document.getElementById("edit-classes-modal-body");
  if (modalBody) {
    modalBody.innerHTML = renderTeacherRegisterFormHtml(true);
  } else {
    renderApp();
  }
}

function toggleTeacherShowCustom() {
  PikminAudio.pluck();
  AppState.teacherRegShowCustom = !AppState.teacherRegShowCustom;
  const modalBody = document.getElementById("edit-classes-modal-body");
  if (modalBody) {
    modalBody.innerHTML = renderTeacherRegisterFormHtml(true);
  } else {
    renderApp();
  }
}

function updateTeacherCustomClass(idx, val) {
  AppState.teacherRegCustom[idx] = val;
}

async function handleTeacherRegister(e) {
  e.preventDefault();
  const school = document.getElementById("reg-school").value.trim();
  const teacherName = document.getElementById("reg-name").value.trim();
  const username = document.getElementById("reg-user").value.trim();
  const password = document.getElementById("reg-pass").value.trim();
  const selectedClasses = AppState.teacherRegSelected.slice(0, 5);
  const customClasses = AppState.teacherRegCustom.map(s => s.trim()).filter(Boolean).slice(0, 5);
  const allClasses = Array.from(new Set([...selectedClasses, ...customClasses]));

  if (allClasses.length === 0) {
    PikminAudio.wrong();
    showToast("請至少勾選或於「其他」輸入 1 個任課班級！", "⚠️");
    return;
  }

  const teacherObj = {
    role: "teacher",
    school,
    username,
    password,
    teacherName,
    selectedClasses,
    customClasses,
    allClasses
  };

  showToast("正在將教師註冊資料與任課班級寫入 Google 試算表...", "☁️");
  const res = await callGasApi("registerTeacher", teacherObj);
  saveLocalTeacher(teacherObj);

  if (res && res.ok) {
    PikminAudio.fanfare();
    showToast("教師註冊成功！已同步至雲端 Google 試算表！", "🌺");
  } else if (res && !res.offline && res.error) {
    PikminAudio.wrong();
    showToast(res.error, "⚠️");
    return;
  } else {
    PikminAudio.fanfare();
    showToast("教師註冊成功！（已儲存於本地並將於連線後同步）", "🌱");
  }

  AppState.user = teacherObj;
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(teacherObj));
  await loadTeacherRecords();
  renderApp();
}

async function handleTeacherLogin(e) {
  e.preventDefault();
  const school = document.getElementById("tch-login-school").value.trim();
  const username = document.getElementById("tch-login-user").value.trim();
  const password = document.getElementById("tch-login-pass").value.trim();

  showToast("正在驗證教師帳號與載入任課班級...", "🔍");
  const res = await callGasApi("loginTeacher", { school, username, password });

  if (res && res.ok && res.teacher) {
    const t = Object.assign({ role: "teacher" }, res.teacher);
    saveLocalTeacher(t);
    AppState.user = t;
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(t));
    PikminAudio.fanfare();
    showToast(`歡迎回來，${t.teacherName}！`, "🌺");
    await loadTeacherRecords();
    renderApp();
    return;
  }

  // Fallback to local teachers cache
  const localT = getLocalTeachers().find(
    x => x.school.toLowerCase() === school.toLowerCase() &&
         x.username.toLowerCase() === username.toLowerCase() &&
         x.password === password
  );
  if (localT) {
    const t = Object.assign({ role: "teacher" }, localT);
    AppState.user = t;
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(t));
    PikminAudio.fanfare();
    showToast(`歡迎回來，${t.teacherName}！`, "🌱");
    await loadTeacherRecords();
    renderApp();
    return;
  }

  PikminAudio.wrong();
  showToast((res && res.error) ? res.error : "找不到此教師帳號或密碼錯誤，首次登入請先點選「老師首次註冊」！", "❌");
}

/* ==========================================================================
   🎒 學生登入與學生三大中心（探險地圖 / 歷史成績與完整卷 / 錯題複習）
   ========================================================================== */
async function handleStudentLogin(e) {
  e.preventDefault();
  const school = document.getElementById("stu-school").value.trim();
  const className = document.getElementById("stu-class").value.trim();
  const seatNo = String(document.getElementById("stu-seat").value).trim();
  const studentName = document.getElementById("stu-name").value.trim();

  if (!school || !className || !seatNo) {
    showToast("請完整填寫學校、班級與座號！", "⚠️");
    return;
  }

  const stuUser = {
    role: "student",
    school,
    className,
    seatNo,
    studentName: studentName || `${className}班${seatNo}號探險家`
  };

  AppState.user = stuUser;
  AppState.studentTab = "map";
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(stuUser));
  PikminAudio.whistle();
  showToast(`集合完畢！歡迎 ${stuUser.school} ${stuUser.className}班 ${stuUser.seatNo}號！`, "🌱");

  await loadStudentHistoryAndWrong();
  renderApp();
}

function getStudentKey(u = AppState.user) {
  if (!u) return "";
  return `${u.school.toLowerCase()}|${u.className.toLowerCase()}|${String(u.seatNo).toLowerCase()}`;
}

async function loadStudentHistoryAndWrong() {
  if (!AppState.user || AppState.user.role !== "student") return;
  const u = AppState.user;
  const sKey = getStudentKey(u);

  // Merge local records and cloud GAS records
  const localRecs = getLocalRecords().filter(
    r => r.school.toLowerCase() === u.school.toLowerCase() &&
         r.className.toLowerCase() === u.className.toLowerCase() &&
         String(r.seatNo).toLowerCase() === String(u.seatNo).toLowerCase()
  );

  let cloudRecs = [];
  let cloudWrong = {};
  const res = await callGasApi("getStudentRecords", {
    school: u.school,
    className: u.className,
    seatNo: u.seatNo
  });
  if (res && res.ok) {
    cloudRecs = Array.isArray(res.records) ? res.records : [];
    cloudWrong = res.wrongState || {};
  }

  const byId = {};
  [...cloudRecs, ...localRecs].forEach(r => {
    if (r && r.recordId) byId[r.recordId] = r;
  });
  AppState.studentRecords = Object.values(byId).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  // Build wrongQuestionsMap from history + saved wrong state
  const localWrong = getLocalWrongMap(sKey);
  const mergedWrong = Object.assign({}, localWrong, cloudWrong);

  // Scan all student records (oldest to newest) to ensure every wrong answer is tracked
  const chronological = AppState.studentRecords.slice().reverse();
  chronological.forEach(rec => {
    (rec.answers || []).forEach(ans => {
      if (!ans || ans.type === "boss") return;
      const qid = ans.questionId || `${rec.examYear}_mc_${ans.qnum}`;
      if (!ans.isCorrect) {
        if (!mergedWrong[qid]) {
          mergedWrong[qid] = {
            questionId: qid,
            examYear: rec.examYear,
            qnum: ans.qnum,
            wrongCount: 1,
            mastered: false
          };
        }
      }
    });
  });

  AppState.wrongQuestionsMap = mergedWrong;
  saveLocalWrongMap(sKey, mergedWrong);
}

function getUnmasteredWrongCount() {
  return Object.values(AppState.wrongQuestionsMap || {}).filter(w => !w.mastered).length;
}

function switchStudentTab(tab) {
  PikminAudio.pluck();
  AppState.quiz = null;
  AppState.studentTab = tab;
  renderApp();
}

function renderStudentDashboard(container) {
  if (AppState.studentTab === "history") {
    renderStudentHistoryView(container);
    return;
  }
  if (AppState.studentTab === "wrong") {
    renderStudentWrongReviewView(container);
    return;
  }

  const stages = window.EXAM_STAGES_DATA || [];
  // Calculate student stats per year
  const bestByYear = {};
  AppState.studentRecords.forEach(r => {
    if (r.mode === "wrong_review") return;
    const y = String(r.examYear);
    if (!bestByYear[y] || r.score > bestByYear[y].score) {
      bestByYear[y] = r;
    }
  });

  const clearedCount = Object.keys(bestByYear).length;
  const unmasteredCount = getUnmasteredWrongCount();

  const stageCardsHtml = stages.map((st, idx) => {
    const best = bestByYear[st.year];
    const badgeInfo = best ? calcCapGradeBadge(best.score) : null;
    const pikTypes = ["red", "yellow", "blue", "purple", "white", "rock", "Winged", "ice", "glow", "oatchi"];
    const pType = pikTypes[idx % pikTypes.length];

    return `
      <div class="stage-card" style="background:${st.bgGrad}; border-color:${st.color};">
        <div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px;">
            <span class="stage-year-tag" style="background:${st.color};">
              📍 第 ${idx + 1} 站｜${st.year} 年會考
            </span>
            ${best
              ? `<span class="pk-badge" style="background:${badgeInfo.color}; color:#fff; border-color:#fff;">🏆 最高 ${best.score} 分 (${badgeInfo.grade})</span>`
              : `<span class="pk-badge">🌱 尚未探險</span>`
            }
          </div>
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
            <div style="background:rgba(255,255,255,0.85); border-radius:50%; padding:6px; border:2px solid ${st.color};">
              ${getPikminSvg(pType, 48)}
            </div>
            <div>
              <h3 style="font-size:1.22rem; font-weight:900; color:#263238;">${escapeHtml(st.title)}</h3>
              <div style="font-size:0.84rem; color:#455a64; font-weight:700;">${escapeHtml(st.subtitle)}</div>
            </div>
          </div>
          <div style="font-size:0.85rem; color:#37474f; background:rgba(255,255,255,0.72); padding:8px 12px; border-radius:12px; font-weight:700;">
            <div>🎯 選擇題：<strong>${st.mcCount} 題</strong>（選項隨機防作弊）</div>
            <div>👑 壓軸 BOSS 觀摩題：<strong>${st.bossCount} 題</strong>（${escapeHtml(st.bossName)}）</div>
          </div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="pk-btn pk-btn-green pk-btn-leaf" style="flex:1;" onclick="startYearStageQuiz('${st.year}', 'full')">
            ⚔️ 完整闖關 (${st.mcCount}題+BOSS)
          </button>
          <button class="pk-btn pk-btn-cream pk-btn-sm" onclick="startYearStageQuiz('${st.year}', 'quick5')" title="快速抽考該年份 5 題">
            ⚡ 5題速測
          </button>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <!-- 學生個人探險總覽列 -->
    <div class="pk-card" style="margin-bottom:24px;">
      <div class="pk-card-header">
        <div class="pk-card-title">
          ${getPikminSvg("oatchi", 42)}
          <span>🗺️ 皮克敏歷屆會考 RPG 探險地圖（由新到舊：115年 ➔ 106年）</span>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="pk-btn pk-btn-yellow pk-btn-sm" onclick="switchStudentTab('history')">
            📜 歷史成績與作答完整卷 (${AppState.studentRecords.length} 筆)
          </button>
          <button class="pk-btn pk-btn-red pk-btn-sm" onclick="switchStudentTab('wrong')">
            🔄 錯題複習特訓營 (待馴服 ${unmasteredCount} 題)
          </button>
        </div>
      </div>

      <div class="stat-cards-row">
        <div class="stat-card">
          <div style="font-size:0.86rem; color:#546e7a; font-weight:800;">🎒 探險隊員身分</div>
          <div class="stat-card-val" style="font-size:1.25rem;">${escapeHtml(AppState.user.school)} ${escapeHtml(AppState.user.className)}班 ${escapeHtml(AppState.user.seatNo)}號</div>
        </div>
        <div class="stat-card">
          <div style="font-size:0.86rem; color:#546e7a; font-weight:800;">🚩 已攻略年份關卡</div>
          <div class="stat-card-val">${clearedCount} / ${stages.length} 關</div>
        </div>
        <div class="stat-card">
          <div style="font-size:0.86rem; color:#546e7a; font-weight:800;">📊 累積探險次數</div>
          <div class="stat-card-val">${AppState.studentRecords.length} 次</div>
        </div>
        <div class="stat-card">
          <div style="font-size:0.86rem; color:#546e7a; font-weight:800;">🔥 待複習馴服錯題</div>
          <div class="stat-card-val" style="color:${unmasteredCount > 0 ? '#d32f2f' : '#2e7d32'};">${unmasteredCount} 題</div>
        </div>
      </div>

      <div class="stages-grid">
        ${stageCardsHtml}
      </div>
    </div>
  `;
}

/* ==========================================================================
   ⚔️ 啟動 RPG 測驗與「答案選項隨機」+「皮克敏即時逐步解析回饋」
   ========================================================================== */
function startYearStageQuiz(year, mode = "full") {
  const stages = window.EXAM_STAGES_DATA || [];
  const stage = stages.find(s => String(s.year) === String(year));
  if (!stage) return;

  PikminAudio.whistle();

  let qList = stage.questions.slice();
  if (mode === "quick5") {
    const mcOnly = qList.filter(q => q.type === "mc");
    const sampled = shuffleArray(mcOnly).slice(0, 5).sort((a, b) => a.qnum - b.qnum);
    const bosses = qList.filter(q => q.type === "boss").slice(0, 1);
    qList = [...sampled, ...bosses];
  }

  // 對每一道選擇題進行「答案選項隨機洗牌 (防作弊)」
  const runtimeQuestions = qList.map(q => {
    if (q.type === "boss") {
      return {
        question: q,
        shuffledOptions: [],
        answered: false,
        bossSelfEval: null,
        revealedStepsCount: 1,
        showFullExpImg: false
      };
    }
    const displayLabels = ["A", "B", "C", "D"];
    const shuffled = shuffleArray(q.options).map((opt, idx) => ({
      displayKey: displayLabels[idx], // 畫面上顯示的隨機選項代號 A, B, C, D
      origKey: opt.origKey,           // 原卷中的選項代號 A, B, C, D
      text: opt.text,
      img: opt.img,
      isCorrect: opt.origKey === q.ans
    }));
    const correctDisplayOpt = shuffled.find(o => o.isCorrect);

    return {
      question: q,
      shuffledOptions: shuffled,
      correctDisplayKey: correctDisplayOpt ? correctDisplayOpt.displayKey : "A",
      answered: false,
      selectedDisplayKey: null,
      selectedOrigKey: null,
      isCorrect: false,
      revealedStepsCount: 1, // 預設先顯示第 1 步，讓學生點擊逐步展開
      showFullExpImg: false
    };
  });

  AppState.quiz = {
    year: String(year),
    stageTitle: stage.title,
    bossName: stage.bossName,
    mode: mode === "quick5" ? "5題速測" : "完整闖關",
    startTimeMs: Date.now(),
    currentIndex: 0,
    combo: 0,
    pikminSquadCount: 100,
    items: runtimeQuestions,
    finished: false,
    submittedRecord: null
  };

  renderApp();
}

function renderQuizBattleView(container) {
  const qz = AppState.quiz;
  if (!qz) return;

  if (qz.finished) {
    renderQuizResultSummaryView(container);
    return;
  }

  const item = qz.items[qz.currentIndex];
  const q = item.question;
  const mcItems = qz.items.filter(x => x.question.type === "mc");
  const answeredMcCount = mcItems.filter(x => x.answered).length;
  const correctMcCount = mcItems.filter(x => x.answered && x.isCorrect).length;
  const hpPercent = Math.max(0, Math.round(((mcItems.length - correctMcCount) / Math.max(1, mcItems.length)) * 100));

  // 題號導覽列
  const dotsHtml = qz.items.map((it, idx) => {
    const isCurr = idx === qz.currentIndex;
    if (it.question.type === "boss") {
      return `<button class="q-dot boss-dot ${isCurr ? 'current' : ''} ${it.answered ? 'correct' : ''}" onclick="jumpToQuizIndex(${idx})">👑非選${it.question.qnum}</button>`;
    }
    let stClass = "";
    if (it.answered) stClass = it.isCorrect ? "correct" : "wrong";
    return `<button class="q-dot ${isCurr ? 'current' : ''} ${stClass}" onclick="jumpToQuizIndex(${idx})">${it.question.qnum}</button>`;
  }).join("");

  // 選文題組區塊
  const passageHtml = q.passageImg ? `
    <div class="passage-box">
      <div class="passage-box-title">📖 題組閱讀選文（請先閱讀下方選文後作答）：</div>
      <div class="q-stem-img-wrap">
        <img src="${q.passageImg}" class="q-stem-img" alt="題組選文" />
      </div>
    </div>
  ` : "";

  // 選項區塊 or 非選 BOSS 觀摩區塊
  let interactionHtml = "";
  if (q.type === "mc") {
    const badgeColors = ["#e53935", "#fbc02d", "#1e88e5", "#8e24aa"];
    const pikTypes = ["red", "yellow", "blue", "purple"];

    interactionHtml = `
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
        <span class="pk-badge" style="background:#fff8e1; color:#e65100; border-color:#ffb300;">
          🎲 防作弊機制已啟動：本題 A、B、C、D 選項順序已隨機排列！請點選正確答案派出皮克敏攻擊：
        </span>
        <span class="pk-badge">📚 出處：${escapeHtml(q.chapter)}</span>
      </div>
      <div class="options-grid">
        ${item.shuffledOptions.map((opt, oIdx) => {
          let btnStatusClass = "";
          let statusTag = "";
          if (item.answered) {
            if (opt.isCorrect) {
              btnStatusClass = "answered-correct";
              statusTag = `<span class="pk-badge" style="background:#2e7d32; color:#fff; border-color:#fff;">🌺 正確答案</span>`;
            } else if (item.selectedDisplayKey === opt.displayKey && !opt.isCorrect) {
              btnStatusClass = "answered-wrong";
              statusTag = `<span class="pk-badge" style="background:#c62828; color:#fff; border-color:#fff;">💥 你的選擇</span>`;
            }
          }
          const txtColor = oIdx === 1 ? "#3e2723" : "#ffffff";
          return `
            <button type="button"
              class="pk-option-btn ${btnStatusClass}"
              ${item.answered ? "disabled" : ""}
              onclick="handleSelectMcOption(${qz.currentIndex}, '${opt.displayKey}')">
              <div class="pk-option-letter-badge" style="background:${badgeColors[oIdx]}; color:${txtColor};">
                ${opt.displayKey}
              </div>
              <div class="pk-option-content">
                <img src="${opt.img}" class="pk-option-img" alt="選項 ${opt.displayKey}" />
              </div>
              <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                ${getPikminSvg(pikTypes[oIdx], 32)}
                ${statusTag}
              </div>
            </button>
          `;
        }).join("")}
      </div>
    `;
  } else {
    // 非選擇題（皮克敏 BOSS 觀摩題）
    interactionHtml = `
      <div style="background:linear-gradient(135deg, #fff8e1, #ffe0b2); border:3px solid #fb8c00; border-radius:20px; padding:18px; margin-bottom:18px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            ${getPikminSvg("oatchi", 44)}
            <div>
              <div style="font-weight:900; color:#e65100; font-size:1.08rem;">
                👑 第二部分：非選擇題 第 ${q.qnum} 題（皮克敏 BOSS 觀摩與自我檢核題・不扣選擇題計分）
              </div>
              <div style="font-size:0.88rem; color:#5d4037; font-weight:700;">
                請先在紙上或腦中構思 (1)、(2) 小題的解題策略，再點擊下方按鈕召喚皮克敏隊長逐步解說！
              </div>
            </div>
          </div>
          ${!item.answered ? `
            <button class="pk-btn pk-btn-red pk-btn-leaf" onclick="handleUnlockBossExplanation(${qz.currentIndex})">
              🌱 召喚皮克敏逐步拆解 BOSS 解法
            </button>
          ` : `
            <span class="pk-badge" style="background:#2e7d32; color:#fff;">🌺 已完成 BOSS 題觀摩</span>
          `}
        </div>
      </div>
    `;
  }

  // 即時逐步解析回饋面板 (當學生已作答後顯示)
  let feedbackHtml = "";
  if (item.answered) {
    feedbackHtml = renderStepByStepFeedbackHtml(qz.currentIndex, item);
  }

  container.innerHTML = `
    <!-- 頂部 RPG 戰鬥狀態列 -->
    <div class="rpg-battle-hud">
      <div class="hud-top-row">
        <div style="display:flex; align-items:center; gap:10px;">
          ${getPikminSvg("red", 38)}
          <div>
            <div style="font-weight:900; font-size:1.1rem;">${escapeHtml(qz.stageTitle)}（${qz.mode}）</div>
            <div style="font-size:0.82rem; color:#c8e6c9;">鎮守原生生物：${escapeHtml(qz.bossName)}</div>
          </div>
        </div>

        <div class="monster-hp-bar-wrap">
          <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:800; padding:0 8px 3px;">
            <span>👾 原生生物體力 HP (${hpPercent}%)</span>
            <span>🔥 連擊 Combo: ${qz.combo}｜🌱 皮克敏小隊: ${qz.pikminSquadCount} 隻</span>
          </div>
          <div class="monster-hp-bar-fill" style="width:${hpPercent}%;"></div>
        </div>

        <div style="display:flex; align-items:center; gap:8px;">
          <span class="pk-badge" style="background:#ffee58; color:#1b5e20;">
            進度：${answeredMcCount} / ${mcItems.length} 題
          </span>
          <button class="pk-btn pk-btn-yellow pk-btn-sm" onclick="finishAndSubmitQuiz()">
            🏁 結算並登錄成績
          </button>
        </div>
      </div>

      <div class="q-dots-bar">
        ${dotsHtml}
      </div>
    </div>

    <!-- 題目主卡片 -->
    <div class="pk-card">
      <div class="pk-card-header">
        <div class="pk-card-title">
          <span class="pk-badge" style="background:#2e7d32; color:#fff; font-size:0.95rem;">
            ${q.type === "mc" ? `${qz.year}年會考 選擇題 第 ${q.qnum} 題` : `${qz.year}年會考 非選擇題 BOSS 第 ${q.qnum} 題`}
          </span>
          <span style="font-size:1rem; color:#455a64;">（第 ${qz.currentIndex + 1} / ${qz.items.length} 關）</span>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="pk-btn pk-btn-cream pk-btn-sm" ${qz.currentIndex === 0 ? "disabled" : ""} onclick="jumpToQuizIndex(${qz.currentIndex - 1})">
            ⬅️ 上一題
          </button>
          ${qz.currentIndex < qz.items.length - 1
            ? `<button class="pk-btn pk-btn-green pk-btn-sm" onclick="jumpToQuizIndex(${qz.currentIndex + 1})">下一題 ➡️</button>`
            : `<button class="pk-btn pk-btn-yellow pk-btn-sm" onclick="finishAndSubmitQuiz()">🏆 完成探險結算成績</button>`
          }
        </div>
      </div>

      ${passageHtml}

      <!-- 原卷高解析去紅字題目與圖表 -->
      <div class="question-stage-box">
        <div class="q-stem-img-wrap">
          <img src="${q.stemImg}" class="q-stem-img" alt="第 ${q.qnum} 題題目" />
        </div>
      </div>

      ${interactionHtml}
      ${feedbackHtml}
    </div>
  `;
}

/* ==========================================================================
   📡 皮克敏人物口氣「即時逐步解析回饋」渲染與互動
   ========================================================================== */
function renderStepByStepFeedbackHtml(itemIdx, item) {
  const q = item.question;
  const guide = q.pikminGuide;
  const steps = q.steps || [];
  const visibleSteps = steps.slice(0, item.revealedStepsCount);
  const hasMoreSteps = item.revealedStepsCount < steps.length;

  let resultBannerHtml = "";
  if (q.type === "mc") {
    if (item.isCorrect) {
      resultBannerHtml = `
        <div style="background:#e8f5e9; border:2.5px solid #2e7d32; color:#1b5e20; padding:12px 18px; border-radius:16px; font-weight:900; margin-bottom:14px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
          <span>🎉 命中目標！皮克敏小隊成功搬運寶物！你選的【(${item.selectedDisplayKey})】完全正確！</span>
          <span class="pk-badge" style="background:#2e7d32; color:#fff;">+100 皮克敏花蜜能量 🌺</span>
        </div>
      `;
    } else {
      resultBannerHtml = `
        <div style="background:#ffebee; border:2.5px solid #e53935; color:#b71c1c; padding:12px 18px; border-radius:16px; font-weight:900; margin-bottom:14px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
          <span>📣 嗶嗶—！隊長吹響救援哨子！你選了 (${item.selectedDisplayKey})，但本題隨機排列後的正確答案是【(${item.correctDisplayKey})】喔！</span>
          <span class="pk-badge" style="background:#c62828; color:#fff;">已自動收錄至「錯題複習營」🔄</span>
        </div>
      `;
    }
  }

  const stepsCardsHtml = visibleSteps.map((st, sIdx) => {
    const stepBadges = ["🌱 第一步：情報偵察", "🌿 第二步：算式推進", "🌺 第三步：關鍵突破", "🏆 第四步：完美收穫"];
    return `
      <div class="step-card" style="border-left-color:${guide.color};">
        <div class="step-card-header" style="color:${guide.color};">
          <span>${stepBadges[sIdx] || `🌱 第 ${st.stepNo} 步`}</span>
          <span style="font-size:0.8rem; opacity:0.85;">— ${escapeHtml(st.speaker)}</span>
        </div>
        <div class="step-card-body">${escapeHtml(st.dialogue)}</div>
      </div>
    `;
  }).join("");

  // 當所有文字步驟揭曉後，顯示動態隨機選項結論 + 完整原卷紅字詳解圖
  const allStepsRevealed = !hasMoreSteps;
  const finalConclusionHtml = allStepsRevealed ? `
    <div class="step-card" style="border-left-color:#2e7d32; background:#f1f8e9;">
      <div class="step-card-header" style="color:#1b5e20;">
        🎯 ${escapeHtml(guide.speaker)} 最終結論與完整圖解：
      </div>
      <div class="step-card-body">
        ${q.type === "mc"
          ? `綜合以上皮克敏小隊的逐步推導，對應本題隨機排列後的選項位置，正確答案要選【(${item.correctDisplayKey})】（對應原卷選項 ${q.ans}）！下方附上完整數學算式與幾何輔助線詳解圖：`
          : `以上即為本題非選擇題 BOSS 戰的完整推導過程！請對照下方完整幾何與算式詳解圖：`}
      </div>
      <div class="official-exp-box">
        <div style="font-size:0.86rem; font-weight:800; color:#2e7d32; margin-bottom:8px;">
          📐 完整數學解析與幾何輔助線圖解（${escapeHtml(q.chapter)}）：
        </div>
        <img src="${q.expImg}" class="official-exp-img" alt="完整試題解析" />
      </div>
    </div>
  ` : "";

  return `
    <div class="pikmin-feedback-panel" id="feedback-panel">
      ${resultBannerHtml}

      <!-- 皮克敏隊長人物口氣開場 -->
      <div class="captain-header">
        <div class="captain-avatar" style="border-color:${guide.color};">
          ${getPikminSvg(guide.pikminType, 50)}
        </div>
        <div style="flex:1;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span style="font-weight:900; font-size:1.1rem; color:${guide.color};">${escapeHtml(guide.speaker)}</span>
            <span class="pk-badge">${escapeHtml(guide.role)}</span>
            <span class="pk-badge" style="background:#e8f5e9;">進度：已解鎖 ${item.revealedStepsCount} / ${steps.length} 步</span>
          </div>
          <div style="margin-top:6px; font-weight:700; color:#37474f; font-size:0.98rem;">
            💬 「${escapeHtml(guide.intro)}」
          </div>
        </div>
      </div>

      <!-- 逐步解析步驟卡片 -->
      ${stepsCardsHtml}
      ${finalConclusionHtml}

      <!-- 逐步解鎖控制按鈕列 -->
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-top:14px;">
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          ${hasMoreSteps ? `
            <button type="button" class="pk-btn pk-btn-green pk-btn-leaf" onclick="revealNextExplanationStep(${itemIdx})">
              🌿 繼續聽 ${escapeHtml(guide.speaker)} 解說下一步 (${item.revealedStepsCount + 1} / ${steps.length})
            </button>
            <button type="button" class="pk-btn pk-btn-cream pk-btn-sm" onclick="revealAllExplanationSteps(${itemIdx})">
              🌺 一鍵展開全部步驟與完整圖解
            </button>
          ` : `
            <span class="pk-badge" style="background:#2e7d32; color:#fff; padding:8px 14px;">
              🌺 已完整解鎖所有皮克敏解析步驟！
            </span>
          `}
        </div>

        <div>
          ${itemIdx < AppState.quiz.items.length - 1 ? `
            <button type="button" class="pk-btn pk-btn-yellow pk-btn-leaf" onclick="jumpToQuizIndex(${itemIdx + 1})">
              前往下一題挑戰 ➡️
            </button>
          ` : `
            <button type="button" class="pk-btn pk-btn-red pk-btn-leaf" onclick="finishAndSubmitQuiz()">
              🏆 完成本關卡！結算成績並登錄試算表
            </button>
          `}
        </div>
      </div>
    </div>
  `;
}

function handleSelectMcOption(itemIdx, displayKey) {
  const qz = AppState.quiz;
  if (!qz) return;
  const item = qz.items[itemIdx];
  if (!item || item.answered) return;

  const chosen = item.shuffledOptions.find(o => o.displayKey === displayKey);
  if (!chosen) return;

  item.answered = true;
  item.selectedDisplayKey = displayKey;
  item.selectedOrigKey = chosen.origKey;
  item.isCorrect = chosen.isCorrect;
  item.revealedStepsCount = 1;

  if (item.isCorrect) {
    qz.combo += 1;
    qz.pikminSquadCount += 5;
    PikminAudio.correct();
  } else {
    qz.combo = 0;
    qz.pikminSquadCount = Math.max(10, qz.pikminSquadCount - 5);
    PikminAudio.wrong();
    // 立即記錄至學生錯題本
    const sKey = getStudentKey();
    const qid = item.question.id;
    const prev = AppState.wrongQuestionsMap[qid];
    AppState.wrongQuestionsMap[qid] = {
      questionId: qid,
      examYear: qz.year,
      qnum: item.question.qnum,
      wrongCount: (prev ? prev.wrongCount : 0) + 1,
      mastered: false
    };
    saveLocalWrongMap(sKey, AppState.wrongQuestionsMap);
  }

  renderApp();
  setTimeout(() => {
    const panel = document.getElementById("feedback-panel");
    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 80);
}

function handleUnlockBossExplanation(itemIdx) {
  const qz = AppState.quiz;
  if (!qz) return;
  const item = qz.items[itemIdx];
  if (!item) return;
  PikminAudio.whistle();
  item.answered = true;
  item.revealedStepsCount = 1;
  renderApp();
}

function revealNextExplanationStep(itemIdx) {
  const qz = AppState.quiz;
  if (!qz) return;
  const item = qz.items[itemIdx];
  if (!item) return;
  PikminAudio.pluck();
  item.revealedStepsCount = Math.min((item.question.steps || []).length, item.revealedStepsCount + 1);
  renderApp();
}

function revealAllExplanationSteps(itemIdx) {
  const qz = AppState.quiz;
  if (!qz) return;
  const item = qz.items[itemIdx];
  if (!item) return;
  PikminAudio.correct();
  item.revealedStepsCount = (item.question.steps || []).length;
  renderApp();
}

function jumpToQuizIndex(idx) {
  const qz = AppState.quiz;
  if (!qz || idx < 0 || idx >= qz.items.length) return;
  PikminAudio.pluck();
  qz.currentIndex = idx;
  renderApp();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ==========================================================================
   🏁 測驗結算與自動上傳 Google 試算表 (GAS)
   ========================================================================== */
async function finishAndSubmitQuiz() {
  const qz = AppState.quiz;
  if (!qz) return;

  const mcItems = qz.items.filter(x => x.question.type === "mc");
  const unanswered = mcItems.filter(x => !x.answered);
  if (unanswered.length > 0) {
    if (!confirm(`還有 ${unanswered.length} 道選擇題尚未作答，確定要直接交卷結算成績嗎？`)) {
      return;
    }
  }

  const totalCount = mcItems.length;
  const correctCount = mcItems.filter(x => x.answered && x.isCorrect).length;
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100;
  const badge = calcCapGradeBadge(score);
  const durationSec = Math.max(1, Math.round((Date.now() - qz.startTimeMs) / 1000));

  const detailedAnswers = qz.items.map(it => {
    const q = it.question;
    if (q.type === "boss") {
      return {
        questionId: q.id,
        qnum: q.qnum,
        type: "boss",
        viewed: it.answered
      };
    }
    return {
      questionId: q.id,
      qnum: q.qnum,
      type: "mc",
      selectedDisplayKey: it.selectedDisplayKey || "未作答",
      selectedOrigKey: it.selectedOrigKey || "未作答",
      correctDisplayKey: it.correctDisplayKey,
      correctOrigKey: q.ans,
      isCorrect: Boolean(it.answered && it.isCorrect),
      shuffledOrder: it.shuffledOptions.map(o => ({
        displayKey: o.displayKey,
        origKey: o.origKey,
        text: o.text
      }))
    };
  });

  const recordObj = {
    recordId: "REC_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    school: AppState.user.school,
    className: AppState.user.className,
    seatNo: AppState.user.seatNo,
    studentName: AppState.user.studentName,
    examYear: qz.year,
    mode: qz.mode,
    score,
    correctCount,
    totalCount,
    gradeBadge: badge.grade,
    durationSec,
    answers: detailedAnswers,
    syncedToGas: false
  };

  qz.finished = true;
  qz.submittedRecord = recordObj;
  PikminAudio.fanfare();

  saveLocalRecord(recordObj);
  AppState.studentRecords.unshift(recordObj);
  renderApp();

  showToast("正在將成績與完整作答卷登錄至 Google 試算表...", "☁️");
  const res = await callGasApi("submitScore", recordObj);
  if (res && res.ok) {
    recordObj.syncedToGas = true;
    saveLocalRecord(recordObj);
    showToast("成績與作答完整卷已成功登錄至 Google 試算表！", "🌺");
    renderApp();
  } else {
    showToast("已儲存於本機紀錄（待試算表網址設定完成後可隨時同步）", "🌱");
  }
}

function renderQuizResultSummaryView(container) {
  const qz = AppState.quiz;
  const rec = qz.submittedRecord;
  const badge = calcCapGradeBadge(rec.score);

  container.innerHTML = `
    <div class="pk-card" style="text-align:center; max-width:860px; margin:0 auto;">
      <div style="display:flex; justify-content:center; gap:12px; margin-bottom:12px;">
        ${getPikminSvg("red", 54)}
        ${getPikminSvg("yellow", 54)}
        ${getPikminSvg("oatchi", 60)}
        ${getPikminSvg("blue", 54)}
        ${getPikminSvg("Winged", 54)}
      </div>

      <span class="pk-badge" style="background:${badge.color}; color:#fff; font-size:1rem; padding:6px 18px;">
        🏆 會考能力等級：${badge.label}
      </span>

      <h2 style="font-size:2rem; font-weight:900; color:#1b5e20; margin:12px 0 6px;">
        ${escapeHtml(qz.stageTitle)} 探險結算報告
      </h2>
      <p style="color:#546e7a; font-weight:700; margin-bottom:20px;">
        探險家：${escapeHtml(rec.school)} ${escapeHtml(rec.className)}班 ${escapeHtml(rec.seatNo)}號｜模式：${escapeHtml(rec.mode)}
      </p>

      <div class="stat-cards-row">
        <div class="stat-card">
          <div style="font-size:0.85rem; color:#546e7a; font-weight:800;">💯 測驗總分</div>
          <div class="stat-card-val" style="font-size:2.2rem; color:${badge.color};">${rec.score} 分</div>
        </div>
        <div class="stat-card">
          <div style="font-size:0.85rem; color:#546e7a; font-weight:800;">✅ 答對題數</div>
          <div class="stat-card-val">${rec.correctCount} / ${rec.totalCount} 題</div>
        </div>
        <div class="stat-card">
          <div style="font-size:0.85rem; color:#546e7a; font-weight:800;">⏱️ 探險耗時</div>
          <div class="stat-card-val">${Math.floor(rec.durationSec / 60)}分 ${rec.durationSec % 60}秒</div>
        </div>
        <div class="stat-card">
          <div style="font-size:0.85rem; color:#546e7a; font-weight:800;">☁️ 試算表登錄狀態</div>
          <div class="stat-card-val" style="font-size:1.1rem; color:${rec.syncedToGas ? '#2e7d32' : '#ef6c00'};">
            ${rec.syncedToGas ? "✅ 已登錄雲端試算表" : "💾 已存本機備援"}
          </div>
        </div>
      </div>

      <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap; margin-top:20px;">
        <button class="pk-btn pk-btn-blue pk-btn-lg pk-btn-leaf" onclick="openFullPaperModal('${rec.recordId}')">
          📄 檢視本次「作答完整卷與逐步解析」
        </button>
        <button class="pk-btn pk-btn-red pk-btn-lg pk-btn-leaf" onclick="switchStudentTab('wrong')">
          🔄 前往錯題複習特訓營 (${getUnmasteredWrongCount()} 題)
        </button>
        <button class="pk-btn pk-btn-green pk-btn-lg pk-btn-leaf" onclick="switchStudentTab('map')">
          🗺️ 返回歷屆會考探險地圖
        </button>
      </div>
    </div>
  `;
}

/* ==========================================================================
   📜 學生查詢「歷史成績」及「作答完整卷」
   ========================================================================== */
function renderStudentHistoryView(container) {
  const recs = AppState.studentRecords || [];

  const rowsHtml = recs.length === 0 ? `
    <tr>
      <td colspan="8" style="text-align:center; padding:32px; color:#78909c; font-weight:800;">
        🌱 目前還沒有探險測驗紀錄喔！快點擊上方「🗺️ 探險闖關」開始挑戰吧！
      </td>
    </tr>
  ` : recs.map((r, i) => {
    const b = calcCapGradeBadge(r.score);
    const dt = formatDateTime(r.timestamp);
    return `
      <tr>
        <td>#${recs.length - i}</td>
        <td>${dt}</td>
        <td><span class="pk-badge" style="background:#2e7d32; color:#fff;">${escapeHtml(r.examYear)} 年會考</span></td>
        <td>${escapeHtml(r.mode || "完整闖關")}</td>
        <td><strong style="font-size:1.1rem; color:${b.color};">${r.score} 分</strong></td>
        <td><span class="pk-badge" style="background:${b.color}; color:#fff;">${b.grade}</span></td>
        <td>${r.correctCount} / ${r.totalCount} 題 (${Math.floor((r.durationSec || 0) / 60)}分${(r.durationSec || 0) % 60}秒)</td>
        <td>
          <button class="pk-btn pk-btn-blue pk-btn-sm" onclick="openFullPaperModal('${r.recordId}')">
            📄 查看作答完整卷
          </button>
        </td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <div class="pk-card">
      <div class="pk-card-header">
        <div class="pk-card-title">
          ${getPikminSvg("blue", 40)}
          <span>📜 歷史成績與作答完整卷查詢（${escapeHtml(AppState.user.school)} ${escapeHtml(AppState.user.className)}班 ${escapeHtml(AppState.user.seatNo)}號）</span>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="pk-btn pk-btn-cream pk-btn-sm" onclick="loadStudentHistoryAndWrong().then(() => renderApp())">
            🔄 重新同步雲端紀錄
          </button>
          <button class="pk-btn pk-btn-green pk-btn-sm" onclick="switchStudentTab('map')">
            🗺️ 返回探險地圖
          </button>
        </div>
      </div>

      <div class="pk-table-wrap">
        <table class="pk-table">
          <thead>
            <tr>
              <th>次別</th>
              <th>測驗時間</th>
              <th>會考年份</th>
              <th>測驗模式</th>
              <th>成績</th>
              <th>等級</th>
              <th>答對題數 / 耗時</th>
              <th>作答完整卷</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ==========================================================================
   🔄 學生「錯題複習特訓營」 (Wrong Question Review & Re-practice)
   ========================================================================== */
function findQuestionById(qid) {
  const stages = window.EXAM_STAGES_DATA || [];
  for (const st of stages) {
    for (const q of st.questions) {
      if (q.id === qid) return q;
    }
  }
  return null;
}

function renderStudentWrongReviewView(container) {
  const wrongList = Object.values(AppState.wrongQuestionsMap || {})
    .map(w => ({ meta: w, question: findQuestionById(w.questionId) }))
    .filter(x => x.question)
    .sort((a, b) => (Number(b.meta.examYear) - Number(a.meta.examYear)) || (a.meta.qnum - b.meta.qnum));

  const unmastered = wrongList.filter(x => !x.meta.mastered);
  const mastered = wrongList.filter(x => x.meta.mastered);

  const cardsHtml = wrongList.length === 0 ? `
    <div style="text-align:center; padding:40px; background:#f1f8e9; border-radius:20px; border:2.5px dashed #81c784;">
      ${getPikminSvg("Winged", 64)}
      <h3 style="color:#2e7d32; margin-top:10px;">太厲害了！目前沒有任何錯題紀錄！</h3>
      <p style="color:#546e7a; font-weight:600; margin-top:6px;">當你在歷屆會考探險中答錯題目時，皮克敏會自動幫你收集到這裡進行特訓喔！</p>
    </div>
  ` : wrongList.map(({ meta, question: q }) => {
    const correctOpt = q.options.find(o => o.origKey === q.ans);
    return `
      <div class="pk-card" style="margin-bottom:18px; border-color:${meta.mastered ? '#81c784' : '#ef5350'};">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span class="pk-badge" style="background:${meta.mastered ? '#2e7d32' : '#d32f2f'}; color:#fff;">
              ${meta.mastered ? "🌺 已馴服掌握" : `🔥 待馴服錯題 (曾錯 ${meta.wrongCount} 次)`}
            </span>
            <span class="pk-badge">${q.year} 年會考 第 ${q.qnum} 題</span>
            <span class="pk-badge">📚 ${escapeHtml(q.chapter)}</span>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="pk-btn ${meta.mastered ? 'pk-btn-cream' : 'pk-btn-green'} pk-btn-sm"
              onclick="toggleWrongQuestionMastered('${q.id}', ${!meta.mastered})">
              ${meta.mastered ? "↩️ 移回待複習清單" : "✅ 標記為「已馴服掌握」"}
            </button>
          </div>
        </div>

        <div class="question-stage-box" style="margin-bottom:12px;">
          <div class="q-stem-img-wrap">
            <img src="${q.stemImg}" class="q-stem-img" alt="題目" />
          </div>
        </div>

        <details style="background:#f1f8e9; border:2px solid #a5d6a7; border-radius:16px; padding:12px 16px;">
          <summary style="cursor:pointer; font-weight:900; color:#1b5e20; font-size:1rem;">
            🌱 點此展開「正確選項內容」與「${escapeHtml(q.pikminGuide.speaker)}逐步解析」
          </summary>
          <div style="margin-top:12px;">
            <div style="display:flex; align-items:center; gap:12px; background:#fff; padding:10px 14px; border-radius:12px; border:2px solid #66bb6a; margin-bottom:12px;">
              <span class="pk-badge" style="background:#2e7d32; color:#fff;">原卷正確選項 (${q.ans})</span>
              ${correctOpt ? `<img src="${correctOpt.img}" style="max-height:60px;" alt="正確選項" />` : ""}
            </div>
            ${(q.steps || []).map(st => `
              <div class="step-card" style="border-left-color:${q.pikminGuide.color};">
                <div class="step-card-header" style="color:${q.pikminGuide.color};">
                  步驟 ${st.stepNo} — ${escapeHtml(st.speaker)}
                </div>
                <div class="step-card-body">${escapeHtml(st.dialogue)}</div>
              </div>
            `).join("")}
            <div class="official-exp-box">
              <img src="${q.expImg}" class="official-exp-img" alt="詳解圖" />
            </div>
          </div>
        </details>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div class="pk-card" style="margin-bottom:20px;">
      <div class="pk-card-header">
        <div class="pk-card-title">
          ${getPikminSvg("purple", 42)}
          <span>🔄 皮克敏錯題複習特訓營（待馴服：${unmastered.length} 題｜已掌握：${mastered.length} 題）</span>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${unmastered.length > 0 ? `
            <button class="pk-btn pk-btn-red pk-btn-leaf" onclick="startWrongQuestionsPracticeQuiz()">
              ⚔️ 啟動「錯題重練 RPG 測驗」 (共 ${unmastered.length} 題・選項重新隨機洗牌)
            </button>
          ` : ""}
          <button class="pk-btn pk-btn-green pk-btn-sm" onclick="switchStudentTab('map')">
            🗺️ 返回探險地圖
          </button>
        </div>
      </div>
      ${cardsHtml}
    </div>
  `;
}

async function toggleWrongQuestionMastered(qid, mastered) {
  PikminAudio.pluck();
  const sKey = getStudentKey();
  if (AppState.wrongQuestionsMap[qid]) {
    AppState.wrongQuestionsMap[qid].mastered = mastered;
    saveLocalWrongMap(sKey, AppState.wrongQuestionsMap);
  }
  renderApp();
  await callGasApi("markWrongMastered", {
    school: AppState.user.school,
    className: AppState.user.className,
    seatNo: AppState.user.seatNo,
    questionId: qid,
    mastered
  });
}

function startWrongQuestionsPracticeQuiz() {
  const unmasteredQuestions = Object.values(AppState.wrongQuestionsMap || {})
    .filter(w => !w.mastered)
    .map(w => findQuestionById(w.questionId))
    .filter(Boolean);

  if (unmasteredQuestions.length === 0) {
    showToast("目前沒有待複習的錯題喔！", "🌺");
    return;
  }

  PikminAudio.whistle();
  const displayLabels = ["A", "B", "C", "D"];
  const runtimeQuestions = unmasteredQuestions.map(q => {
    const shuffled = shuffleArray(q.options).map((opt, idx) => ({
      displayKey: displayLabels[idx],
      origKey: opt.origKey,
      text: opt.text,
      img: opt.img,
      isCorrect: opt.origKey === q.ans
    }));
    const correctDisplayOpt = shuffled.find(o => o.isCorrect);
    return {
      question: q,
      shuffledOptions: shuffled,
      correctDisplayKey: correctDisplayOpt ? correctDisplayOpt.displayKey : "A",
      answered: false,
      selectedDisplayKey: null,
      selectedOrigKey: null,
      isCorrect: false,
      revealedStepsCount: 1,
      showFullExpImg: false
    };
  });

  AppState.quiz = {
    year: "錯題特訓",
    stageTitle: "🔥 皮克敏錯題複習特訓營",
    bossName: "歷屆錯題心魔巨怪",
    mode: "錯題複習",
    startTimeMs: Date.now(),
    currentIndex: 0,
    combo: 0,
    pikminSquadCount: 100,
    items: runtimeQuestions,
    finished: false,
    submittedRecord: null
  };

  renderApp();
}

/* ==========================================================================
   📄 檢視「作答完整卷」彈出視窗 (學生與老師皆可調閱)
   ========================================================================== */
function openFullPaperModal(recordId) {
  PikminAudio.pluck();
  const allPool = [...(AppState.studentRecords || []), ...(AppState.teacherRecords || []), ...getLocalRecords()];
  const rec = allPool.find(r => r && r.recordId === recordId);
  if (!rec) {
    showToast("找不到該筆作答完整卷資料", "⚠️");
    return;
  }

  const badge = calcCapGradeBadge(rec.score);
  const answers = Array.isArray(rec.answers) ? rec.answers : [];

  const itemsHtml = answers.map((ans, idx) => {
    const q = findQuestionById(ans.questionId || `${rec.examYear}_mc_${ans.qnum}`);
    if (!q) {
      return `<div class="step-card">第 ${ans.qnum} 題：作答 ${ans.selectedDisplayKey}（正確：${ans.correctDisplayKey}）</div>`;
    }
    if (ans.type === "boss" || q.type === "boss") {
      return `
        <div class="pk-card" style="margin-bottom:14px; padding:16px; border-color:#ffb300;">
          <div style="font-weight:900; color:#e65100; margin-bottom:8px;">
            👑 非選擇題 BOSS 第 ${q.qnum} 題（觀摩狀態：${ans.viewed ? "已觀摩" : "未展開"}）
          </div>
          <img src="${q.stemImg}" style="max-width:100%; max-height:240px; object-fit:contain;" alt="BOSS題" />
          <details style="margin-top:8px;">
            <summary style="cursor:pointer; font-weight:800; color:#2e7d32;">展開完整參考解答與圖解</summary>
            <img src="${q.expImg}" style="max-width:100%; max-height:320px; object-fit:contain; margin-top:8px;" alt="BOSS詳解" />
          </details>
        </div>
      `;
    }

    const chosenOpt = q.options.find(o => o.origKey === ans.selectedOrigKey);
    const rightOpt = q.options.find(o => o.origKey === q.ans);

    return `
      <div class="pk-card" style="margin-bottom:14px; padding:16px; border-color:${ans.isCorrect ? '#66bb6a' : '#ef5350'};">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="pk-badge" style="background:${ans.isCorrect ? '#2e7d32' : '#c62828'}; color:#fff;">
              ${ans.isCorrect ? "✅ 答對" : "❌ 答錯"}
            </span>
            <strong>${q.year}年 第 ${q.qnum} 題</strong>
            <span class="pk-badge">${escapeHtml(q.chapter)}</span>
          </div>
          <div style="font-size:0.88rem; font-weight:800; color:#37474f;">
            學生作答：<span style="color:${ans.isCorrect ? '#2e7d32' : '#c62828'};">(${escapeHtml(ans.selectedDisplayKey || '未作答')}) [原卷${escapeHtml(ans.selectedOrigKey || '-')}]</span>
            ｜正確答案：<span style="color:#2e7d32;">(${escapeHtml(ans.correctDisplayKey || q.ans)}) [原卷${q.ans}]</span>
          </div>
        </div>

        <div style="background:#fff; border:2px solid #e0e0e0; border-radius:12px; padding:10px; text-align:center; margin-bottom:10px;">
          <img src="${q.stemImg}" style="max-width:100%; max-height:240px; object-fit:contain;" alt="題目" />
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
          <div style="background:${ans.isCorrect ? '#e8f5e9' : '#ffebee'}; padding:10px; border-radius:12px; border:2px solid ${ans.isCorrect ? '#66bb6a' : '#ef5350'};">
            <div style="font-size:0.82rem; font-weight:800; margin-bottom:4px;">👉 學生當時選擇的選項內容：</div>
            ${chosenOpt ? `<img src="${chosenOpt.img}" style="max-height:54px; max-width:100%;" />` : `<span>未作答</span>`}
          </div>
          <div style="background:#e8f5e9; padding:10px; border-radius:12px; border:2px solid #66bb6a;">
            <div style="font-size:0.82rem; font-weight:800; color:#1b5e20; margin-bottom:4px;">🌺 正確答案選項內容：</div>
            ${rightOpt ? `<img src="${rightOpt.img}" style="max-height:54px; max-width:100%;" />` : ""}
          </div>
        </div>

        <details style="background:#f9fbe7; padding:10px 14px; border-radius:12px; border:1.5px solid #c5e1a5;">
          <summary style="cursor:pointer; font-weight:800; color:#2e7d32;">
            🌱 查看皮克敏逐步解析與原卷詳解圖
          </summary>
          <div style="margin-top:10px;">
            ${(q.steps || []).map(st => `
              <div class="step-card" style="border-left-color:${q.pikminGuide.color};">
                <div class="step-card-header">${escapeHtml(st.speaker)}（步驟 ${st.stepNo}）</div>
                <div class="step-card-body">${escapeHtml(st.dialogue)}</div>
              </div>
            `).join("")}
            <div class="official-exp-box">
              <img src="${q.expImg}" class="official-exp-img" alt="詳解" />
            </div>
          </div>
        </details>
      </div>
    `;
  }).join("");

  showModal(
    `📄 作答完整卷｜${escapeHtml(rec.school)} ${escapeHtml(rec.className)}班 ${escapeHtml(rec.seatNo)}號（${escapeHtml(rec.examYear)}年・${rec.score}分 ${badge.grade}）`,
    `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:16px; padding:12px 16px; background:#e8f5e9; border-radius:14px;">
        <div>
          <strong>學生：</strong>${escapeHtml(rec.school)} ${escapeHtml(rec.className)}班 ${escapeHtml(rec.seatNo)}號 ${escapeHtml(rec.studentName || "")}
          ｜<strong>時間：</strong>${formatDateTime(rec.timestamp)}
        </div>
        <div>
          <span class="pk-badge" style="background:${badge.color}; color:#fff;">總分：${rec.score} 分 (${badge.grade})｜答對 ${rec.correctCount}/${rec.totalCount} 題</span>
        </div>
      </div>
      ${itemsHtml}
    `
  );
}

/* ==========================================================================
   👩‍🏫 老師後台：查詢任課學校班級學生的成績及作答情形
   ========================================================================== */
async function loadTeacherRecords() {
  if (!AppState.user || AppState.user.role !== "teacher") return;
  const t = AppState.user;

  const localRecs = getLocalRecords().filter(
    r => r.school.toLowerCase() === t.school.toLowerCase() &&
         t.allClasses.map(c => String(c).toLowerCase()).includes(String(r.className).toLowerCase())
  );

  let cloudRecs = [];
  const res = await callGasApi("getTeacherClassRecords", {
    school: t.school,
    classes: t.allClasses
  });
  if (res && res.ok && Array.isArray(res.records)) {
    cloudRecs = res.records;
  }

  const byId = {};
  [...cloudRecs, ...localRecs].forEach(r => {
    if (r && r.recordId) byId[r.recordId] = r;
  });
  AppState.teacherRecords = Object.values(byId).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

function renderTeacherDashboard(container) {
  const t = AppState.user;
  const allRecs = AppState.teacherRecords || [];

  // 套用篩選條件
  const filtered = allRecs.filter(r => {
    if (AppState.teacherFilterClass !== "ALL" && String(r.className).toLowerCase() !== AppState.teacherFilterClass.toLowerCase()) {
      return false;
    }
    if (AppState.teacherFilterYear !== "ALL" && String(r.examYear) !== AppState.teacherFilterYear) {
      return false;
    }
    if (AppState.teacherSearchSeat.trim()) {
      const q = AppState.teacherSearchSeat.trim().toLowerCase();
      const matchSeat = String(r.seatNo).toLowerCase() === q;
      const matchName = String(r.studentName || "").toLowerCase().includes(q);
      if (!matchSeat && !matchName) return false;
    }
    return true;
  });

  // 統計數據
  const totalCount = filtered.length;
  const avgScore = totalCount > 0 ? Math.round(filtered.reduce((s, r) => s + Number(r.score || 0), 0) / totalCount) : 0;
  const maxScore = totalCount > 0 ? Math.max(...filtered.map(r => Number(r.score || 0))) : 0;
  const uniqueStudents = new Set(filtered.map(r => `${r.className}_${r.seatNo}`)).size;

  // 計算最常錯題目 Top 5
  const wrongFreq = {};
  filtered.forEach(r => {
    (r.answers || []).forEach(a => {
      if (a && a.type === "mc" && !a.isCorrect) {
        const key = `${r.examYear}年 第${a.qnum}題`;
        wrongFreq[key] = (wrongFreq[key] || 0) + 1;
      }
    });
  });
  const topWrongList = Object.entries(wrongFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const stages = window.EXAM_STAGES_DATA || [];

  const rowsHtml = filtered.length === 0 ? `
    <tr>
      <td colspan="9" style="text-align:center; padding:32px; color:#78909c; font-weight:800;">
        🌱 目前所選任課班級與篩選條件下尚無學生測驗紀錄。
      </td>
    </tr>
  ` : filtered.map(r => {
    const b = calcCapGradeBadge(r.score);
    const wrongNums = (r.answers || []).filter(a => a && a.type === "mc" && !a.isCorrect).map(a => `第${a.qnum}題`);
    return `
      <tr>
        <td>${formatDateTime(r.timestamp)}</td>
        <td><span class="pk-badge">${escapeHtml(r.className)} 班</span></td>
        <td><strong>${escapeHtml(r.seatNo)} 號</strong></td>
        <td>${escapeHtml(r.studentName || "-")}</td>
        <td><span class="pk-badge" style="background:#2e7d32; color:#fff;">${escapeHtml(r.examYear)}年 (${escapeHtml(r.mode || '闖關')})</span></td>
        <td><strong style="font-size:1.1rem; color:${b.color};">${r.score} 分</strong> <span class="pk-badge" style="background:${b.color}; color:#fff;">${b.grade}</span></td>
        <td>${r.correctCount} / ${r.totalCount} 題</td>
        <td style="max-width:220px; font-size:0.84rem; color:#c62828;">
          ${wrongNums.length === 0 ? `<span style="color:#2e7d32;">🌺 全對滿分</span>` : wrongNums.slice(0, 6).join("、") + (wrongNums.length > 6 ? ` 等${wrongNums.length}題` : "")}
        </td>
        <td>
          <button class="pk-btn pk-btn-blue pk-btn-sm" onclick="openFullPaperModal('${r.recordId}')">
            📄 檢視完整作答卷
          </button>
        </td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <div class="pk-card">
      <div class="pk-card-header">
        <div class="pk-card-title">
          ${getPikminSvg("oatchi", 44)}
          <div>
            <div>👩‍🏫 教師指揮中心：任課班級學生成績與作答情形查詢</div>
            <div style="font-size:0.86rem; color:#546e7a; font-weight:700; margin-top:2px;">
              任教學校：${escapeHtml(t.school)}｜任課班級：${t.allClasses.map(c => `<span class="pk-badge" style="margin-right:4px;">${escapeHtml(c)}班</span>`).join("")}
            </div>
          </div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="pk-btn pk-btn-yellow pk-btn-sm" onclick="openEditTeacherClassesModal()">
            🏫 新增/修改任課班級
          </button>
          <button class="pk-btn pk-btn-cream pk-btn-sm" onclick="loadTeacherRecords().then(() => renderApp())">
            🔄 重新載入雲端成績
          </button>
          <button class="pk-btn pk-btn-green pk-btn-sm" onclick="exportTeacherCsv()">
            📥 匯出 CSV 成績報表
          </button>
        </div>
      </div>

      <!-- 篩選工具列 -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:18px; background:#f1f8e9; padding:14px; border-radius:16px; border:2px solid #c5e1a5;">
        <div>
          <label class="pk-label">🚩 篩選任課班級</label>
          <select class="pk-select" onchange="AppState.teacherFilterClass=this.value; renderApp();">
            <option value="ALL" ${AppState.teacherFilterClass === 'ALL' ? 'selected' : ''}>全部任課班級 (${t.allClasses.join(', ')})</option>
            ${t.allClasses.map(c => `<option value="${escapeHtml(c)}" ${AppState.teacherFilterClass === c ? 'selected' : ''}>${escapeHtml(c)} 班</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="pk-label">📅 篩選會考年份</label>
          <select class="pk-select" onchange="AppState.teacherFilterYear=this.value; renderApp();">
            <option value="ALL" ${AppState.teacherFilterYear === 'ALL' ? 'selected' : ''}>全部年份 (115～106年)</option>
            ${stages.map(s => `<option value="${s.year}" ${AppState.teacherFilterYear === s.year ? 'selected' : ''}>${s.year} 年會考</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="pk-label">🔍 搜尋座號或學生姓名</label>
          <input type="text" class="pk-input" placeholder="輸入座號 (如 5) 或姓名" value="${escapeHtml(AppState.teacherSearchSeat)}"
            oninput="AppState.teacherSearchSeat=this.value; renderApp();" />
        </div>
      </div>

      <!-- 班級成績統計卡片 -->
      <div class="stat-cards-row">
        <div class="stat-card">
          <div style="font-size:0.85rem; color:#546e7a; font-weight:800;">👥 參與學生人數 / 總人次</div>
          <div class="stat-card-val">${uniqueStudents} 人 / ${totalCount} 次</div>
        </div>
        <div class="stat-card">
          <div style="font-size:0.85rem; color:#546e7a; font-weight:800;">📊 班級平均成績</div>
          <div class="stat-card-val">${avgScore} 分</div>
        </div>
        <div class="stat-card">
          <div style="font-size:0.85rem; color:#546e7a; font-weight:800;">🏆 班級最高分</div>
          <div class="stat-card-val">${maxScore} 分</div>
        </div>
        <div class="stat-card">
          <div style="font-size:0.85rem; color:#546e7a; font-weight:800;">🔥 班級最常錯題目 Top 3</div>
          <div style="font-size:0.88rem; font-weight:800; color:#c62828; margin-top:6px;">
            ${topWrongList.length === 0 ? "尚無錯題統計" : topWrongList.slice(0, 3).map(x => `${x[0]}(${x[1]}次)`).join("<br/>")}
          </div>
        </div>
      </div>

      <!-- 學生作答列表 -->
      <div class="pk-table-wrap">
        <table class="pk-table">
          <thead>
            <tr>
              <th>測驗時間</th>
              <th>班級</th>
              <th>座號</th>
              <th>姓名</th>
              <th>年份關卡</th>
              <th>成績與等級</th>
              <th>答對題數</th>
              <th>答錯題號一覽</th>
              <th>作答完整卷詳情</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openEditTeacherClassesModal() {
  if (!AppState.user || AppState.user.role !== "teacher") return;
  PikminAudio.pluck();
  AppState.teacherRegSelected = (AppState.user.selectedClasses || []).slice(0, 5);
  const cus = (AppState.user.customClasses || []).slice(0, 5);
  AppState.teacherRegCustom = [cus[0] || "", cus[1] || "", cus[2] || "", cus[3] || "", cus[4] || ""];
  AppState.teacherRegShowCustom = cus.length > 0;

  showModal(
    "🏫 修改教師任課班級（每學年30班可勾選5班＋其他自訂最多5班）",
    `<div id="edit-classes-modal-body">${renderTeacherRegisterFormHtml(true)}</div>`
  );
}

async function handleUpdateTeacherClassesSubmit(e) {
  e.preventDefault();
  const selectedClasses = AppState.teacherRegSelected.slice(0, 5);
  const customClasses = AppState.teacherRegCustom.map(s => s.trim()).filter(Boolean).slice(0, 5);
  const allClasses = Array.from(new Set([...selectedClasses, ...customClasses]));

  if (allClasses.length === 0) {
    showToast("請至少選擇或輸入 1 個任課班級！", "⚠️");
    return;
  }

  AppState.user.selectedClasses = selectedClasses;
  AppState.user.customClasses = customClasses;
  AppState.user.allClasses = allClasses;
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(AppState.user));
  saveLocalTeacher(AppState.user);
  closeModal();

  await callGasApi("updateTeacherClasses", {
    school: AppState.user.school,
    username: AppState.user.username,
    selectedClasses,
    customClasses,
    allClasses
  });
  await loadTeacherRecords();
  PikminAudio.correct();
  showToast("任課班級已更新！", "🌺");
  renderApp();
}

function exportTeacherCsv() {
  const recs = AppState.teacherRecords || [];
  if (recs.length === 0) {
    showToast("目前沒有可匯出的成績資料", "⚠️");
    return;
  }
  const headers = ["測驗時間", "學校", "班級", "座號", "姓名", "會考年份", "模式", "分數", "等級", "答對題數", "總題數", "耗時(秒)", "答錯題號"];
  const lines = [headers.join(",")];
  recs.forEach(r => {
    const wrongNums = (r.answers || []).filter(a => a && a.type === "mc" && !a.isCorrect).map(a => a.qnum).join(";");
    const row = [
      formatDateTime(r.timestamp),
      r.school,
      r.className,
      r.seatNo,
      r.studentName || "",
      r.examYear,
      r.mode || "",
      r.score,
      r.gradeBadge || "",
      r.correctCount,
      r.totalCount,
      r.durationSec || 0,
      wrongNums
    ].map(v => `"${String(v).replace(/"/g, '""')}"`);
    lines.push(row.join(","));
  });

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `皮克敏會考數學成績報表_${AppState.user.school}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  PikminAudio.correct();
  showToast("已匯出 CSV 成績報表！", "📥");
}

/* ==========================================================================
   ⚙️ GAS 試算表網址設定與 Code.gs 部署說明視窗
   ========================================================================== */
function openGasConfigModal() {
  PikminAudio.pluck();
  showModal(
    "⚙️ Google 試算表 (GAS) 連線設定與後端腳本部署指南",
    `
      <div class="pk-form-group">
        <label class="pk-label">🔗 Google Apps Script (GAS) 網頁應用程式網址 (/exec)</label>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <input type="url" id="gas-url-input" class="pk-input" style="flex:1;" value="${escapeHtml(AppState.gasUrl)}" />
          <button type="button" class="pk-btn pk-btn-green pk-btn-sm" onclick="saveGasUrlConfig()">💾 儲存並測試連線</button>
        </div>
        <div style="font-size:0.84rem; color:#546e7a; margin-top:6px; font-weight:600;">
          預設已填入您的試算表網址。當您重新建立試算表並部署新的 GAS 網址後，可直接貼在上方儲存立即切換！
        </div>
      </div>

      <div style="background:#f1f8e9; border:2px solid #81c784; border-radius:16px; padding:16px; margin-top:14px;">
        <div style="font-weight:900; color:#1b5e20; font-size:1.05rem; margin-bottom:8px;">
          📋 如何將本資料夾中的 <code>Code.gs</code> 部署到您新建的 Google 試算表？
        </div>
        <ol style="padding-left:20px; line-height:1.7; font-size:0.92rem; color:#263238; font-weight:600;">
          <li>開啟 Google 雲端硬碟，建立一個<strong>新的 Google 試算表</strong>。</li>
          <li>點選試算表上方選單<strong>「擴充功能」 ➔ 「Apps Script」</strong>。</li>
          <li>打開本資料夾中的 <strong><code>Code.gs</code></strong> 檔案（或點擊下方按鈕複製完整 GAS 程式碼），完整貼上取代編輯器內的預設程式碼，按 <kbd>Ctrl+S</kbd> 儲存。</li>
          <li>點選右上角<strong>「部署」 ➔ 「新增部署作業」</strong>，左側齒輪選取類型：<strong>「網頁應用程式 (Web App)」</strong>。</li>
          <li>將「執行身分」設為<strong>「我 (Me)」</strong>，「誰可以存取」設為<strong>「所有人 (Anyone)」</strong>，點選「部署」。</li>
          <li>複製產生的 <code>https://script.google.com/macros/s/.../exec</code> 網址，貼回上方輸入框並按「儲存並測試連線」即可！首次執行時，腳本會自動建立 <code>Scores</code>（成績與完整卷）、<code>Teachers</code>（教師與任課班級）、<code>WrongQuestions</code>（錯題紀錄）三個工作表！</li>
        </ol>
      </div>
    `
  );
}

async function saveGasUrlConfig() {
  const input = document.getElementById("gas-url-input");
  if (!input || !input.value.trim()) return;
  AppState.gasUrl = input.value.trim();
  localStorage.setItem(STORAGE_KEYS.GAS_URL, AppState.gasUrl);
  showToast("正在測試 GAS 試算表連線...", "☁️");
  const res = await callGasApi("ping");
  if (res && res.ok) {
    PikminAudio.fanfare();
    showToast("連線成功！Google 試算表運作正常！", "🌺");
    closeModal();
  } else {
    PikminAudio.wrong();
    showToast("已儲存網址，請確認 GAS 已部署為「所有人皆可存取」並更新版本", "⚠️");
  }
}

/* ==========================================================================
   🪟 通用 Modal 與輔助函式
   ========================================================================== */
function showModal(title, bodyHtml) {
  closeModal();
  const backdrop = document.createElement("div");
  backdrop.id = "pk-modal-backdrop";
  backdrop.className = "pk-modal-backdrop";
  backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };
  backdrop.innerHTML = `
    <div class="pk-modal">
      <div class="pk-modal-header">
        <span>${title}</span>
        <button type="button" class="pk-btn pk-btn-cream pk-btn-sm" onclick="closeModal()">✖ 關閉</button>
      </div>
      <div class="pk-modal-body">${bodyHtml}</div>
    </div>
  `;
  document.body.appendChild(backdrop);
}

function closeModal() {
  const el = document.getElementById("pk-modal-backdrop");
  if (el) el.remove();
}

function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("zh-TW", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false
    });
  } catch (_) {
    return String(iso);
  }
}

/* ==========================================================================
   🚀 初始化啟動
   ========================================================================== */
window.addEventListener("DOMContentLoaded", async () => {
  const isSecretRegPage = Boolean(window.IS_TEACHER_REGISTER_PAGE) || new URLSearchParams(window.location.search).get("admin") === "teacher_reg_888";
  if (isSecretRegPage) {
    AppState.portalMode = "teacher_register";
  }
  try {
    const savedUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || "null");
    if (savedUser && savedUser.role && !isSecretRegPage) {
      AppState.user = savedUser;
      if (savedUser.role === "student") {
        await loadStudentHistoryAndWrong();
      } else if (savedUser.role === "teacher") {
        await loadTeacherRecords();
      }
    }
  } catch (_) {}
  renderApp();
});
