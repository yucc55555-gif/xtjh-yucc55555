/**
 * 國中七上數學第二章金庸武俠 RPG 線上測驗 - 前端核心控制器
 */

// 應用程式全域狀態
const appState = {
  role: 'guest', // 'guest', 'student', 'teacher'
  currentView: 'view-home',
  student: null, // { classId, seatNum, name, level, exp, sect }
  teacher: null, // { teacherId, name, classes: [] }
  activeQuiz: null, // 進行中測驗狀態
  activeMistakeQuiz: null, // 進行中錯題重練狀態
  selectedTeacherClass: '', // 教師目前檢視的班級
  currentFullExam: null // 正在檢視的完整考卷
};

// DOM 載入後初始化
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  checkCachedLogin();
  updateGasStatusIndicator();
});

// 檢查快取登入
function checkCachedLogin() {
  const cachedStudent = localStorage.getItem('WUXIA_ACTIVE_STUDENT');
  const cachedTeacher = localStorage.getItem('WUXIA_ACTIVE_TEACHER');

  if (cachedStudent) {
    try {
      appState.student = JSON.parse(cachedStudent);
      appState.role = 'student';
      showView('view-student-map');
      renderStudentHeader();
      renderStageMap();
      return;
    } catch (e) {}
  }

  if (cachedTeacher) {
    try {
      appState.teacher = JSON.parse(cachedTeacher);
      appState.role = 'teacher';
      showView('view-teacher-dashboard');
      initTeacherDashboard();
      return;
    } catch (e) {}
  }

  showView('view-home');
}

// 畫面切換
function showView(viewId) {
  const views = [
    'view-home',
    'view-student-map',
    'view-battle',
    'view-student-history',
    'view-student-mistakes',
    'view-teacher-dashboard'
  ];

  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === viewId) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });

  appState.currentView = viewId;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // 重新渲染當前畫面上的數學公式
  setTimeout(renderMath, 100);
}

// KaTeX 公式排版渲染
function renderMath() {
  if (window.renderMathInElement) {
    window.renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\(', right: '\\)', display: false },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }
}

// 監聽按鈕事件
function initEventListeners() {
  // 學生登入
  const studentForm = document.getElementById('student-login-form');
  if (studentForm) {
    studentForm.addEventListener('submit', handleStudentLogin);
  }

  // 自動填充學生班級下拉選單 (701~730 共30班)
  const studentClassSelect = document.getElementById('student-class');
  if (studentClassSelect) {
    let optionsHtml = '<option value="">請選擇班級 (701~730)</option>';
    for (let i = 1; i <= 30; i++) {
      const c = `7${String(i).padStart(2, '0')}`;
      optionsHtml += `<option value="${c}">${c} 班</option>`;
    }
    studentClassSelect.innerHTML = optionsHtml;
  }

  // 教師登入
  const teacherForm = document.getElementById('teacher-login-form');
  if (teacherForm) {
    teacherForm.addEventListener('submit', handleTeacherLogin);
  }

  // 教師註冊表單
  const teacherRegForm = document.getElementById('teacher-reg-form');
  if (teacherRegForm) {
    teacherRegForm.addEventListener('submit', handleTeacherRegister);
  }

  // 音效開關切換
  const audioToggleBtn = document.getElementById('audio-toggle-btn');
  if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', () => {
      window.wuxiaAudio.muted = !window.wuxiaAudio.muted;
      audioToggleBtn.innerHTML = window.wuxiaAudio.muted 
        ? '<i class="fa-solid fa-volume-xmark"></i> 靜音' 
        : '<i class="fa-solid fa-volume-high"></i> 音效開';
    });
  }

  // GAS 設定按鈕
  const gasSettingBtn = document.getElementById('gas-setting-btn');
  if (gasSettingBtn) {
    gasSettingBtn.addEventListener('click', openGasModal);
  }
}

// 更新頂部 GAS 狀態燈號
function updateGasStatusIndicator() {
  const badge = document.getElementById('gas-status-badge');
  if (!badge) return;

  if (window.apiService.isGasConfigured()) {
    badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-900 text-green-200 border border-green-500 cursor-pointer';
    badge.innerHTML = '<i class="fa-solid fa-cloud"></i> Google 試算表已連線';
  } else {
    badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-900 text-yellow-200 border border-yellow-600 cursor-pointer';
    badge.innerHTML = '<i class="fa-solid fa-hard-drive"></i> 本機離線模式 (點擊串接試算表)';
  }
}

// ==========================================
// 學生端功能
// ==========================================

// 處理學生登入
async function handleStudentLogin(e) {
  e.preventDefault();
  const classId = document.getElementById('student-class').value.trim();
  const seatNum = document.getElementById('student-seat').value.trim();
  const name = document.getElementById('student-name').value.trim();
  const sect = document.getElementById('student-sect').value;

  if (!classId || !seatNum) {
    alert('請填寫班級與座號！');
    return;
  }

  const res = await window.apiService.request('loginStudent', { classId, seatNum, name, sect });
  if (res.success && res.student) {
    appState.student = res.student;
    appState.role = 'student';
    localStorage.setItem('WUXIA_ACTIVE_STUDENT', JSON.stringify(res.student));
    showView('view-student-map');
    renderStudentHeader();
    renderStageMap();
  } else {
    alert(res.error || '登入失敗，請稍後再試！');
  }
}

