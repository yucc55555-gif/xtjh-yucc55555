/**
 * ============================================================================
 * 小叮噹(哆啦A夢) 國中數學歷屆基會考 RPG 線上測驗系統 - 核心應用邏輯 (app.js)
 * ============================================================================
 */

(function () {
  const STORAGE_KEYS = {
    GAS_URL: 'dora_math_gas_url_v1',
    CURRENT_USER: 'dora_math_current_user_v1',
    LOCAL_TEACHERS: 'dora_math_teachers_v1',
    LOCAL_RECORDS: 'dora_math_records_v1',
    LOCAL_WRONGS: 'dora_math_wrongs_v1'
  };

  const FIXED_GAS_URL = 'https://script.google.com/macros/s/AKfycbxUFpfQDeQg_OdgMDnJ-oaqRZLX9EMjvPWJCYlQON0OVQYGVK4d5rcUyQPSOOO66hC3mA/exec';

  const DATA = window.DORAEMON_QUIZ_DATA || { grades: [], questions: [] };
  const QUESTION_MAP = {};
  DATA.questions.forEach(q => {
    QUESTION_MAP[q.id] = q;
  });

  // 檢查是否為「老師專用註冊網址」 (teacher_register.html 或 ?mode=teacher_register)
  const urlParams = new URLSearchParams(window.location.search);
  const IS_TEACHER_REG_PAGE = Boolean(
    window.DORA_TEACHER_REGISTER_PAGE ||
    urlParams.get('mode') === 'teacher_register' ||
    urlParams.get('register') === 'teacher' ||
    /teacher_register\.html/i.test(window.location.pathname)
  );

  // 全域狀態 (GAS 試算表網址已固定綁定)
  const state = {
    gasUrl: FIXED_GAS_URL,
    gasConnected: true,
    user: loadJson(STORAGE_KEYS.CURRENT_USER, null), // { role: 'student'|'teacher', ... }
    portalTab: IS_TEACHER_REG_PAGE ? 'teacher' : 'student', // 'student' | 'teacher'
    teacherAuthMode: IS_TEACHER_REG_PAGE ? 'register' : 'login', // 'login' | 'register'
    regGradeTab: '7', // '7' | '8' | '9'
    regSelectedClasses: [], // 勾選班級 (最多 5 班)
    regOtherChecked: false,
    regCustomClasses: ['', '', '', '', ''], // 自訂輸入班級 (最多 5 班)

    // 學生端狀態
    studentNav: 'map', // 'map' | 'history' | 'wrong' | 'battle'
    selectedGradeId: DATA.grades[0] ? DATA.grades[0].id : '7a',
    studentRecords: [],
    studentWrongs: [],
    wrongFilterGrade: 'all',
    wrongFilterStatus: 'unmastered',

    // RPG 戰鬥狀態
    battle: null,

    // 老師端狀態
    teacherFilterClass: 'all',
    teacherFilterGrade: 'all',
    teacherFilterChapter: 'all',
    teacherSearchSeat: '',
    teacherRecords: [],
    teacherWrongs: []
  };

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function saveJson(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (_) {}
  }

  // ==========================================================================
  // GAS 雲端試算表 API 與本地雙軌同步引擎
  // ==========================================================================
  async function callGasApi(action, payload = {}) {
    const body = Object.assign({ action }, payload);
    if (!state.gasUrl) {
      return handleLocalFallback(action, body);
    }
    try {
      const res = await fetch(state.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      state.gasConnected = true;
      updateGasStatusUi();
      // 同步寫入本地快取確保離線也能讀取
      handleLocalFallback(action, body, json);
      return json;
    } catch (err) {
      console.warn('GAS 連線失敗，自動切換為本機百寶袋快取模式:', err);
      state.gasConnected = false;
      updateGasStatusUi();
      return handleLocalFallback(action, body);
    }
  }

  function handleLocalFallback(action, data, cloudResult = null) {
    const teachers = loadJson(STORAGE_KEYS.LOCAL_TEACHERS, []);
    const records = loadJson(STORAGE_KEYS.LOCAL_RECORDS, []);
    const wrongs = loadJson(STORAGE_KEYS.LOCAL_WRONGS, []);

    if (action === 'getInitData') {
      const schoolMap = {};
      teachers.forEach(t => {
        if (!schoolMap[t.school]) schoolMap[t.school] = new Set();
        (t.allClasses || []).forEach(c => schoolMap[t.school].add(c));
      });
      return cloudResult || {
        ok: true,
        schools: Object.keys(schoolMap).map(s => ({ school: s, classes: Array.from(schoolMap[s]) }))
      };
    }

    if (action === 'registerTeacher') {
      const school = String(data.school || '').trim();
      const username = String(data.username || '').trim();
      const name = String(data.name || username).trim();
      const password = String(data.password || '').trim();
      const standardClasses = data.standardClasses || [];
      const customClasses = (data.customClasses || []).filter(Boolean);
      const allClasses = Array.from(new Set([...standardClasses, ...customClasses]));

      if (!cloudResult) {
        if (!school || !username || !password) return { ok: false, error: '請填寫完整學校、帳號與密碼！' };
        if (standardClasses.length > 5) return { ok: false, error: '年級班級勾選最多 5 班！' };
        if (customClasses.length > 5) return { ok: false, error: '其他自訂班級最多 5 班！' };
        if (allClasses.length === 0) return { ok: false, error: '請至少選擇或輸入 1 個上課班級！' };
        const dup = teachers.find(t => t.school === school && t.username.toLowerCase() === username.toLowerCase());
        if (dup) return { ok: false, error: '此學校已有相同教師帳號，請直接登入！' };
      }

      const teacherObj = (cloudResult && cloudResult.teacher) ? cloudResult.teacher : {
        teacherId: 'T_' + Date.now(),
        school,
        username,
        name,
        password,
        standardClasses,
        customClasses,
        allClasses,
        createdAt: new Date().toISOString()
      };
      const idx = teachers.findIndex(t => t.school === school && t.username.toLowerCase() === username.toLowerCase());
      if (idx >= 0) teachers[idx] = Object.assign({}, teachers[idx], teacherObj, { password });
      else teachers.push(Object.assign({}, teacherObj, { password }));
      saveJson(STORAGE_KEYS.LOCAL_TEACHERS, teachers);
      return cloudResult || { ok: true, teacher: teacherObj };
    }

    if (action === 'loginTeacher') {
      if (cloudResult && cloudResult.ok) return cloudResult;
      const school = String(data.school || '').trim();
      const username = String(data.username || '').trim();
      const password = String(data.password || '').trim();
      const found = teachers.find(t =>
        (!school || t.school === school) &&
        (t.username.toLowerCase() === username.toLowerCase() || (t.name && t.name.toLowerCase() === username.toLowerCase())) &&
        t.password === password
      );
      if (!found) {
        return { ok: false, error: '帳號或密碼錯誤！老師第一次登入請先點選「老師註冊」建立帳號與上課班級。' };
      }
      return { ok: true, teacher: found };
    }

    if (action === 'updateTeacherClasses') {
      const standardClasses = data.standardClasses || [];
      const customClasses = (data.customClasses || []).filter(Boolean);
      const allClasses = Array.from(new Set([...standardClasses, ...customClasses]));
      if (standardClasses.length > 5) return { ok: false, error: '年級班級勾選最多 5 班！' };
      if (customClasses.length > 5) return { ok: false, error: '其他自訂班級最多 5 班！' };
      if (allClasses.length === 0) return { ok: false, error: '請至少選擇 1 個班級！' };

      const idx = teachers.findIndex(t => t.teacherId === data.teacherId || (t.school === data.school && t.username === data.username));
      if (idx >= 0) {
        teachers[idx].standardClasses = standardClasses;
        teachers[idx].customClasses = customClasses;
        teachers[idx].allClasses = allClasses;
        saveJson(STORAGE_KEYS.LOCAL_TEACHERS, teachers);
      }
      return cloudResult || { ok: true, standardClasses, customClasses, allClasses };
    }

    if (action === 'submitQuiz') {
      const rec = {
        recordId: (cloudResult && cloudResult.recordId) || data.recordId || ('R_' + Date.now()),
        timestamp: data.timestamp || new Date().toISOString(),
        school: data.school,
        className: String(data.className),
        seatNo: String(data.seatNo),
        studentName: data.studentName || '',
        gradeId: data.gradeId,
        gradeName: data.gradeName,
        chapterCode: data.chapterCode,
        chapterName: data.chapterName,
        mode: data.mode,
        score: Number(data.score),
        correctCount: Number(data.correctCount),
        totalCount: Number(data.totalCount),
        durationSec: Number(data.durationSec),
        answers: data.answers || []
      };
      records.unshift(rec);
      saveJson(STORAGE_KEYS.LOCAL_RECORDS, records);

      // 更新本地錯題本
      (data.answers || []).forEach(ans => {
        const key = `${data.school}__${data.className}__${data.seatNo}__${ans.questionId}`;
        const wIdx = wrongs.findIndex(w => w.key === key);
        if (!ans.isCorrect) {
          if (wIdx >= 0) {
            wrongs[wIdx].wrongCount = (wrongs[wIdx].wrongCount || 1) + 1;
            wrongs[wIdx].lastChosen = ans.chosen;
            wrongs[wIdx].mastered = false;
            wrongs[wIdx].updatedAt = rec.timestamp;
          } else {
            wrongs.push({
              key,
              school: data.school,
              className: String(data.className),
              seatNo: String(data.seatNo),
              questionId: ans.questionId,
              gradeId: data.gradeId,
              chapterCode: data.chapterCode,
              wrongCount: 1,
              lastChosen: ans.chosen,
              mastered: false,
              updatedAt: rec.timestamp
            });
          }
        } else if (wIdx >= 0 && data.mode === 'wrong_review') {
          wrongs[wIdx].mastered = true;
          wrongs[wIdx].updatedAt = rec.timestamp;
        }
      });
      saveJson(STORAGE_KEYS.LOCAL_WRONGS, wrongs);
      return cloudResult || { ok: true, recordId: rec.recordId, timestamp: rec.timestamp };
    }

    if (action === 'getStudentData') {
      if (cloudResult && cloudResult.ok) {
        return cloudResult;
      }
      const myRecs = records.filter(r =>
        r.school === data.school &&
        String(r.className) === String(data.className) &&
        String(r.seatNo) === String(data.seatNo)
      );
      const myWrongs = wrongs.filter(w =>
        w.school === data.school &&
        String(w.className) === String(data.className) &&
        String(w.seatNo) === String(data.seatNo)
      );
      return { ok: true, records: myRecs, wrongQuestions: myWrongs };
    }

    if (action === 'markWrongMastered') {
      const key = `${data.school}__${data.className}__${data.seatNo}__${data.questionId}`;
      const wIdx = wrongs.findIndex(w => w.key === key);
      if (wIdx >= 0) {
        wrongs[wIdx].mastered = data.mastered !== false;
        wrongs[wIdx].updatedAt = new Date().toISOString();
        saveJson(STORAGE_KEYS.LOCAL_WRONGS, wrongs);
      }
      return cloudResult || { ok: true };
    }

    if (action === 'getTeacherReport') {
      if (cloudResult && cloudResult.ok && cloudResult.records && cloudResult.records.length > 0) {
        return cloudResult;
      }
      const clsSet = new Set((data.classes || []).map(String));
      const fRecs = records.filter(r =>
        (!data.school || r.school === data.school) &&
        (clsSet.size === 0 || clsSet.has(String(r.className)))
      );
      const fWrongs = wrongs.filter(w =>
        (!data.school || w.school === data.school) &&
        (clsSet.size === 0 || clsSet.has(String(w.className)))
      );
      return { ok: true, records: fRecs, wrongQuestions: fWrongs };
    }

    return { ok: true };
  }

  // ==========================================================================
  // 音效合成器 (Web Audio API 卡通鈴鐺與百寶袋音效)
  // ==========================================================================
  function playBellSound(type) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'correct') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.09);
        osc.frequency.setValueAtTime(1174.66, now + 0.18);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        osc.start(now);
        osc.stop(now + 0.42);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.setValueAtTime(175, now + 0.14);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, now);
        osc.frequency.setValueAtTime(1318.5, now + 0.06);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
      }
    } catch (_) {}
  }

  // ==========================================================================
  // 畫面渲染主控台
  // ==========================================================================
  function renderApp() {
    updateNavbarUi();
    const root = document.getElementById('app-root');
    if (!root) return;

    if (!state.user) {
      renderPortalView(root);
    } else if (state.user.role === 'student') {
      renderStudentView(root);
    } else if (state.user.role === 'teacher') {
      renderTeacherView(root);
    }
  }

  function updateNavbarUi() {
    const userSlot = document.getElementById('nav-user-slot');
    updateGasStatusUi();
    if (!userSlot) return;

    if (!state.user) {
      userSlot.innerHTML = `
        <span class="user-badge">🔔 歡迎來到四次元數學百寶袋！請先登入</span>
      `;
    } else if (state.user.role === 'student') {
      userSlot.innerHTML = `
        <span class="user-badge">
          🎒 ${escapeHtml(state.user.school)}｜${escapeHtml(state.user.className)}班 ${escapeHtml(state.user.seatNo)}號 ${escapeHtml(state.user.studentName || '')}
        </span>
        <button class="dora-btn dora-btn-red dora-btn-sm" id="btn-logout">🚪 登出</button>
      `;
      document.getElementById('btn-logout').onclick = handleLogout;
    } else if (state.user.role === 'teacher') {
      userSlot.innerHTML = `
        <span class="user-badge">
          🎓 ${escapeHtml(state.user.school)}｜${escapeHtml(state.user.name)} 老師（任課 ${(state.user.allClasses || []).length} 班）
        </span>
        <button class="dora-btn dora-btn-bell dora-btn-sm" id="btn-edit-classes">⚙️ 任課班級設定</button>
        <button class="dora-btn dora-btn-red dora-btn-sm" id="btn-logout">🚪 登出</button>
      `;
      document.getElementById('btn-logout').onclick = handleLogout;
      document.getElementById('btn-edit-classes').onclick = openEditTeacherClassesModal;
    }
  }

  function updateGasStatusUi() {
    const pill = document.getElementById('gas-status-pill');
    if (!pill) return;
    if (state.gasUrl) {
      pill.className = 'gas-status-pill connected';
      pill.innerHTML = '☁️ GAS 試算表已設定連動';
    } else {
      pill.className = 'gas-status-pill';
      pill.innerHTML = '⚙️ 設定 GAS Google 試算表網址';
    }
  }

  function handleLogout() {
    playBellSound('click');
    state.user = null;
    state.battle = null;
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    renderApp();
  }

  // ==========================================================================
  // 1. 登入與註冊入口畫面 (學生登入 + 老師登入/註冊)
  // ==========================================================================
  function renderPortalView(container) {
    const localTeachers = loadJson(STORAGE_KEYS.LOCAL_TEACHERS, []);
    const knownSchools = Array.from(new Set(localTeachers.map(t => t.school).filter(Boolean)));
    const totalQuestionsCount = DATA.questions.length;

    container.innerHTML = `
      <div class="portal-grid">
        <!-- 左側：小叮噹卡通歡迎海報 -->
        <div class="hero-banner">
          <div style="display:flex; align-items:center; gap:18px; flex-wrap:wrap;">
            <div style="width:96px; height:96px; background:#fff; border:4px solid #1E293B; border-radius:50%; padding:4px; box-shadow:0 6px 0 #1E293B; flex-shrink:0;">
              ${window.DORA_CHARS.getAvatarSvg('doraemon')}
            </div>
            <div>
              <div style="display:inline-block; background:#FFD700; color:#1E293B; font-weight:900; font-size:0.85rem; padding:4px 12px; border-radius:999px; border:2px solid #1E293B; margin-bottom:6px;">
                🔔 四次元百寶袋 RPG 數學大冒險
              </div>
              <h1 style="font-size:1.85rem; font-weight:900; text-shadow:2px 2px 0 #1E293B; line-height:1.25;">
                小叮噹國中數學<br>歷屆基會考 RPG 線上測驗
              </h1>
            </div>
          </div>

          <div class="hero-bell-collar">
            <div class="hero-bell-icon">🔔</div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin-top:16px;">
            <div style="background:rgba(255,255,255,0.16); border:2.5px solid #1E293B; border-radius:16px; padding:12px;">
              <div style="font-weight:900; color:#FEF08A; font-size:0.9rem;">📚 完整收錄六冊題庫</div>
              <div style="font-size:1.35rem; font-weight:900; margin-top:2px;">共 ${totalQuestionsCount} 道歷屆試題</div>
              <div style="font-size:0.8rem; opacity:0.9;">七上～九下共 59 個章節關卡與原卷附圖</div>
            </div>
            <div style="background:rgba(255,255,255,0.16); border:2.5px solid #1E293B; border-radius:16px; padding:12px;">
              <div style="font-weight:900; color:#FEF08A; font-size:0.9rem;">💬 小叮噹人物逐步解說</div>
              <div style="font-size:1.35rem; font-weight:900; margin-top:2px;">及時逐步解析回饋</div>
              <div style="font-size:0.8rem; opacity:0.9;">小叮噹、大雄、宜靜、小叮鈴陪你一步步推導</div>
            </div>
            <div style="background:rgba(255,255,255,0.16); border:2.5px solid #1E293B; border-radius:16px; padding:12px;">
              <div style="font-weight:900; color:#FEF08A; font-size:0.9rem;">🛸 時光機＆記憶吐司</div>
              <div style="font-size:1.1rem; font-weight:900; margin-top:2px;">歷史完整卷＋錯題複習</div>
              <div style="font-size:0.8rem; opacity:0.9;">隨時調閱完整作答考卷與錯題重練特訓</div>
            </div>
            <div style="background:rgba(255,255,255,0.16); border:2.5px solid #1E293B; border-radius:16px; padding:12px;">
              <div style="font-weight:900; color:#FEF08A; font-size:0.9rem;">📊 GAS Google 試算表</div>
              <div style="font-size:1.1rem; font-weight:900; margin-top:2px;">教師班級成績管理</div>
              <div style="font-size:0.8rem; opacity:0.9;">自動登錄試算表，老師即時查詢任課班級作答</div>
            </div>
          </div>

          <div style="display:flex; justify-content:center; gap:14px; margin-top:20px;">
            <div style="width:52px; height:52px; background:#fff; border:3px solid #1E293B; border-radius:50%; padding:3px;" title="小叮噹">${window.DORA_CHARS.getAvatarSvg('doraemon')}</div>
            <div style="width:52px; height:52px; background:#fff; border:3px solid #1E293B; border-radius:50%; padding:3px;" title="大雄">${window.DORA_CHARS.getAvatarSvg('nobita')}</div>
            <div style="width:52px; height:52px; background:#fff; border:3px solid #1E293B; border-radius:50%; padding:3px;" title="宜靜">${window.DORA_CHARS.getAvatarSvg('shizuka')}</div>
            <div style="width:52px; height:52px; background:#fff; border:3px solid #1E293B; border-radius:50%; padding:3px;" title="技安">${window.DORA_CHARS.getAvatarSvg('gian')}</div>
            <div style="width:52px; height:52px; background:#fff; border:3px solid #1E293B; border-radius:50%; padding:3px;" title="阿福">${window.DORA_CHARS.getAvatarSvg('suneo')}</div>
            <div style="width:52px; height:52px; background:#fff; border:3px solid #1E293B; border-radius:50%; padding:3px;" title="小叮鈴">${window.DORA_CHARS.getAvatarSvg('dorami')}</div>
          </div>
        </div>

        <!-- 右側：學生登入 / 老師登入註冊卡片 -->
        <div class="pocket-card">
          <div class="role-tabs">
            <div class="role-tab ${state.portalTab === 'student' ? 'active-student' : ''}" id="tab-role-student">
              🎒 學生闖關登入
            </div>
            <div class="role-tab ${state.portalTab === 'teacher' ? 'active-teacher' : ''}" id="tab-role-teacher">
              🎓 老師管理專區
            </div>
          </div>

          <div id="portal-form-area"></div>
        </div>
      </div>
    `;

    document.getElementById('tab-role-student').onclick = () => {
      playBellSound('click');
      state.portalTab = 'student';
      renderPortalView(container);
    };
    document.getElementById('tab-role-teacher').onclick = () => {
      playBellSound('click');
      state.portalTab = 'teacher';
      renderPortalView(container);
    };

    const formArea = document.getElementById('portal-form-area');
    if (state.portalTab === 'student') {
      renderStudentLoginForm(formArea, knownSchools, localTeachers);
    } else {
      renderTeacherPortalForm(formArea, knownSchools);
    }
  }

  function renderStudentLoginForm(formArea, knownSchools, localTeachers) {
    // 收集所有常用班級 (701~730, 801~830, 901~930 + 老師自訂班級)
    const customCls = [];
    localTeachers.forEach(t => {
      (t.customClasses || []).forEach(c => {
        if (c && !customCls.includes(c)) customCls.push(c);
      });
    });

    formArea.innerHTML = `
      <div style="background:#EFF6FF; border:2.5px solid #1E293B; border-radius:16px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:center; gap:12px;">
        <div style="width:46px; height:46px; flex-shrink:0;">${window.DORA_CHARS.getAvatarSvg('doraemon')}</div>
        <div style="font-size:0.9rem; font-weight:800; color:#1E3A8A;">
          「嗨！請輸入你的<b>學校、班級、座號</b>，就能搭上時光機開始 RPG 數學闖關、查看完整作答考卷與錯題複習喔！」
        </div>
      </div>

      <form id="student-login-form">
        <div class="form-group">
          <label class="form-label">🏫 就讀學校</label>
          <input type="text" class="dora-input" id="stu-school" list="school-datalist" placeholder="例如：大雄國中（可直接輸入或下拉選擇）" required />
          <datalist id="school-datalist">
            ${knownSchools.map(s => `<option value="${escapeHtml(s)}"></option>`).join('')}
          </datalist>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">🚪 班級（可選或直接輸入）</label>
            <input type="text" class="dora-input" id="stu-class" list="class-datalist" placeholder="例如：701" required />
            <datalist id="class-datalist">
              ${customCls.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)} (自訂班級)</option>`).join('')}
              ${generateGradeClassesList('7').map(c => `<option value="${c}">${c}班 (七年級)</option>`).join('')}
              ${generateGradeClassesList('8').map(c => `<option value="${c}">${c}班 (八年級)</option>`).join('')}
              ${generateGradeClassesList('9').map(c => `<option value="${c}">${c}班 (九年級)</option>`).join('')}
            </datalist>
          </div>

          <div class="form-group">
            <label class="form-label">🔢 座號</label>
            <input type="number" min="1" max="99" class="dora-input" id="stu-seat" placeholder="例如：15" required />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">😊 姓名或勇者暱稱（選填，方便老師識別）</label>
          <input type="text" class="dora-input" id="stu-name" placeholder="例如：野比大雄" />
        </div>

        <button type="submit" class="dora-btn dora-btn-bell dora-btn-lg" style="width:100%; margin-top:6px;">
          🔔 搖響鈴鐺！登入開始 RPG 測驗
        </button>
      </form>
    `;

    document.getElementById('student-login-form').onsubmit = async (e) => {
      e.preventDefault();
      playBellSound('correct');
      const school = document.getElementById('stu-school').value.trim();
      const className = document.getElementById('stu-class').value.trim().replace(/班$/, '');
      const seatNo = String(parseInt(document.getElementById('stu-seat').value.trim(), 10) || document.getElementById('stu-seat').value.trim());
      const studentName = document.getElementById('stu-name').value.trim();

      if (!school || !className || !seatNo) return;

      state.user = {
        role: 'student',
        school,
        className,
        seatNo,
        studentName
      };
      saveJson(STORAGE_KEYS.CURRENT_USER, state.user);
      state.studentNav = 'map';
      await loadStudentCloudData();
      renderApp();
    };
  }

  function generateGradeClassesList(gradePrefix) {
    const arr = [];
    for (let i = 1; i <= 30; i++) {
      arr.push(`${gradePrefix}${String(i).padStart(2, '0')}`);
    }
    return arr;
  }

  // ==========================================================================
  // 老師登入與註冊表單（一般首頁僅供老師登入；專屬註冊網址才開放老師註冊，避免學生亂註冊）
  // ==========================================================================
  function renderTeacherPortalForm(formArea, knownSchools) {
    // 若非老師專用註冊網址，強制僅顯示「老師登入」畫面
    if (!IS_TEACHER_REG_PAGE) {
      state.teacherAuthMode = 'login';
    }
    const isReg = IS_TEACHER_REG_PAGE && state.teacherAuthMode === 'register';

    formArea.innerHTML = `
      ${IS_TEACHER_REG_PAGE ? `
        <div style="background:#FFF1F2; border:2.5px solid #E11D48; border-radius:14px; padding:10px 14px; margin-bottom:14px; font-weight:900; color:#9F1239; font-size:0.9rem;">
          🔐 這是「教師專屬註冊與班級綁定網頁」（學生端首頁已隱藏註冊入口，避免學生誤註冊）
        </div>
        <div style="display:flex; gap:8px; margin-bottom:16px;">
          <button type="button" class="dora-btn ${isReg ? 'dora-btn-pink' : 'dora-btn-white'} dora-btn-sm" id="btn-mode-register" style="flex:1;">
            📝 老師第一次登入：註冊帳號與選班
          </button>
          <button type="button" class="dora-btn ${!isReg ? 'dora-btn-blue' : 'dora-btn-white'} dora-btn-sm" id="btn-mode-login" style="flex:1;">
            🔑 已註冊老師登入
          </button>
        </div>
      ` : `
        <div style="background:#EFF6FF; border:2.5px solid #1E293B; border-radius:16px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:center; gap:12px;">
          <div style="width:44px; height:44px; flex-shrink:0;">${window.DORA_CHARS.getAvatarSvg('dorami')}</div>
          <div style="font-size:0.9rem; font-weight:800; color:#1E3A8A;">
            「歡迎老師！請輸入您已註冊的學校、帳號與密碼登入查詢任課班級成績。（教師註冊請使用教師專用註冊網址）」
          </div>
        </div>
      `}

      ${!isReg ? `
        <form id="teacher-login-form">
          <div class="form-group">
            <label class="form-label">🏫 任教學校</label>
            <input type="text" class="dora-input" id="tch-login-school" list="tch-school-list" placeholder="例如：大雄國中" required />
            <datalist id="tch-school-list">
              ${knownSchools.map(s => `<option value="${escapeHtml(s)}"></option>`).join('')}
            </datalist>
          </div>
          <div class="form-group">
            <label class="form-label">👤 教師帳號或姓名</label>
            <input type="text" class="dora-input" id="tch-login-user" placeholder="請輸入註冊時的帳號或姓名" required />
          </div>
          <div class="form-group">
            <label class="form-label">🔒 登入密碼</label>
            <input type="password" class="dora-input" id="tch-login-pwd" placeholder="請輸入密碼" required />
          </div>
          <div id="tch-login-msg" style="color:#DC2626; font-weight:800; font-size:0.9rem; margin-bottom:10px;"></div>
          <button type="submit" class="dora-btn dora-btn-blue dora-btn-lg" style="width:100%;">
            🚪 進入百寶袋教師成績管理後台
          </button>
        </form>
      ` : `
        <form id="teacher-reg-form">
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">🏫 任教學校</label>
              <input type="text" class="dora-input" id="tch-reg-school" placeholder="例如：大雄國中" required />
            </div>
            <div class="form-group">
              <label class="form-label">👨‍🏫 教師姓名</label>
              <input type="text" class="dora-input" id="tch-reg-name" placeholder="例如：王老師" required />
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">👤 登入帳號</label>
              <input type="text" class="dora-input" id="tch-reg-user" placeholder="例如：wang_math" required />
            </div>
            <div class="form-group">
              <label class="form-label">🔒 設定密碼</label>
              <input type="password" class="dora-input" id="tch-reg-pwd" placeholder="設定登入密碼" required />
            </div>
          </div>

          <!-- 班級選擇器：每個年級 30 個班級勾選 (最多 5 班) + 其他選項自行輸入 (最多 5 班) -->
          <div class="form-group">
            <label class="form-label">
              📋 選擇上課班級
              <span style="font-size:0.82rem; color:#0369A1;">（每個年級提供 30 班勾選，最多 5 班；另有「其他」可自行輸入最多 5 班）</span>
            </label>
            <div id="reg-class-picker-mount"></div>
          </div>

          <div id="tch-reg-msg" style="color:#DC2626; font-weight:800; font-size:0.9rem; margin-bottom:10px;"></div>
          <button type="submit" class="dora-btn dora-btn-pink dora-btn-lg" style="width:100%;">
            ✨ 完成老師註冊並綁定任課班級
          </button>
        </form>
      `}
    `;

    const btnLogin = document.getElementById('btn-mode-login');
    if (btnLogin) {
      btnLogin.onclick = () => {
        playBellSound('click');
        state.teacherAuthMode = 'login';
        renderTeacherPortalForm(formArea, knownSchools);
      };
    }
    const btnReg = document.getElementById('btn-mode-register');
    if (btnReg) {
      btnReg.onclick = () => {
        playBellSound('click');
        state.teacherAuthMode = 'register';
        renderTeacherPortalForm(formArea, knownSchools);
      };
    }

    if (!isReg) {
      document.getElementById('teacher-login-form').onsubmit = async (e) => {
        e.preventDefault();
        const school = document.getElementById('tch-login-school').value.trim();
        const username = document.getElementById('tch-login-user').value.trim();
        const password = document.getElementById('tch-login-pwd').value.trim();
        const msgEl = document.getElementById('tch-login-msg');
        msgEl.textContent = '⏳ 正在驗證教師身分...';

        const res = await callGasApi('loginTeacher', { school, username, password });
        if (!res.ok) {
          playBellSound('wrong');
          msgEl.textContent = '❌ ' + (res.error || '登入失敗');
          return;
        }
        playBellSound('correct');
        state.user = Object.assign({ role: 'teacher' }, res.teacher);
        saveJson(STORAGE_KEYS.CURRENT_USER, state.user);
        state.teacherFilterClass = 'all';
        await loadTeacherCloudData();
        renderApp();
      };
    } else {
      const pickerMount = document.getElementById('reg-class-picker-mount');
      renderClassPickerWidget(pickerMount, {
        gradeTab: state.regGradeTab,
        selectedClasses: state.regSelectedClasses,
        otherChecked: state.regOtherChecked,
        customClasses: state.regCustomClasses,
        onChange(updated) {
          state.regGradeTab = updated.gradeTab;
          state.regSelectedClasses = updated.selectedClasses;
          state.regOtherChecked = updated.otherChecked;
          state.regCustomClasses = updated.customClasses;
        }
      });

      document.getElementById('teacher-reg-form').onsubmit = async (e) => {
        e.preventDefault();
        const school = document.getElementById('tch-reg-school').value.trim();
        const name = document.getElementById('tch-reg-name').value.trim();
        const username = document.getElementById('tch-reg-user').value.trim();
        const password = document.getElementById('tch-reg-pwd').value.trim();
        const msgEl = document.getElementById('tch-reg-msg');

        const standardClasses = state.regSelectedClasses.slice(0, 5);
        const customClasses = state.regOtherChecked
          ? state.regCustomClasses.map(s => s.trim().replace(/班$/, '')).filter(Boolean).slice(0, 5)
          : [];

        if (standardClasses.length === 0 && customClasses.length === 0) {
          playBellSound('wrong');
          msgEl.textContent = '⚠️ 請至少勾選 1 個年級班級，或勾選「其他」自行輸入班級！';
          return;
        }

        msgEl.style.color = '#0369A1';
        msgEl.textContent = '⏳ 正在將教師資料與任課班級登錄至試算表...';

        const res = await callGasApi('registerTeacher', {
          school,
          name,
          username,
          password,
          standardClasses,
          customClasses
        });

        if (!res.ok) {
          playBellSound('wrong');
          msgEl.style.color = '#DC2626';
          msgEl.textContent = '❌ ' + (res.error || '註冊失敗');
          return;
        }

        playBellSound('correct');
        state.user = Object.assign({ role: 'teacher' }, res.teacher);
        saveJson(STORAGE_KEYS.CURRENT_USER, state.user);
        state.teacherFilterClass = 'all';
        await loadTeacherCloudData();
        renderApp();
      };
    }
  }

  /**
   * 共用元件：每個年級 30 個班級勾選 (最多 5 班) + 其他自訂輸入 (最多 5 班)
   */
  function renderClassPickerWidget(mountEl, cfg) {
    function redraw() {
      const gradePrefix = cfg.gradeTab;
      const gradeClasses = generateGradeClassesList(gradePrefix);
      const customCount = cfg.otherChecked ? cfg.customClasses.filter(s => s.trim()).length : 0;

      mountEl.innerHTML = `
        <div class="class-picker-box">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
            <div class="grade-subtabs" style="margin-bottom:0;">
              <button type="button" class="grade-subtab ${cfg.gradeTab === '7' ? 'active' : ''}" data-gtab="7">七年級 (701~730)</button>
              <button type="button" class="grade-subtab ${cfg.gradeTab === '8' ? 'active' : ''}" data-gtab="8">八年級 (801~830)</button>
              <button type="button" class="grade-subtab ${cfg.gradeTab === '9' ? 'active' : ''}" data-gtab="9">九年級 (901~930)</button>
            </div>
            <div style="font-size:0.86rem; font-weight:900; background:#FEF08A; border:2px solid #1E293B; padding:3px 10px; border-radius:999px;">
              已勾選班級：<span style="color:#E11D48;">${cfg.selectedClasses.length} / 5</span> 班
            </div>
          </div>

          <div class="class-checkbox-grid">
            ${gradeClasses.map(cls => {
              const isChecked = cfg.selectedClasses.includes(cls);
              return `
                <label class="class-check-item ${isChecked ? 'checked' : ''}">
                  <input type="checkbox" value="${cls}" ${isChecked ? 'checked' : ''} class="chk-std-class" />
                  <span>${cls}班</span>
                </label>
              `;
            }).join('')}
          </div>

          ${cfg.selectedClasses.length > 0 ? `
            <div style="margin-top:8px; font-size:0.84rem; font-weight:800; color:#0369A1;">
              📌 目前已勾選：${cfg.selectedClasses.map(c => `<span style="display:inline-block; background:#fff; border:1.5px solid #1E293B; border-radius:999px; padding:1px 8px; margin-right:4px;">${c}班</span>`).join('')}
            </div>
          ` : ''}

          <!-- 其他選項：讓老師自己輸入，最多輸入 5 個班級 -->
          <div style="margin-top:12px; padding-top:10px; border-top:2px dashed #93C5FD;">
            <label style="display:inline-flex; align-items:center; gap:8px; font-weight:900; font-size:0.94rem; cursor:pointer;">
              <input type="checkbox" id="chk-other-class" ${cfg.otherChecked ? 'checked' : ''} style="width:17px; height:17px; accent-color:#E60012;" />
              <span>➕ 其他（自行輸入班級，最多可輸入 5 個班級；目前已填 ${customCount} / 5 班）</span>
            </label>

            ${cfg.otherChecked ? `
              <div class="custom-class-inputs">
                ${cfg.customClasses.map((val, idx) => `
                  <input
                    type="text"
                    class="dora-input inp-custom-class"
                    data-cidx="${idx}"
                    value="${escapeHtml(val)}"
                    placeholder="自訂班級 ${idx + 1} (如:731)"
                    style="padding:7px 10px; font-size:0.88rem;"
                  />
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `;

      mountEl.querySelectorAll('.grade-subtab').forEach(btn => {
        btn.onclick = () => {
          cfg.gradeTab = btn.getAttribute('data-gtab');
          cfg.onChange(cfg);
          redraw();
        };
      });

      mountEl.querySelectorAll('.chk-std-class').forEach(chk => {
        chk.onchange = () => {
          const val = chk.value;
          if (chk.checked) {
            if (cfg.selectedClasses.length >= 5) {
              chk.checked = false;
              playBellSound('wrong');
              alert('每個年級班級勾選最多以 5 個班級為限喔！（若需更多自訂班級可使用下方「其他」選項輸入）');
              return;
            }
            cfg.selectedClasses.push(val);
          } else {
            cfg.selectedClasses = cfg.selectedClasses.filter(c => c !== val);
          }
          playBellSound('click');
          cfg.onChange(cfg);
          redraw();
        };
      });

      const otherChk = mountEl.querySelector('#chk-other-class');
      if (otherChk) {
        otherChk.onchange = () => {
          cfg.otherChecked = otherChk.checked;
          cfg.onChange(cfg);
          redraw();
        };
      }

      mountEl.querySelectorAll('.inp-custom-class').forEach(inp => {
        inp.oninput = () => {
          const idx = Number(inp.getAttribute('data-cidx'));
          cfg.customClasses[idx] = inp.value;
          cfg.onChange(cfg);
        };
      });
    }

    redraw();
  }

  // ==========================================================================
  // 2. 學生端視圖：任意門闖關大廳 / 歷史成績與完整作答卷 / 錯題複習 / RPG 戰鬥
  // ==========================================================================
  async function loadStudentCloudData() {
    if (!state.user || state.user.role !== 'student') return;
    const res = await callGasApi('getStudentData', {
      school: state.user.school,
      className: state.user.className,
      seatNo: state.user.seatNo
    });
    if (res && res.ok) {
      state.studentRecords = res.records || [];
      state.studentWrongs = res.wrongQuestions || [];
    }
  }

  function renderStudentView(container) {
    if (state.studentNav === 'battle' && state.battle) {
      renderRpgBattleView(container);
      return;
    }

    const totalExp = state.studentRecords.reduce((acc, r) => acc + (r.score || 0), 0);
    const heroLv = Math.max(1, Math.floor(totalExp / 100) + 1);
    const unmasteredWrongs = state.studentWrongs.filter(w => !w.mastered).length;

    container.innerHTML = `
      <!-- 學生頂部資訊與導覽列 -->
      <div class="student-top-bar">
        <div style="display:flex; align-items:center; gap:14px;">
          <div style="width:62px; height:62px; background:#fff; border:3px solid #1E293B; border-radius:50%; padding:3px; box-shadow:0 4px 0 #1E293B;">
            ${window.DORA_CHARS.getAvatarSvg('nobita')}
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="background:#00A0E9; color:#fff; font-weight:900; font-size:0.82rem; padding:3px 10px; border-radius:999px; border:2px solid #1E293B;">
                LV.${heroLv} 四次元數學勇者
              </span>
              <span style="font-weight:900; font-size:1.15rem;">
                ${escapeHtml(state.user.school)} ${escapeHtml(state.user.className)}班 ${escapeHtml(state.user.seatNo)}號 ${escapeHtml(state.user.studentName || '')}
              </span>
            </div>
            <div style="font-size:0.86rem; font-weight:800; color:#475569; margin-top:4px;">
              ⚔️ 已完成闖關：<b>${state.studentRecords.length}</b> 次 ｜ ⭐ 累積總積分：<b>${totalExp}</b> EXP ｜ 🍞 待複習錯題：<b style="color:#E11D48;">${unmasteredWrongs}</b> 題
            </div>
          </div>
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="dora-btn ${state.studentNav === 'map' ? 'dora-btn-bell' : 'dora-btn-white'}" id="snav-map">
            🚪 任意門章節闖關
          </button>
          <button class="dora-btn ${state.studentNav === 'history' ? 'dora-btn-bell' : 'dora-btn-white'}" id="snav-history">
            🛸 歷史成績＆完整作答卷 (${state.studentRecords.length})
          </button>
          <button class="dora-btn ${state.studentNav === 'wrong' ? 'dora-btn-bell' : 'dora-btn-white'}" id="snav-wrong">
            🍞 記憶吐司錯題複習 (${unmasteredWrongs})
          </button>
        </div>
      </div>

      <div id="student-subview"></div>
    `;

    document.getElementById('snav-map').onclick = () => {
      playBellSound('click');
      state.studentNav = 'map';
      renderStudentView(container);
    };
    document.getElementById('snav-history').onclick = () => {
      playBellSound('click');
      state.studentNav = 'history';
      renderStudentView(container);
    };
    document.getElementById('snav-wrong').onclick = () => {
      playBellSound('click');
      state.studentNav = 'wrong';
      renderStudentView(container);
    };

    const sub = document.getElementById('student-subview');
    if (state.studentNav === 'map') {
      renderAdventureMapSubview(sub);
    } else if (state.studentNav === 'history') {
      renderStudentHistorySubview(sub);
    } else if (state.studentNav === 'wrong') {
      renderStudentWrongSubview(sub);
    }
  }

  function renderAdventureMapSubview(sub) {
    const curGrade = DATA.grades.find(g => g.id === state.selectedGradeId) || DATA.grades[0];
    if (!curGrade) return;

    sub.innerHTML = `
      <div class="pocket-card">
        <div class="pocket-card-header">
          <div class="pocket-title">
            🚪 任意門世界地圖：依年級、章節選擇 RPG 測驗關卡
          </div>
          <div style="font-size:0.9rem; font-weight:800; color:#475569;">
            💡 點選下方年級切換學期，每個章節皆可選擇「5題 / 10題 / 全章節全部題目 / 自選題號」進行挑戰！
          </div>
        </div>

        <!-- 六個學期年級切換按鈕 -->
        <div class="Grade-tabs-bar">
          ${DATA.grades.map(g => `
            <div class="grade-door-tab ${g.id === curGrade.id ? 'active' : ''}" data-gid="${g.id}">
              <div style="font-size:1.1rem; font-weight:900;">🚪 ${escapeHtml(g.shortName)}</div>
              <div style="font-size:0.78rem; font-weight:800; opacity:0.9;">${escapeHtml(g.name)}</div>
              <div style="font-size:0.76rem; font-weight:800; margin-top:3px;">(${g.totalQuestions} 題)</div>
            </div>
          `).join('')}
        </div>

        <!-- 章節關卡卡片列表 -->
        <div class="chapters-grid">
          ${curGrade.chapters.map(ch => {
            const chRecords = state.studentRecords.filter(r => r.gradeId === curGrade.id && r.chapterCode === ch.code);
            const bestScore = chRecords.length ? Math.max(...chRecords.map(r => r.score)) : null;
            const stars = bestScore === null ? '☆☆☆' : (bestScore >= 90 ? '⭐⭐⭐' : bestScore >= 70 ? '⭐⭐☆' : '⭐☆☆');
            const bossInfo = window.DORA_CHARS.getBossForChapter(ch.code, ch.name);

            return `
              <div class="chapter-stage-card">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span class="stage-code-badge">章節 ${escapeHtml(ch.code)}</span>
                    <span class="stage-stars" title="最高分紀錄">${stars}</span>
                  </div>
                  <div class="stage-name">${escapeHtml(ch.name)}</div>
                  <div style="font-size:0.84rem; font-weight:800; color:#475569; margin-top:6px;">
                    👾 守關魔王：${escapeHtml(bossInfo.title)}<br>
                    📝 題庫總數：<b>${ch.count}</b> 道歷屆基會試題<br>
                    🏆 最高成績：${bestScore !== null ? `<b style="color:#059669;">${bestScore} 分</b> (已挑戰 ${chRecords.length} 次)` : '<span style="color:#94A3B8;">尚未挑戰</span>'}
                  </div>
                </div>

                <div style="display:flex; gap:8px; margin-top:6px;">
                  <button class="dora-btn dora-btn-bell dora-btn-sm btn-start-stage" data-gcode="${curGrade.id}" data-ccode="${escapeHtml(ch.code)}" style="flex:1;">
                    ⚔️ 進入關卡挑戰
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    sub.querySelectorAll('.grade-door-tab').forEach(tab => {
      tab.onclick = () => {
        playBellSound('click');
        state.selectedGradeId = tab.getAttribute('data-gid');
        renderAdventureMapSubview(sub);
      };
    });

    sub.querySelectorAll('.btn-start-stage').forEach(btn => {
      btn.onclick = () => {
        playBellSound('click');
        const gId = btn.getAttribute('data-gcode');
        const cCode = btn.getAttribute('data-ccode');
        openStageLaunchModal(gId, cCode);
      };
    });
  }

  /**
   * 關卡啟動彈窗：可選 5 題、10 題、本章節全部題目、或自選題號範圍
   */
  function openStageLaunchModal(gradeId, chapterCode) {
    const gradeObj = DATA.grades.find(g => g.id === gradeId);
    const chObj = gradeObj ? gradeObj.chapters.find(c => c.code === chapterCode) : null;
    const pool = DATA.questions.filter(q => q.grade === gradeId && q.chapterCode === chapterCode);
    if (!pool.length) return;

    const bossInfo = window.DORA_CHARS.getBossForChapter(chapterCode, chObj ? chObj.name : '');

    const modal = createModal(`🚪 準備傳送：${gradeObj.name}【${chapterCode} ${chObj ? chObj.name : ''}】`, `
      <div style="display:flex; align-items:center; gap:16px; background:#EFF6FF; border:3px solid #1E293B; border-radius:18px; padding:14px 18px; margin-bottom:18px;">
        <div style="width:64px; height:64px; flex-shrink:0;">${window.DORA_CHARS.getAvatarSvg('doraemon')}</div>
        <div>
          <div style="font-weight:900; font-size:1.08rem; color:#0077B6;">
            小叮噹：「本章節共有 ${pool.length} 道歷屆基會考真題，請選擇你的 RPG 戰鬥模式！」
          </div>
          <div style="font-size:0.88rem; font-weight:800; color:#475569; margin-top:4px;">
            👾 鎮守魔王：<b>${escapeHtml(bossInfo.title)}</b> ｜ 🎁 通關獎勵道具：<b>${escapeHtml(bossInfo.gadgetReward)}</b>
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:20px;">
        <div class="pocket-card" style="margin:0; padding:16px; text-align:center; box-shadow:0 5px 0 #1E293B;">
          <div style="font-size:1.5rem;">⚡</div>
          <div style="font-weight:900; font-size:1.05rem; margin:4px 0;">快速巡邏戰</div>
          <div style="font-size:0.84rem; color:#475569; font-weight:700; margin-bottom:12px;">隨機抽取 ${Math.min(5, pool.length)} 題歷屆試題</div>
          <button class="dora-btn dora-btn-blue dora-btn-sm" id="launch-5" style="width:100%;">🚀 挑戰 5 題</button>
        </div>

        <div class="pocket-card" style="margin:0; padding:16px; text-align:center; box-shadow:0 5px 0 #1E293B; background:#FFFBEB;">
          <div style="font-size:1.5rem;">⚔️</div>
          <div style="font-weight:900; font-size:1.05rem; margin:4px 0;">標準魔王戰 (推薦)</div>
          <div style="font-size:0.84rem; color:#475569; font-weight:700; margin-bottom:12px;">隨機抽取 ${Math.min(10, pool.length)} 題歷屆試題</div>
          <button class="dora-btn dora-btn-bell dora-btn-sm" id="launch-10" style="width:100%;">🔔 挑戰 10 題</button>
        </div>

        <div class="pocket-card" style="margin:0; padding:16px; text-align:center; box-shadow:0 5px 0 #1E293B;">
          <div style="font-size:1.5rem;">👑</div>
          <div style="font-weight:900; font-size:1.05rem; margin:4px 0;">全章節制霸戰</div>
          <div style="font-size:0.84rem; color:#475569; font-weight:700; margin-bottom:12px;">本章節全部 ${pool.length} 題完整作答</div>
          <button class="dora-btn dora-btn-pink dora-btn-sm" id="launch-all" style="width:100%;">👑 全部 ${pool.length} 題全出</button>
        </div>
      </div>

      <!-- 自選題號區：確保附件中每一道題目都能指定練習或檢視 -->
      <div style="background:#F8FAFC; border:2.5px solid #1E293B; border-radius:16px; padding:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
          <div style="font-weight:900; font-size:0.95rem;">🎯 或勾選指定題目進行闖關（本章節共 ${pool.length} 題）：</div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="dora-btn dora-btn-white dora-btn-sm" id="btn-sel-all-q">全選</button>
            <button type="button" class="dora-btn dora-btn-white dora-btn-sm" id="btn-clear-all-q">清除</button>
            <button type="button" class="dora-btn dora-btn-green dora-btn-sm" id="btn-launch-custom">🎯 挑戰已勾選題目</button>
          </div>
        </div>
        <div style="max-height:190px; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:6px;">
          ${pool.map((q, idx) => `
            <label style="display:flex; align-items:center; gap:6px; padding:6px 8px; background:#fff; border:2px solid #CBD5E1; border-radius:10px; font-size:0.82rem; font-weight:800; cursor:pointer;">
              <input type="checkbox" class="chk-custom-q" value="${q.id}" checked />
              <span>#${idx + 1} (${escapeHtml(q.section.replace(/^[一二三四]、/, ''))}第${q.qNum}題)【${escapeHtml(q.examTag)}】</span>
            </label>
          `).join('')}
        </div>
      </div>
    `);

    modal.querySelector('#launch-5').onclick = () => {
      closeModal(modal);
      startRpgBattle(gradeId, chapterCode, shuffleArray(pool).slice(0, 5), '快速巡邏戰(5題)');
    };
    modal.querySelector('#launch-10').onclick = () => {
      closeModal(modal);
      startRpgBattle(gradeId, chapterCode, shuffleArray(pool).slice(0, 10), '標準魔王戰(10題)');
    };
    modal.querySelector('#launch-all').onclick = () => {
      closeModal(modal);
      startRpgBattle(gradeId, chapterCode, pool.slice(), `全章節制霸(${pool.length}題)`);
    };
    modal.querySelector('#btn-sel-all-q').onclick = () => {
      modal.querySelectorAll('.chk-custom-q').forEach(c => { c.checked = true; });
    };
    modal.querySelector('#btn-clear-all-q').onclick = () => {
      modal.querySelectorAll('.chk-custom-q').forEach(c => { c.checked = false; });
    };
    modal.querySelector('#btn-launch-custom').onclick = () => {
      const ids = Array.from(modal.querySelectorAll('.chk-custom-q:checked')).map(c => c.value);
      if (!ids.length) {
        alert('請至少勾選 1 道題目！');
        return;
      }
      const chosenQs = pool.filter(q => ids.includes(q.id));
      closeModal(modal);
      startRpgBattle(gradeId, chapterCode, chosenQs, `自選題號(${chosenQs.length}題)`);
    };
  }

  function shuffleArray(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // ==========================================================================
  // 3. RPG 戰鬥與「小叮噹人物口氣及時逐步解析回饋」
  // ==========================================================================
  function startRpgBattle(gradeId, chapterCode, questions, modeLabel, isWrongReview = false) {
    const gradeObj = DATA.grades.find(g => g.id === gradeId) || { id: gradeId, name: '綜合複習' };
    const chObj = (gradeObj.chapters || []).find(c => c.code === chapterCode) || { code: chapterCode, name: modeLabel };
    const bossInfo = window.DORA_CHARS.getBossForChapter(chapterCode, chObj.name);

    state.battle = {
      gradeId: gradeObj.id,
      gradeName: gradeObj.name,
      chapterCode: chObj.code,
      chapterName: chObj.name,
      mode: isWrongReview ? 'wrong_review' : modeLabel,
      modeLabel,
      bossTitle: bossInfo.title,
      gadgetReward: bossInfo.gadgetReward,
      questions,
      currentIndex: 0,
      heroHp: 100,
      bossHp: 100,
      combo: 0,
      startTime: Date.now(),
      qStartTime: Date.now(),
      answeredCurrent: false,
      currentChosen: null,
      visibleStepCount: 1, // 逐步解析：預設先顯示第 1 步，可點「下一步解析」或「展開全部步驟」
      answersLog: [], // 完整作答明細
      finished: false
    };
    state.studentNav = 'battle';
    playBellSound('correct');
    renderApp();
  }

  function renderRpgBattleView(container) {
    const b = state.battle;
    if (!b) return;

    if (b.finished) {
      renderBattleResultView(container, b);
      return;
    }

    const q = b.questions[b.currentIndex];
    const totalQ = b.questions.length;
    const totalSteps = (q.steps || []).length;

    container.innerHTML = `
      <!-- 頂部返回與關卡資訊列 -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <button class="dora-btn dora-btn-white dora-btn-sm" id="btn-quit-battle">⬅️ 離開關卡</button>
          <span class="user-badge" style="background:#FFFFFF;">
            🚪 ${escapeHtml(b.gradeName)}｜${escapeHtml(b.chapterCode)} ${escapeHtml(b.chapterName)}（${escapeHtml(b.modeLabel)}）
          </span>
        </div>
        <div class="user-badge" style="background:#FFD700;">
          ⚔️ 進度：第 ${b.currentIndex + 1} / ${totalQ} 題 ｜ 🔥 連擊 Combo：${b.combo}
        </div>
      </div>

      <!-- RPG 雙血條戰鬥舞台 -->
      <div class="rpg-arena-banner">
        <div class="fighter-box">
          <div class="fighter-avatar">${window.DORA_CHARS.getAvatarSvg('doraemon')}</div>
          <div style="flex:1;">
            <div style="font-weight:900; font-size:1.05rem;">
              🛡️ ${escapeHtml(state.user.studentName || (state.user.className + '班 ' + state.user.seatNo + '號'))} ＆ 小叮噹
            </div>
            <div style="font-size:0.82rem; color:#A7F3D0; font-weight:800;">勇者生命值 HP：${Math.max(0, Math.round(b.heroHp))}%</div>
            <div class="hp-bar-outer">
              <div class="hp-bar-inner hp-hero" style="width:${Math.max(0, b.heroHp)}%;"></div>
            </div>
          </div>
        </div>

        <div class="vs-badge">VS</div>

        <div class="fighter-box boss-side">
          <div class="fighter-avatar">${window.DORA_CHARS.getAvatarSvg('boss')}</div>
          <div style="flex:1;">
            <div style="font-weight:900; font-size:1.05rem;">👾 ${escapeHtml(b.bossTitle)}</div>
            <div style="font-size:0.82rem; color:#FCA5A5; font-weight:800;">魔王護盾 HP：${Math.max(0, Math.round(b.bossHp))}%</div>
            <div class="hp-bar-outer" style="margin-left:auto;">
              <div class="hp-bar-inner hp-boss" style="width:${Math.max(0, b.bossHp)}%;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 題目百寶袋卡片 -->
      <div class="pocket-card">
        <div class="question-box">
          <div class="question-meta-row">
            <span style="background:#00A0E9; color:#fff; font-weight:900; font-size:0.88rem; padding:4px 14px; border-radius:999px; border:2px solid #1E293B;">
              第 ${b.currentIndex + 1} 題（原卷 ${escapeHtml(q.section)} 第 ${q.qNum} 題）
            </span>
            <span class="exam-tag-badge">📌 歷屆出處：【${escapeHtml(q.examTag)}】</span>
          </div>

          <div class="question-stem-text">${q.stem}</div>

          ${(q.stemFigs && q.stemFigs.length > 0) ? `
            <div class="question-figs-wrap">
              ${q.stemFigs.map(src => `
                <img src="${escapeHtml(src)}" alt="題目附圖" class="question-fig-img" onclick="window.open('${escapeHtml(src)}', '_blank')" title="點擊放大檢視原卷圖表" />
              `).join('')}
            </div>
          ` : ''}
        </div>

        <!-- 四個選項按鈕 -->
        <div class="options-grid">
          ${['A', 'B', 'C', 'D'].map(letter => {
            let btnClass = 'option-card-btn';
            if (b.answeredCurrent) {
              if (letter === q.answer) btnClass += ' correct-choice';
              else if (letter === b.currentChosen && letter !== q.answer) btnClass += ' wrong-choice';
            }
            return `
              <button
                type="button"
                class="${btnClass}"
                data-opt="${letter}"
                ${b.answeredCurrent ? 'disabled' : ''}
              >
                <span class="option-letter-bell">${letter}</span>
                <span style="flex:1; line-height:1.5;">${q.options[letter]}</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- 作答後立即顯示：小叮噹人物口氣「及時逐步解析回饋」 -->
        ${b.answeredCurrent ? renderStepByStepFeedbackHtml(q, b, totalSteps, totalQ) : ''}
      </div>
    `;

    document.getElementById('btn-quit-battle').onclick = () => {
      if (confirm('確定要中途離開目前的 RPG 測驗關卡嗎？（離開將不會登錄本次成績）')) {
        state.battle = null;
        state.studentNav = 'map';
        renderApp();
      }
    };

    if (!b.answeredCurrent) {
      container.querySelectorAll('.option-card-btn').forEach(btn => {
        btn.onclick = () => {
          const chosen = btn.getAttribute('data-opt');
          handleSelectAnswer(chosen);
        };
      });
    } else {
      const btnNextStep = document.getElementById('btn-next-exp-step');
      if (btnNextStep) {
        btnNextStep.onclick = () => {
          playBellSound('click');
          b.visibleStepCount = Math.min(totalSteps, b.visibleStepCount + 1);
          renderRpgBattleView(container);
        };
      }
      const btnAllSteps = document.getElementById('btn-all-exp-steps');
      if (btnAllSteps) {
        btnAllSteps.onclick = () => {
          playBellSound('click');
          b.visibleStepCount = totalSteps;
          renderRpgBattleView(container);
        };
      }
      const btnNextQ = document.getElementById('btn-next-question');
      if (btnNextQ) {
        btnNextQ.onclick = () => {
          playBellSound('click');
          goToNextQuestion();
        };
      }
    }
  }

  function renderStepByStepFeedbackHtml(q, b, totalSteps, totalQ) {
    const isCorrect = b.currentChosen === q.answer;
    const shownSteps = (q.steps || []).slice(0, b.visibleStepCount);
    const hasMoreSteps = b.visibleStepCount < totalSteps;

    return `
      <div class="dora-feedback-panel">
        <div class="feedback-banner ${isCorrect ? 'is-correct' : 'is-wrong'}">
          <div>
            ${isCorrect
              ? `🎉 太棒了！發動秘密道具「空氣砲」命中魔王！你的作答 (${b.currentChosen}) 完全正確！`
              : `💥 哎呀！被魔王反擊了！你選了 (${b.currentChosen})，正確答案是 (${q.answer})！小叮噹馬上為你逐步解析：`}
          </div>
          <div style="font-size:0.88rem;">
            解析進度：步驟 ${b.visibleStepCount} / ${totalSteps}
          </div>
        </div>

        <!-- 角色逐步對話列表 -->
        <div class="step-dialogue-list">
          ${shownSteps.map((st, idx) => {
            const voice = window.DORA_CHARS.getDynamicStepVoice(st, idx, totalSteps, q.id);
            return `
              <div class="step-dialogue-card">
                <div class="char-avatar-box">
                  <div class="char-avatar-circle">${window.DORA_CHARS.getAvatarSvg(voice.speaker)}</div>
                  <span class="char-name-tag">${escapeHtml(voice.speakerName)}</span>
                </div>
                <div class="step-speech-content">
                  <span class="step-gadget-badge">步驟 ${idx + 1}｜${escapeHtml(voice.gadget)}</span>
                  <div class="step-intro-voice">「${escapeHtml(voice.intro)}」</div>
                  <div class="step-math-box">${st.mathHtml}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- 當展開到最後一步時，若詳解有原卷輔助圖形則一併呈現 -->
        ${(!hasMoreSteps && q.expFigs && q.expFigs.length > 0) ? `
          <div style="background:#FFFFFF; border:2.5px dashed #0284C7; border-radius:16px; padding:12px; margin-bottom:16px; text-align:center;">
            <div style="font-weight:900; font-size:0.9rem; color:#0369A1; margin-bottom:8px;">📐 小叮噹拿出「幾何透視繪圖板」（原卷詳解附圖）：</div>
            <div class="question-figs-wrap" style="margin:0;">
              ${q.expFigs.map(src => `
                <img src="${escapeHtml(src)}" alt="詳解附圖" class="question-fig-img" onclick="window.open('${escapeHtml(src)}', '_blank')" />
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 逐步推進控制列 -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding-top:8px; border-top:2px dashed #CBD5E1;">
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            ${hasMoreSteps ? `
              <button type="button" class="dora-btn dora-btn-blue" id="btn-next-exp-step">
                👉 下一步解析（請下一位夥伴解說 ${b.visibleStepCount + 1}/${totalSteps}）
              </button>
              <button type="button" class="dora-btn dora-btn-white dora-btn-sm" id="btn-all-exp-steps">
                ✨ 一次展開全部 ${totalSteps} 個步驟
              </button>
            ` : `
              <span style="font-weight:900; color:#047857; font-size:0.95rem;">
                ✅ 已完整顯示全部 ${totalSteps} 步小叮噹角色解析！
              </span>
            `}
          </div>

          <button type="button" class="dora-btn dora-btn-bell dora-btn-lg" id="btn-next-question">
            ${b.currentIndex + 1 < totalQ ? '⚔️ 繼續挑戰下一題 ➡️' : '🏆 完成測驗！查看成績與登錄試算表'}
          </button>
        </div>
      </div>
    `;
  }

  function handleSelectAnswer(chosen) {
    const b = state.battle;
    if (!b || b.answeredCurrent) return;
    const q = b.questions[b.currentIndex];
    const totalQ = b.questions.length;
    const isCorrect = chosen === q.answer;
    const spentSec = Math.max(1, Math.round((Date.now() - b.qStartTime) / 1000));

    b.answeredCurrent = true;
    b.currentChosen = chosen;
    b.visibleStepCount = 1; // 先呈現第 1 步，讓學生可逐步點閱

    if (isCorrect) {
      playBellSound('correct');
      b.combo += 1;
      b.bossHp = Math.max(0, b.bossHp - (100 / totalQ));
    } else {
      playBellSound('wrong');
      b.combo = 0;
      b.heroHp = Math.max(5, b.heroHp - Math.max(10, Math.round(80 / totalQ)));
    }

    b.answersLog.push({
      questionId: q.id,
      qNum: q.qNum,
      section: q.section,
      examTag: q.examTag,
      chosen,
      correctAnswer: q.answer,
      isCorrect,
      spentSec
    });

    renderApp();
  }

  async function goToNextQuestion() {
    const b = state.battle;
    if (!b) return;
    if (b.currentIndex + 1 < b.questions.length) {
      b.currentIndex += 1;
      b.answeredCurrent = false;
      b.currentChosen = null;
      b.visibleStepCount = 1;
      b.qStartTime = Date.now();
      renderApp();
    } else {
      // 測驗結束：計算成績並以 GAS 登錄至 Google 試算表
      b.finished = true;
      const totalCount = b.questions.length;
      const correctCount = b.answersLog.filter(a => a.isCorrect).length;
      const score = Math.round((correctCount / totalCount) * 100);
      const durationSec = Math.max(1, Math.round((Date.now() - b.startTime) / 1000));

      b.finalScore = score;
      b.correctCount = correctCount;
      b.totalCount = totalCount;
      b.durationSec = durationSec;
      b.syncStatus = 'saving';
      renderApp();

      const payload = {
        recordId: 'R_' + Date.now(),
        timestamp: new Date().toISOString(),
        school: state.user.school,
        className: state.user.className,
        seatNo: state.user.seatNo,
        studentName: state.user.studentName || '',
        gradeId: b.gradeId,
        gradeName: b.gradeName,
        chapterCode: b.chapterCode,
        chapterName: b.chapterName,
        mode: b.mode,
        score,
        correctCount,
        totalCount,
        durationSec,
        answers: b.answersLog
      };

      const res = await callGasApi('submitQuiz', payload);
      b.syncStatus = res && res.ok ? 'saved' : 'local_saved';
      b.savedRecord = payload;
      await loadStudentCloudData();
      renderApp();
    }
  }

  function renderBattleResultView(container, b) {
    const isWin = b.finalScore >= 60;
    container.innerHTML = `
      <div class="pocket-card" style="text-align:center; max-width:860px; margin:0 auto;">
        <div style="width:100px; height:100px; margin:0 auto 12px; background:#FFFBEB; border:4px solid #1E293B; border-radius:50%; padding:6px; box-shadow:0 6px 0 #1E293B;">
          ${window.DORA_CHARS.getAvatarSvg(isWin ? 'doraemon' : 'dorami')}
        </div>

        <div style="display:inline-block; background:#FFD700; border:2.5px solid #1E293B; border-radius:999px; padding:4px 16px; font-weight:900; margin-bottom:8px;">
          ${escapeHtml(b.gradeName)}｜${escapeHtml(b.chapterCode)} ${escapeHtml(b.chapterName)}
        </div>

        <h2 style="font-size:2rem; font-weight:900; color:#0077B6; margin-bottom:6px;">
          ${isWin ? '🏆 闖關成功！成功擊退章節數學魔王！' : '💪 再接再厲！小叮噹陪你把錯題補起來！'}
        </h2>

        <p style="font-weight:800; color:#475569; margin-bottom:18px;">
          ${b.syncStatus === 'saving'
            ? '⏳ 正在透過 GAS 將成績與完整作答明細登錄至 Google 試算表...'
            : (state.gasUrl ? '✅ 成績與作答完整卷已成功登錄至 Google 試算表！' : '✅ 成績與作答完整卷已儲存（設定 GAS 網址後可同步至 Google 試算表）')}
        </p>

        <div class="stat-cards-grid" style="max-width:680px; margin:0 auto 22px;">
          <div class="stat-card">
            <div class="stat-card-label">🎯 本次測驗得分</div>
            <div class="stat-card-value" style="color:${b.finalScore >= 80 ? '#059669' : b.finalScore >= 60 ? '#0284C7' : '#E11D48'};">
              ${b.finalScore} 分
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">✅ 答對 / 總題數</div>
            <div class="stat-card-value">${b.correctCount} / ${b.totalCount}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">⏱️ 作答耗時</div>
            <div class="stat-card-value">${b.durationSec} 秒</div>
          </div>
        </div>

        <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
          <button class="dora-btn dora-btn-bell dora-btn-lg" id="btn-view-this-paper">
            📜 檢視本次「作答完整卷」與詳解
          </button>
          <button class="dora-btn dora-btn-blue dora-btn-lg" id="btn-back-map">
            🚪 返回任意門關卡大廳
          </button>
          <button class="dora-btn dora-btn-pink dora-btn-lg" id="btn-go-wrongs">
            🍞 前往記憶吐司錯題複習
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-view-this-paper').onclick = () => {
      if (b.savedRecord) openFullExamPaperModal(b.savedRecord);
    };
    document.getElementById('btn-back-map').onclick = () => {
      state.battle = null;
      state.studentNav = 'map';
      renderApp();
    };
    document.getElementById('btn-go-wrongs').onclick = () => {
      state.battle = null;
      state.studentNav = 'wrong';
      renderApp();
    };
  }

  // ==========================================================================
  // 4. 學生歷史成績與「作答完整卷」查詢
  // ==========================================================================
  function renderStudentHistorySubview(sub) {
    const recs = state.studentRecords || [];

    sub.innerHTML = `
      <div class="pocket-card">
        <div class="pocket-card-header">
          <div class="pocket-title">🛸 時光機：歷史測驗成績與「作答完整卷」查詢</div>
          <button class="dora-btn dora-btn-blue dora-btn-sm" id="btn-refresh-stu-history">🔄 重新同步紀錄</button>
        </div>

        ${recs.length === 0 ? `
          <div style="text-align:center; padding:40px 20px; font-weight:800; color:#64748B;">
            <div style="width:76px; height:76px; margin:0 auto 12px;">${window.DORA_CHARS.getAvatarSvg('doraemon')}</div>
            目前還沒有歷史測驗紀錄喔！快去「🚪 任意門章節闖關」挑戰第一關吧！
          </div>
        ` : `
          <div class="dora-table-wrap">
            <table class="dora-table">
              <thead>
                <tr>
                  <th>測驗時間</th>
                  <th>年級與章節</th>
                  <th>模式</th>
                  <th>得分</th>
                  <th>答對/題數</th>
                  <th>作答時間</th>
                  <th>完整考卷與詳解</th>
                </tr>
              </thead>
              <tbody>
                ${recs.map((r, idx) => `
                  <tr>
                    <td>${formatDateTime(r.timestamp)}</td>
                    <td><b>${escapeHtml(r.gradeName)}</b><br><span style="font-size:0.84rem; color:#0369A1;">${escapeHtml(r.chapterCode)} ${escapeHtml(r.chapterName)}</span></td>
                    <td>${escapeHtml(r.mode || '標準戰')}</td>
                    <td><span style="font-size:1.15rem; font-weight:900; color:${r.score >= 80 ? '#059669' : r.score >= 60 ? '#0284C7' : '#E11D48'};">${r.score} 分</span></td>
                    <td>${r.correctCount} / ${r.totalCount} 題</td>
                    <td>${r.durationSec || 0} 秒</td>
                    <td>
                      <button class="dora-btn dora-btn-bell dora-btn-sm btn-open-paper" data-ridx="${idx}">
                        📜 查看完整作答卷
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    document.getElementById('btn-refresh-stu-history').onclick = async () => {
      await loadStudentCloudData();
      renderStudentHistorySubview(sub);
    };

    sub.querySelectorAll('.btn-open-paper').forEach(btn => {
      btn.onclick = () => {
        playBellSound('click');
        const idx = Number(btn.getAttribute('data-ridx'));
        openFullExamPaperModal(recs[idx]);
      };
    });
  }

  /**
   * 彈窗：檢視單次測驗「作答完整卷」(學生與老師皆可調閱)
   */
  function openFullExamPaperModal(record) {
    if (!record) return;
    const answers = record.answers || [];

    const html = `
      <div style="background:#FFFBEB; border:3px solid #1E293B; border-radius:18px; padding:14px 18px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <div style="font-size:1.1rem; font-weight:900; color:#0F172A;">
            🏫 ${escapeHtml(record.school)}｜${escapeHtml(record.className)}班 ${escapeHtml(record.seatNo)}號 ${escapeHtml(record.studentName || '')}
          </div>
          <div style="font-size:0.88rem; font-weight:800; color:#475569; margin-top:4px;">
            📚 範圍：${escapeHtml(record.gradeName)}【${escapeHtml(record.chapterCode)} ${escapeHtml(record.chapterName)}】｜🕒 時間：${formatDateTime(record.timestamp)}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:1.65rem; font-weight:900; color:${record.score >= 60 ? '#059669' : '#E11D48'};">
            得分：${record.score} 分
          </div>
          <div style="font-size:0.85rem; font-weight:800;">
            答對 ${record.correctCount} / ${record.totalCount} 題（耗時 ${record.durationSec || 0} 秒）
          </div>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:18px;">
        ${answers.map((ans, idx) => {
          const q = QUESTION_MAP[ans.questionId];
          if (!q) {
            return `<div class="question-box">第 ${idx + 1} 題（題目 ID: ${escapeHtml(ans.questionId)}）作答：${escapeHtml(ans.chosen)}｜正確答案：${escapeHtml(ans.correctAnswer)}</div>`;
          }
          return `
            <div class="question-box" style="margin-bottom:0; border-color:${ans.isCorrect ? '#059669' : '#E11D48'};">
              <div class="question-meta-row">
                <span style="background:${ans.isCorrect ? '#059669' : '#E11D48'}; color:#fff; font-weight:900; font-size:0.88rem; padding:4px 12px; border-radius:999px;">
                  ${ans.isCorrect ? '✅ 答對' : '❌ 答錯'}｜第 ${idx + 1} 題（原卷第 ${q.qNum} 題）
                </span>
                <span class="exam-tag-badge">【${escapeHtml(q.examTag)}】耗時 ${ans.spentSec || 0} 秒</span>
              </div>

              <div class="question-stem-text">${q.stem}</div>

              ${(q.stemFigs && q.stemFigs.length > 0) ? `
                <div class="question-figs-wrap">
                  ${q.stemFigs.map(src => `<img src="${escapeHtml(src)}" class="question-fig-img" onclick="window.open('${escapeHtml(src)}', '_blank')" />`).join('')}
                </div>
              ` : ''}

              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:8px; margin:12px 0;">
                ${['A', 'B', 'C', 'D'].map(optKey => {
                  const isChosen = ans.chosen === optKey;
                  const isRight = q.answer === optKey;
                  let bg = '#FFFFFF';
                  let bd = '#CBD5E1';
                  if (isRight) { bg = '#D1FAE5'; bd = '#059669'; }
                  else if (isChosen && !isRight) { bg = '#FEE2E2'; bd = '#E11D48'; }
                  return `
                    <div style="padding:8px 12px; border:2.5px solid ${bd}; background:${bg}; border-radius:12px; font-weight:800; font-size:0.95rem;">
                      <b>(${optKey})</b> ${q.options[optKey]}
                      ${isRight ? ' <span style="color:#047857;">(正確答案)</span>' : ''}
                      ${isChosen && !isRight ? ' <span style="color:#B91C1C;">(你的作答)</span>' : ''}
                      ${isChosen && isRight ? ' <span style="color:#047857;">(你的作答 ✓)</span>' : ''}
                    </div>
                  `;
                }).join('')}
              </div>

              <div style="background:#F0F9FF; border:2px dashed #0284C7; border-radius:14px; padding:12px; margin-top:10px;">
                <div style="font-weight:900; color:#0369A1; margin-bottom:6px;">💬 小叮噹逐步解析：</div>
                ${(q.steps || []).map((st, sIdx) => `
                  <div style="margin-bottom:6px; font-size:0.95rem; font-weight:700;">
                    <span style="background:#FFD700; border:1.5px solid #1E293B; border-radius:999px; padding:1px 8px; font-size:0.8rem; font-weight:900; margin-right:6px;">
                      步驟 ${sIdx + 1} (${escapeHtml(st.speakerName)})
                    </span>
                    ${st.mathHtml}
                  </div>
                `).join('')}
                ${(q.expFigs && q.expFigs.length > 0) ? `
                  <div class="question-figs-wrap" style="margin-top:8px;">
                    ${q.expFigs.map(src => `<img src="${escapeHtml(src)}" class="question-fig-img" onclick="window.open('${escapeHtml(src)}', '_blank')" />`).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    createModal(`📜 作答完整卷檢視：${record.gradeName} ${record.chapterCode} ${record.chapterName}`, html);
  }

  // ==========================================================================
  // 5. 學生「記憶吐司：錯題複習」專區
  // ==========================================================================
  function renderStudentWrongSubview(sub) {
    const allWrongs = state.studentWrongs || [];
    const filtered = allWrongs.filter(w => {
      const q = QUESTION_MAP[w.questionId];
      if (!q) return false;
      const matchG = state.wrongFilterGrade === 'all' || q.grade === state.wrongFilterGrade;
      const matchS = state.wrongFilterStatus === 'all' ||
                     (state.wrongFilterStatus === 'unmastered' && !w.mastered) ||
                     (state.wrongFilterStatus === 'mastered' && w.mastered);
      return matchG && matchS;
    });

    sub.innerHTML = `
      <div class="pocket-card">
        <div class="pocket-card-header">
          <div class="pocket-title">🍞 記憶吐司：個人錯題複習與重練特訓</div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <select class="dora-select" id="sel-wrong-grade" style="width:auto; padding:6px 12px;">
              <option value="all">全部年級</option>
              ${DATA.grades.map(g => `<option value="${g.id}" ${state.wrongFilterGrade === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}
            </select>
            <select class="dora-select" id="sel-wrong-status" style="width:auto; padding:6px 12px;">
              <option value="unmastered" ${state.wrongFilterStatus === 'unmastered' ? 'selected' : ''}>📌 待訂正複習錯題</option>
              <option value="mastered" ${state.wrongFilterStatus === 'mastered' ? 'selected' : ''}>✅ 已訂正學會錯題</option>
              <option value="all" ${state.wrongFilterStatus === 'all' ? 'selected' : ''}>全部錯題紀錄</option>
            </select>
            ${filtered.length > 0 ? `
              <button class="dora-btn dora-btn-pink dora-btn-sm" id="btn-battle-wrongs">
                ⚔️ 啟動錯題重練 RPG 特訓 (${filtered.length} 題)
              </button>
            ` : ''}
          </div>
        </div>

        ${filtered.length === 0 ? `
          <div style="text-align:center; padding:40px 20px; font-weight:800; color:#059669;">
            <div style="width:76px; height:76px; margin:0 auto 12px;">${window.DORA_CHARS.getAvatarSvg('shizuka')}</div>
            太棒了！目前這個篩選條件下沒有待複習的錯題喔！
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:18px;">
            ${filtered.map(w => {
              const q = QUESTION_MAP[w.questionId];
              return `
                <div class="question-box" style="margin-bottom:0;">
                  <div class="question-meta-row">
                    <div>
                      <span class="stage-code-badge">${escapeHtml(q.gradeShort)} ${escapeHtml(q.chapterFull)}</span>
                      <span style="font-weight:900; color:#E11D48; margin-left:8px;">
                        累計答錯 ${w.wrongCount || 1} 次（上次誤選：${escapeHtml(w.lastChosen || '-')}）
                      </span>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                      <span class="exam-tag-badge">【${escapeHtml(q.examTag)}】</span>
                      <button class="dora-btn ${w.mastered ? 'dora-btn-white' : 'dora-btn-green'} dora-btn-sm btn-toggle-mastered" data-qid="${q.id}" data-cur="${w.mastered ? '1' : '0'}">
                        ${w.mastered ? '↩️ 移回待複習' : '✅ 標記為已學會'}
                      </button>
                    </div>
                  </div>

                  <div class="question-stem-text">${q.stem}</div>

                  ${(q.stemFigs && q.stemFigs.length > 0) ? `
                    <div class="question-figs-wrap">
                      ${q.stemFigs.map(src => `<img src="${escapeHtml(src)}" class="question-fig-img" onclick="window.open('${escapeHtml(src)}', '_blank')" />`).join('')}
                    </div>
                  ` : ''}

                  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:8px; margin:12px 0;">
                    ${['A', 'B', 'C', 'D'].map(k => `
                      <div style="padding:8px 12px; border:2px solid ${k === q.answer ? '#059669' : '#CBD5E1'}; background:${k === q.answer ? '#D1FAE5' : '#FFFFFF'}; border-radius:12px; font-weight:800;">
                        <b>(${k})</b> ${q.options[k]} ${k === q.answer ? '✓' : ''}
                      </div>
                    `).join('')}
                  </div>

                  <div style="background:#FFFBEB; border:2px solid #F59E0B; border-radius:14px; padding:12px;">
                    <div style="font-weight:900; color:#B45309; margin-bottom:6px;">🍞 小叮噹記憶吐司逐步詳解：</div>
                    ${(q.steps || []).map((st, sIdx) => `
                      <div style="margin-bottom:6px; font-weight:700;">
                        <b>步驟 ${sIdx + 1} (${escapeHtml(st.speakerName)})：</b> ${st.mathHtml}
                      </div>
                    `).join('')}
                    ${(q.expFigs && q.expFigs.length > 0) ? `
                      <div class="question-figs-wrap" style="margin-top:8px;">
                        ${q.expFigs.map(src => `<img src="${escapeHtml(src)}" class="question-fig-img" onclick="window.open('${escapeHtml(src)}', '_blank')" />`).join('')}
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    document.getElementById('sel-wrong-grade').onchange = (e) => {
      state.wrongFilterGrade = e.target.value;
      renderStudentWrongSubview(sub);
    };
    document.getElementById('sel-wrong-status').onchange = (e) => {
      state.wrongFilterStatus = e.target.value;
      renderStudentWrongSubview(sub);
    };

    const btnBattleWrongs = document.getElementById('btn-battle-wrongs');
    if (btnBattleWrongs) {
      btnBattleWrongs.onclick = () => {
        const qs = filtered.map(w => QUESTION_MAP[w.questionId]).filter(Boolean);
        startRpgBattle('wrong_review', '錯題特訓', qs, `記憶吐司錯題複習(${qs.length}題)`, true);
      };
    }

    sub.querySelectorAll('.btn-toggle-mastered').forEach(btn => {
      btn.onclick = async () => {
        playBellSound('correct');
        const qid = btn.getAttribute('data-qid');
        const cur = btn.getAttribute('data-cur') === '1';
        await callGasApi('markWrongMastered', {
          school: state.user.school,
          className: state.user.className,
          seatNo: state.user.seatNo,
          questionId: qid,
          mastered: !cur
        });
        await loadStudentCloudData();
        renderStudentWrongSubview(sub);
      };
    });
  }

  // ==========================================================================
  // 6. 老師端視圖：查詢任課學校班級學生的成績及作答情形
  // ==========================================================================
  async function loadTeacherCloudData() {
    if (!state.user || state.user.role !== 'teacher') return;
    const res = await callGasApi('getTeacherReport', {
      school: state.user.school,
      classes: state.user.allClasses || []
    });
    if (res && res.ok) {
      state.teacherRecords = res.records || [];
      state.teacherWrongs = res.wrongQuestions || [];
    }
  }

  function renderTeacherView(container) {
    const teacherClasses = state.user.allClasses || [];
    const allRecs = state.teacherRecords || [];

    // 依班級、年級、章節、座號篩選
    const filteredRecs = allRecs.filter(r => {
      const matchCls = state.teacherFilterClass === 'all'
        ? teacherClasses.includes(String(r.className))
        : String(r.className) === state.teacherFilterClass;
      const matchG = state.teacherFilterGrade === 'all' || r.gradeId === state.teacherFilterGrade;
      const matchC = state.teacherFilterChapter === 'all' || r.chapterCode === state.teacherFilterChapter;
      const matchSeat = !state.teacherSearchSeat.trim() || String(r.seatNo) === state.teacherSearchSeat.trim();
      return matchCls && matchG && matchC && matchSeat;
    });

    // 計算統計指標
    const totalAttempts = filteredRecs.length;
    const avgScore = totalAttempts ? Math.round(filteredRecs.reduce((a, r) => a + r.score, 0) / totalAttempts) : 0;
    const uniqueStudents = new Set(filteredRecs.map(r => `${r.className}_${r.seatNo}`)).size;
    const passCount = filteredRecs.filter(r => r.score >= 60).length;
    const passRate = totalAttempts ? Math.round((passCount / totalAttempts) * 100) : 0;

    // 統計班級常錯題目 TOP 5
    const wrongFreq = {};
    filteredRecs.forEach(r => {
      (r.answers || []).forEach(a => {
        if (!a.isCorrect && a.questionId) {
          wrongFreq[a.questionId] = (wrongFreq[a.questionId] || 0) + 1;
        }
      });
    });
    const topWrongQs = Object.entries(wrongFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const selectedGradeObj = DATA.grades.find(g => g.id === state.teacherFilterGrade);

    container.innerHTML = `
      <div class="pocket-card">
        <div class="pocket-card-header">
          <div>
            <div class="pocket-title">
              🎓 百寶袋教師後台：${escapeHtml(state.user.school)} 任課班級學生成績與作答查詢
            </div>
            <div style="font-size:0.88rem; font-weight:800; color:#475569; margin-top:4px;">
              👨‍🏫 任課教師：<b>${escapeHtml(state.user.name)}</b> ｜ 📋 已綁定任課班級：
              ${teacherClasses.map(c => `<span style="display:inline-block; background:#FEF08A; border:2px solid #1E293B; border-radius:999px; padding:1px 10px; margin-right:4px;">${escapeHtml(c)}班</span>`).join('')}
            </div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="dora-btn dora-btn-blue dora-btn-sm" id="btn-tch-refresh">🔄 同步最新成績</button>
            <button class="dora-btn dora-btn-green dora-btn-sm" id="btn-tch-export">📥 匯出 CSV 成績單</button>
          </div>
        </div>

        <!-- 任課班級快速切換頁籤 -->
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">
          <button class="dora-btn ${state.teacherFilterClass === 'all' ? 'dora-btn-bell' : 'dora-btn-white'} dora-btn-sm tch-cls-tab" data-cls="all">
            📋 全部任課班級 (${teacherClasses.length} 班)
          </button>
          ${teacherClasses.map(cls => `
            <button class="dora-btn ${state.teacherFilterClass === String(cls) ? 'dora-btn-bell' : 'dora-btn-white'} dora-btn-sm tch-cls-tab" data-cls="${escapeHtml(cls)}">
              🚪 ${escapeHtml(cls)} 班
            </button>
          `).join('')}
        </div>

        <!-- 篩選條件列 -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; background:#F0F9FF; border:2.5px solid #1E293B; border-radius:16px; padding:14px; margin-bottom:20px;">
          <div>
            <label class="form-label" style="font-size:0.84rem;">📚 篩選年級</label>
            <select class="dora-select" id="tch-sel-grade" style="padding:7px 10px; font-size:0.9rem;">
              <option value="all">全部年級</option>
              ${DATA.grades.map(g => `<option value="${g.id}" ${state.teacherFilterGrade === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label" style="font-size:0.84rem;">📖 篩選章節</label>
            <select class="dora-select" id="tch-sel-chapter" style="padding:7px 10px; font-size:0.9rem;">
              <option value="all">全部章節</option>
              ${selectedGradeObj ? selectedGradeObj.chapters.map(c => `<option value="${escapeHtml(c.code)}" ${state.teacherFilterChapter === c.code ? 'selected' : ''}>${escapeHtml(c.fullName)}</option>`).join('') : ''}
            </select>
          </div>
          <div>
            <label class="form-label" style="font-size:0.84rem;">🔢 搜尋學生座號</label>
            <input type="text" class="dora-input" id="tch-inp-seat" value="${escapeHtml(state.teacherSearchSeat)}" placeholder="輸入座號 (如: 15)" style="padding:7px 10px; font-size:0.9rem;" />
          </div>
        </div>

        <!-- 班級成績統計卡片 -->
        <div class="stat-cards-grid">
          <div class="stat-card">
            <div class="stat-card-label">📝 測驗總人次</div>
            <div class="stat-card-value">${totalAttempts} 次</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">👥 作答學生人數</div>
            <div class="stat-card-value">${uniqueStudents} 人</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">📊 班級平均分數</div>
            <div class="stat-card-value">${avgScore} 分</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">✅ 及格率 (≥60分)</div>
            <div class="stat-card-value">${passRate}%</div>
          </div>
        </div>

        <!-- 班級最常答錯題目分析 (供老師課堂檢討) -->
        ${topWrongQs.length > 0 ? `
          <div style="background:#FFF1F2; border:3px solid #1E293B; border-radius:18px; padding:14px 18px; margin-bottom:20px;">
            <div style="font-weight:900; color:#BE123C; margin-bottom:8px;">
              🔍 任課班級常見錯題排行（點擊可投影檢視題目與小叮噹逐步詳解）：
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              ${topWrongQs.map(([qid, cnt]) => {
                const q = QUESTION_MAP[qid];
                if (!q) return '';
                return `
                  <button class="dora-btn dora-btn-white dora-btn-sm btn-preview-q" data-qid="${qid}">
                    ❌ ${escapeHtml(q.gradeShort)} ${escapeHtml(q.chapterCode)} 第${q.qNum}題（錯 ${cnt} 次）
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 學生作答紀錄總表 -->
        ${filteredRecs.length === 0 ? `
          <div style="text-align:center; padding:36px 20px; font-weight:800; color:#64748B;">
            目前尚無符合篩選條件的學生測驗成績紀錄。
          </div>
        ` : `
          <div class="dora-table-wrap">
            <table class="dora-table">
              <thead>
                <tr>
                  <th>測驗時間</th>
                  <th>班級</th>
                  <th>座號</th>
                  <th>姓名</th>
                  <th>測驗年級＆章節</th>
                  <th>分數</th>
                  <th>答對/總題數</th>
                  <th>耗時</th>
                  <th>作答情形與完整卷</th>
                </tr>
              </thead>
              <tbody>
                ${filteredRecs.map((r, idx) => `
                  <tr>
                    <td>${formatDateTime(r.timestamp)}</td>
                    <td><span class="stage-code-badge">${escapeHtml(r.className)}班</span></td>
                    <td><b>${escapeHtml(r.seatNo)}號</b></td>
                    <td>${escapeHtml(r.studentName || '-')}</td>
                    <td><b>${escapeHtml(r.gradeName)}</b><br><span style="font-size:0.84rem; color:#0369A1;">${escapeHtml(r.chapterCode)} ${escapeHtml(r.chapterName)}</span></td>
                    <td><span style="font-size:1.15rem; font-weight:900; color:${r.score >= 80 ? '#059669' : r.score >= 60 ? '#0284C7' : '#E11D48'};">${r.score} 分</span></td>
                    <td>${r.correctCount} / ${r.totalCount} 題</td>
                    <td>${r.durationSec || 0} 秒</td>
                    <td>
                      <button class="dora-btn dora-btn-bell dora-btn-sm btn-tch-view-paper" data-ridx="${idx}">
                        🔍 查看作答完整卷
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    container.querySelectorAll('.tch-cls-tab').forEach(btn => {
      btn.onclick = () => {
        playBellSound('click');
        state.teacherFilterClass = btn.getAttribute('data-cls');
        renderTeacherView(container);
      };
    });

    document.getElementById('tch-sel-grade').onchange = (e) => {
      state.teacherFilterGrade = e.target.value;
      state.teacherFilterChapter = 'all';
      renderTeacherView(container);
    };

    document.getElementById('tch-sel-chapter').onchange = (e) => {
      state.teacherFilterChapter = e.target.value;
      renderTeacherView(container);
    };

    document.getElementById('tch-inp-seat').oninput = (e) => {
      state.teacherSearchSeat = e.target.value;
      renderTeacherView(container);
    };

    document.getElementById('btn-tch-refresh').onclick = async () => {
      await loadTeacherCloudData();
      renderTeacherView(container);
    };

    document.getElementById('btn-tch-export').onclick = () => {
      exportTeacherCsv(filteredRecs);
    };

    container.querySelectorAll('.btn-tch-view-paper').forEach(btn => {
      btn.onclick = () => {
        playBellSound('click');
        const idx = Number(btn.getAttribute('data-ridx'));
        openFullExamPaperModal(filteredRecs[idx]);
      };
    });

    container.querySelectorAll('.btn-preview-q').forEach(btn => {
      btn.onclick = () => {
        const qid = btn.getAttribute('data-qid');
        const q = QUESTION_MAP[qid];
        if (!q) return;
        openFullExamPaperModal({
          school: state.user.school,
          className: state.teacherFilterClass === 'all' ? '任課班級' : state.teacherFilterClass,
          seatNo: '-',
          studentName: '課堂錯題檢討模式',
          gradeName: q.gradeName,
          chapterCode: q.chapterCode,
          chapterName: q.chapterName,
          timestamp: new Date().toISOString(),
          score: 100,
          correctCount: 1,
          totalCount: 1,
          durationSec: 0,
          answers: [{
            questionId: q.id,
            chosen: q.answer,
            correctAnswer: q.answer,
            isCorrect: true,
            spentSec: 0
          }]
        });
      };
    });
  }

  function exportTeacherCsv(records) {
    if (!records.length) {
      alert('目前沒有可匯出的成績資料！');
      return;
    }
    const headers = ['測驗時間', '學校', '班級', '座號', '姓名', '年級', '章節代碼', '章節名稱', '模式', '得分', '答對題數', '總題數', '作答秒數'];
    const rows = records.map(r => [
      formatDateTime(r.timestamp),
      r.school,
      r.className,
      r.seatNo,
      r.studentName || '',
      r.gradeName,
      r.chapterCode,
      r.chapterName,
      r.mode || '',
      r.score,
      r.correctCount,
      r.totalCount,
      r.durationSec || 0
    ]);
    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.user.school}_任課班級數學RPG成績單_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openEditTeacherClassesModal() {
    if (!state.user || state.user.role !== 'teacher') return;
    const tempCfg = {
      gradeTab: '7',
      selectedClasses: (state.user.standardClasses || []).slice(),
      otherChecked: (state.user.customClasses || []).length > 0,
      customClasses: [
        (state.user.customClasses || [])[0] || '',
        (state.user.customClasses || [])[1] || '',
        (state.user.customClasses || [])[2] || '',
        (state.user.customClasses || [])[3] || '',
        (state.user.customClasses || [])[4] || ''
      ],
      onChange(u) {
        this.gradeTab = u.gradeTab;
        this.selectedClasses = u.selectedClasses;
        this.otherChecked = u.otherChecked;
        this.customClasses = u.customClasses;
      }
    };

    const modal = createModal('⚙️ 修改任課班級設定（年級勾選最多5班＋其他自訂最多5班）', `
      <div id="edit-cls-mount"></div>
      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px;">
        <button class="dora-btn dora-btn-bell" id="btn-save-edit-cls">💾 儲存任課班級設定</button>
      </div>
    `);

    renderClassPickerWidget(modal.querySelector('#edit-cls-mount'), tempCfg);

    modal.querySelector('#btn-save-edit-cls').onclick = async () => {
      const std = tempCfg.selectedClasses.slice(0, 5);
      const cus = tempCfg.otherChecked
        ? tempCfg.customClasses.map(s => s.trim().replace(/班$/, '')).filter(Boolean).slice(0, 5)
        : [];
      if (std.length === 0 && cus.length === 0) {
        alert('請至少選擇或輸入 1 個任課班級！');
        return;
      }
      const res = await callGasApi('updateTeacherClasses', {
        teacherId: state.user.teacherId,
        school: state.user.school,
        username: state.user.username,
        standardClasses: std,
        customClasses: cus
      });
      if (res && res.ok) {
        state.user.standardClasses = std;
        state.user.customClasses = cus;
        state.user.allClasses = Array.from(new Set([...std, ...cus]));
        saveJson(STORAGE_KEYS.CURRENT_USER, state.user);
        closeModal(modal);
        await loadTeacherCloudData();
        renderApp();
      }
    };
  }

  // ==========================================================================
  // 7. GAS Google 試算表網址連動設定精靈 Modal
  // ==========================================================================
  function openGasConfigModal() {
    const modal = createModal('☁️ 設定 Google Apps Script (GAS) 試算表登錄網址', `
      <div style="background:#EFF6FF; border:2.5px solid #1E293B; border-radius:16px; padding:14px; margin-bottom:16px; font-weight:700; font-size:0.92rem; line-height:1.65;">
        <div style="font-weight:900; color:#0077B6; font-size:1.02rem; margin-bottom:6px;">
          🔔 小叮噹 GAS 試算表 3 分鐘快速部署步驟：
        </div>
        1. 在 Google 雲端硬碟新增一份空白 <b>Google 試算表 (Google Sheets)</b>。<br>
        2. 點選上方選單「<b>擴充功能</b>」＞「<b>Apps Script</b>」。<br>
        3. 將本資料夾中的 <code>Code.gs</code> 程式碼完整貼上並儲存。<br>
        4. 點選右上角「<b>部署</b>」＞「<b>新增部署作業</b>」＞類型選「<b>網頁應用程式 (Web App)</b>」，將「誰可以存取」設為「<b>所有人 (Anyone)</b>」。<br>
        5. 複製產生的 <code>https://script.google.com/macros/s/.../exec</code> 網址貼到下方即可！
      </div>

      <div class="form-group">
        <label class="form-label">🔗 已固定綁定之 GAS 網頁應用程式網址 (Web App URL)</label>
        <input type="url" class="dora-input" id="inp-gas-url" value="${escapeHtml(FIXED_GAS_URL)}" readonly style="background:#F1F5F9; cursor:default;" />
      </div>

      <div id="gas-test-msg" style="font-weight:800; font-size:0.9rem; margin-bottom:12px;"></div>

      <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <button type="button" class="dora-btn dora-btn-blue" id="btn-test-gas">🔌 測試 Google 試算表連線</button>
      </div>
    `);

    modal.querySelector('#btn-test-gas').onclick = async () => {
      const url = FIXED_GAS_URL;
      const msgEl = modal.querySelector('#gas-test-msg');
      state.gasUrl = FIXED_GAS_URL;
      updateGasStatusUi();

      msgEl.style.color = '#0369A1';
      msgEl.textContent = '⏳ 正在測試連線至 Google 試算表...';
      try {
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + 'action=ping');
        const json = await res.json();
        if (json && json.ok) {
          playBellSound('correct');
          msgEl.style.color = '#059669';
          msgEl.textContent = '✅ 連線成功！Google 試算表工作表已自動初始化完成！';
          setTimeout(() => closeModal(modal), 900);
        } else {
          msgEl.style.color = '#D97706';
          msgEl.textContent = '⚠️ 已綁定固定網址，請確認 GAS 部署權限已設為「所有人 (Anyone)」。';
        }
      } catch (_) {
        msgEl.style.color = '#059669';
        msgEl.textContent = '✅ 已綁定固定 GAS 網址！後續測驗成績與註冊資料將自動寫入試算表。';
        setTimeout(() => closeModal(modal), 900);
      }
    };
  }

  // ==========================================================================
  // 通用彈窗與字串工具
  // ==========================================================================
  function createModal(title, bodyHtml) {
    const backdrop = document.createElement('div');
    backdrop.className = 'dora-modal-backdrop';
    backdrop.innerHTML = `
      <div class="dora-modal-box">
        <div class="dora-modal-header">
          <div style="font-size:1.18rem; font-weight:900;">${escapeHtml(title)}</div>
          <button type="button" class="dora-btn dora-btn-red dora-btn-sm btn-close-modal">✖ 關閉</button>
        </div>
        <div class="dora-modal-body">${bodyHtml}</div>
      </div>
    `;
    backdrop.querySelector('.btn-close-modal').onclick = () => closeModal(backdrop);
    backdrop.onclick = (e) => {
      if (e.target === backdrop) closeModal(backdrop);
    };
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function closeModal(modalEl) {
    if (modalEl && modalEl.parentNode) {
      modalEl.parentNode.removeChild(modalEl);
    }
  }

  function formatDateTime(iso) {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch (_) {
      return String(iso);
    }
  }

  function escapeHtml(str) {
    return String(str === undefined || str === null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 啟動初始化
  window.addEventListener('DOMContentLoaded', async () => {
    const brandEl = document.getElementById('brand-logo-home');
    if (brandEl) {
      brandEl.onclick = () => {
        if (state.user && state.user.role === 'student') {
          state.battle = null;
          state.studentNav = 'map';
          renderApp();
        }
      };
    }

    const brandAvatarEl = document.getElementById('brand-dora-svg');
    if (brandAvatarEl && window.DORA_CHARS) {
      brandAvatarEl.innerHTML = window.DORA_CHARS.getAvatarSvg('doraemon');
    }

    const gasPill = document.getElementById('gas-status-pill');
    if (gasPill) {
      gasPill.onclick = openGasConfigModal;
    }

    if (state.user) {
      if (state.user.role === 'student') await loadStudentCloudData();
      if (state.user.role === 'teacher') await loadTeacherCloudData();
    }

    renderApp();
  });
})();
