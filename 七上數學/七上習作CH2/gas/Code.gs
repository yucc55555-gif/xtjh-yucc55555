/**
 * 國中七上數學第二章《分數的運算》金庸武俠 RPG 線上測驗系統
 * Google Apps Script (GAS) 後端主程式
 * 
 * 功能支援：
 * 1. 自動建立與初始化 4 張試算表 (Teachers, Students, ExamRecords, Mistakes)
 * 2. 教師首次註冊（最多勾選 5 個班級）與登入
 * 3. 學生依班級+座號登入、歷程進度記錄
 * 4. 測驗成績與完整考卷作答明細 (answersJson) 登錄
 * 5. 錯題庫自動更新與掌握標記 (錯題複習)
 * 6. 教師端依任課班級查詢學生成績、個別完整考卷與全班易錯題統計
 */

const SHEET_NAMES = {
  TEACHERS: 'Teachers',
  STUDENTS: 'Students',
  EXAM_RECORDS: 'ExamRecords',
  MISTAKES: 'Mistakes'
};

/**
 * 初始化試算表結構與樣式（可手動在 GAS 編輯器執行此函數，亦會在接收請求時自動檢查）
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Teachers 表
  let teacherSheet = ss.getSheetByName(SHEET_NAMES.TEACHERS);
  if (!teacherSheet) {
    teacherSheet = ss.insertSheet(SHEET_NAMES.TEACHERS);
    const headers = ['教師編號(ID)', '教師姓名', '登入密碼', '任教班級(最多5班)', '註冊時間', '最後登入時間'];
    teacherSheet.appendRow(headers);
    styleHeaderRow(teacherSheet, headers.length);
  }

  // 2. Students 表
  let studentSheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);
  if (!studentSheet) {
    studentSheet = ss.insertSheet(SHEET_NAMES.STUDENTS);
    const headers = ['班級', '座號', '俠客稱號/姓名', '等級', '經驗值(EXP)', '門派', '最後活動時間'];
    studentSheet.appendRow(headers);
    styleHeaderRow(studentSheet, headers.length);
  }

  // 3. ExamRecords 表 (完整作答紀錄)
  let recordSheet = ss.getSheetByName(SHEET_NAMES.EXAM_RECORDS);
  if (!recordSheet) {
    recordSheet = ss.insertSheet(SHEET_NAMES.EXAM_RECORDS);
    const headers = [
      '測驗紀錄ID', '提交時間', '班級', '座號', '學生姓名', 
      '測驗章節', '金庸時代主題', '得分', '總分', '正確率(%)', 
      '耗時(秒)', '完整作答明細JSON'
    ];
    recordSheet.appendRow(headers);
    styleHeaderRow(recordSheet, headers.length);
  }

  // 4. Mistakes 表 (錯題庫)
  let mistakeSheet = ss.getSheetByName(SHEET_NAMES.MISTAKES);
  if (!mistakeSheet) {
    mistakeSheet = ss.insertSheet(SHEET_NAMES.MISTAKES);
    const headers = [
      '錯題ID', '記錄時間', '班級', '座號', '測驗章節', 
      '題號ID', '題目簡述', '學生錯誤作答', '正確解答', '是否已克服', '克服時間'
    ];
    mistakeSheet.appendRow(headers);
    styleHeaderRow(mistakeSheet, headers.length);
  }

  return { success: true, message: 'Google 試算表四張資料庫工作表初始化成功！' };
}

/** 美化標題列 */
function styleHeaderRow(sheet, colCount) {
  const headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setBackground('#2C3E50')
             .setFontColor('#FFFFFF')
             .setFontWeight('bold')
             .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

/**
 * 處理 POST 請求 (主要 API 入口)
 */
function doPost(e) {
  try {
    let params = {};
    if (e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (err) {
        params = e.parameter || {};
      }
    } else {
      params = e.parameter || {};
    }

    const action = params.action;
    const result = routeAction(action, params);
    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

/**
 * 處理 GET 請求 (提供狀態檢查與 JSONP 查詢支援)
 */
function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action || 'ping';

    if (action === 'ping') {
      return createJsonResponse({ 
        success: true, 
        status: 'online', 
        title: '七上數學第二章金庸武俠RPG線上測驗後端', 
        time: new Date().toISOString() 
      }, params.callback);
    }

    const result = routeAction(action, params);
    return createJsonResponse(result, params.callback);
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() }, e ? e.parameter?.callback : null);
  }
}

