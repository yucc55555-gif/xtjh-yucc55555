/**
 * ============================================================================
 * 小叮噹(哆啦A夢) 國中數學歷屆基會考 RPG 線上測驗系統 - Google Apps Script (GAS) 後端
 * ============================================================================
 * 功能包含：
 * 1. 自動建立與初始化 Google 試算表工作表 (Teachers, QuizRecords, WrongQuestions)
 * 2. 老師註冊 (最多勾選 5 個年級班級 + 其他自訂最多 5 個班級)、老師登入、修改任課班級
 * 3. 老師查詢任課學校與班級學生的歷次成績、作答完整卷、錯題統計
 * 4. 學生以「學校、班級、座號」登入、登錄 RPG 測驗成績與完整作答明細
 * 5. 學生查詢歷史成績、檢視完整作答卷、錯題複習與訂正狀態更新
 *
 * 部署說明：
 * 1. 建立一份新的 Google 試算表 (Google Sheets)，點選「擴充功能」>「Apps Script」
 * 2. 將本檔案內容完整貼入 Code.gs 並儲存
 * 3. 點選右上角「部署」>「新增部署作業」
 *    - 選取類型：「網頁應用程式 (Web App)」
 *    - 執行身分：「我 (Me)」
 *    - 誰可以存取：「所有人 (Anyone)」
 * 4. 複製部署後的「網頁應用程式網址 (Web App URL)」，貼入前端測驗系統的「GAS 連動設定」即可！
 * ============================================================================
 */

const SHEET_NAMES = {
  TEACHERS: 'Teachers',
  QUIZ_RECORDS: 'QuizRecords',
  WRONG_QUESTIONS: 'WrongQuestions'
};

/**
 * 取得並自動初始化試算表各工作表與標題列
 */
function getOrInitSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. 老師註冊表
  let teacherSheet = ss.getSheetByName(SHEET_NAMES.TEACHERS);
  if (!teacherSheet) {
    teacherSheet = ss.insertSheet(SHEET_NAMES.TEACHERS);
    teacherSheet.appendRow([
      'teacherId',
      'school',
      'username',
      'name',
      'password',
      'standardClassesJson',
      'customClassesJson',
      'allClassesJson',
      'createdAt',
      'updatedAt'
    ]);
    teacherSheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#00A0E9').setFontColor('#FFFFFF');
    teacherSheet.setFrozenRows(1);
  }

  // 2. 學生測驗成績與完整作答卷表
  let recordSheet = ss.getSheetByName(SHEET_NAMES.QUIZ_RECORDS);
  if (!recordSheet) {
    recordSheet = ss.insertSheet(SHEET_NAMES.QUIZ_RECORDS);
    recordSheet.appendRow([
      'recordId',
      'timestamp',
      'school',
      'className',
      'seatNo',
      'studentName',
      'gradeId',
      'gradeName',
      'chapterCode',
      'chapterName',
      'mode',
      'score',
      'correctCount',
      'totalCount',
      'durationSec',
      'answersJson'
    ]);
    recordSheet.getRange(1, 1, 1, 16).setFontWeight('bold').setBackground('#00A0E9').setFontColor('#FFFFFF');
    recordSheet.setFrozenRows(1);
  }

  // 3. 學生錯題複習紀錄表
  let wrongSheet = ss.getSheetByName(SHEET_NAMES.WRONG_QUESTIONS);
  if (!wrongSheet) {
    wrongSheet = ss.insertSheet(SHEET_NAMES.WRONG_QUESTIONS);
    wrongSheet.appendRow([
      'key',
      'school',
      'className',
      'seatNo',
      'questionId',
      'gradeId',
      'chapterCode',
      'wrongCount',
      'lastChosen',
      'mastered',
      'updatedAt'
    ]);
    wrongSheet.getRange(1, 1, 1, 11).setFontWeight('bold').setBackground('#E60012').setFontColor('#FFFFFF');
    wrongSheet.setFrozenRows(1);
  }

  return { ss, teacherSheet, recordSheet, wrongSheet };
}

/**
 * 處理 GET 請求 (支援 API 查詢與健康檢查)
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || 'ping';
    const result = routeAction(action, params);
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message || String(err) });
  }
}

/**
 * 處理 POST 請求 (使用 text/plain JSON 避免 CORS 預檢問題)
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }
    const action = payload.action || 'ping';
    const result = routeAction(action, payload);
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message || String(err) });
  }
}

/**
 * 路由分發各項 API Action
 */
