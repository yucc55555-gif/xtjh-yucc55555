/**
 * 🌱 皮克敏歷屆會考數學 RPG 線上測驗系統 - Google Apps Script (GAS) 後端程式碼
 *
 * 【部署步驟說明】
 * 1. 建立一個新的 Google 試算表 (Google Sheets)
 * 2. 點選上方選單「擴充功能」 -> 「Apps Script」
 * 3. 將本檔案 (Code.gs) 的所有內容完整貼上，取代原本的程式碼，並按 Ctrl+S 儲存
 * 4. 點選右上角「部署」 -> 「新增部署作業」
 * 5. 左側齒輪選取類型：「網頁應用程式 (Web App)」
 *    - 執行身分：選擇「我 (Me)」
 *    - 誰可以存取：選擇「所有人 (Anyone)」
 * 6. 點選「部署」，授權後複製產生的「網頁應用程式網址 (https://script.google.com/macros/s/.../exec)」
 * 7. 貼入線上測驗系統右上角的「⚙️ 雲端試算表連線設定」即可（或直接修改前端預設網址）！
 *
 * 本腳本會在第一次收到請求時，自動在試算表建立三個工作表：
 * - Scores (學生測驗成績與完整作答卷紀錄)
 * - Teachers (教師註冊帳號與任課班級設定)
 * - WrongQuestions (學生錯題複習掌握狀態)
 */

const SHEET_SCORES = 'Scores';
const SHEET_TEACHERS = 'Teachers';
const SHEET_WRONG = 'WrongQuestions';

function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let scoreSheet = ss.getSheetByName(SHEET_SCORES);
  if (!scoreSheet) {
    scoreSheet = ss.insertSheet(SHEET_SCORES);
    scoreSheet.appendRow([
      'recordId',
      'timestamp',
      'school',
      'className',
      'seatNo',
      'studentName',
      'examYear',
      'mode',
      'score',
      'correctCount',
      'totalCount',
      'gradeBadge',
      'durationSec',
      'answersJson'
    ]);
    scoreSheet.getRange(1, 1, 1, 14).setFontWeight('bold').setBackground('#d9ead3');
    scoreSheet.setFrozenRows(1);
  }

  let teacherSheet = ss.getSheetByName(SHEET_TEACHERS);
  if (!teacherSheet) {
    teacherSheet = ss.insertSheet(SHEET_TEACHERS);
    teacherSheet.appendRow([
      'teacherId',
      'registeredAt',
      'school',
      'username',
      'passwordHash',
      'teacherName',
      'selectedClassesJson',
      'customClassesJson',
      'allClassesJson'
    ]);
    teacherSheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#fce5cd');
    teacherSheet.setFrozenRows(1);
  }

  let wrongSheet = ss.getSheetByName(SHEET_WRONG);
  if (!wrongSheet) {
    wrongSheet = ss.insertSheet(SHEET_WRONG);
    wrongSheet.appendRow([
      'studentKey',
      'school',
      'className',
      'seatNo',
      'questionId',
      'examYear',
      'qnum',
      'wrongCount',
      'mastered',
      'lastUpdated'
    ]);
    wrongSheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#f4cccc');
    wrongSheet.setFrozenRows(1);
  }

  return { ss, scoreSheet, teacherSheet, wrongSheet };
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeStr(v) {
  return String(v == null ? '' : v).trim();
}