/**
 * 動作路由分流
 */
function routeAction(action, params) {
  setupSheets(); // 確保資料表結構存在
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  switch (action) {
    // 教師相關
    case 'registerTeacher':
      return handleRegisterTeacher(ss, params);
    case 'loginTeacher':
      return handleLoginTeacher(ss, params);
    case 'updateTeacherClasses':
      return handleUpdateTeacherClasses(ss, params);
    case 'getTeacherClassData':
      return handleGetTeacherClassData(ss, params);

    // 學生相關
    case 'loginStudent':
      return handleLoginStudent(ss, params);
    case 'submitQuiz':
      return handleSubmitQuiz(ss, params);
    case 'getStudentHistory':
      return handleGetStudentHistory(ss, params);
    case 'getStudentMistakes':
      return handleGetStudentMistakes(ss, params);
    case 'resolveMistake':
      return handleResolveMistake(ss, params);

    default:
      return { success: false, error: '未知的請求動作: ' + action };
  }
}

// ==========================================
// 教師端處理邏輯
// ==========================================

/** 教師首次註冊（限制最多 5 班） */
function handleRegisterTeacher(ss, params) {
  const teacherId = String(params.teacherId || '').trim();
  const name = String(params.name || '').trim();
  const password = String(params.password || '').trim();
  let classes = params.classes;

  if (!teacherId || !name || !password) {
    return { success: false, error: '教師代號、姓名與密碼皆為必填！' };
  }

  // 驗證班級數量上限
  if (typeof classes === 'string') {
    classes = classes.split(',').map(c => c.trim()).filter(Boolean);
  }
  if (!Array.isArray(classes) || classes.length === 0) {
    return { success: false, error: '請至少選擇一個任教班級！' };
  }
  if (classes.length > 5) {
    return { success: false, error: '任教班級最多只能選擇 5 個班級！' };
  }

  const sheet = ss.getSheetByName(SHEET_NAMES.TEACHERS);
  const data = sheet.getDataRange().getValues();

  // 檢查是否已註冊
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === teacherId.toLowerCase()) {
      return { success: false, error: '此教師代號已經被註冊過！請直接登入。' };
    }
  }

  const nowStr = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss');
  sheet.appendRow([
    teacherId,
    name,
    password,
    classes.join(','),
    nowStr,
    nowStr
  ]);

  return {
    success: true,
    message: '教師註冊成功！',
    teacher: {
      teacherId: teacherId,
      name: name,
      classes: classes
    }
  };
}

/** 教師登入 */
function handleLoginTeacher(ss, params) {
  const teacherId = String(params.teacherId || '').trim();
  const password = String(params.password || '').trim();

  if (!teacherId || !password) {
    return { success: false, error: '請提供教師代號與密碼！' };
  }

  const sheet = ss.getSheetByName(SHEET_NAMES.TEACHERS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === teacherId.toLowerCase()) {
      if (String(data[i][2]) === password) {
        // 更新最後登入時間
        const nowStr = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss');
        sheet.getRange(i + 1, 6).setValue(nowStr);

        const classesStr = String(data[i][3] || '');
        const classList = classesStr.split(',').map(c => c.trim()).filter(Boolean);

        return {
          success: true,
          message: '教師登入成功！',
          teacher: {
            teacherId: data[i][0],
            name: data[i][1],
            classes: classList
          }
        };
      } else {
        return { success: false, error: '密碼不正確，請重新輸入！' };
      }
    }
  }

  return { success: false, error: '找不到此教師帳號，若為首次使用請先完成註冊！' };
}

/** 教師更新任教班級（最多5班） */
function handleUpdateTeacherClasses(ss, params) {
  const teacherId = String(params.teacherId || '').trim();
  let classes = params.classes;

  if (typeof classes === 'string') {
    classes = classes.split(',').map(c => c.trim()).filter(Boolean);
  }
  if (!Array.isArray(classes) || classes.length === 0 || classes.length > 5) {
    return { success: false, error: '任教班級必須為 1 至 5 個班級！' };
  }

  const sheet = ss.getSheetByName(SHEET_NAMES.TEACHERS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === teacherId.toLowerCase()) {
      sheet.getRange(i + 1, 4).setValue(classes.join(','));
      return { success: true, message: '任教班級更新成功！', classes: classes };
    }
  }

  return { success: false, error: '找不到教師帳號！' };
}