function routeAction(action, data) {
  const sheets = getOrInitSheets();

  switch (action) {
    case 'ping':
    case 'getInitData':
      return handleGetInitData(sheets);

    case 'registerTeacher':
      return handleRegisterTeacher(sheets, data);

    case 'loginTeacher':
      return handleLoginTeacher(sheets, data);

    case 'updateTeacherClasses':
      return handleUpdateTeacherClasses(sheets, data);

    case 'getTeacherReport':
      return handleGetTeacherReport(sheets, data);

    case 'submitQuiz':
      return handleSubmitQuiz(sheets, data);

    case 'getStudentData':
      return handleGetStudentData(sheets, data);

    case 'markWrongMastered':
      return handleMarkWrongMastered(sheets, data);

    default:
      return { ok: false, error: '未知的動作指令: ' + action };
  }
}

/**
 * 1. 取得初始學校與班級清單
 */
function handleGetInitData(sheets) {
  const rows = getSheetRows(sheets.teacherSheet);
  const schoolMap = {};
  rows.forEach(r => {
    const sch = String(r.school || '').trim();
    if (!sch) return;
    if (!schoolMap[sch]) schoolMap[sch] = new Set();
    try {
      const clsList = JSON.parse(r.allClassesJson || '[]');
      clsList.forEach(c => schoolMap[sch].add(String(c)));
    } catch (_) {}
  });

  const schools = Object.keys(schoolMap).map(sch => ({
    school: sch,
    classes: Array.from(schoolMap[sch])
  }));

  return {
    ok: true,
    serverTime: new Date().toISOString(),
    schools: schools
  };
}

/**
 * 2. 老師註冊 (驗證：每個年級30班勾選最多5班 + 其他自訂最多5班)
 */
function handleRegisterTeacher(sheets, data) {
  const school = String(data.school || '').trim();
  const username = String(data.username || '').trim();
  const name = String(data.name || username).trim();
  const password = String(data.password || '').trim();
  const standardClasses = Array.isArray(data.standardClasses) ? data.standardClasses.map(String) : [];
  const customClasses = Array.isArray(data.customClasses) ? data.customClasses.map(s => String(s).trim()).filter(Boolean) : [];

  if (!school || !username || !password) {
    return { ok: false, error: '請完整填寫學校、教師帳號與密碼！' };
  }
  if (standardClasses.length > 5) {
    return { ok: false, error: '年級班級勾選最多以 5 個班級為限！' };
  }
  if (customClasses.length > 5) {
    return { ok: false, error: '「其他」自訂輸入班級最多以 5 個班級為限！' };
  }

  const allClasses = Array.from(new Set([...standardClasses, ...customClasses]));
  if (allClasses.length === 0) {
    return { ok: false, error: '請至少選擇或輸入 1 個上課班級！' };
  }

  const rows = getSheetRows(sheets.teacherSheet);
  const exists = rows.find(r =>
    String(r.school).trim() === school &&
    String(r.username).trim().toLowerCase() === username.toLowerCase()
  );
  if (exists) {
    return { ok: false, error: '此學校已存在相同的教師帳號，請直接登入或更換帳號！' };
  }

  const now = new Date().toISOString();
  const teacherId = 'T_' + new Date().getTime();

  sheets.teacherSheet.appendRow([
    teacherId,
    school,
    username,
    name,
    password,
    JSON.stringify(standardClasses),
    JSON.stringify(customClasses),
    JSON.stringify(allClasses),
    now,
    now
  ]);

  return {
    ok: true,
    teacher: {
      teacherId,
      school,
      username,
      name,
      standardClasses,
      customClasses,
      allClasses,
      createdAt: now
    }
  };
}

/**
 * 3. 老師登入
 */
function handleLoginTeacher(sheets, data) {
  const school = String(data.school || '').trim();
  const username = String(data.username || '').trim();
  const password = String(data.password || '').trim();

  const rows = getSheetRows(sheets.teacherSheet);
  const found = rows.find(r => {
    const matchSchool = !school || String(r.school).trim() === school;
    const matchUser = String(r.username).trim().toLowerCase() === username.toLowerCase() ||
                      String(r.name).trim().toLowerCase() === username.toLowerCase();
    const matchPwd = String(r.password).trim() === password;
    return matchSchool && matchUser && matchPwd;
  });

  if (!found) {
    return { ok: false, error: '學校、教師帳號或密碼不正確，若為第一次登入請先完成「老師註冊」！' };
  }

  return {
    ok: true,
    teacher: {
      teacherId: found.teacherId,
      school: found.school,
      username: found.username,
      name: found.name,
      standardClasses: safeJsonParse(found.standardClassesJson, []),
      customClasses: safeJsonParse(found.customClassesJson, []),
      allClasses: safeJsonParse(found.allClassesJson, [])
    }
  };
}

/**
 * 4. 老師更新任課班級
 */