function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = normalizeStr(params.action || 'ping');
    return handleAction(action, params);
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }
    const action = normalizeStr(payload.action || 'ping');
    return handleAction(action, payload);
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function handleAction(action, data) {
  const { scoreSheet, teacherSheet, wrongSheet } = initSheets();

  // 1. 系統連線測試 & 取得已註冊學校/班級清單
  if (action === 'ping' || action === 'init') {
    const schoolsMap = {};
    const tRows = teacherSheet.getDataRange().getValues();
    for (let i = 1; i < tRows.length; i++) {
      const sch = normalizeStr(tRows[i][2]);
      if (!sch) continue;
      if (!schoolsMap[sch]) schoolsMap[sch] = {};
      try {
        const clsList = JSON.parse(tRows[i][8] || '[]');
        clsList.forEach(c => { if (c) schoolsMap[sch][String(c).trim()] = true; });
      } catch (_) {}
    }
    const sRows = scoreSheet.getDataRange().getValues();
    for (let i = 1; i < sRows.length; i++) {
      const sch = normalizeStr(sRows[i][2]);
      const cls = normalizeStr(sRows[i][3]);
      if (!sch) continue;
      if (!schoolsMap[sch]) schoolsMap[sch] = {};
      if (cls) schoolsMap[sch][cls] = true;
    }
    const schools = Object.keys(schoolsMap).map(sch => ({
      school: sch,
      classes: Object.keys(schoolsMap[sch]).sort()
    }));
    return jsonResponse({
      ok: true,
      serverTime: new Date().toISOString(),
      schools: schools
    });
  }

  // 2. 學生儲存測驗成績與作答完整卷
  if (action === 'submitScore') {
    const school = normalizeStr(data.school);
    const className = normalizeStr(data.className);
    const seatNo = normalizeStr(data.seatNo);
    const studentName = normalizeStr(data.studentName || '');
    const examYear = normalizeStr(data.examYear);
    const mode = normalizeStr(data.mode || 'quiz');
    const score = Number(data.score || 0);
    const correctCount = Number(data.correctCount || 0);
    const totalCount = Number(data.totalCount || 0);
    const gradeBadge = normalizeStr(data.gradeBadge || '');
    const durationSec = Number(data.durationSec || 0);
    const answers = Array.isArray(data.answers) ? data.answers : [];

    if (!school || !className || !seatNo || !examYear) {
      return jsonResponse({ ok: false, error: '缺少學校、班級、座號或年份資訊' });
    }

    const recordId = 'REC_' + new Date().getTime() + '_' + Math.floor(Math.random() * 10000);
    const timestamp = new Date().toISOString();

    scoreSheet.appendRow([
      recordId,
      timestamp,
      school,
      className,
      seatNo,
      studentName,
      examYear,
      mode,
      score,
      correctCount,
      totalCount,
      gradeBadge,
      durationSec,
      JSON.stringify(answers)
    ]);

    // 同步更新錯題表 WrongQuestions
    updateWrongQuestionsSheet(wrongSheet, school, className, seatNo, examYear, answers);

    return jsonResponse({
      ok: true,
      recordId: recordId,
      timestamp: timestamp
    });
  }

  // 3. 學生查詢個人歷史成績、作答完整卷與錯題紀錄
  if (action === 'getStudentRecords') {
    const school = normalizeStr(data.school);
    const className = normalizeStr(data.className);
    const seatNo = normalizeStr(data.seatNo);

    if (!school || !className || !seatNo) {
      return jsonResponse({ ok: false, error: '請提供學校、班級與座號' });
    }

    const rows = scoreSheet.getDataRange().getValues();
    const records = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (
        normalizeStr(r[2]).toLowerCase() === school.toLowerCase() &&
        normalizeStr(r[3]).toLowerCase() === className.toLowerCase() &&
        normalizeStr(r[4]).toLowerCase() === seatNo.toLowerCase()
      ) {
        let parsedAnswers = [];
        try { parsedAnswers = JSON.parse(r[13] || '[]'); } catch (_) {}
        records.push({
          recordId: normalizeStr(r[0]),
          timestamp: normalizeStr(r[1]),
          school: normalizeStr(r[2]),
          className: normalizeStr(r[3]),
          seatNo: normalizeStr(r[4]),
          studentName: normalizeStr(r[5]),
          examYear: normalizeStr(r[6]),
          mode: normalizeStr(r[7]),
          score: Number(r[8] || 0),
          correctCount: Number(r[9] || 0),
          totalCount: Number(r[10] || 0),
          gradeBadge: normalizeStr(r[11]),
          durationSec: Number(r[12] || 0),
          answers: parsedAnswers
        });
      }
    }
    records.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    // 取得錯題掌握狀態
    const studentKey = [school.toLowerCase(), className.toLowerCase(), seatNo.toLowerCase()].join('|');
    const wRows = wrongSheet.getDataRange().getValues();
    const wrongState = {};
    for (let i = 1; i < wRows.length; i++) {
      if (normalizeStr(wRows[i][0]) === studentKey) {
        wrongState[normalizeStr(wRows[i][4])] = {
          questionId: normalizeStr(wRows[i][4]),
          examYear: normalizeStr(wRows[i][5]),
          qnum: Number(wRows[i][6] || 0),
          wrongCount: Number(wRows[i][7] || 1),
          mastered: Boolean(wRows[i][8])
        };
      }
    }

    return jsonResponse({
      ok: true,
      records: records,
      wrongState: wrongState
    });
  }

  // 4. 學生更新錯題複習狀態（標記已馴服/已掌握）
  if (action === 'markWrongMastered') {
    const school = normalizeStr(data.school);
    const className = normalizeStr(data.className);
    const seatNo = normalizeStr(data.seatNo);
    const questionId = normalizeStr(data.questionId);
    const mastered = Boolean(data.mastered);
    const studentKey = [school.toLowerCase(), className.toLowerCase(), seatNo.toLowerCase()].join('|');

    const wRows = wrongSheet.getDataRange().getValues();
    for (let i = 1; i < wRows.length; i++) {
      if (normalizeStr(wRows[i][0]) === studentKey && normalizeStr(wRows[i][4]) === questionId) {
        wrongSheet.getRange(i + 1, 9).setValue(mastered);
        wrongSheet.getRange(i + 1, 10).setValue(new Date().toISOString());
        return jsonResponse({ ok: true, questionId: questionId, mastered: mastered });
      }
    }
    return jsonResponse({ ok: true, questionId: questionId, mastered: mastered });
  }

  // 5. 老師註冊（含勾選最多5班 + 其他自訂最多5班）
  if (action === 'registerTeacher') {
    const school = normalizeStr(data.school);
    const username = normalizeStr(data.username);
    const password = normalizeStr(data.password);
    const teacherName = normalizeStr(data.teacherName || username);
    const selectedClasses = Array.isArray(data.selectedClasses) ? data.selectedClasses.slice(0, 5) : [];
    const customClasses = Array.isArray(data.customClasses) ? data.customClasses.slice(0, 5) : [];
    const allClasses = Array.isArray(data.allClasses)
      ? data.allClasses
      : selectedClasses.concat(customClasses);

    if (!school || !username || !password) {
      return jsonResponse({ ok: false, error: '請填寫學校、教師帳號與密碼' });
    }
    if (allClasses.length === 0) {
      return jsonResponse({ ok: false, error: '請至少選擇或輸入 1 個任課班級' });
    }

    const tRows = teacherSheet.getDataRange().getValues();
    for (let i = 1; i < tRows.length; i++) {
      if (
        normalizeStr(tRows[i][2]).toLowerCase() === school.toLowerCase() &&
        normalizeStr(tRows[i][3]).toLowerCase() === username.toLowerCase()
      ) {
        return jsonResponse({ ok: false, error: '此學校已有相同教師帳號，請直接登入或更換帳號名稱' });
      }
    }

    const teacherId = 'TCH_' + new Date().getTime();
    const now = new Date().toISOString();
    teacherSheet.appendRow([
      teacherId,
      now,
      school,
      username,
      password,
      teacherName,
      JSON.stringify(selectedClasses),
      JSON.stringify(customClasses),
      JSON.stringify(allClasses)
    ]);

    return jsonResponse({
      ok: true,
      teacher: {
        teacherId: teacherId,
        school: school,
        username: username,
        teacherName: teacherName,
        selectedClasses: selectedClasses,
        customClasses: customClasses,
        allClasses: allClasses
      }
    });
  }

  // 6. 老師登入
  if (action === 'loginTeacher') {
    const school = normalizeStr(data.school);
    const username = normalizeStr(data.username);
    const password = normalizeStr(data.password);

    const tRows = teacherSheet.getDataRange().getValues();
    for (let i = 1; i < tRows.length; i++) {
      const r = tRows[i];
      const matchSchool = !school || normalizeStr(r[2]).toLowerCase() === school.toLowerCase();
      if (
        matchSchool &&
        normalizeStr(r[3]).toLowerCase() === username.toLowerCase() &&
        normalizeStr(r[4]) === password
      ) {
        let sel = [], cus = [], all = [];
        try { sel = JSON.parse(r[6] || '[]'); } catch (_) {}
        try { cus = JSON.parse(r[7] || '[]'); } catch (_) {}
        try { all = JSON.parse(r[8] || '[]'); } catch (_) {}
        return jsonResponse({
          ok: true,
          teacher: {
            teacherId: normalizeStr(r[0]),
            school: normalizeStr(r[2]),
            username: normalizeStr(r[3]),
            teacherName: normalizeStr(r[5]),
            selectedClasses: sel,
            customClasses: cus,
            allClasses: all
          }
        });
      }
    }
    return jsonResponse({ ok: false, error: '帳號、學校或密碼錯誤，若尚未註冊請先點選「教師首次註冊」' });
  }

  // 7. 老師更新任課班級設定
  if (action === 'updateTeacherClasses') {
    const school = normalizeStr(data.school);
    const username = normalizeStr(data.username);
    const selectedClasses = Array.isArray(data.selectedClasses) ? data.selectedClasses.slice(0, 5) : [];
    const customClasses = Array.isArray(data.customClasses) ? data.customClasses.slice(0, 5) : [];
    const allClasses = Array.isArray(data.allClasses)
      ? data.allClasses
      : selectedClasses.concat(customClasses);

    const tRows = teacherSheet.getDataRange().getValues();
    for (let i = 1; i < tRows.length; i++) {
      if (
        normalizeStr(tRows[i][2]).toLowerCase() === school.toLowerCase() &&
        normalizeStr(tRows[i][3]).toLowerCase() === username.toLowerCase()
      ) {
        teacherSheet.getRange(i + 1, 7).setValue(JSON.stringify(selectedClasses));
        teacherSheet.getRange(i + 1, 8).setValue(JSON.stringify(customClasses));
        teacherSheet.getRange(i + 1, 9).setValue(JSON.stringify(allClasses));
        return jsonResponse({
          ok: true,
          selectedClasses: selectedClasses,
          customClasses: customClasses,
          allClasses: allClasses
        });
      }
    }
    return jsonResponse({ ok: false, error: '找不到對應的教師帳號' });
  }

  // 8. 老師查詢任課學校與班級學生的成績及完整作答情形
  if (action === 'getTeacherClassRecords') {
    const school = normalizeStr(data.school);
    const classes = Array.isArray(data.classes)
      ? data.classes.map(c => normalizeStr(c).toLowerCase())
      : (data.className ? [normalizeStr(data.className).toLowerCase()] : []);
    const examYear = normalizeStr(data.examYear || '');

    const rows = scoreSheet.getDataRange().getValues();
    const records = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const rSchool = normalizeStr(r[2]);
      const rClass = normalizeStr(r[3]);
      const rYear = normalizeStr(r[6]);

      if (school && rSchool.toLowerCase() !== school.toLowerCase()) continue;
      if (classes.length > 0 && classes.indexOf(rClass.toLowerCase()) === -1) continue;
      if (examYear && examYear !== 'ALL' && rYear !== examYear) continue;

      let parsedAnswers = [];
      try { parsedAnswers = JSON.parse(r[13] || '[]'); } catch (_) {}

      records.push({
        recordId: normalizeStr(r[0]),
        timestamp: normalizeStr(r[1]),
        school: rSchool,
        className: rClass,
        seatNo: normalizeStr(r[4]),
        studentName: normalizeStr(r[5]),
        examYear: rYear,
        mode: normalizeStr(r[7]),
        score: Number(r[8] || 0),
        correctCount: Number(r[9] || 0),
        totalCount: Number(r[10] || 0),
        gradeBadge: normalizeStr(r[11]),
        durationSec: Number(r[12] || 0),
        answers: parsedAnswers
      });
    }
    records.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    return jsonResponse({
      ok: true,
      records: records
    });
  }

  return jsonResponse({ ok: false, error: '未知的動作: ' + action });
}

