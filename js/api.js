// ============================================================================
// GAS (Google Apps Script) 雲端試算表同步引擎 & 本機儲存雙核心管理 (api.js)
// 支援：學生登入、測驗成績與完整試卷登錄、錯題紀錄、教師註冊(最多5班)、教師查詢後台
// ============================================================================

const STORAGE_KEYS = {
  GAS_URL: 'MATH71_GAS_URL',
  CURRENT_STUDENT: 'MATH71_CURRENT_STUDENT',
  CURRENT_TEACHER: 'MATH71_CURRENT_TEACHER',
  STUDENTS_DB: 'MATH71_STUDENTS_DB',
  EXAMS_DB: 'MATH71_EXAMS_DB',
  WRONG_DB: 'MATH71_WRONG_DB',
  TEACHERS_DB: 'MATH71_TEACHERS_DB',
  SEEDED: 'MATH71_DEMO_SEEDED_V2'
};

class DataService {
  constructor() {
    this.gasUrl = localStorage.getItem(STORAGE_KEYS.GAS_URL) || APP_CONFIG.defaultGasUrl || '';
    if (!localStorage.getItem(STORAGE_KEYS.GAS_URL) && APP_CONFIG.defaultGasUrl) {
      localStorage.setItem(STORAGE_KEYS.GAS_URL, APP_CONFIG.defaultGasUrl);
    }
    this.ensureSeedData();
  }

  getGasUrl() {
    return this.gasUrl;
  }

  setGasUrl(url) {
    this.gasUrl = (url || '').trim();
    localStorage.setItem(STORAGE_KEYS.GAS_URL, this.gasUrl);
  }

  isGasConfigured() {
    return Boolean(this.gasUrl && this.gasUrl.startsWith('https://script.google.com/'));
  }