function handleUpdateTeacherClasses(sheets, data) {
  const teacherId = String(data.teacherId || '').trim();
  const school = String(data.school || '').trim();
  const username = String(data.username || '').trim();
  const standardClasses = Array.isArray(data.standardClasses) ? data.standardClasses.map(String) : [];
  const customClasses = Array.isArray(data.customClasses) ? data.customClasses.map(s => String(s).trim()).filter(Boolean) : [];

  if (standardClasses.length > 5) {
    return { ok: false, error: '年級班級勾選最多 5 班！' };
  }
  if (customClasses.length > 5) {
    return { ok: false, error: '其他自訂班級最多 5 班！' };
  }
  const allClasses = Array.from(new Set([...standardClasses, ...customClasses]));
  if (allClasses.length === 0) {
    return { ok: false, error: '請至少保留 1 個任課班級！' };
  }

  const sheet = sheets.teacherSheet;
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    const rowId = String(values[i][0]);
    const rowSchool = String(values[i][1]);
    const rowUser = String(values[i][2]);
    if ((teacherId && rowId === teacherId) || (rowSchool === school && rowUser === username)) {
      const now = new Date().toISOString();
      sheet.getRange(i + 1, 6).setValue(JSON.stringify(standardClasses));
      sheet.getRange(i + 1, 7).setValue(JSON.stringify(customClasses));
      sheet.getRange(i + 1, 8).setValue(JSON.stringify(allClasses));
      sheet.getRange(i + 1, 10).setValue(now);
      return {
        ok: true,
        standardClasses,
        customClasses,
        allClasses
      };
    }
  }
  return { ok: false, error: '找不到指定的教師資料！' };
}

/**
 * 5. 老師查詢任課學校與班級學生成績及作答情形
 */
function handleGetTeacherReport(sheets, data) {
  const school = String(data.school || '').trim();
  const classes = Array.isArray(data.classes) ? data.classes.map(String) : [];
  const classSet = new Set(classes);

  const allRecords = getSheetRows(sheets.recordSheet);
  const filteredRecords = allRecords.filter(r => {
    const matchSchool = !school || String(r.school).trim() === school;
    const matchClass = classSet.size === 0 || classSet.has(String(r.className).trim());
    return matchSchool && matchClass;
  }).map(r => ({
    recordId: r.recordId,
    timestamp: r.timestamp,
    school: r.school,
    className: String(r.className),
    seatNo: String(r.seatNo),
    studentName: r.studentName || '',
    gradeId: r.gradeId,
    gradeName: r.gradeName,
    chapterCode: r.chapterCode,
    chapterName: r.chapterName,
    mode: r.mode,
    score: Number(r.score || 0),
    correctCount: Number(r.correctCount || 0),
    totalCount: Number(r.totalCount || 0),
    durationSec: Number(r.durationSec || 0),
    answers: safeJsonParse(r.answersJson, [])
  }));

  const allWrongs = getSheetRows(sheets.wrongSheet);
  const filteredWrongs = allWrongs.filter(w => {
    const matchSchool = !school || String(w.school).trim() === school;
    const matchClass = classSet.size === 0 || classSet.has(String(w.className).trim());
    return matchSchool && matchClass;
  }).map(w => ({
    school: w.school,
    className: String(w.className),
    seatNo: String(w.seatNo),
    questionId: w.questionId,
    gradeId: w.gradeId,
    chapterCode: w.chapterCode,
    wrongCount: Number(w.wrongCount || 1),
    lastChosen: w.lastChosen,
    mastered: String(w.mastered) === 'true' || w.mastered === true,
    updatedAt: w.updatedAt
  }));

  return {
    ok: true,
    records: filteredRecords,
    wrongQuestions: filteredWrongs
  };
}

/**
 * 6. 學生提交 RPG 測驗成績與完整作答卷
 */
