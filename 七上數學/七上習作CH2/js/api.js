/**
 * 國中七上數學第二章金庸武俠 RPG 線上測驗 - API 通訊層
 * 支援 Google Apps Script 雲端試算表串接，並內建 LocalStorage 離線模擬資料庫
 */

class ApiService {
  constructor() {
    this.storageKey = 'GAS_WEB_APP_URL';
    this.mockKey = 'WUXIA_MATH_MOCK_DB';
    this.gasUrl = localStorage.getItem(this.storageKey) || '';
    this.initMockDb();
  }

  // 初始化本機離線模擬資料庫
  initMockDb() {
    if (!localStorage.getItem(this.mockKey)) {
      const initialDb = {
        teachers: [
          {
            teacherId: 'T001',
            name: '張松溪老師 (範例)',
            password: '123',
            classes: ['701', '702', '703'],
            createdAt: '2026/10/29 20:00:00'
          }
        ],
        students: [
          {
            classId: '701',
            seatNum: '1',
            name: '701班 1號 少俠 (郭靖)',
            level: 3,
            exp: 280,
            sect: '武當派'
          }
        ],
        examRecords: [
          {
            recordId: 'REC_DEMO_01',
            timestamp: '2026/10/29 20:30:00',
            classId: '701',
            seatNum: '1',
            studentName: '701班 1號 少俠 (郭靖)',
            chapterId: 'ch2_1',
            chapterTitle: '2-1 因數與倍數',
            eraName: '第一回【春秋戰國·越女論劍】',
            score: 90,
            totalScore: 100,
            accuracy: 90,
            timeSpentSeconds: 245,
            answersJson: JSON.stringify([
              {
                questionId: '2-1-Q1',
                title: '因數的相乘與相加可能值',
                studentAnswer: 'A',
                correctAnswer: 'A',
                isCorrect: true,
                score: 10
              },
              {
                questionId: '2-1-Q4',
                title: '11 的倍數判別法',
                studentAnswer: 'C',
                correctAnswer: 'B',
                isCorrect: false,
                score: 0
              }
            ])
          }
        ],
        mistakes: [
          {
            mistakeId: 'MST_701_1_2-1-Q4',
            timestamp: '2026/10/29 20:30:00',
            classId: '701',
            seatNum: '1',
            chapterId: 'ch2_1',
            questionId: '2-1-Q4',
            questionTitle: '11 的倍數判別法',
            wrongAnswer: 'C',
            correctAnswer: 'B',
            isResolved: false
          }
        ]
      };
      localStorage.setItem(this.mockKey, JSON.stringify(initialDb));
    }
  }

  getMockDb() {
    return JSON.parse(localStorage.getItem(this.mockKey) || '{}');
  }

  saveMockDb(db) {
    localStorage.setItem(this.mockKey, JSON.stringify(db));
  }

  // 設定與檢查 GAS Web App URL
  setGasUrl(url) {
    this.gasUrl = (url || '').trim();
    if (this.gasUrl) {
      localStorage.setItem(this.storageKey, this.gasUrl);
    } else {
      localStorage.removeItem(this.storageKey);
    }
  }

  getGasUrl() {
    return this.gasUrl;
  }

  isGasConfigured() {
    return !!(this.gasUrl && this.gasUrl.startsWith('https://script.google.com/'));
  }

  // 統一請求發送
  async request(action, params = {}) {
    const payload = { action, ...params };

    // 若設定了 GAS 網址，優先連線 Google 雲端
    if (this.isGasConfigured()) {
      try {
        const response = await fetch(this.gasUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8' // 避免 CORS preflight 限制
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          // 若 GAS 操作成功，順便備份一份到本地離線庫
          this.syncToMockDb(action, params, result);
          return result;
        }
      } catch (err) {
        console.warn('Google 試算表連線失敗或遇到 CORS，切換至本機備援資料庫:', err);
      }
    }

    // 離線模擬資料庫處理
    return this.mockHandle(action, params);
  }

