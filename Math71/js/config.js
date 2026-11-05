// ============================================================================
// 偉大航道・七年級數學探險島 (Grand Line Math 7A Island) - 系統設定與航海王角色資料
// ============================================================================

const APP_CONFIG = {
  appName: '偉大航道數學探險隊',
  subtitle: '康軒版｜國中七年級上學期數學',
  defaultSchool: 'xtjh',
  version: '2.0.0',
  // 預設 GAS Web App URL (已固定設定您的 Google Apps Script 網址)
  defaultGasUrl: 'https://script.google.com/macros/s/AKfycbyQYbAf8YqEIiza2QOd4lXQaxrcY5M9EKIJgyZH5704PkhoXYAz4plpmL8mhg90AWyllQ/exec',
  teacherInviteCode: 'MATH71', // 教師註冊通行碼 (選填保護機制)
  maxTeacherClasses: 5,        // 老師最多可選擇 5 個班級
  passScore: 60                // 測驗及格獲得證書門檻
};

// 航海王 (One Piece) 學習夥伴角色設定與口氣台詞庫
const ONE_PIECE_CHARACTERS = [
  {
    id: 'luffy',
    name: '蒙其・D・魯夫',
    title: '草帽海賊團船長',
    badge: '橡膠果實能力者',
    color: '#e63946',
    accentBg: '#fff0f1',
    borderColor: '#ffccd0',
    emoji: '👒',
    svgAvatar: `<svg viewBox="0 0 100 100" class="char-svg">
      <circle cx="50" cy="50" r="46" fill="#ffe5d9" stroke="#e63946" stroke-width="4"/>
      <!-- 草帽 -->
      <ellipse cx="50" cy="30" rx="44" ry="12" fill="#f4d35e" stroke="#b5830d" stroke-width="3"/>
      <path d="M22 28 C22 8, 78 8, 78 28 Z" fill="#f4d35e" stroke="#b5830d" stroke-width="3"/>
      <path d="M23 25 Q50 30 77 25" stroke="#e63946" stroke-width="6" fill="none"/>
      <!-- 頭髮與臉 -->
      <path d="M25 32 L20 48 L28 42 L25 55 L33 45" fill="#1d1d1d"/>
      <path d="M75 32 L80 48 L72 42 L75 55 L67 45" fill="#1d1d1d"/>
      <circle cx="50" cy="56" r="24" fill="#ffcdb2"/>
      <!-- 眼睛與傷疤 -->
      <circle cx="41" cy="52" r="3.5" fill="#1d1d1d"/>
      <circle cx="59" cy="52" r="3.5" fill="#1d1d1d"/>
      <path d="M36 58 Q41 60 44 58" stroke="#8d5b4c" stroke-width="1.8" fill="none"/>
      <line x1="38" y1="57" x2="38" y2="60" stroke="#8d5b4c" stroke-width="1.5"/>
      <line x1="41" y1="57" x2="41" y2="60" stroke="#8d5b4c" stroke-width="1.5"/>
      <!-- 招牌大笑 -->
      <path d="M37 64 Q50 76 63 64 Z" fill="#ffffff" stroke="#1d1d1d" stroke-width="2"/>
      <line x1="43" y1="65" x2="43" y2="70" stroke="#1d1d1d" stroke-width="1.5"/>
      <line x1="50" y1="65" x2="50" y2="71" stroke="#1d1d1d" stroke-width="1.5"/>
      <line x1="57" y1="65" x2="57" y2="70" stroke="#1d1d1d" stroke-width="1.5"/>
    </svg>`,
    catchphrase: '我是要成為「數學海賊王」的男人！ヒヒヒ！',
    description: '熱血直覺派！用最簡單直白的話幫你把複雜算式一拳擊飛！',
    correctIntro: [
      'ヒヒヒ！太厲害了吧！這題就像我的「橡膠槍亂打」一樣瞬間命中！',
      '好耶——！完全正確！離偉大航道的數學大秘寶又近一步啦！開宴會啦！🍖',
      '沒錯沒錯！你的直覺跟霸氣一樣強！我們來看為什麼這樣算超快：'
    ],
    wrongIntro: [
      '唔喔喔！差一點點！別灰心，就算被打倒一百次，只要再站起來就能贏！我們一步一步看：',
      '肚子的肉不夠吃了嗎？哈哈！這題其實有個小機關，船長帶你一拳破解它：',
      '沒問題的！航海難免會遇到暴風雨，看清楚下面的步驟，下一題用「二檔」秒殺它！'
    ],
    stepPrefix: ['🥊 第一拳（看清目標）', '🔥 第二檔（關鍵運算）', '🏴‍☠️ 橡膠火箭砲（最終答案）']
  },
  {
    id: 'zoro',
    name: '羅羅亞・索隆',
    title: '三刀流劍豪',
    badge: '目標世界第一大劍豪',
    color: '#2a9d8f',
    accentBg: '#eefaf8',
    borderColor: '#b5e8e0',
    emoji: '⚔️',
    svgAvatar: `<svg viewBox="0 0 100 100" class="char-svg">
      <circle cx="50" cy="50" r="46" fill="#e6f5f2" stroke="#2a9d8f" stroke-width="4"/>
      <!-- 綠藻頭 -->
      <path d="M22 45 L18 30 L30 33 L35 20 L46 28 L55 18 L63 29 L75 23 L72 35 L82 35 L77 48 Z" fill="#2a9d8f" stroke="#1b6b61" stroke-width="2"/>
      <circle cx="50" cy="56" r="23" fill="#f7cad0"/>
      <!-- 頭巾額頭 -->
      <path d="M27 42 Q50 47 73 42 L71 34 Q50 38 29 34 Z" fill="#1d3557"/>
      <!-- 左眼刀疤與右眼 -->
      <line x1="39" y1="45" x2="39" y2="60" stroke="#7f4f24" stroke-width="2"/>
      <line x1="35" y1="52" x2="43" y2="52" stroke="#1d1d1d" stroke-width="2.5"/>
      <circle cx="60" cy="52" r="3" fill="#1d1d1d"/>
      <path d="M54 47 L65 49" stroke="#1b6b61" stroke-width="2.5"/>
      <!-- 嘴角自信笑 -->
      <path d="M42 66 L58 64" stroke="#1d1d1d" stroke-width="2.5" stroke-linecap="round"/>
      <!-- 三水滴耳環 -->
      <line x1="27" y1="58" x2="25" y2="66" stroke="#f4d35e" stroke-width="2"/>
      <line x1="27" y1="58" x2="27" y2="67" stroke="#f4d35e" stroke-width="2"/>
      <line x1="27" y1="58" x2="29" y2="66" stroke="#f4d35e" stroke-width="2"/>
    </svg>`,
    catchphrase: '背後受傷是劍士的恥辱！基本功一刀都不能省！',
    description: '嚴謹修練派！把每個計算拆解成一刀流、二刀流、三刀流，刀刀精準！',
    correctIntro: [
      '哼，幹得不錯！一刀兩斷，沒有半點多餘的破綻！',
      '這就是苦練基本功的成果！「三刀流・奧義」完美斬開這道題目！',
      '很好，連見聞色霸氣都看穿題目的陷阱了。再確認一次斬擊軌跡：'
    ],
    wrongIntro: [
      '喂，別迷路了！（雖然我好像沒資格說別人…）握緊你的刀，重新看清楚算式結構：',
      '力道太急了！算數跟劍術一樣，順序錯了就會露出破綻，看我的三刀流拆解：',
      '這點小傷算什麼！把正負號與括號看清楚，我們再斬一次：'
    ],
    stepPrefix: ['🗡️ 壹刀流（審題定號）', '⚔️ 貳刀流（化簡破陣）', '🐉 三刀流奧義（斬獲正解）']
  },
  {
    id: 'nami',
    name: '娜美',
    title: '天才航海士',
    badge: '天候棒與貝里專家',
    color: '#f4a261',
    accentBg: '#fff8f0',
    borderColor: '#fde0c3',
    emoji: '🍊',
    svgAvatar: `<svg viewBox="0 0 100 100" class="char-svg">
      <circle cx="50" cy="50" r="46" fill="#fff3e6" stroke="#f4a261" stroke-width="4"/>
      <!-- 橘色長髮 -->
      <path d="M22 65 Q18 22 50 22 Q82 22 78 65 L70 75 L30 75 Z" fill="#f48c06"/>
      <circle cx="50" cy="55" r="22" fill="#ffe5d9"/>
      <path d="M28 42 Q45 30 68 42 Q55 32 30 45 Z" fill="#f48c06"/>
      <!-- 大眼睛 -->
      <circle cx="41" cy="52" r="3.5" fill="#582f0e"/>
      <circle cx="59" cy="52" r="3.5" fill="#582f0e"/>
      <circle cx="42" cy="51" r="1.2" fill="#fff"/>
      <circle cx="60" cy="51" r="1.2" fill="#fff"/>
      <!-- 甜美微笑 -->
      <path d="M43 63 Q50 70 57 63" stroke="#e63946" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>`,
    catchphrase: '只要跟數字、貝里還有航線座標有關，全都交給我這位天才航海士！',
    description: '精打細算派！擅長用金錢買賣、溫度變化與地圖座標讓你秒懂數學！',
    correctIntro: [
      '太棒了！精準無誤！這筆帳算得比我數一億貝里還要快呢！💰✨',
      '完美航線！照這個速度破關，黃金寶箱很快就是我們的囊中之物啦！',
      '哼哼～不愧是我認可的航海助手！我們來複習一下這個超划算的解題路線：'
    ],
    wrongIntro: [
      '等等！這樣算的話我們的貝里會虧本啦！😱 快拿出航海圖，我幫你重新定位：',
      '前方有低氣壓陷阱喔！別被題目的數字騙了，跟著我的天候指針一步步算：',
      '差一點就偏離航道囉！正負號就像是賺錢跟賠錢，絕對不能搞混，看這裡：'
    ],
    stepPrefix: ['🧭 航線定位（找出條件）', '💰 貝里精算（列式推理）', '🍊 完美入袋（核對答案）']
  },
  {
    id: 'chopper',
    name: '多尼多尼・喬巴',
    title: '草帽海賊團船醫',
    badge: '人人果實・藍波球',
    color: '#e76f51',
    accentBg: '#fff4f1',
    borderColor: '#fad2c8',
    emoji: '🦌',
    svgAvatar: `<svg viewBox="0 0 100 100" class="char-svg">
      <circle cx="50" cy="50" r="46" fill="#fde8e8" stroke="#e76f51" stroke-width="4"/>
      <!-- 鹿角 -->
      <path d="M22 32 L14 20 L20 18 L24 25 L26 16 L30 28" fill="#8d5b4c" stroke="#5c3a2e" stroke-width="2"/>
      <path d="M78 32 L86 20 L80 18 L76 25 L74 16 L70 28" fill="#8d5b4c" stroke="#5c3a2e" stroke-width="2"/>
      <!-- 粉紅醫療帽 -->
      <path d="M26 42 C26 18, 74 18, 74 42 Z" fill="#ff758f" stroke="#c9184a" stroke-width="2.5"/>
      <ellipse cx="50" cy="42" rx="30" ry="7" fill="#ff758f" stroke="#c9184a" stroke-width="2.5"/>
      <!-- X標誌 -->
      <line x1="45" y1="27" x2="55" y2="37" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
      <line x1="55" y1="27" x2="45" y2="37" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
      <!-- 臉與藍鼻子 -->
      <circle cx="50" cy="59" r="21" fill="#d4a373"/>
      <circle cx="41" cy="55" r="3.8" fill="#1d1d1d"/>
      <circle cx="59" cy="55" r="3.8" fill="#1d1d1d"/>
      <circle cx="42" cy="54" r="1.3" fill="#fff"/>
      <circle cx="60" cy="54" r="1.3" fill="#fff"/>
      <ellipse cx="50" cy="60" rx="4.5" ry="3.2" fill="#3a86ff"/>
      <path d="M45 67 Q50 72 55 67" stroke="#5c3a2e" stroke-width="2" fill="none"/>
    </svg>`,
    catchphrase: '就算你誇獎我懂數學，我也不會高興的啦你這混蛋～扭扭♪',
    description: '溫柔船醫派！像調配萬能藥一樣，耐心地幫你診斷每個小錯誤！',
    correctIntro: [
      '哇啊啊！你答對了耶！好厲害喔！給你看我的藍波球強化診斷書！🌸',
      '太棒了～完全沒有算錯症狀！就算你這麼厲害我也不會請你吃棉花糖的啦～ヒヒ！',
      '診斷結果：100分健康！你的數學免疫力超強！我們一起看看處方箋步驟：'
    ],
    wrongIntro: [
      '嗚哇～！船醫！這裡有人算式受傷了！啊，船醫就是我啦！快來看我的治療步驟：',
      '別難過別難過（拍拍）～這題就像苦苦的藥草，只要照這三個步驟調配就會變甜喔：',
      '吃下這顆數學藍波球開啟「頭腦強化」吧！弱點就在這裡，我們一起治好它：'
    ],
    stepPrefix: ['🩺 頭腦強化（診斷題意）', '💊 調配處方（逐步運算）', '🌸 萬能藥完成（得出正解）']
  },
  {
    id: 'robin',
    name: '妮可・羅賓',
    title: '考古學家',
    badge: '花花果實能力者',
    color: '#6d597a',
    accentBg: '#f6f2f9',
    borderColor: '#dcd0e5',
    emoji: '🌸',
    svgAvatar: `<svg viewBox="0 0 100 100" class="char-svg">
      <circle cx="50" cy="50" r="46" fill="#f3eef8" stroke="#6d597a" stroke-width="4"/>
      <!-- 黑長髮 -->
      <path d="M24 72 Q20 20 50 20 Q80 20 76 72 Z" fill="#1d1e2c"/>
      <circle cx="50" cy="54" r="21" fill="#ffe5d9"/>
      <!-- 太陽眼鏡掛額頭 -->
      <rect x="33" y="28" width="14" height="8" rx="3" fill="#e07a5f" stroke="#fff" stroke-width="1"/>
      <rect x="53" y="28" width="14" height="8" rx="3" fill="#e07a5f" stroke="#fff" stroke-width="1"/>
      <line x1="47" y1="32" x2="53" y2="32" stroke="#fff" stroke-width="2"/>
      <!-- 眼睛與鼻樑 -->
      <circle cx="41" cy="51" r="3" fill="#2b2d42"/>
      <circle cx="59" cy="51" r="3" fill="#2b2d42"/>
      <line x1="50" y1="49" x2="50" y2="57" stroke="#d4a373" stroke-width="1.8"/>
      <!-- 優雅微笑 -->
      <path d="M43 63 Q50 68 57 63" stroke="#b56576" stroke-width="2.2" fill="none"/>
    </svg>`,
    catchphrase: '歷史本文與代數方程式一樣，只要解開符號的秘密，真相就會浮現。',
    description: '優雅邏輯派！用最清晰的條理幫你把代數與規則推演得一清二楚！',
    correctIntro: [
      '呵呵，真是優雅又精準的推論呢！你已經完全解讀出這塊「數學歷史本文」了。',
      '「二輪花・綻放」！答案完全正確，你的邏輯思維非常迷人喔。',
      '太出色了，看來什麼樣的代數密碼都難不倒你。讓我們回顧這段完美的解讀過程：'
    ],
    wrongIntro: [
      '呵呵，別緊張，解讀古老密碼時難免會看錯幾個符號。讓我用花花果實幫你翻開線索吧：',
      '這道題目藏了一個小小的文字迷宮呢，我們靜下心來，照著邏輯一步步推敲：',
      '真相往往藏在細節裡。注意看括號與符號的變化，答案其實就在眼前：'
    ],
    stepPrefix: ['📜 拓印碑文（提取條件）', '🌸 花花推演（邏輯化簡）', '✨ 真相浮現（最終解答）']
  },
  {
    id: 'sanji',
    name: '賓什莫克・香吉士',
    title: '草帽海賊團廚師',
    badge: '黑足・惡魔風腳',
    color: '#457b9d',
    accentBg: '#f0f7fc',
    borderColor: '#c2dff0',
    emoji: '🍳',
    svgAvatar: `<svg viewBox="0 0 100 100" class="char-svg">
      <circle cx="50" cy="50" r="46" fill="#edf6f9" stroke="#457b9d" stroke-width="4"/>
      <circle cx="50" cy="55" r="22" fill="#ffe5d9"/>
      <!-- 金髮遮單眼 -->
      <path d="M26 50 Q25 22 52 22 Q78 22 74 52 L52 56 L48 38 L32 55 Z" fill="#f9c74f" stroke="#d49b1f" stroke-width="1.5"/>
      <!-- 捲眉毛與眼睛 -->
      <path d="M55 44 Q64 42 64 47 Q64 50 60 48" stroke="#1d1d1d" stroke-width="2" fill="none"/>
      <circle cx="60" cy="53" r="3" fill="#1d1d1d"/>
      <!-- 小鬍子與微笑 -->
      <path d="M43 63 Q50 68 58 63" stroke="#1d1d1d" stroke-width="2" fill="none"/>
      <path d="M46 72 L54 72" stroke="#1d1d1d" stroke-width="2.5"/>
    </svg>`,
    catchphrase: '數學就像頂級料理，食材比例與火候順序多一分少一分都不行！',
    description: '黃金比例派！把分數通分與四則運算比喻成食譜火候，好吃又好懂！',
    correctIntro: [
      'Magnifique（太完美了）！這道算式的火候控制得恰到好處，簡直是米其林三星級的解答！🍽️',
      '惡魔風腳・一級絞肉！漂亮地把難題踢飛了！來，這是獎勵你的特製甜點！',
      '精準的比例！不管是通分還是移項都像刀工一樣俐落，看看這份主廚秘笈：'
    ],
    wrongIntro: [
      '喂喂，先別急著下鍋啊！調味順序要是顛倒了，整鍋湯的味道就會變調喔，看主廚示範：',
      '不能浪費任何一個數字食材！仔細看清楚題目給的份量比例，我們重新料理一次：',
      '差一點點就烤焦囉！先處理括號裡的主菜，再加外面的配料，跟著這三步做準沒錯：'
    ],
    stepPrefix: ['🔪 備料刀工（整理算式）', '🔥 惡魔風腳火候（核心計算）', '🍽️ 完美擺盤（最終結果）']
  }
];