// 學生頂部狀態卡
function renderStudentHeader() {
  const container = document.getElementById('student-user-card');
  if (!container || !appState.student) return;

  const s = appState.student;
  const title = window.getHeroTitle(s.level || 1);
  const expProgress = (s.exp || 0) % 100;

  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-4 p-4 bg-gradient-to-r from-red-950 via-stone-900 to-amber-950 rounded-xl border border-amber-600 text-white shadow-xl">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-full bg-amber-500 text-stone-900 flex items-center justify-center text-3xl font-bold border-2 border-amber-200 shadow-md">
          🥋
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xl font-bold text-amber-300">${s.name}</span>
            <span class="text-xs px-2 py-0.5 rounded bg-amber-900/80 text-amber-200 border border-amber-500">${s.classId}班 ${s.seatNum}號</span>
            <span class="text-xs px-2 py-0.5 rounded bg-red-900 text-red-200">${s.sect || '武當派'}</span>
          </div>
          <div class="text-sm text-stone-300 mt-1">
            稱號：<span class="text-amber-400 font-bold">${title}</span>
            <span class="ml-3 text-xs text-stone-400">等級：Lv.${s.level || 1} (EXP: ${s.exp || 0})</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button onclick="showView('view-student-map')" class="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-200 text-sm border border-stone-600">
          <i class="fa-solid fa-map"></i> 歷練地圖
        </button>
        <button onclick="openStudentHistory()" class="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-200 text-sm border border-stone-600">
          <i class="fa-solid fa-scroll"></i> 歷史戰績
        </button>
        <button onclick="openStudentMistakes()" class="px-3 py-1.5 rounded bg-red-900 hover:bg-red-800 text-amber-100 text-sm border border-red-600">
          <i class="fa-solid fa-book-skull"></i> 錯題複習
        </button>
        <button onclick="logout()" class="px-3 py-1.5 rounded bg-stone-900 hover:bg-black text-stone-400 hover:text-white text-sm border border-stone-700">
          <i class="fa-solid fa-right-from-bracket"></i> 登出
        </button>
      </div>
    </div>
  `;
}

// 渲染金庸年代五大關卡地圖
async function renderStageMap() {
  const container = document.getElementById('stage-map-container');
  if (!container) return;

  // 取得學生歷史測驗以顯示各關最高分
  let history = [];
  if (appState.student) {
    const res = await window.apiService.request('getStudentHistory', {
      classId: appState.student.classId,
      seatNum: appState.student.seatNum
    });
    if (res.success) history = res.history || [];
  }

  // 各章節最高分統計
  const stageStats = {};
  history.forEach(rec => {
    if (!stageStats[rec.chapterId] || rec.score > stageStats[rec.chapterId]) {
      stageStats[rec.chapterId] = rec.score;
    }
  });

  container.innerHTML = window.QUIZ_CHAPTERS.map((ch, idx) => {
    const highestScore = stageStats[ch.id];
    const isCompleted = highestScore !== undefined;
    let stars = '☆☆☆';
    if (isCompleted) {
      if (highestScore >= 90) stars = '⭐⭐⭐';
      else if (highestScore >= 70) stars = '⭐⭐☆';
      else stars = '⭐☆☆';
    }

    return `
      <div class="stage-card bg-stone-900/90 rounded-2xl p-6 border-2 border-amber-600/70 text-white relative overflow-hidden flex flex-col justify-between shadow-xl">
        <div class="absolute -right-6 -bottom-6 text-8xl opacity-10 pointer-events-none">
          ${ch.boss.avatar}
        </div>
        
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-600/30 text-amber-300 border border-amber-500">
              ${ch.code}
            </span>
            <span class="text-xs text-stone-400 font-serif">
              ${ch.novel}
            </span>
          </div>

          <h3 class="text-xl font-bold text-amber-200 mt-1">${ch.eraName}</h3>
          <p class="text-sm font-semibold text-stone-300">${ch.title}</p>
          <p class="text-xs text-stone-400 mt-2 line-clamp-2">${ch.eraDesc}</p>

          <div class="mt-4 p-3 rounded-lg bg-stone-950/70 border border-stone-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-2xl">${ch.boss.avatar}</span>
              <div>
                <div class="text-xs text-stone-400">鎮關強敵</div>
                <div class="text-sm font-bold text-red-300">${ch.boss.name}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs text-stone-400">最高得分</div>
              <div class="text-sm font-bold ${highestScore >= 60 ? 'text-green-400' : 'text-stone-400'}">
                ${isCompleted ? `${highestScore} 分` : '尚未修煉'}
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-between pt-4 border-t border-stone-800">
          <div class="text-amber-400 text-sm tracking-widest">${stars}</div>
          <button onclick="startQuiz('${ch.id}')" class="btn-wuxia px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
            <i class="fa-solid fa-khanda"></i> 進入試煉
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// 戰鬥測驗核心邏輯 (及時逐步解析)
// ==========================================

// 開始測驗
function startQuiz(chapterId) {
  const chapter = window.QUIZ_CHAPTERS.find(c => c.id === chapterId);
  if (!chapter) return;

  appState.activeQuiz = {
    chapter: chapter,
    questions: chapter.questions,
    currentIdx: 0,
    answers: [],
    playerHp: 100,
    bossHp: 100,
    startTime: Date.now(),
    score: 0
  };

  showView('view-battle');
  renderBattleScreen();
}

// 渲染戰鬥畫面
function renderBattleScreen() {
  const qState = appState.activeQuiz;
  if (!qState) return;

  const currentQ = qState.questions[qState.currentIdx];
  const ch = qState.chapter;

  // 頂部血條與人物對峙
  const arenaEl = document.getElementById('battle-arena-container');
  if (arenaEl) {
    arenaEl.innerHTML = `
      <div class="bg-scroll p-6 rounded-2xl shadow-2xl mb-6">
        <div class="flex items-center justify-between text-xs text-stone-700 mb-2 font-bold">
          <span>${ch.eraName} · ${ch.title}</span>
          <span>第 ${qState.currentIdx + 1} / ${qState.questions.length} 題</span>
        </div>

        <!-- 敵我對決雙方資訊 -->
        <div class="grid grid-cols-2 gap-4 items-center">
          <!-- 玩家方 -->
          <div class="p-3 bg-stone-900/10 rounded-xl border border-stone-400/50 flex items-center gap-3">
            <div id="player-avatar" class="text-4xl">🥋</div>
            <div class="flex-1">
              <div class="flex items-center justify-between text-xs font-bold text-stone-800 mb-1">
                <span>少俠 (你)</span>
                <span id="player-hp-text">${qState.playerHp} / 100 HP</span>
              </div>
              <div class="w-full bg-stone-300 rounded-full h-3 overflow-hidden border border-stone-400">
                <div id="player-hp-bar" class="hp-bar-fill bg-green-600 h-full rounded-full" style="width: ${qState.playerHp}%;"></div>
              </div>
            </div>
          </div>

          <!-- BOSS方 -->
          <div class="p-3 bg-red-950/10 rounded-xl border border-red-900/30 flex items-center gap-3">
            <div class="flex-1 text-right">
              <div class="flex items-center justify-between text-xs font-bold text-red-950 mb-1">
                <span id="boss-hp-text">${qState.bossHp} / 100 HP</span>
                <span>${ch.boss.name}</span>
              </div>
              <div class="w-full bg-stone-300 rounded-full h-3 overflow-hidden border border-stone-400">
                <div id="boss-hp-bar" class="hp-bar-fill bg-red-600 h-full rounded-full" style="width: ${qState.bossHp}%;"></div>
              </div>
            </div>
            <div id="boss-avatar" class="text-4xl">${ch.boss.avatar}</div>
          </div>
        </div>

        <div class="text-center mt-3 text-xs italic text-stone-600">
          ${ch.boss.dialogue}
        </div>
      </div>

      <!-- 題目主卡片 -->
      <div id="question-card" class="bg-stone-900 text-white p-8 rounded-2xl border-2 border-amber-600/80 shadow-2xl relative">
        <div class="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
          <span class="text-amber-400 font-bold text-lg">第 ${qState.currentIdx + 1} 題：${currentQ.title}</span>
          <span class="text-xs px-2.5 py-1 rounded bg-stone-800 text-stone-400">${currentQ.source}</span>
        </div>

        <div class="text-lg leading-relaxed text-stone-100 my-4">
          ${currentQ.question}
        </div>

        <!-- 選項列表 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6" id="quiz-options-container">
          ${currentQ.options.map(opt => {
            const optLetter = opt.charAt(0);
            return `
              <button onclick="selectOption('${optLetter}')" id="opt-btn-${optLetter}" class="quiz-opt-btn p-4 rounded-xl text-left font-serif transition-all bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center gap-3">
                <span class="w-7 h-7 rounded-full bg-stone-900 text-amber-300 font-bold flex items-center justify-center text-sm border border-stone-700">
                  ${optLetter}
                </span>
                <span class="flex-1">${opt.substring(2).trim()}</span>
              </button>
            `;
          }).join('')}
        </div>

        <div class="mt-8 flex justify-end">
          <button id="submit-answer-btn" onclick="submitCurrentAnswer()" disabled class="btn-wuxia-gold px-8 py-3 rounded-xl text-base font-bold opacity-50 cursor-not-allowed">
            <i class="fa-solid fa-dragon"></i> 出招判定！
          </button>
        </div>
      </div>
    `;
  }

  renderMath();
}

let selectedOptionLetter = null;

// 學生點擊選項
function selectOption(letter) {
  selectedOptionLetter = letter;
  ['A', 'B', 'C', 'D'].forEach(l => {
    const btn = document.getElementById(`opt-btn-${l}`);
    if (btn) {
      if (l === letter) {
        btn.classList.add('border-amber-400', 'bg-amber-950/70', 'ring-2', 'ring-amber-400');
        btn.classList.remove('bg-stone-800');
      } else {
        btn.classList.remove('border-amber-400', 'bg-amber-950/70', 'ring-2', 'ring-amber-400');
        btn.classList.add('bg-stone-800');
      }
    }
  });

  const submitBtn = document.getElementById('submit-answer-btn');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}

// 提交當前題目回答 (及時逐步解析與戰鬥特效)
function submitCurrentAnswer() {
  if (!selectedOptionLetter || !appState.activeQuiz) return;

  const qState = appState.activeQuiz;
  const currentQ = qState.questions[qState.currentIdx];
  const isCorrect = selectedOptionLetter === currentQ.answer;

  // 禁用選項與按鈕防止重複點擊
  document.querySelectorAll('.quiz-opt-btn').forEach(b => b.disabled = true);
  const submitBtn = document.getElementById('submit-answer-btn');
  if (submitBtn) submitBtn.disabled = true;

  // 記錄作答
  qState.answers.push({
    questionId: currentQ.id,
    title: currentQ.title,
    questionText: currentQ.question,
    studentAnswer: selectedOptionLetter,
    correctAnswer: currentQ.answer,
    isCorrect: isCorrect,
    score: isCorrect ? currentQ.score : 0,
    source: currentQ.source,
    explanation: currentQ.explanation
  });

  // 戰鬥扣血與音效
  const playerAvatar = document.getElementById('player-avatar');
  const bossAvatar = document.getElementById('boss-avatar');
  const damagePerQuestion = Math.ceil(100 / qState.questions.length);

  if (isCorrect) {
    // 答對：擊中 Boss
    window.wuxiaAudio.playSwordSlash();
    setTimeout(() => window.wuxiaAudio.playHit(), 100);

    qState.score += currentQ.score;
    qState.bossHp = Math.max(0, qState.bossHp - damagePerQuestion);

    if (playerAvatar) playerAvatar.classList.add('attack-player');
    if (bossAvatar) {
      setTimeout(() => {
        bossAvatar.classList.add('shake', 'hit-flash');
      }, 150);
    }
  } else {
    // 答錯：主角受擊
    setTimeout(() => window.wuxiaAudio.playHurt(), 150);
    qState.playerHp = Math.max(0, qState.playerHp - 20); // 答錯扣 20 HP

    if (bossAvatar) bossAvatar.classList.add('attack-boss');
    if (playerAvatar) {
      setTimeout(() => {
        playerAvatar.classList.add('shake', 'hit-flash');
      }, 150);
    }
  }

  // 更新血條 UI
  updateHpBars();

  // 彈出及時逐步解析回饋彈窗
  setTimeout(() => {
    openStepExplanationModal(currentQ, isCorrect, selectedOptionLetter);
  }, 450);
}

// 更新血條寬度
function updateHpBars() {
  const qState = appState.activeQuiz;
  if (!qState) return;

  const playerBar = document.getElementById('player-hp-bar');
  const playerText = document.getElementById('player-hp-text');
  const bossBar = document.getElementById('boss-hp-bar');
  const bossText = document.getElementById('boss-hp-text');

  if (playerBar && playerText) {
    playerBar.style.width = `${qState.playerHp}%`;
    playerText.innerText = `${qState.playerHp} / 100 HP`;
    if (qState.playerHp <= 30) playerBar.className = 'hp-bar-fill bg-red-600 h-full rounded-full';
  }

  if (bossBar && bossText) {
    bossBar.style.width = `${qState.bossHp}%`;
    bossText.innerText = `${qState.bossHp} / 100 HP`;
  }
}

// 彈出【及時逐步解析回饋】彈窗
function openStepExplanationModal(question, isCorrect, studentAnswer) {
  const modal = document.getElementById('explanation-modal');
  const container = document.getElementById('explanation-content');
  if (!modal || !container) return;

  const exp = question.explanation;

  container.innerHTML = `
    <div class="p-6">
      <!-- 戰鬥判定橫幅 -->
      <div class="p-4 rounded-xl mb-6 flex items-center justify-between ${isCorrect ? 'bg-green-950/80 border border-green-500 text-green-200' : 'bg-red-950/80 border border-red-500 text-red-200'}">
        <div class="flex items-center gap-3">
          <span class="text-3xl">${isCorrect ? '⚔️' : '💥'}</span>
          <div>
            <div class="text-lg font-bold">${isCorrect ? '招式命中！得心應手！' : '招式受挫！遭到反制！'}</div>
            <div class="text-xs opacity-90">你的出招：選項 ${studentAnswer} ｜ 正確招式：選項 ${question.answer}</div>
          </div>
        </div>
        <div class="text-xl font-bold font-mono">
          ${isCorrect ? '+10 分' : '+0 分'}
        </div>
      </div>

      <!-- 核心題意 -->
      <div class="text-sm text-stone-300 pb-3 mb-4 border-b border-stone-700">
        <span class="font-bold text-amber-400">題目：</span>${question.question}
      </div>

      <!-- 觀念金鑰 -->
      <div class="bg-amber-950/40 border-l-4 border-amber-500 p-3 rounded-r-lg mb-4 text-sm text-amber-100">
        <div class="font-bold text-amber-300 flex items-center gap-2 mb-1">
          <i class="fa-solid fa-key"></i> 觀念金鑰：
        </div>
        ${exp.concept}
      </div>

      <!-- 逐步解析步驟 -->
      <div class="space-y-2 mb-4">
        <div class="text-sm font-bold text-stone-200 flex items-center gap-2">
          <i class="fa-solid fa-list-check text-amber-400"></i> 逐步解析推導：
        </div>
        ${exp.steps.map(step => `
          <div class="bg-stone-800/80 p-3 rounded-lg text-sm text-stone-200 font-serif leading-relaxed">
            ${step}
          </div>
        `).join('')}
      </div>

      <!-- 易錯陷阱 -->
      ${exp.pitfall ? `
        <div class="bg-red-950/30 border-l-4 border-red-500 p-3 rounded-r-lg mb-4 text-xs text-red-200">
          <span class="font-bold text-red-400"><i class="fa-solid fa-triangle-exclamation"></i> 易錯陷阱提點：</span>
          ${exp.pitfall}
        </div>
      ` : ''}

      <!-- 秘笈總結 -->
      <div class="p-3 bg-stone-800 rounded-lg text-sm text-amber-300 font-bold flex items-center justify-between">
        <span><i class="fa-solid fa-scroll"></i> 秘笈結論：</span>
        <span>${exp.summary}</span>
      </div>

      <!-- 下一步按鈕 -->
      <div class="mt-6 flex justify-end">
        <button onclick="closeExplanationAndNext()" class="btn-wuxia px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2">
          領會心法，下一回合 ➔
        </button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  renderMath();
}

// 關閉解析並進入下一題或結算
async function closeExplanationAndNext() {
  const modal = document.getElementById('explanation-modal');
  if (modal) modal.classList.add('hidden');

  selectedOptionLetter = null;
  const qState = appState.activeQuiz;
  if (!qState) return;

  qState.currentIdx++;

  // 判斷是否所有題目答完或主角陣亡
  if (qState.currentIdx >= qState.questions.length || qState.playerHp <= 0) {
    await finishQuiz();
  } else {
    renderBattleScreen();
  }
}

// 測驗完成與結算
async function finishQuiz() {
  const qState = appState.activeQuiz;
  if (!qState || !appState.student) return;

  const timeSpent = Math.round((Date.now() - qState.startTime) / 1000);
  const totalScore = qState.questions.length * 10;
  const isVictory = qState.score >= (totalScore * 0.6);

  if (isVictory) {
    window.wuxiaAudio.playVictory();
  } else {
    window.wuxiaAudio.playDefeat();
  }

  // 提交至後端 GAS
  const submitData = {
    classId: appState.student.classId,
    seatNum: appState.student.seatNum,
    studentName: appState.student.name,
    chapterId: qState.chapter.id,
    chapterTitle: qState.chapter.title,
    eraName: qState.chapter.eraName,
    score: qState.score,
    totalScore: totalScore,
    timeSpentSeconds: timeSpent,
    answers: qState.answers
  };

  const res = await window.apiService.request('submitQuiz', submitData);

  // 結算畫面
  const arenaEl = document.getElementById('battle-arena-container');
  if (arenaEl) {
    arenaEl.innerHTML = `
      <div class="bg-scroll p-8 rounded-3xl max-w-2xl mx-auto shadow-2xl text-center">
        <div class="text-6xl mb-3">
          ${isVictory ? '🏆' : '⚔️'}
        </div>
        <h2 class="text-3xl font-black ${isVictory ? 'text-amber-800' : 'text-stone-800'} font-serif mb-2">
          ${isVictory ? '試煉大捷！通關成功！' : '力戰竭力！再接再厲！'}
        </h2>
        <p class="text-sm text-stone-600 mb-6">
          ${qState.chapter.eraName} · ${qState.chapter.title}
        </p>

        <div class="grid grid-cols-3 gap-4 my-6 p-4 bg-stone-900/10 rounded-2xl border border-stone-400">
          <div>
            <div class="text-xs text-stone-600 font-bold">測驗總分</div>
            <div class="text-3xl font-black text-amber-700">${qState.score} / ${totalScore}</div>
          </div>
          <div>
            <div class="text-xs text-stone-600 font-bold">正確率</div>
            <div class="text-3xl font-black text-stone-800">
              ${Math.round((qState.score / totalScore) * 100)}%
            </div>
          </div>
          <div>
            <div class="text-xs text-stone-600 font-bold">修煉歷時</div>
            <div class="text-3xl font-black text-stone-800">${timeSpent} 秒</div>
          </div>
        </div>

        <div class="p-3 bg-amber-100 rounded-xl border border-amber-300 text-amber-900 text-sm mb-8 font-bold">
          獲得修煉武學經驗：+${res.gainedExp || (qState.score * 5 + 20)} EXP！
          ${window.apiService.isGasConfigured() ? '成績已自動同步至 Google 試算表！' : '成績已儲存至本機資料庫！'}
        </div>

        <div class="flex flex-wrap justify-center gap-4">
          <button onclick="showView('view-student-map'); renderStageMap();" class="btn-wuxia px-6 py-3 rounded-xl font-bold text-sm">
            <i class="fa-solid fa-map"></i> 返回地圖
          </button>
          <button onclick="viewSubmittedExamDirectly()" class="btn-wuxia-gold px-6 py-3 rounded-xl font-bold text-sm">
            <i class="fa-solid fa-file-lines"></i> 查看本卷完整作答
          </button>
          <button onclick="openStudentMistakes()" class="px-6 py-3 rounded-xl font-bold text-sm bg-red-900 hover:bg-red-800 text-white border border-red-600 shadow-md">
            <i class="fa-solid fa-book-skull"></i> 前往錯題本複習
          </button>
        </div>
      </div>
    `;
  }
}

// 測驗完立即檢視該次完整卷
function viewSubmittedExamDirectly() {
  const qState = appState.activeQuiz;
  if (!qState) return;

  openFullExamModal({
    chapterTitle: qState.chapter.title,
    eraName: qState.chapter.eraName,
    timestamp: new Date().toLocaleString(),
    score: qState.score,
    totalScore: qState.questions.length * 10,
    answersJson: JSON.stringify(qState.answers)
  });
}

// ==========================================
// 歷史成績與完整考卷檢視
// ==========================================

// 打開學生歷史戰績
async function openStudentHistory() {
  if (!appState.student) return;
  showView('view-student-history');

  const container = document.getElementById('history-records-list');
  if (!container) return;

  container.innerHTML = `<div class="p-8 text-center text-stone-400">載入歷史紀錄中...</div>`;

  const res = await window.apiService.request('getStudentHistory', {
    classId: appState.student.classId,
    seatNum: appState.student.seatNum
  });

  const history = res.history || [];
  if (history.length === 0) {
    container.innerHTML = `
      <div class="p-12 text-center text-stone-400 bg-stone-900 rounded-2xl border border-stone-800">
        <i class="fa-solid fa-scroll text-5xl mb-4 text-stone-600"></i>
        <div class="text-lg font-bold">尚無測驗紀錄</div>
        <p class="text-sm mt-1">快去地圖挑戰金庸時代試煉吧！</p>
      </div>
    `;
    return;
  }

  container.innerHTML = history.map((rec, idx) => `
    <div class="p-6 rounded-2xl bg-stone-900 border border-stone-800 hover:border-amber-600/60 transition-all flex flex-wrap items-center justify-between gap-4 shadow-md">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">${rec.eraName}</span>
          <span class="text-xs text-stone-400">${rec.timestamp}</span>
        </div>
        <h4 class="text-xl font-bold text-white mt-1">${rec.chapterTitle}</h4>
        <div class="text-xs text-stone-400 mt-1">耗時：${rec.timeSpentSeconds || '--'} 秒 ｜ 正確率：${rec.accuracy}%</div>
      </div>

      <div class="flex items-center gap-6">
        <div class="text-right">
          <div class="text-xs text-stone-400">獲得分數</div>
          <div class="text-2xl font-black ${rec.score >= 60 ? 'text-amber-400' : 'text-red-400'}">${rec.score} / ${rec.totalScore}</div>
        </div>

        <button onclick="inspectHistoryExam(${idx})" class="btn-wuxia px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
          <i class="fa-solid fa-eye"></i> 檢視完整卷
        </button>
      </div>
    </div>
  `).join('');

  // 將資料暫存以備點擊
  window.lastLoadedHistory = history;
}

// 點擊檢視特定一筆歷史考卷
function inspectHistoryExam(index) {
  if (window.lastLoadedHistory && window.lastLoadedHistory[index]) {
    openFullExamModal(window.lastLoadedHistory[index]);
  }
}

// 展開【完整考卷檢視】模態視窗 (含學生作答、正確解答與逐題解析)
function openFullExamModal(examRecord) {
  const modal = document.getElementById('full-exam-modal');
  const container = document.getElementById('full-exam-content');
  if (!modal || !container) return;

  let answers = [];
  try {
    answers = typeof examRecord.answersJson === 'string' 
      ? JSON.parse(examRecord.answersJson || '[]') 
      : examRecord.answersJson;
  } catch (e) {
    answers = [];
  }

  container.innerHTML = `
    <div class="p-6">
      <!-- 考卷標題表頭 -->
      <div class="p-4 bg-stone-900 rounded-xl border border-stone-700 text-white flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <span class="text-xs text-amber-400 font-bold">${examRecord.eraName}</span>
          <h3 class="text-2xl font-bold">${examRecord.chapterTitle} 完整作答卷</h3>
          <div class="text-xs text-stone-400 mt-1">測驗時間：${examRecord.timestamp}</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-stone-400">考卷實得總分</div>
          <div class="text-3xl font-black text-amber-400">${examRecord.score} / ${examRecord.totalScore}</div>
        </div>
      </div>

      <!-- 題目逐題清單 -->
      <div class="space-y-6">
        ${answers.map((ans, idx) => `
          <div class="p-5 rounded-xl border-2 ${ans.isCorrect ? 'border-green-600/40 bg-stone-900/60' : 'border-red-600/40 bg-red-950/20'}">
            <div class="flex items-center justify-between pb-2 border-b border-stone-800 mb-3">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${ans.isCorrect ? 'bg-green-700 text-white' : 'bg-red-700 text-white'}">
                  ${idx + 1}
                </span>
                <span class="font-bold text-white text-base">${ans.title || `第 ${idx + 1} 題`}</span>
              </div>
              <span class="text-xs font-bold ${ans.isCorrect ? 'text-green-400' : 'text-red-400'}">
                ${ans.isCorrect ? '✓ 答對 (+10分)' : '✗ 答錯 (+0分)'}
              </span>
            </div>

            <!-- 題目內容 -->
            <div class="text-stone-200 text-sm mb-3">
              ${ans.questionText || ''}
            </div>

            <!-- 學生答案與正確答案對照 -->
            <div class="grid grid-cols-2 gap-3 p-3 rounded-lg bg-stone-950 text-xs mb-3 font-mono">
              <div class="${ans.isCorrect ? 'text-green-400' : 'text-red-400'} font-bold">
                學生作答：選項 ${ans.studentAnswer || '--'}
              </div>
              <div class="text-amber-300 font-bold">
                標準解答：選項 ${ans.correctAnswer || '--'}
              </div>
            </div>

            <!-- 逐題解析與觀念展開 -->
            ${ans.explanation ? `
              <div class="mt-3 p-3 rounded bg-stone-800/80 text-xs text-stone-300 space-y-1.5 border-l-2 border-amber-500">
                <div class="font-bold text-amber-300">💡 觀念：${ans.explanation.concept || ''}</div>
                ${(ans.explanation.steps || []).map(s => `<div>${s}</div>`).join('')}
                ${ans.explanation.pitfall ? `<div class="text-red-300">⚠️ 易錯提醒：${ans.explanation.pitfall}</div>` : ''}
                <div class="text-amber-400 font-semibold">🌟 結論：${ans.explanation.summary || ''}</div>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>

      <div class="mt-6 text-center">
        <button onclick="closeFullExamModal()" class="btn-wuxia px-8 py-2.5 rounded-xl text-sm font-bold">
          關閉完整考卷
        </button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  renderMath();
}

function closeFullExamModal() {
  const modal = document.getElementById('full-exam-modal');
  if (modal) modal.classList.add('hidden');
}

// ==========================================
// 錯題複習庫 (錯題本)
// ==========================================

// 打開錯題複習清單
async function openStudentMistakes() {
  if (!appState.student) return;
  showView('view-student-mistakes');

  const container = document.getElementById('mistakes-records-list');
  if (!container) return;

  container.innerHTML = `<div class="p-8 text-center text-stone-400">載入錯題庫中...</div>`;

  const res = await window.apiService.request('getStudentMistakes', {
    classId: appState.student.classId,
    seatNum: appState.student.seatNum
  });

  const mistakes = res.mistakes || [];
  if (mistakes.length === 0) {
    container.innerHTML = `
      <div class="p-12 text-center text-stone-400 bg-stone-900 rounded-2xl border border-stone-800">
        <div class="text-5xl mb-4 text-green-500">🎉</div>
        <div class="text-lg font-bold text-white">太厲害了！目前沒有任何未克服的錯題！</div>
        <p class="text-sm mt-1">功力純熟，繼續保持！</p>
      </div>
    `;
    const reTestBtn = document.getElementById('retest-mistakes-btn');
    if (reTestBtn) reTestBtn.classList.add('hidden');
    return;
  }

  const reTestBtn = document.getElementById('retest-mistakes-btn');
  if (reTestBtn) reTestBtn.classList.remove('hidden');

  container.innerHTML = mistakes.map((m, idx) => `
    <div class="p-5 rounded-2xl bg-stone-900 border border-red-900/60 flex flex-wrap items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-xs px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">待克服錯題</span>
          <span class="text-xs text-stone-400">${m.timestamp}</span>
        </div>
        <h4 class="text-base font-bold text-white mt-1">${m.questionTitle}</h4>
        <div class="text-xs text-stone-400 mt-1 font-mono">
          曾選錯誤答案：<span class="text-red-400 font-bold">${m.wrongAnswer}</span> ｜ 
          正確答案：<span class="text-green-400 font-bold">${m.correctAnswer}</span>
        </div>
      </div>

      <button onclick="rechallengeSingleMistake('${m.questionId}')" class="btn-wuxia-gold px-4 py-2 rounded-xl text-xs font-bold">
        <i class="fa-solid fa-rotate-right"></i> 立即重練此題
      </button>
    </div>
  `).join('');

  window.currentStudentMistakes = mistakes;
}

// 單題重新挑戰錯題
function rechallengeSingleMistake(questionId) {
  // 在所有章節題庫中尋找該題目
  let foundQ = null;
  let foundCh = null;
  for (const ch of window.QUIZ_CHAPTERS) {
    const q = ch.questions.find(item => item.id === questionId);
    if (q) {
      foundQ = q;
      foundCh = ch;
      break;
    }
  }

  if (!foundQ || !foundCh) {
    alert('找不到該題目資料！');
    return;
  }

  appState.activeQuiz = {
    chapter: foundCh,
    questions: [foundQ],
    currentIdx: 0,
    answers: [],
    playerHp: 100,
    bossHp: 100,
    startTime: Date.now(),
    score: 0,
    isMistakeRechallenge: true
  };

  showView('view-battle');
  renderBattleScreen();
}

// 批量重練所有錯題
function startRetestAllMistakes() {
  if (!window.currentStudentMistakes || window.currentStudentMistakes.length === 0) return;

  const qList = [];
  window.currentStudentMistakes.forEach(m => {
    for (const ch of window.QUIZ_CHAPTERS) {
      const q = ch.questions.find(item => item.id === m.questionId);
      if (q && !qList.some(exist => exist.id === q.id)) {
        qList.push(q);
      }
    }
  });

  if (qList.length === 0) return;

  appState.activeQuiz = {
    chapter: {
      id: 'mistake_practice',
      title: '錯題精修總突破',
      eraName: '【思過崖·破招解惑】',
      boss: {
        name: '自身心魔幻影',
        avatar: '🪞',
        dialogue: '「擊碎過往之迷思，方能領悟武道真諦！」'
      }
    },
    questions: qList,
    currentIdx: 0,
    answers: [],
    playerHp: 100,
    bossHp: 100,
    startTime: Date.now(),
    score: 0,
    isMistakeRechallenge: true
  };

  showView('view-battle');
  renderBattleScreen();
}

// ==========================================
// 教師端功能 (註冊選班、查詢學生成績、易錯題診斷)
// ==========================================

// 教師登入
async function handleTeacherLogin(e) {
  e.preventDefault();
  const teacherId = document.getElementById('teacher-id').value.trim();
  const password = document.getElementById('teacher-pwd').value.trim();

  if (!teacherId || !password) {
    alert('請填寫教師代號與密碼！');
    return;
  }

  const res = await window.apiService.request('loginTeacher', { teacherId, password });
  if (res.success && res.teacher) {
    appState.teacher = res.teacher;
    appState.role = 'teacher';
    localStorage.setItem('WUXIA_ACTIVE_TEACHER', JSON.stringify(res.teacher));
    showView('view-teacher-dashboard');
    initTeacherDashboard();
  } else {
    alert(res.error || '登入失敗，請確認帳號密碼！');
  }
}

// 開啟教師首次註冊彈窗
function openTeacherRegisterModal() {
  const modal = document.getElementById('teacher-reg-modal');
  if (!modal) return;

  // 渲染可選班級多選框 (701~730 共 30 班)
  const classCheckboxContainer = document.getElementById('teacher-classes-checkboxes');
  if (classCheckboxContainer) {
    const classList = [];
    for (let i = 1; i <= 30; i++) {
      classList.push(`7${String(i).padStart(2, '0')}`);
    }
    classCheckboxContainer.innerHTML = classList.map(c => `
      <label class="flex items-center gap-1.5 p-2 rounded bg-stone-800 hover:bg-stone-700 cursor-pointer text-xs font-mono text-stone-200">
        <input type="checkbox" name="teacher_class" value="${c}" onchange="checkTeacherClassCount(this)" class="accent-amber-500 rounded">
        <span>${c} 班</span>
      </label>
    `).join('');
  }

  updateClassCountBadge();
  modal.classList.remove('hidden');
}

function closeTeacherRegisterModal() {
  const modal = document.getElementById('teacher-reg-modal');
  if (modal) modal.classList.add('hidden');
}

// 限制教師選班最多 5 班
function checkTeacherClassCount(checkbox) {
  const checked = document.querySelectorAll('input[name="teacher_class"]:checked');
  if (checked.length > 5) {
    checkbox.checked = false;
    alert('⚠️ 任教班級最多只能選擇 5 個班級！');
  }
  updateClassCountBadge();
}

function updateClassCountBadge() {
  const badge = document.getElementById('selected-class-count-badge');
  const checked = document.querySelectorAll('input[name="teacher_class"]:checked');
  if (badge) {
    badge.innerText = `已選擇 ${checked.length} / 5 班`;
    badge.className = checked.length > 0 ? 'text-amber-400 font-bold' : 'text-stone-400';
  }
}

// 執行教師註冊
async function handleTeacherRegister(e) {
  e.preventDefault();
  const teacherId = document.getElementById('reg-teacher-id').value.trim();
  const name = document.getElementById('reg-teacher-name').value.trim();
  const password = document.getElementById('reg-teacher-pwd').value.trim();

  const checkedBoxes = Array.from(document.querySelectorAll('input[name="teacher_class"]:checked'));
  const classes = checkedBoxes.map(b => b.value);

  if (!teacherId || !name || !password) {
    alert('請填妥所有必填欄位！');
    return;
  }
  if (classes.length === 0) {
    alert('請至少勾選一個任教班級！');
    return;
  }
  if (classes.length > 5) {
    alert('任教班級最多只能選擇 5 班！');
    return;
  }

  const res = await window.apiService.request('registerTeacher', {
    teacherId,
    name,
    password,
    classes
  });

  if (res.success && res.teacher) {
    alert('🎉 教師註冊成功！系統將為您自動登入。');
    closeTeacherRegisterModal();
    appState.teacher = res.teacher;
    appState.role = 'teacher';
    localStorage.setItem('WUXIA_ACTIVE_TEACHER', JSON.stringify(res.teacher));
    showView('view-teacher-dashboard');
    initTeacherDashboard();
  } else {
    alert(res.error || '註冊失敗！');
  }
}

// 初始化教師儀表板
function initTeacherDashboard() {
  if (!appState.teacher) return;

  const t = appState.teacher;
  const nameEl = document.getElementById('dashboard-teacher-name');
  if (nameEl) nameEl.innerText = `${t.name} 老師`;

  // 渲染任教班級下拉選單 (只顯示該老師任教的最多5班)
  const classSelect = document.getElementById('teacher-class-select');
  if (classSelect) {
    classSelect.innerHTML = t.classes.map(c => `
      <option value="${c}">${c} 班</option>
    `).join('');

    appState.selectedTeacherClass = t.classes[0] || '';
    classSelect.value = appState.selectedTeacherClass;
    classSelect.onchange = (e) => {
      appState.selectedTeacherClass = e.target.value;
      loadTeacherClassData();
    };
  }

  loadTeacherClassData();
}

// 載入所選班級的學生成績與作答診斷
async function loadTeacherClassData() {
  const classId = appState.selectedTeacherClass;
  if (!classId) return;

  const tableBody = document.getElementById('teacher-students-tbody');
  const errorRankingContainer = document.getElementById('teacher-error-ranking-container');

  if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-stone-400">載入班級成績數據中...</td></tr>`;

  const res = await window.apiService.request('getTeacherClassData', { classId });
  if (!res.success) {
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-400">載入失敗：${res.error}</td></tr>`;
    return;
  }

  const students = res.students || [];

  // 1. 班級概況統計卡
  const totalStudentsEl = document.getElementById('stat-total-students');
  const totalExamsEl = document.getElementById('stat-total-exams');
  const avgScoreEl = document.getElementById('stat-class-avg');

  let totalScoreSum = 0;
  let totalScoreCount = 0;
  students.forEach(s => {
    (s.records || []).forEach(r => {
      totalScoreSum += r.score;
      totalScoreCount++;
    });
  });

  if (totalStudentsEl) totalStudentsEl.innerText = `${students.length} 人`;
  if (totalExamsEl) totalExamsEl.innerText = `${res.totalRecords || 0} 卷`;
  if (avgScoreEl) avgScoreEl.innerText = totalScoreCount > 0 ? `${Math.round(totalScoreSum / totalScoreCount)} 分` : '--';

  // 2. 學生名冊表格
  if (tableBody) {
    if (students.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-stone-400">此班級尚無學生完成測驗登錄</td></tr>`;
    } else {
      tableBody.innerHTML = students.map(s => {
        const records = s.records || [];
        const avg = records.length > 0 
          ? Math.round(records.reduce((acc, r) => acc + r.score, 0) / records.length) 
          : '--';

        return `
          <tr class="border-b border-stone-800 hover:bg-stone-800/40 text-sm">
            <td class="p-4 font-mono font-bold text-amber-300">${s.seatNum} 號</td>
            <td class="p-4 font-bold text-white">${s.name}</td>
            <td class="p-4 text-stone-300">Lv.${s.level || 1} (${s.exp || 0} EXP)</td>
            <td class="p-4">
              <span class="px-2.5 py-1 rounded-full text-xs font-bold ${avg >= 60 ? 'bg-green-950 text-green-300 border border-green-800' : 'bg-stone-800 text-stone-400'}">
                ${avg !== '--' ? avg + ' 分' : '未作答'}
              </span>
            </td>
            <td class="p-4">
              <span class="text-xs ${s.mistakeCount > 0 ? 'text-red-400 font-bold' : 'text-stone-400'}">
                ${s.mistakeCount} 題
              </span>
            </td>
            <td class="p-4 text-right">
              <button onclick="inspectStudentRecords('${s.seatNum}')" class="btn-wuxia px-3 py-1.5 rounded-lg text-xs font-bold">
                <i class="fa-solid fa-file-waveform"></i> 查看作答詳情
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // 3. 班級易錯題排行榜 (迷思概念診斷)
  if (errorRankingContainer) {
    const ranking = res.errorRanking || [];
    if (ranking.length === 0) {
      errorRankingContainer.innerHTML = `<div class="p-6 text-center text-stone-400 text-sm">暫無足夠作答數據以生成易錯題統計</div>`;
    } else {
      errorRankingContainer.innerHTML = ranking.map((q, idx) => `
        <div class="p-4 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="w-6 h-6 rounded-full bg-red-950 text-red-300 font-bold flex items-center justify-center text-xs border border-red-800">
              #${idx + 1}
            </span>
            <div>
              <div class="text-sm font-bold text-white">${q.title}</div>
              <div class="text-xs text-stone-400">總作答 ${q.totalAttempts} 次 ｜ 答錯 ${q.wrongAttempts} 次</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-lg font-black text-red-400">${q.errorRate}%</div>
            <div class="text-[10px] text-stone-400">全班錯誤率</div>
          </div>
        </div>
      `).join('');
    }
  }

  window.currentClassStudents = students;
}

// 點擊學生查看其歷次測驗與作答詳情
function inspectStudentRecords(seatNum) {
  const student = (window.currentClassStudents || []).find(s => String(s.seatNum) === String(seatNum));
  if (!student) return;

  const modal = document.getElementById('student-detail-modal');
  const container = document.getElementById('student-detail-content');
  if (!modal || !container) return;

  const records = student.records || [];

  container.innerHTML = `
    <div class="p-6">
      <div class="flex items-center justify-between pb-4 border-b border-stone-700 mb-6">
        <div>
          <h3 class="text-xl font-bold text-white">${student.name} (${student.classId}班 ${student.seatNum}號)</h3>
          <p class="text-xs text-stone-400 mt-1">累積作答 ${records.length} 回 ｜ 未克服錯題：${student.mistakeCount} 題</p>
        </div>
        <button onclick="closeStudentDetailModal()" class="text-stone-400 hover:text-white text-lg">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="space-y-4">
        ${records.length === 0 ? `<div class="p-6 text-center text-stone-400">該生尚未提交任何測驗</div>` : ''}
        ${records.map(rec => `
          <div class="p-4 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
            <div>
              <span class="text-xs text-amber-400">${rec.eraName}</span>
              <div class="text-base font-bold text-white">${rec.chapterTitle}</div>
              <div class="text-xs text-stone-400 mt-1">時間：${rec.timestamp} ｜ 正確率：${rec.accuracy}%</div>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-xl font-black text-amber-300">${rec.score} 分</span>
              <button onclick='openFullExamModal(${JSON.stringify(rec).replace(/'/g, "&#39;")})' class="btn-wuxia px-3 py-1.5 rounded-lg text-xs font-bold">
                檢視考卷
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeStudentDetailModal() {
  const modal = document.getElementById('student-detail-modal');
  if (modal) modal.classList.add('hidden');
}

// 匯出班級成績 CSV
function exportClassCsv() {
  const students = window.currentClassStudents || [];
  if (students.length === 0) {
    alert('目前沒有學生成績可匯出！');
    return;
  }

  let csvContent = '\uFEFF班級,座號,姓名,等級,經驗值,平均成績,未克服錯題數\n';
  students.forEach(s => {
    const records = s.records || [];
    const avg = records.length > 0 ? Math.round(records.reduce((a, r) => a + r.score, 0) / records.length) : 0;
    csvContent += `"${s.classId}","${s.seatNum}","${s.name}",${s.level || 1},${s.exp || 0},${avg},${s.mistakeCount}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${appState.selectedTeacherClass}班_數學RPG測驗成績冊.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==========================================
// 雲端試算表設定與公用功能
// ==========================================

function openGasModal() {
  const modal = document.getElementById('gas-config-modal');
  const input = document.getElementById('gas-url-input');
  if (input) input.value = window.apiService.getGasUrl();
  if (modal) modal.classList.remove('hidden');
}

function closeGasModal() {
  const modal = document.getElementById('gas-config-modal');
  if (modal) modal.classList.add('hidden');
}

async function saveGasUrl() {
  const input = document.getElementById('gas-url-input');
  const url = input ? input.value.trim() : '';

  if (url && !url.startsWith('https://script.google.com/')) {
    alert('網址格式不符合 Google Apps Script Web App 格式 (需以 https://script.google.com/ 開頭)！');
    return;
  }

  window.apiService.setGasUrl(url);
  updateGasStatusIndicator();
  closeGasModal();

  if (url) {
    alert('✅ Google 試算表 Web App 網址已儲存！');
  } else {
    alert('已切換回「本機離線模式」。');
  }
}

// 登出
function logout() {
  appState.student = null;
  appState.teacher = null;
  appState.role = 'guest';
  localStorage.removeItem('WUXIA_ACTIVE_STUDENT');
  localStorage.removeItem('WUXIA_ACTIVE_TEACHER');
  showView('view-home');
}