/** 教師查詢特定任教班級的所有學生成績、作答明細與易錯題統計 */
function handleGetTeacherClassData(ss, params) {
  const classId = String(params.classId || '').trim();
  if (!classId) {
    return { success: false, error: '請提供要查詢的班級代碼！' };
  }

  // 1. 抓取該班學生名冊
  const studentSheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);
  const sData = studentSheet.getDataRange().getValues();
  const studentsMap = {};

  for (let i = 1; i < sData.length; i++) {
    if (String(sData[i][0]) === classId) {
      const seat = String(sData[i][1]);
      studentsMap[seat] = {
        classId: classId,
        seatNum: seat,
        name: sData[i][2],
        level: sData[i][3],
        exp: sData[i][4],
        sect: sData[i][5],
        lastActive: sData[i][6],
        records: [],
        mistakeCount: 0
      };
    }
  }

  // 2. 抓取該班所有測驗紀錄
  const recordSheet = ss.getSheetByName(SHEET_NAMES.EXAM_RECORDS);
  const rData = recordSheet.getDataRange().getValues();
  const classRecords = [];
  const questionErrorStats = {}; // 題目答錯率統計

  for (let i = 1; i < rData.length; i++) {
    if (String(rData[i][2]) === classId) {
      const record = {
        recordId: rData[i][0],
        timestamp: rData[i][1],
        classId: rData[i][2],
        seatNum: String(rData[i][3]),
        studentName: rData[i][4],
        chapterId: rData[i][5],
        chapterTitle: rData[i][6],
        eraName: rData[i][7],
        score: Number(rData[i][8]),
        totalScore: Number(rData[i][9]),
        accuracy: Number(rData[i][10]),
        timeSpentSeconds: Number(rData[i][11]),
        answersJson: rData[i][12]
      };
      classRecords.push(record);

      // 歸納到學生個別紀錄中
      if (!studentsMap[record.seatNum]) {
        studentsMap[record.seatNum] = {
          classId: classId,
          seatNum: record.seatNum,
          name: record.studentName,
          level: 1,
          exp: 0,
          records: [],
          mistakeCount: 0
        };
      }
      studentsMap[record.seatNum].records.push(record);

      // 解析作答明細統計錯題
      try {
        const answers = JSON.parse(record.answersJson || '[]');
        answers.forEach(ans => {
          const qKey = ans.questionId || ans.id;
          if (!questionErrorStats[qKey]) {
            questionErrorStats[qKey] = {
              questionId: qKey,
              title: ans.title || ans.questionText || '',
              chapterId: record.chapterId,
              totalAttempts: 0,
              wrongAttempts: 0
            };
          }
          questionErrorStats[qKey].totalAttempts++;
          if (!ans.isCorrect) {
            questionErrorStats[qKey].wrongAttempts++;
          }
        });
      } catch (e) {}
    }
  }

  // 3. 抓取該班尚未克服的錯題數
  const mistakeSheet = ss.getSheetByName(SHEET_NAMES.MISTAKES);
  const mData = mistakeSheet.getDataRange().getValues();
  for (let i = 1; i < mData.length; i++) {
    if (String(mData[i][2]) === classId) {
      const seat = String(mData[i][3]);
      const isResolved = mData[i][9] === true || String(mData[i][9]).toLowerCase() === 'true';
      if (!isResolved && studentsMap[seat]) {
        studentsMap[seat].mistakeCount++;
      }
    }
  }

  // 計算易錯題排行
  const errorRanking = Object.values(questionErrorStats)
    .filter(q => q.totalAttempts > 0)
    .map(q => ({
      ...q,
      errorRate: Math.round((q.wrongAttempts / q.totalAttempts) * 100)
    }))
    .sort((a, b) => b.errorRate - a.errorRate);

  return {
    success: true,
    classId: classId,
    students: Object.values(studentsMap).sort((a, b) => Number(a.seatNum) - Number(b.seatNum)),
    totalRecords: classRecords.length,
    errorRanking: errorRanking.slice(0, 10) // 前 10 大易錯難題
  };
}