// 海賊稱號與懸賞金等級制度
const PIRATE_RANKS = [
  { minExp: 0,    title: '風車村見習生',   bountyMultiplier: 10000,   icon: '⚓' },
  { minExp: 100,  title: '東海賞金新星',   bountyMultiplier: 50000,   icon: '⛵' },
  { minExp: 300,  title: '偉大航道探險家', bountyMultiplier: 150000,  icon: '🧭' },
  { minExp: 600,  title: '超新星十一人',   bountyMultiplier: 500000,  icon: '⚡' },
  { minExp: 1000, title: '新世界四皇候補', bountyMultiplier: 1500000, icon: '👑' },
  { minExp: 1500, title: '偉大數學海賊王', bountyMultiplier: 5000000, icon: '🏴‍☠️' }
];

// 預設學校選項 (學生也可自行輸入任何學校)
const PRESET_SCHOOLS = [
  'xtjh',
  '建德國中',
  '暖暖國中',
  '中正國中',
  '成功國中',
  '銘傳國中',
  '南榮國中',
  '武崙國中',
  '百福國中',
  '信義國中',
  '明德國中'
];

// 通用班級格式相容解析器 (自動分解如 701702705730 或 701,702 等多種格式)
function parseTeacherClasses(raw) {
  let list = [];
  if (Array.isArray(raw)) {
    raw.forEach(r => list.push(...parseTeacherClasses(r)));
  } else if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    // 1. 包含分隔符號 (逗號、頓號、空白、斜線、分號)
    if (/[,、\s\/;]/.test(s)) {
      list = s.split(/[,、\s\/;]+/).map(c => c.trim()).filter(Boolean);
    } 
    // 2. 連續 3 碼班級字串 (例如 701702705730)
    else if (s.length >= 6 && s.length % 3 === 0 && /^\d+$/.test(s)) {
      list = s.match(/\d{3}/g) || [s];
    }
    // 3. 常見 7 開頭連續班級 (例如 701702 或 701702705)
    else if (/^(7\d{2})+$/.test(s)) {
      list = s.match(/7\d{2}/g) || [s];
    }
    else {
      list = [s];
    }
  }
  return Array.from(new Set(list.map(c => String(c).trim()).filter(Boolean)));
}