  // 初始化預設示範資料，讓老師與學生打開網頁即可體驗完整報表與排行榜
  ensureSeedData() {
    if (localStorage.getItem(STORAGE_KEYS.SEEDED)) return;

    const demoTeachers = [
      {
        username: 'teacher01',
        password: '1234',
        name: '紅髮傑克老師',
        school: 'xtjh',
        classes: ['701', '702', '703'],
        createdAt: '2026-10-01T08:00:00.000Z'
      }
    ];

    const demoStudents = [
      {
        studentKey: 'xtjh_701_01',
        school: 'xtjh',
        className: '701',
        seatNo: '01',
        name: '王小明',
        characterId: 'luffy',
        exp: 360,
        bounty: 26000000,
        completedStages: ['1-1', '1-2', '1-3'],
        stageStars: { '1-1': 3, '1-2': 2, '1-3': 3 },
        stageBestScores: { '1-1': 100, '1-2': 80, '1-3': 100 },
        lastActive: '2026-11-04 14:20'
      },
      {
        studentKey: 'xtjh_701_05',
        school: 'xtjh',
        className: '701',
        seatNo: '05',
        name: '林美玲',
        characterId: 'nami',
        exp: 490,
        bounty: 36000000,
        completedStages: ['1-1', '1-2', '1-3', '1-4'],
        stageStars: { '1-1': 3, '1-2': 3, '1-3': 2, '1-4': 3 },
        stageBestScores: { '1-1': 100, '1-2': 100, '1-3': 80, '1-4': 100 },
        lastActive: '2026-11-04 15:10'
      },
      {
        studentKey: 'xtjh_701_12',
        school: 'xtjh',
        className: '701',
        seatNo: '12',
        name: '陳冠宇',
        characterId: 'zoro',
        exp: 210,
        bounty: 8000000,
        completedStages: ['1-1', '1-2'],
        stageStars: { '1-1': 2, '1-2': 2 },
        stageBestScores: { '1-1': 80, '1-2': 60 },
        lastActive: '2026-11-03 19:45'
      },
      {
        studentKey: 'xtjh_702_03',
        school: 'xtjh',
        className: '702',
        seatNo: '03',
        name: '張雅筑',
        characterId: 'robin',
        exp: 250,
        bounty: 15000000,
        completedStages: ['1-1', '2-1'],
        stageStars: { '1-1': 3, '2-1': 3 },
        stageBestScores: { '1-1': 100, '2-1': 100 },
        lastActive: '2026-11-04 11:05'
      }
    ];

    const demoExams = [
      {
        examId: 'EX_DEMO_1001',
        studentKey: 'xtjh_701_01',
        school: 'xtjh',
        className: '701',
        seatNo: '01',
        studentName: '王小明',
        characterId: 'luffy',
        stageId: '1-1',
        stageTitle: '第1-1節・負數與數線',
        score: 100,
        correctCount: 5,
        totalQuestions: 5,
        stars: 3,
        passed: true,
        durationSec: 135,
        timestamp: '2026-11-03 16:10',
        answersDetail: [
          { qId: 'q1_1_1', type: 'choice', concept: '正負數的相對表示', prompt: '娜美每賣出一箱橘子就會記錄賺賠情形，若賠了 190 貝里應該怎麼記？', userAnswer: '－190', correctAnswer: '－190', isCorrect: true },
          { qId: 'q1_1_2', type: 'choice', concept: '絕對值與整數個數', prompt: '已知 c 為負整數，且 ｜c｜＜ 6，則 c 共有幾種可能？', userAnswer: '5 種', correctAnswer: '5 種', isCorrect: true },
          { qId: 'q1_1_3', type: 'fill', concept: '相反數與雙重負號', prompt: '請計算：－(－7) 的相反數為多少？', userAnswer: '-7', correctAnswer: '-7', isCorrect: true },
          { qId: 'q1_1_4', type: 'fill', concept: '絕對值的比較大小', prompt: '若 a 為 ｜－19｜，b 為 ｜－16｜，則 a 和 b 的大小關係為何？', userAnswer: 'a>b', correctAnswer: 'a>b', isCorrect: true },
          { qId: 'q1_1_5', type: 'match', concept: '絕對值與相反數配對', prompt: '【拖曳配合題】絕對值與相反數配對', userAnswer: '－3 的相反數→3, 最大的負整數→-1, ｜－8｜ 的相反數→-8, 不比 2 大也不比 2 小的數→2', correctAnswer: '全部配對正確', isCorrect: true }
        ]
      },
      {
        examId: 'EX_DEMO_1002',
        studentKey: 'xtjh_701_01',
        school: 'xtjh',
        className: '701',
        seatNo: '01',
        studentName: '王小明',
        characterId: 'luffy',
        stageId: '1-2',
        stageTitle: '第1-2節・整數的加減',
        score: 80,
        correctCount: 4,
        totalQuestions: 5,
        stars: 2,
        passed: true,
        durationSec: 168,
        timestamp: '2026-11-04 14:20',
        answersDetail: [
          { qId: 'q1_2_1', type: 'choice', concept: '去括號法則', prompt: '下列哪一個算式的結果與「 1 － ( 6 － 3 ) 」完全相同？', userAnswer: '1 － 6 － 3', correctAnswer: '1 － 6 ＋ 3', isCorrect: false },
          { qId: 'q1_2_2', type: 'choice', concept: '數線上兩點距離', prompt: '偉大航道數線上有 A(－7)、B(5) 兩座島嶼，請問 A、B 兩點的距離為多少？', userAnswer: '12', correctAnswer: '12', isCorrect: true },
          { qId: 'q1_2_3', type: 'fill', concept: '含絕對值與中括號的加減運算', prompt: '請計算下列算式的值：(－13) ＋ ｜－23｜ － [ 24 ＋ (－12) ] ＝ ？', userAnswer: '-2', correctAnswer: '-2', isCorrect: true },
          { qId: 'q1_2_4', type: 'fill', concept: '生活溫度差應用', prompt: '最高溫約 80 度，最低溫約零下 111 度，最高溫比最低溫高了幾度？', userAnswer: '191', correctAnswer: '191', isCorrect: true },
          { qId: 'q1_2_5', type: 'match', concept: '整數加減與中點坐標綜合配對', prompt: '【拖曳配合題】整數加減與中點坐標綜合配對', userAnswer: '全部配對正確', correctAnswer: '全部配對正確', isCorrect: true }
        ]
      },
      {
        examId: 'EX_DEMO_1003',
        studentKey: 'xtjh_701_12',
        school: 'xtjh',
        className: '701',
        seatNo: '12',
        studentName: '陳冠宇',
        characterId: 'zoro',
        stageId: '1-1',
        stageTitle: '第1-1節・負數與數線',
        score: 80,
        correctCount: 4,
        totalQuestions: 5,
        stars: 2,
        passed: true,
        durationSec: 150,
        timestamp: '2026-11-03 19:10',
        answersDetail: [
          { qId: 'q1_1_1', type: 'choice', concept: '正負數的相對表示', prompt: '若賠了 190 貝里應該怎麼記？', userAnswer: '－190', correctAnswer: '－190', isCorrect: true },
          { qId: 'q1_1_2', type: 'choice', concept: '絕對值與整數個數', prompt: '已知 c 為負整數，且 ｜c｜＜ 6，則 c 共有幾種可能？', userAnswer: '5 種', correctAnswer: '5 種', isCorrect: true },
          { qId: 'q1_1_3', type: 'fill', concept: '相反數與雙重負號', prompt: '請計算：－(－7) 的相反數為多少？', userAnswer: '7', correctAnswer: '-7', isCorrect: false },
          { qId: 'q1_1_4', type: 'fill', concept: '絕對值的比較大小', prompt: '若 a 為 ｜－19｜，b 為 ｜－16｜，則 a 和 b 的大小關係為何？', userAnswer: 'a>b', correctAnswer: 'a>b', isCorrect: true },
          { qId: 'q1_1_5', type: 'match', concept: '絕對值與相反數配對', prompt: '【拖曳配合題】絕對值與相反數配對', userAnswer: '全部配對正確', correctAnswer: '全部配對正確', isCorrect: true }
        ]
      },
      {
        examId: 'EX_DEMO_1004',
        studentKey: 'xtjh_701_12',
        school: 'xtjh',
        className: '701',
        seatNo: '12',
        studentName: '陳冠宇',
        characterId: 'zoro',
        stageId: '1-2',
        stageTitle: '第1-2節・整數的加減',
        score: 60,
        correctCount: 3,
        totalQuestions: 5,
        stars: 1,
        passed: true,
        durationSec: 195,
        timestamp: '2026-11-03 19:45',
        answersDetail: [
          { qId: 'q1_2_1', type: 'choice', concept: '去括號法則', prompt: '下列哪一個算式的結果與「 1 － ( 6 － 3 ) 」完全相同？', userAnswer: '1 － 6 － 3', correctAnswer: '1 － 6 ＋ 3', isCorrect: false },
          { qId: 'q1_2_2', type: 'choice', concept: '數線上兩點距離', prompt: '偉大航道數線上有 A(－7)、B(5) 兩座島嶼，請問 A、B 兩點的距離為多少？', userAnswer: '12', correctAnswer: '12', isCorrect: true },
          { qId: 'q1_2_3', type: 'fill', concept: '含絕對值與中括號的加減運算', prompt: '請計算下列算式的值：(－13) ＋ ｜－23｜ － [ 24 ＋ (－12) ] ＝ ？', userAnswer: '22', correctAnswer: '-2', isCorrect: false },
          { qId: 'q1_2_4', type: 'fill', concept: '生活溫度差應用', prompt: '最高溫約 80 度，最低溫約零下 111 度，最高溫比最低溫高了幾度？', userAnswer: '191', correctAnswer: '191', isCorrect: true },
          { qId: 'q1_2_5', type: 'match', concept: '整數加減與中點坐標綜合配對', prompt: '【拖曳配合題】整數加減與中點坐標綜合配對', userAnswer: '全部配對正確', correctAnswer: '全部配對正確', isCorrect: true }
        ]
      }
    ];

    const demoWrong = [
      {
        id: 'WR_DEMO_1',
        studentKey: 'xtjh_701_01',
        school: 'xtjh',
        className: '701',
        seatNo: '01',
        studentName: '王小明',
        stageId: '1-2',
        stageTitle: '第1-2節・整數的加減',
        qId: 'q1_2_1',
        concept: '去括號法則',
        prompt: '下列哪一個算式的結果與「 1 － ( 6 － 3 ) 」完全相同？',
        userAnswer: '1 － 6 － 3',
        correctAnswer: '1 － 6 ＋ 3',
        timestamp: '2026-11-04 14:20',
        mastered: false
      },
      {
        id: 'WR_DEMO_2',
        studentKey: 'xtjh_701_12',
        school: 'xtjh',
        className: '701',
        seatNo: '12',
        studentName: '陳冠宇',
        stageId: '1-1',
        stageTitle: '第1-1節・負數與數線',
        qId: 'q1_1_3',
        concept: '相反數與雙重負號',
        prompt: '請計算：－(－7) 的相反數為多少？',
        userAnswer: '7',
        correctAnswer: '-7',
        timestamp: '2026-11-03 19:10',
        mastered: false
      },
      {
        id: 'WR_DEMO_3',
        studentKey: 'xtjh_701_12',
        school: 'xtjh',
        className: '701',
        seatNo: '12',
        studentName: '陳冠宇',
        stageId: '1-2',
        stageTitle: '第1-2節・整數的加減',
        qId: 'q1_2_1',
        concept: '去括號法則',
        prompt: '下列哪一個算式的結果與「 1 － ( 6 － 3 ) 」完全相同？',
        userAnswer: '1 － 6 － 3',
        correctAnswer: '1 － 6 ＋ 3',
        timestamp: '2026-11-03 19:45',
        mastered: false
      },
      {
        id: 'WR_DEMO_4',
        studentKey: 'xtjh_701_12',
        school: 'xtjh',
        className: '701',
        seatNo: '12',
        studentName: '陳冠宇',
        stageId: '1-2',
        stageTitle: '第1-2節・整數的加減',
        qId: 'q1_2_3',
        concept: '含絕對值與中括號的加減運算',
        prompt: '請計算下列算式的值：(－13) ＋ ｜－23｜ － [ 24 ＋ (－12) ] ＝ ？',
        userAnswer: '22',
        correctAnswer: '-2',
        timestamp: '2026-11-03 19:45',
        mastered: false
      }
    ];

    localStorage.setItem(STORAGE_KEYS.TEACHERS_DB, JSON.stringify(demoTeachers));
    localStorage.setItem(STORAGE_KEYS.STUDENTS_DB, JSON.stringify(demoStudents));
    localStorage.setItem(STORAGE_KEYS.EXAMS_DB, JSON.stringify(demoExams));
    localStorage.setItem(STORAGE_KEYS.WRONG_DB, JSON.stringify(demoWrong));
    localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
  }