// ==========================================
// 學生端處理邏輯
// ==========================================

/** 學生依班級座號登入 */
function handleLoginStudent(ss, params) {
  const classId = String(params.classId || '').trim();
  const seatNum = String(params.seatNum || '').trim();
  let name = String(params.name || '').trim();
  const sect = String(params.sect || '武當派').trim();

  if (!classId || !seatNum) {
    return { success: false, error: '請輸入班級與座號！' };
  }

  const sheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);
  const data = sheet.getDataRange().getValues();
  const nowStr = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === classId && String(data[i][1]) === seatNum) {
      // 學生已存在，更新最後活動時間與名稱（若有提供）
      if (name && name !== String(data[i][2])) {
        sheet.getRange(i + 1, 3).setValue(name);
      } else {
        name = String(data[i][2]);
      }
      sheet.getRange(i + 1, 7).setValue(nowStr);

      return {
        success: true,
        isNew: false,
        student: {
          classId: classId,
          seatNum: seatNum,
          name: name,
          level: Number(data[i][3]) || 1,
          exp: Number(data[i][4]) || 0,
          sect: data[i][5] || sect
        }
      };
    }
  }

  // 初次登入，自動建立學生資料
  if (!name) {
    name = classId + '班 ' + seatNum + '號 少俠';
  }

  sheet.appendRow([
    classId,
    seatNum,
    name,
    1, // 初始等級
    0, // 初始經驗
    sect,
    nowStr
  ]);

  return {
    success: true,
    isNew: true,
    student: {
      classId: classId,
      seatNum: seatNum,
      name: name,
      level: 1,
      exp: 0,
      sect: sect
    }
  };
}

/** 提交測驗作答結果（登錄到 ExamRecords 並更新 Mistakes） */
function handleSubmitQuiz(ss, params) {
  const classId = String(params.classId || '').trim();
  const seatNum = String(params.seatNum || '').trim();
  const studentName = String(params.studentName || '').trim();
  const chapterId = String(params.chapterId || '').trim();
  const chapterTitle = String(params.chapterTitle || '').trim();
  const eraName = String(params.eraName || '').trim();
  const score = Number(params.score || 0);
  const totalScore = Number(params.totalScore || 100);
  const timeSpentSeconds = Number(params.timeSpentSeconds || 0);
  const answers = params.answers || []; // 完整每題作答陣列

  if (!classId || !seatNum || !chapterId) {
    return { success: false, error: '缺少必要的測驗參數！' };
  }

  const now = new Date();
  const nowStr = Utilities.formatDate(now, 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss');
  const recordId = 'REC_' + now.getTime() + '_' + Math.floor(Math.random() * 1000);
  const accuracy = totalScore > 0 ? Math.round((score / totalScore) * 100) : 0;
  const answersJson = typeof answers === 'string' ? answers : JSON.stringify(answers);

  // 1. 寫入 ExamRecords
  const recordSheet = ss.getSheetByName(SHEET_NAMES.EXAM_RECORDS);
  recordSheet.appendRow([
    recordId,
    nowStr,
    classId,
    seatNum,
    studentName,
    chapterId,
    chapterTitle,
    eraName,
    score,
    totalScore,
    accuracy,
    timeSpentSeconds,
    answersJson
  ]);

  // 2. 處理錯題並記錄至 Mistakes
  const mistakeSheet = ss.getSheetByName(SHEET_NAMES.MISTAKES);
  const parsedAnswers = Array.isArray(answers) ? answers : JSON.parse(answersJson || '[]');
  let newMistakesCount = 0;

  parsedAnswers.forEach((ans, idx) => {
    if (!ans.isCorrect) {
      newMistakesCount++;
      const mistakeId = 'MST_' + classId + '_' + seatNum + '_' + (ans.questionId || idx);
      const qSummary = ans.title || ans.questionText || ('第 ' + (idx + 1) + ' 題');
      mistakeSheet.appendRow([
        mistakeId,
        nowStr,
        classId,
        seatNum,
        chapterId,
        ans.questionId || String(idx + 1),
        qSummary.substring(0, 150),
        String(ans.studentAnswer || ''),
        String(ans.correctAnswer || ''),
        false, // 尚未克服
        ''
      ]);
    }
  });

  // 3. 升級與增加學生經驗值
  const gainedExp = score * 5 + (accuracy === 100 ? 50 : 20);
  updateStudentExp(ss, classId, seatNum, gainedExp);

  return {
    success: true,
    message: '測驗成績與作答明細登錄成功！',
    recordId: recordId,
    score: score,
    gainedExp: gainedExp,
    newMistakesCount: newMistakesCount
  };
}

/** 增加學生經驗並計算等級 */
function updateStudentExp(ss, classId, seatNum, expToAdd) {
  const sheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === classId && String(data[i][1]) === seatNum) {
      const currentExp = Number(data[i][4]) || 0;
      const newExp = currentExp + expToAdd;
      // 每 100 EXP 升 1 級
      const newLevel = Math.max(1, Math.floor(newExp / 100) + 1);

      sheet.getRange(i + 1, 4).setValue(newLevel);
      sheet.getRange(i + 1, 5).setValue(newExp);
      break;
    }
  }
}