  // 離線模擬資料庫邏輯分流
  mockHandle(action, params) {
    const db = this.getMockDb();

    switch (action) {
      case 'ping':
        return { success: true, status: 'offline_mock', message: '本機離線模式運作中' };

      case 'registerTeacher': {
        const teacherId = String(params.teacherId || '').trim();
        const name = String(params.name || '').trim();
        const password = String(params.password || '').trim();
        const classes = Array.isArray(params.classes) ? params.classes : [];

        if (classes.length > 5) {
          return { success: false, error: '任教班級最多只能選擇 5 個班級！' };
        }
        if (db.teachers.some(t => t.teacherId.toLowerCase() === teacherId.toLowerCase())) {
          return { success: false, error: '此教師代號已被註冊！' };
        }

        const newTeacher = {
          teacherId,
          name,
          password,
          classes,
          createdAt: new Date().toLocaleString()
        };
        db.teachers.push(newTeacher);
        this.saveMockDb(db);

        return {
          success: true,
          message: '教師註冊成功 (本機保存)！',
          teacher: { teacherId, name, classes }
        };
      }

      case 'loginTeacher': {
        const teacherId = String(params.teacherId || '').trim();
        const password = String(params.password || '').trim();
        const teacher = db.teachers.find(t => t.teacherId.toLowerCase() === teacherId.toLowerCase());

        if (!teacher) {
          return { success: false, error: '找不到此教師帳號，若為首次使用請先完成註冊！' };
        }
        if (teacher.password !== password) {
          return { success: false, error: '密碼錯誤！' };
        }

        return {
          success: true,
          message: '教師登入成功！',
          teacher: {
            teacherId: teacher.teacherId,
            name: teacher.name,
            classes: teacher.classes
          }
        };
      }

      case 'getTeacherClassData': {
        const classId = String(params.classId || '').trim();
        const studentsMap = {};
        const questionStats = {};

        // 該班已登記學生
        db.students.filter(s => s.classId === classId).forEach(s => {
          studentsMap[s.seatNum] = {
            ...s,
            records: [],
            mistakeCount: 0
          };
        });

        // 該班測驗紀錄
        const records = db.examRecords.filter(r => r.classId === classId);
        records.forEach(r => {
          if (!studentsMap[r.seatNum]) {
            studentsMap[r.seatNum] = {
              classId,
              seatNum: r.seatNum,
              name: r.studentName,
              level: 1,
              exp: 0,
              sect: '武當派',
              records: [],
              mistakeCount: 0
            };
          }
          studentsMap[r.seatNum].records.push(r);

          try {
            const ansList = JSON.parse(r.answersJson || '[]');
            ansList.forEach(a => {
              const qid = a.questionId || a.id;
              if (!questionStats[qid]) {
                questionStats[qid] = {
                  questionId: qid,
                  title: a.title || a.questionText || '',
                  chapterId: r.chapterId,
                  totalAttempts: 0,
                  wrongAttempts: 0
                };
              }
              questionStats[qid].totalAttempts++;
              if (!a.isCorrect) questionStats[qid].wrongAttempts++;
            });
          } catch (e) {}
        });

        // 未克服錯題數
        db.mistakes.filter(m => m.classId === classId && !m.isResolved).forEach(m => {
          if (studentsMap[m.seatNum]) {
            studentsMap[m.seatNum].mistakeCount++;
          }
        });

        const errorRanking = Object.values(questionStats)
          .map(q => ({
            ...q,
            errorRate: Math.round((q.wrongAttempts / q.totalAttempts) * 100)
          }))
          .sort((a, b) => b.errorRate - a.errorRate);

        return {
          success: true,
          classId,
          students: Object.values(studentsMap).sort((a, b) => Number(a.seatNum) - Number(b.seatNum)),
          totalRecords: records.length,
          errorRanking: errorRanking.slice(0, 10)
        };
      }

      case 'loginStudent': {
        const classId = String(params.classId || '').trim();
        const seatNum = String(params.seatNum || '').trim();
        let name = String(params.name || '').trim();
        const sect = String(params.sect || '武當派').trim();

        let student = db.students.find(s => s.classId === classId && s.seatNum === seatNum);
        if (!student) {
          student = {
            classId,
            seatNum,
            name: name || `${classId}班 ${seatNum}號 少俠`,
            level: 1,
            exp: 0,
            sect
          };
          db.students.push(student);
          this.saveMockDb(db);
        } else if (name && student.name !== name) {
          student.name = name;
          this.saveMockDb(db);
        }

        return { success: true, student };
      }

      case 'submitQuiz': {
        const { classId, seatNum, studentName, chapterId, chapterTitle, eraName, score, totalScore, timeSpentSeconds, answers } = params;
        const nowStr = new Date().toLocaleString();
        const recordId = 'REC_' + Date.now();
        const answersJson = typeof answers === 'string' ? answers : JSON.stringify(answers || []);

        const record = {
          recordId,
          timestamp: nowStr,
          classId,
          seatNum,
          studentName,
          chapterId,
          chapterTitle,
          eraName,
          score,
          totalScore,
          accuracy: Math.round((score / totalScore) * 100),
          timeSpentSeconds,
          answersJson
        };
        db.examRecords.push(record);

        // 錯題登記
        const parsed = Array.isArray(answers) ? answers : JSON.parse(answersJson);
        parsed.forEach((ans, idx) => {
          if (!ans.isCorrect) {
            db.mistakes.push({
              mistakeId: `MST_${classId}_${seatNum}_${ans.questionId || idx}`,
              timestamp: nowStr,
              classId,
              seatNum,
              chapterId,
              questionId: ans.questionId || String(idx + 1),
              questionTitle: ans.title || ans.questionText || `第 ${idx + 1} 題`,
              wrongAnswer: String(ans.studentAnswer || ''),
              correctAnswer: String(ans.correctAnswer || ''),
              isResolved: false
            });
          }
        });

        // 學生升級經驗
        const student = db.students.find(s => s.classId === classId && s.seatNum === seatNum);
        const gainedExp = score * 5 + 20;
        if (student) {
          student.exp = (student.exp || 0) + gainedExp;
          student.level = Math.max(1, Math.floor(student.exp / 100) + 1);
        }
        this.saveMockDb(db);

        return {
          success: true,
          message: '測驗成績儲存成功！',
          recordId,
          score,
          gainedExp
        };
      }

      case 'getStudentHistory': {
        const { classId, seatNum } = params;
        const history = db.examRecords.filter(r => r.classId === classId && r.seatNum === seatNum);
        history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return { success: true, history };
      }

      case 'getStudentMistakes': {
        const { classId, seatNum } = params;
        const mistakes = db.mistakes.filter(m => m.classId === classId && m.seatNum === seatNum && !m.isResolved);
        return { success: true, mistakes };
      }

      case 'resolveMistake': {
        const { classId, seatNum, questionId } = params;
        db.mistakes.forEach(m => {
          if (m.classId === classId && m.seatNum === seatNum && m.questionId === questionId) {
            m.isResolved = true;
            m.resolvedAt = new Date().toLocaleString();
          }
        });
        this.saveMockDb(db);
        return { success: true, message: '錯題已標記克服！' };
      }

      default:
        return { success: false, error: '未知動作: ' + action };
    }
  }

  // 同步部分資料至本地資料庫以備斷網時查看
  syncToMockDb(action, params, result) {
    if (!result || !result.success) return;
    try {
      const db = this.getMockDb();
      if (action === 'submitQuiz') {
        this.mockHandle('submitQuiz', params);
      }
    } catch (e) {}
  }
}

// 全域 API 實例
window.apiService = new ApiService();