  // 通用 GAS POST 呼叫 (使用 text/plain 避免 CORS preflight 阻擋)
  async postToGas(action, payload) {
    if (!this.isGasConfigured()) {
      return { ok: false, offline: true };
    }
    try {
      const response = await fetch(this.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...payload })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      console.warn('GAS 雲端同步失敗，已自動儲存於本機：', err);
      return { ok: false, error: err.message };
    }
  }

  // 取得本機資料庫
  getLocalList(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }

  saveLocalList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  }

  // --------------------------------------------------------------------------
  // 1. 學生登入 / 切換角色 / 讀取進度
  // --------------------------------------------------------------------------
  async loginStudent({ school, className, seatNo, name, characterId }) {
    const cleanSchool = school.trim();
    const cleanClass = className.trim();
    const cleanSeat = String(seatNo).trim().padStart(2, '0');
    const cleanName = (name || '').trim() || `海賊新星#${cleanSeat}`;
    const studentKey = `${cleanSchool}_${cleanClass}_${cleanSeat}`;

    let students = this.getLocalList(STORAGE_KEYS.STUDENTS_DB);
    let student = students.find(s => s.studentKey === studentKey);

    const nowStr = this.formatNow();
    if (!student) {
      student = {
        studentKey,
        school: cleanSchool,
        className: cleanClass,
        seatNo: cleanSeat,
        name: cleanName,
        characterId: characterId || 'luffy',
        exp: 0,
        bounty: 0,
        completedStages: [],
        stageStars: {},
        stageBestScores: {},
        lastActive: nowStr
      };
      students.push(student);
    } else {
      if (name && name.trim()) student.name = name.trim();
      if (characterId) student.characterId = characterId;
      student.lastActive = nowStr;
    }

    this.saveLocalList(STORAGE_KEYS.STUDENTS_DB, students);
    localStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT, JSON.stringify(student));

    // 同步至 GAS
    if (this.isGasConfigured()) {
      const res = await this.postToGas('upsertStudent', { student });
      if (res && res.ok && res.student) {
        // 合併雲端進度
        student = this.mergeStudentProgress(student, res.student);
        const idx = students.findIndex(s => s.studentKey === studentKey);
        if (idx !== -1) students[idx] = student;
        this.saveLocalList(STORAGE_KEYS.STUDENTS_DB, students);
        localStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT, JSON.stringify(student));
      }
    }

    return student;
  }

  mergeStudentProgress(localStu, remoteStu) {
    const mergedStages = Array.from(new Set([...(localStu.completedStages || []), ...(remoteStu.completedStages || [])]));
    const mergedStars = { ...(remoteStu.stageStars || {}), ...(localStu.stageStars || {}) };
    const mergedScores = { ...(remoteStu.stageBestScores || {}), ...(localStu.stageBestScores || {}) };
    for (const k of Object.keys(remoteStu.stageStars || {})) {
      mergedStars[k] = Math.max(localStu.stageStars?.[k] || 0, remoteStu.stageStars[k] || 0);
    }
    for (const k of Object.keys(remoteStu.stageBestScores || {})) {
      mergedScores[k] = Math.max(localStu.stageBestScores?.[k] || 0, remoteStu.stageBestScores[k] || 0);
    }
    return {
      ...localStu,
      exp: Math.max(localStu.exp || 0, remoteStu.exp || 0),
      bounty: Math.max(localStu.bounty || 0, remoteStu.bounty || 0),
      completedStages: mergedStages,
      stageStars: mergedStars,
      stageBestScores: mergedScores
    };
  }

  getCurrentStudent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_STUDENT);
      if (!raw) return null;
      const stu = JSON.parse(raw);
      if (stu && (stu.school === '建德國中' || !stu.school)) {
        stu.school = 'xtjh';
        if (stu.studentKey && stu.studentKey.startsWith('建德國中_')) {
          stu.studentKey = stu.studentKey.replace('建德國中_', 'xtjh_');
        }
        localStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT, JSON.stringify(stu));
      }
      return stu;
    } catch {
      return null;
    }
  }

  updateStudentCharacter(characterId) {
    const stu = this.getCurrentStudent();
    if (!stu) return null;
    stu.characterId = characterId;
    localStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT, JSON.stringify(stu));

    const students = this.getLocalList(STORAGE_KEYS.STUDENTS_DB);
    const idx = students.findIndex(s => s.studentKey === stu.studentKey);
    if (idx !== -1) {
      students[idx].characterId = characterId;
      this.saveLocalList(STORAGE_KEYS.STUDENTS_DB, students);
    }
    this.postToGas('upsertStudent', { student: stu });
    return stu;
  }

  // --------------------------------------------------------------------------
  // 2. 登錄測驗成績、完整試卷與錯題紀錄 (同步至 GAS Google 試算表)
  // --------------------------------------------------------------------------
  async submitExamResult({ stage, score, correctCount, totalQuestions, durationSec, answersDetail, paperKey = 'basic', paperTitle = '' }) {
    const stu = this.getCurrentStudent();
    if (!stu) throw new Error('尚未登入學生身分');

    const passed = score >= APP_CONFIG.passScore;
    const stars = score === 100 ? 3 : score >= 80 ? 2 : score >= 60 ? 1 : 0;
    const timestamp = this.formatNow();
    const examId = 'EX_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    const fullStageTitle = paperTitle ? `${stage.title}・${paperTitle}` : stage.title;

    const examRecord = {
      examId,
      studentKey: stu.studentKey,
      school: stu.school,
      className: stu.className,
      seatNo: stu.seatNo,
      studentName: stu.name,
      characterId: stu.characterId,
      stageId: stage.id,
      stageTitle: fullStageTitle,
      paperKey,
      paperTitle,
      score,
      correctCount,
      totalQuestions,
      stars,
      passed,
      durationSec,
      timestamp,
      answersDetail
    };

    // 1. 存入本機試卷資料庫 (雙重防護：3秒內相同學生與相同試卷重複觸發視為連點，安全略過)
    const exams = this.getLocalList(STORAGE_KEYS.EXAMS_DB);
    if (exams.length > 0) {
      const lastExam = exams[0];
      const nowMs = Date.now();
      const lastExamMs = lastExam.examId ? Number(lastExam.examId.split('_')[1] || 0) : 0;
      if (
        lastExam.studentKey === stu.studentKey &&
        lastExam.stageId === stage.id &&
        lastExam.paperKey === paperKey &&
        (nowMs - lastExamMs < 3000)
      ) {
        console.warn('偵測到重複交卷連點，安全略過第二次寫入');
        return {
          examRecord: lastExam,
          student: stu,
          expEarned: 0,
          bountyEarned: 0,
          syncedToCloud: true
        };
      }
    }
    exams.unshift(examRecord);
    this.saveLocalList(STORAGE_KEYS.EXAMS_DB, exams);

    // 2. 更新學生經驗值、懸賞金與過關狀態
    const expEarned = passed ? Math.round(stage.expReward * (score / 100)) : 20;
    const bountyEarned = passed ? Math.round(stage.bountyReward * (score / 100)) : 50000;

    stu.exp = (stu.exp || 0) + expEarned;
    stu.bounty = (stu.bounty || 0) + bountyEarned;
    stu.lastActive = timestamp;
    if (passed && !stu.completedStages.includes(stage.id)) {
      stu.completedStages.push(stage.id);
    }
    stu.stageStars = stu.stageStars || {};
    stu.stageBestScores = stu.stageBestScores || {};
    stu.stageStars[stage.id] = Math.max(stu.stageStars[stage.id] || 0, stars);
    stu.stageBestScores[stage.id] = Math.max(stu.stageBestScores[stage.id] || 0, score);

    localStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT, JSON.stringify(stu));
    const students = this.getLocalList(STORAGE_KEYS.STUDENTS_DB);
    const sIdx = students.findIndex(s => s.studentKey === stu.studentKey);
    if (sIdx !== -1) {
      students[sIdx] = stu;
    } else {
      students.push(stu);
    }
    this.saveLocalList(STORAGE_KEYS.STUDENTS_DB, students);

    // 3. 記錄錯題至錯題資料庫
    const wrongList = this.getLocalList(STORAGE_KEYS.WRONG_DB);
    const newWrongItems = [];
    answersDetail.forEach(ans => {
      if (!ans.isCorrect) {
        const wItem = {
          id: 'WR_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          studentKey: stu.studentKey,
          school: stu.school,
          className: stu.className,
          seatNo: stu.seatNo,
          studentName: stu.name,
          stageId: stage.id,
          stageTitle: stage.title,
          qId: ans.qId,
          concept: ans.concept,
          prompt: ans.prompt,
          userAnswer: ans.userAnswer,
          correctAnswer: ans.correctAnswer,
          timestamp,
          mastered: false
        };
        wrongList.unshift(wItem);
        newWrongItems.push(wItem);
      } else {
        // 如果之前錯過的題目這次答對了，可標記為已複習掌握
        wrongList.forEach(w => {
          if (w.studentKey === stu.studentKey && w.qId === ans.qId) {
            w.mastered = true;
          }
        });
      }
    });
    this.saveLocalList(STORAGE_KEYS.WRONG_DB, wrongList);

    // 4. 同步傳送至 GAS Google 試算表
    const gasRes = await this.postToGas('submitExam', {
      student: stu,
      examRecord,
      wrongItems: newWrongItems
    });

    return {
      examRecord,
      student: stu,
      expEarned,
      bountyEarned,
      syncedToCloud: Boolean(gasRes && gasRes.ok)
    };
  }

  // 取得當前學生的歷史試卷與錯題 (寬鬆比對校名與班級座號，避免大小寫或補零差異)
  getStudentExams(studentKey, currentStudentObj = null) {
    const list = this.getLocalList(STORAGE_KEYS.EXAMS_DB);
    if (!studentKey && !currentStudentObj) return [];
    
    return list.filter(e => {
      if (e.studentKey === studentKey) return true;
      if (currentStudentObj) {
        const sameSchool = String(e.school || '').trim().toLowerCase() === String(currentStudentObj.school || '').trim().toLowerCase();
        const sameClass = String(e.className || '').trim().toLowerCase() === String(currentStudentObj.className || '').trim().toLowerCase();
        const sameSeat = Number(e.seatNo) === Number(currentStudentObj.seatNo);
        if (sameSchool && sameClass && sameSeat) return true;
      }
      return false;
    });
  }

  getStudentWrongQuestions(studentKey, currentStudentObj = null) {
    const list = this.getLocalList(STORAGE_KEYS.WRONG_DB);
    if (!studentKey && !currentStudentObj) return [];

    return list.filter(w => {
      if (w.studentKey === studentKey) return true;
      if (currentStudentObj) {
        const sameSchool = String(w.school || '').trim().toLowerCase() === String(currentStudentObj.school || '').trim().toLowerCase();
        const sameClass = String(w.className || '').trim().toLowerCase() === String(currentStudentObj.className || '').trim().toLowerCase();
        const sameSeat = Number(w.seatNo) === Number(currentStudentObj.seatNo);
        if (sameSchool && sameClass && sameSeat) return true;
      }
      return false;
    });
  }

  markWrongQuestionMastered(wrongId) {
    const wrongList = this.getLocalList(STORAGE_KEYS.WRONG_DB);
    const item = wrongList.find(w => w.id === wrongId);
    if (item) {
      item.mastered = true;
      this.saveLocalList(STORAGE_KEYS.WRONG_DB, wrongList);
    }
  }

  // --------------------------------------------------------------------------
  // 3. 教師註冊 (最多5個班級) 與登入管理
  // --------------------------------------------------------------------------
  async registerTeacher({ username, password, name, school, classes }) {
    const cleanUser = username.trim();
    const cleanSchool = school.trim();
    const cleanClasses = Array.from(new Set(classes.map(c => c.trim()).filter(Boolean)));

    if (!cleanUser || !password || !cleanSchool) {
      throw new Error('請填寫完整的帳號、密碼與任教學校！');
    }
    if (cleanClasses.length === 0) {
      throw new Error('請至少選擇或輸入 1 個任課班級！');
    }
    if (cleanClasses.length > APP_CONFIG.maxTeacherClasses) {
      throw new Error(`最多只能選擇 ${APP_CONFIG.maxTeacherClasses} 個班級！`);
    }

    const teachers = this.getLocalList(STORAGE_KEYS.TEACHERS_DB);
    const existingIdx = teachers.findIndex(t => t.username.toLowerCase() === cleanUser.toLowerCase());

    const teacherObj = {
      username: cleanUser,
      password,
      name: (name || '').trim() || `${cleanSchool}數學老師`,
      school: cleanSchool,
      classes: cleanClasses,
      createdAt: new Date().toISOString()
    };

    if (existingIdx !== -1) {
      teachers[existingIdx] = teacherObj;
    } else {
      teachers.push(teacherObj);
    }
    this.saveLocalList(STORAGE_KEYS.TEACHERS_DB, teachers);

    // 同步至 GAS
    const gasRes = await this.postToGas('registerTeacher', { teacher: teacherObj });
    return { teacher: teacherObj, syncedToCloud: Boolean(gasRes && gasRes.ok) };
  }

  async loginTeacher(username, password) {
    const cleanUser = (username || '').trim();
    // 若有設定 GAS，可先向雲端驗證或同步教師資料
    if (this.isGasConfigured()) {
      const gasRes = await this.postToGas('loginTeacher', { username: cleanUser, password });
      if (gasRes && gasRes.ok && gasRes.teacher) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_TEACHER, JSON.stringify(gasRes.teacher));
        return gasRes.teacher;
      }
    }

    const teachers = this.getLocalList(STORAGE_KEYS.TEACHERS_DB);
    const found = teachers.find(
      t => t.username.toLowerCase() === cleanUser.toLowerCase() && t.password === password
    );
    if (!found) {
      throw new Error('帳號或密碼錯誤！若尚未註冊，請先至教師專屬註冊網頁註冊。');
    }
    localStorage.setItem(STORAGE_KEYS.CURRENT_TEACHER, JSON.stringify(found));
    return found;
  }

  getCurrentTeacher() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_TEACHER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  logoutTeacher() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_TEACHER);
  }

  // 老師查詢任課學校與班級的資料 (支援從雲端 GAS 拉取最新資料並與本機整合)
  async queryTeacherDashboardData(teacher, selectedClass = 'ALL') {
    if (this.isGasConfigured()) {
      const res = await this.postToGas('queryTeacherData', {
        school: teacher.school,
        classes: teacher.classes
      });
      if (res && res.ok) {
        if (Array.isArray(res.students)) this.saveLocalList(STORAGE_KEYS.STUDENTS_DB, res.students);
        if (Array.isArray(res.exams)) this.saveLocalList(STORAGE_KEYS.EXAMS_DB, res.exams);
        if (Array.isArray(res.wrongQuestions)) this.saveLocalList(STORAGE_KEYS.WRONG_DB, res.wrongQuestions);
      }
    }

    const allowedClasses = (teacher.classes || []).map(c => String(c).trim().toLowerCase());
    const cleanTeacherSchool = String(teacher.school || '').trim().toLowerCase();

    const filterByClass = item => {
      const itemSchool = String(item.school || '').trim().toLowerCase();
      const itemClass = String(item.className || '').trim().toLowerCase();

      // 學校名稱比對 (不分大小寫)
      if (itemSchool !== cleanTeacherSchool) return false;

      // 班級比對
      if (selectedClass && selectedClass !== 'ALL') {
        return itemClass === String(selectedClass).trim().toLowerCase();
      }
      return allowedClasses.includes(itemClass);
    };

    let students = this.getLocalList(STORAGE_KEYS.STUDENTS_DB)
      .filter(filterByClass);

    const exams = this.getLocalList(STORAGE_KEYS.EXAMS_DB).filter(filterByClass);
    const wrongQuestions = this.getLocalList(STORAGE_KEYS.WRONG_DB).filter(filterByClass);

    // 關鍵修復：若學生名冊中尚無資料，但測驗歷程中有紀錄，自動聚合產生學生名單，確保老師後台永不漏失學生
    const existingStudentKeys = new Set(students.map(s => `${s.school}_${s.className}_${Number(s.seatNo)}`.toLowerCase()));
    exams.forEach(e => {
      const sKey = `${e.school}_${e.className}_${Number(e.seatNo)}`.toLowerCase();
      if (!existingStudentKeys.has(sKey)) {
        existingStudentKeys.add(sKey);
        students.push({
          studentKey: `${e.school}_${e.className}_${e.seatNo}`,
          school: e.school,
          className: e.className,
          seatNo: e.seatNo,
          name: e.studentName || `海賊同學#${e.seatNo}`,
          characterId: e.characterId || 'luffy',
          exp: 100,
          bounty: 3000000,
          completedStages: [e.stageId],
          lastActive: e.timestamp || ''
        });
      }
    });

    students.sort((a, b) => a.className.localeCompare(b.className) || Number(a.seatNo) - Number(b.seatNo));

    return {
      students,
      exams,
      wrongQuestions
    };
  }

  // 學生端向雲端 GAS 同步自身歷次作答卷與錯題本
  async syncStudentCloudData(stu) {
    if (!this.isGasConfigured() || !stu) return null;
    try {
      const res = await this.postToGas('queryTeacherData', {
        school: stu.school,
        classes: [stu.className]
      });
      if (res && res.ok) {
        const cleanSchool = String(stu.school || '').trim().toLowerCase();
        const cleanClass = String(stu.className || '').trim().toLowerCase();
        const cleanSeat = Number(stu.seatNo);

        const isCurrentStudent = item => {
          const itemSchool = String(item.school || '').trim().toLowerCase();
          const itemClass = String(item.className || '').trim().toLowerCase();
          const itemSeat = Number(item.seatNo);
          return itemSchool === cleanSchool && itemClass === cleanClass && itemSeat === cleanSeat;
        };

        // 1. 合併試卷歷程
        if (Array.isArray(res.exams)) {
          const cloudExams = res.exams.filter(isCurrentStudent);
          const localExams = this.getLocalList(STORAGE_KEYS.EXAMS_DB);
          const examMap = new Map();
          cloudExams.forEach(e => examMap.set(e.examId, e));
          localExams.forEach(e => {
            if (!examMap.has(e.examId)) examMap.set(e.examId, e);
          });
          this.saveLocalList(STORAGE_KEYS.EXAMS_DB, Array.from(examMap.values()));
        }

        // 2. 合併錯題庫
        if (Array.isArray(res.wrongQuestions)) {
          const cloudWrongs = res.wrongQuestions.filter(isCurrentStudent);
          const localWrongs = this.getLocalList(STORAGE_KEYS.WRONG_DB);
          const wrongMap = new Map();
          cloudWrongs.forEach(w => wrongMap.set(w.id, w));
          localWrongs.forEach(w => {
            if (!wrongMap.has(w.id)) wrongMap.set(w.id, w);
          });
          this.saveLocalList(STORAGE_KEYS.WRONG_DB, Array.from(wrongMap.values()));
        }

        return true;
      }
    } catch (e) {
      console.warn('雲端同步失敗（離線使用）:', e);
    }
    return false;
  }

  formatNow() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}

const dataService = new DataService();