function handleSubmitQuiz(sheets, data) {
  const recordId = data.recordId || ('R_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000));
  const timestamp = data.timestamp || new Date().toISOString();
  const school = String(data.school || '').trim();
  const className = String(data.className || '').trim();
  const seatNo = String(data.seatNo || '').trim();
  const studentName = String(data.studentName || '').trim();
  const gradeId = String(data.gradeId || '');
  const gradeName = String(data.gradeName || '');
  const chapterCode = String(data.chapterCode || '');
  const chapterName = String(data.chapterName || '');
  const mode = String(data.mode || 'standard');
  const score = Number(data.score || 0);
  const correctCount = Number(data.correctCount || 0);
  const totalCount = Number(data.totalCount || 0);
  const durationSec = Number(data.durationSec || 0);
  const answers = Array.isArray(data.answers) ? data.answers : [];

  sheets.recordSheet.appendRow([
    recordId,
    timestamp,
    school,
    className,
    seatNo,
    studentName,
    gradeId,
    gradeName,
    chapterCode,
    chapterName,
    mode,
    score,
    correctCount,
    totalCount,
    durationSec,
    JSON.stringify(answers)
  ]);

  // 同步更新學生錯題本
  const wrongSheet = sheets.wrongSheet;
  const wrongValues = wrongSheet.getDataRange().getValues();
  const keyToRowIndex = {};
  for (let i = 1; i < wrongValues.length; i++) {
    keyToRowIndex[String(wrongValues[i][0])] = i + 1;
  }

  answers.forEach(ans => {
    const qid = String(ans.questionId || '');
    if (!qid) return;
    const key = `${school}__${className}__${seatNo}__${qid}`;
    const rowIdx = keyToRowIndex[key];

    if (!ans.isCorrect) {
      if (rowIdx) {
        const prevCount = Number(wrongValues[rowIdx - 1][7] || 0);
        wrongSheet.getRange(rowIdx, 8).setValue(prevCount + 1);
        wrongSheet.getRange(rowIdx, 9).setValue(String(ans.chosen || ''));
        wrongSheet.getRange(rowIdx, 10).setValue(false);
        wrongSheet.getRange(rowIdx, 11).setValue(timestamp);
      } else {
        wrongSheet.appendRow([
          key,
          school,
          className,
          seatNo,
          qid,
          gradeId,
          chapterCode,
          1,
          String(ans.chosen || ''),
          false,
          timestamp
        ]);
      }
    } else if (rowIdx && data.mode === 'wrong_review') {
      wrongSheet.getRange(rowIdx, 10).setValue(true);
      wrongSheet.getRange(rowIdx, 11).setValue(timestamp);
    }
  });

  return {
    ok: true,
    recordId,
    timestamp
  };
}

/**
 * 7. 學生查詢個人歷史成績、完整作答卷與錯題清單
 */
function handleGetStudentData(sheets, data) {
  const school = String(data.school || '').trim();
  const className = String(data.className || '').trim();
  const seatNo = String(data.seatNo || '').trim();

  const allRecords = getSheetRows(sheets.recordSheet);
  const myRecords = allRecords.filter(r =>
    String(r.school).trim() === school &&
    String(r.className).trim() === className &&
    String(r.seatNo).trim() === seatNo
  ).map(r => ({
    recordId: r.recordId,
    timestamp: r.timestamp,
    school: r.school,
    className: String(r.className),
    seatNo: String(r.seatNo),
    studentName: r.studentName || '',
    gradeId: r.gradeId,
    gradeName: r.gradeName,
    chapterCode: r.chapterCode,
    chapterName: r.chapterName,
    mode: r.mode,
    score: Number(r.score || 0),
    correctCount: Number(r.correctCount || 0),
    totalCount: Number(r.totalCount || 0),
    durationSec: Number(r.durationSec || 0),
    answers: safeJsonParse(r.answersJson, [])
  }));

  const allWrongs = getSheetRows(sheets.wrongSheet);
  const myWrongs = allWrongs.filter(w =>
    String(w.school).trim() === school &&
    String(w.className).trim() === className &&
    String(w.seatNo).trim() === seatNo
  ).map(w => ({
    questionId: w.questionId,
    gradeId: w.gradeId,
    chapterCode: w.chapterCode,
    wrongCount: Number(w.wrongCount || 1),
    lastChosen: w.lastChosen,
    mastered: String(w.mastered) === 'true' || w.mastered === true,
    updatedAt: w.updatedAt
  }));

  return {
    ok: true,
    records: myRecords,
    wrongQuestions: myWrongs
  };
}

/**
 * 8. 標記錯題已訂正學會
 */
function handleMarkWrongMastered(sheets, data) {
  const school = String(data.school || '').trim();
  const className = String(data.className || '').trim();
  const seatNo = String(data.seatNo || '').trim();
  const questionId = String(data.questionId || '').trim();
  const mastered = data.mastered !== false;
  const key = `${school}__${className}__${seatNo}__${questionId}`;

  const sheet = sheets.wrongSheet;
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === key) {
      sheet.getRange(i + 1, 10).setValue(mastered);
      sheet.getRange(i + 1, 11).setValue(new Date().toISOString());
      return { ok: true, key, mastered };
    }
  }
  return { ok: true, key, mastered };
}

/**
 * 輔助函式：讀取工作表所有列並轉為物件陣列
 */
function getSheetRows(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0].map(h => String(h).trim());
  const result = [];
  for (let i = 1; i < values.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[i][j];
    }
    result.push(obj);
  }
  return result;
}

function safeJsonParse(str, fallback) {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch (_) {
    return fallback;
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