function updateWrongQuestionsSheet(wrongSheet, school, className, seatNo, examYear, answers) {
  if (!Array.isArray(answers) || answers.length === 0) return;
  const studentKey = [school.toLowerCase(), className.toLowerCase(), seatNo.toLowerCase()].join('|');
  const rows = wrongSheet.getDataRange().getValues();
  const rowIndexByQid = {};
  for (let i = 1; i < rows.length; i++) {
    if (normalizeStr(rows[i][0]) === studentKey) {
      rowIndexByQid[normalizeStr(rows[i][4])] = {
        rowNum: i + 1,
        wrongCount: Number(rows[i][7] || 0)
      };
    }
  }
  const now = new Date().toISOString();
  answers.forEach(ans => {
    if (!ans || ans.type === 'boss') return;
    const qid = normalizeStr(ans.questionId || (examYear + '_mc_' + ans.qnum));
    if (!ans.isCorrect) {
      if (rowIndexByQid[qid]) {
        const info = rowIndexByQid[qid];
        wrongSheet.getRange(info.rowNum, 8).setValue(info.wrongCount + 1);
        wrongSheet.getRange(info.rowNum, 9).setValue(false);
        wrongSheet.getRange(info.rowNum, 10).setValue(now);
      } else {
        wrongSheet.appendRow([
          studentKey,
          school,
          className,
          seatNo,
          qid,
          examYear,
          Number(ans.qnum || 0),
          1,
          false,
          now
        ]);
      }
    }
  });
}