/** 查詢學生歷史測驗與完整考卷作答 */
function handleGetStudentHistory(ss, params) {
  const classId = String(params.classId || '').trim();
  const seatNum = String(params.seatNum || '').trim();

  if (!classId || !seatNum) {
    return { success: false, error: '請提供班級與座號！' };
  }

  const sheet = ss.getSheetByName(SHEET_NAMES.EXAM_RECORDS);
  const data = sheet.getDataRange().getValues();
  const history = [];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) === classId && String(data[i][3]) === seatNum) {
      history.push({
        recordId: data[i][0],
        timestamp: data[i][1],
        chapterId: data[i][5],
        chapterTitle: data[i][6],
        eraName: data[i][7],
        score: Number(data[i][8]),
        totalScore: Number(data[i][9]),
        accuracy: Number(data[i][10]),
        timeSpentSeconds: Number(data[i][11]),
        answersJson: data[i][12]
      });
    }
  }

  // 照時間倒序排列 (最新在最前)
  history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return { success: true, history: history };
}

/** 查詢學生未克服的錯題庫 */
function handleGetStudentMistakes(ss, params) {
  const classId = String(params.classId || '').trim();
  const seatNum = String(params.seatNum || '').trim();

  if (!classId || !seatNum) {
    return { success: false, error: '請提供班級與座號！' };
  }

  const sheet = ss.getSheetByName(SHEET_NAMES.MISTAKES);
  const data = sheet.getDataRange().getValues();
  const mistakes = [];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) === classId && String(data[i][3]) === seatNum) {
      const isResolved = data[i][9] === true || String(data[i][9]).toLowerCase() === 'true';
      if (!isResolved) {
        mistakes.push({
          rowId: i + 1,
          mistakeId: data[i][0],
          timestamp: data[i][1],
          chapterId: data[i][4],
          questionId: data[i][5],
          questionTitle: data[i][6],
          wrongAnswer: data[i][7],
          correctAnswer: data[i][8]
        });
      }
    }
  }

  return { success: true, mistakes: mistakes };
}

/** 學生錯題複習重新作答答對後，標記為已克服 */
function handleResolveMistake(ss, params) {
  const classId = String(params.classId || '').trim();
  const seatNum = String(params.seatNum || '').trim();
  const questionId = String(params.questionId || '').trim();

  if (!classId || !seatNum || !questionId) {
    return { success: false, error: '缺少參數！' };
  }

  const sheet = ss.getSheetByName(SHEET_NAMES.MISTAKES);
  const data = sheet.getDataRange().getValues();
  const nowStr = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss');
  let updated = false;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) === classId && 
        String(data[i][3]) === seatNum && 
        String(data[i][5]) === questionId) {
      sheet.getRange(i + 1, 10).setValue(true);
      sheet.getRange(i + 1, 11).setValue(nowStr);
      updated = true;
    }
  }

  return { success: true, updated: updated, message: '錯題已標記為克服！' };
}

// ==========================================
// 工具函數
// ==========================================

/** 建立 JSON / JSONP 回應 (支援跨網域) */
function createJsonResponse(data, callback) {
  const jsonString = JSON.stringify(data);
  let output;
  if (callback) {
    output = ContentService.createTextOutput(callback + '(' + jsonString + ');')
                           .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    output = ContentService.createTextOutput(jsonString)
                           .setMimeType(ContentService.MimeType.JSON);
  }
  return output;
}