// 關卡 ID 標準化轉換器 (相容 Google 試算表自動將 1-1、2-1 等代號轉換為日期的問題)
function normalizeStageId(rawStage, stageTitle = '') {
  if (!rawStage) return '';
  const s = String(rawStage).trim();
  if (/^(\d+-\d+|exam-\d+)$/i.test(s)) return s;
  if (stageTitle) {
    const tm = stageTitle.match(/第?(\d+-\d+)/);
    if (tm) return tm[1];
    const em = stageTitle.match(/第(\d+)次段考/);
    if (em) return 'exam-' + em[1];
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return (d.getMonth() + 1) + '-' + d.getDate();
  }
  return s;
}

// 依據試卷作答紀錄重新核算並校正學生累積成就 (通關數、星星、EXP、懸賞金)
function reconcileStudentFromExams(student, exams) {
  if (!student) return student;
  const cleanSchool = String(student.school || '').trim().toLowerCase();
  const cleanClass = String(student.className || '').trim().toLowerCase();
  const cleanSeat = Number(student.seatNo);

  const studentExams = (exams || []).filter(e => {
    return String(e.school || '').trim().toLowerCase() === cleanSchool &&
           String(e.className || '').trim().toLowerCase() === cleanClass &&
           Number(e.seatNo) === cleanSeat;
  });

  const passedStages = new Set(student.completedStages || []);
  const stageStars = { ...(student.stageStars || {}) };
  const stageBestScores = { ...(student.stageBestScores || {}) };

  let totalExp = 0;
  let totalBounty = 0;

  studentExams.forEach(e => {
    const stageId = normalizeStageId(e.stageId, e.stageTitle);
    const score = Number(e.score || 0);
    const passed = e.passed === true || e.passed === '是' || score >= 60;

    if (passed && stageId) {
      passedStages.add(stageId);
      const stars = score === 100 ? 3 : score >= 80 ? 2 : score >= 60 ? 1 : 0;
      stageStars[stageId] = Math.max(stageStars[stageId] || 0, stars);
      stageBestScores[stageId] = Math.max(stageBestScores[stageId] || 0, score);
    }
  });

  passedStages.forEach(stId => {
    const bestScore = stageBestScores[stId] || 60;
    totalExp += Math.round(100 * (bestScore / 100));
    totalBounty += Math.round(3000000 * (bestScore / 100));
  });

  student.completedStages = Array.from(passedStages);
  student.stageStars = stageStars;
  student.stageBestScores = stageBestScores;
  student.exp = Math.max(student.exp || 0, totalExp);
  student.bounty = Math.max(student.bounty || 0, totalBounty);

  return student;
}
