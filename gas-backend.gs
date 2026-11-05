/**
 * ============================================================================
 * 偉大航道七年級數學探險島 - Google Apps Script (GAS) 後端腳本
 * ============================================================================
 * 
 * 【部署說明】
 * 1. 打開 Google 雲端硬碟，建立一個新的 Google 試算表 (Google Sheet)，例如命名為「國中七年級數學探險島_資料庫」。
 * 2. 在試算表上方選單點選「擴充功能」->「Apps Script」。
 * 3. 將本檔案全部內容複製並貼上到 Apps Script 編輯器中（覆蓋 Code.gs 內容）。
 * 4. 點選右上角「部署」->「新部署作業」：
 *    - 種類選擇：「網頁應用程式 (Web App)」
 *    - 說明：輸入「v1」
 *    - 誰可以存取 (Who has access)：【務必選擇「所有人 (Anyone)」】
 *    - 執行身分 (Execute as)：【我 (Me)】
 * 5. 點擊「部署」，完成權限授予後，複製產生的「網頁應用程式網址 (Web App URL)」。
 * 6. 將此網址貼至探險島系統設定或 config.js 中的 defaultGasUrl 即可！
 */

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    var action = data.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    initSheets(ss);

    if (action === 'upsertStudent') {
      return handleUpsertStudent(ss, data.student);
    } else if (action === 'submitExam') {
      return handleSubmitExam(ss, data.student, data.examRecord, data.wrongItems);
    } else if (action === 'registerTeacher') {
      return handleRegisterTeacher(ss, data.teacher);
    } else if (action === 'loginTeacher') {
      return handleLoginTeacher(ss, data.username, data.password);
    } else if (action === 'queryTeacherData') {
      return handleQueryTeacherData(ss, data.school, data.classes);
    }

    return createJsonResponse({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return createJsonResponse({ ok: false, error: err.toString() });
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Great Line Math 7A GAS Backend is Online!");
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// 建立或取得試算表中的分頁
function initSheets(ss) {
  var sheets = {
    '學生名冊與進度': ['學生唯一碼', '學校', '班級', '座號', '姓名', '夥伴角色', '經驗值', '懸賞金', '已通過關卡數', '通過關卡列表', '最後活動時間'],
    '測驗成績與試卷': ['試卷ID', '時間', '學校', '班級', '座號', '姓名', '關卡代碼', '單元關卡名稱', '得分', '對題數', '總題數', '花費秒數', '是否及格', '完整作答歷程JSON'],
    '學生錯題庫': ['錯題ID', '時間', '學校', '班級', '座號', '姓名', '關卡代碼', '題號', '考點概念', '題目內文', '學生錯誤答案', '正確解答', '是否已複習'],
    '教師帳號管理': ['帳號', '密碼', '姓名', '學校', '任課班級(逗號隔開)', '註冊時間']
  };

  for (var name in sheets) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(sheets[name]);
      sheet.getRange(1, 1, 1, sheets[name].length).setFontWeight('bold').setBackground('#f3f4f6');
    }
  }
}

// 1. 更新或新增學生進度
function handleUpsertStudent(ss, stu) {
  var sheet = ss.getSheetByName('學生名冊與進度');
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == stu.studentKey) {
      rowIndex = i + 1;
      break;
    }
  }

  var completedStagesStr = Array.isArray(stu.completedStages) ? stu.completedStages.join(',') : (stu.completedStages || '');
  var rowData = [
    stu.studentKey,
    stu.school,
    stu.className,
    stu.seatNo,
    stu.name,
    stu.characterId,
    stu.exp || 0,
    stu.bounty || 0,
    Array.isArray(stu.completedStages) ? stu.completedStages.length : 0,
    completedStagesStr,
    stu.lastActive || new Date().toLocaleString()
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return createJsonResponse({ ok: true, student: stu });
}

// 2. 登記完整考試試卷與錯題
function handleSubmitExam(ss, stu, exam, wrongItems) {
  // 1) 試卷記錄
  var examSheet = ss.getSheetByName('測驗成績與試卷');
  var answersJson = JSON.stringify(exam.answersDetail || []);
  examSheet.appendRow([
    exam.examId,
    exam.timestamp,
    stu.school,
    stu.className,
    stu.seatNo,
    stu.name,
    exam.stageId,
    exam.stageTitle,
    exam.score,
    exam.correctCount,
    exam.totalQuestions,
    exam.durationSec,
    exam.passed ? '是' : '否',
    answersJson
  ]);

  // 2) 錯題記錄
  if (wrongItems && wrongItems.length > 0) {
    var wrongSheet = ss.getSheetByName('學生錯題庫');
    for (var i = 0; i < wrongItems.length; i++) {
      var w = wrongItems[i];
      wrongSheet.appendRow([
        w.id,
        w.timestamp,
        w.school,
        w.className,
        w.seatNo,
        w.studentName,
        w.stageId,
        w.qId,
        w.concept,
        w.prompt,
        w.userAnswer,
        w.correctAnswer,
        '否'
      ]);
    }
  }

  // 3) 同步更新學生資料
  if (stu) {
    handleUpsertStudent(ss, stu);
  } else {
    // 若前端未傳遞完整 stu，由試卷資訊自動更新名冊
    handleUpsertStudent(ss, {
      studentKey: exam.school + '_' + exam.className + '_' + exam.seatNo,
      school: exam.school,
      className: exam.className,
      seatNo: exam.seatNo,
      name: exam.studentName,
      characterId: exam.characterId || 'luffy',
      exp: exam.score,
      bounty: exam.score * 100000,
      completedStages: exam.passed ? [exam.stageId] : [],
      lastActive: exam.timestamp
    });
  }

  return createJsonResponse({ ok: true });
}

// 3. 教師註冊
function handleRegisterTeacher(ss, teacher) {
  var sheet = ss.getSheetByName('教師帳號管理');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === String(teacher.username).toLowerCase()) {
      // 帳號已存在，更新
      sheet.getRange(i + 1, 2, 1, 5).setValues([[
        teacher.password,
        teacher.name,
        teacher.school,
        teacher.classes.join(','),
        new Date().toLocaleString()
      ]]);
      return createJsonResponse({ ok: true, updated: true });
    }
  }

  sheet.appendRow([
    teacher.username,
    teacher.password,
    teacher.name,
    teacher.school,
    teacher.classes.join(','),
    teacher.createdAt || new Date().toLocaleString()
  ]);

  return createJsonResponse({ ok: true, registered: true });
}

// 4. 教師登入
function handleLoginTeacher(ss, username, password) {
  var sheet = ss.getSheetByName('教師帳號管理');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === String(username).toLowerCase() && String(data[i][1]) === String(password)) {
      var teacher = {
        username: data[i][0],
        name: data[i][2],
        school: data[i][3],
        classes: String(data[i][4]).split(',').map(function(c) { return c.trim(); })
      };
      return createJsonResponse({ ok: true, teacher: teacher });
    }
  }

  return createJsonResponse({ ok: false, error: '帳號或密碼不符' });
}

// 5. 老師查詢班級學生歷程、成績與錯題
function handleQueryTeacherData(ss, school, classes) {
  var classSet = {};
  var cleanSchool = String(school || '').trim().toLowerCase();
  for (var c = 0; c < (classes || []).length; c++) {
    classSet[String(classes[c]).trim().toLowerCase()] = true;
  }

  // 查詢學生名冊
  var stuSheet = ss.getSheetByName('學生名冊與進度');
  var students = [];
  if (stuSheet) {
    var stuRows = stuSheet.getDataRange().getValues();
    for (var i = 1; i < stuRows.length; i++) {
      var r = stuRows[i];
      var rSchool = String(r[1] || '').trim().toLowerCase();
      var rClass = String(r[2] || '').trim().toLowerCase();
      if ((!cleanSchool || rSchool === cleanSchool) && classSet[rClass]) {
        students.push({
          studentKey: String(r[0]),
          school: String(r[1]),
          className: String(r[2]),
          seatNo: String(r[3]),
          name: String(r[4]),
          characterId: String(r[5] || 'luffy'),
          exp: Number(r[6] || 0),
          bounty: Number(r[7] || 0),
          completedStages: r[9] ? String(r[9]).split(',').filter(Boolean) : [],
          lastActive: String(r[10] || '')
        });
      }
    }
  }

  // 查詢試卷歷程
  var examSheet = ss.getSheetByName('測驗成績與試卷');
  var exams = [];
  if (examSheet) {
    var examRows = examSheet.getDataRange().getValues();
    for (var j = 1; j < examRows.length; j++) {
      var er = examRows[j];
      var erSchool = String(er[2] || '').trim().toLowerCase();
      var erClass = String(er[3] || '').trim().toLowerCase();
      if ((!cleanSchool || erSchool === cleanSchool) && classSet[erClass]) {
        var answersDetail = [];
        try { answersDetail = JSON.parse(er[13]); } catch (e) {}
        exams.push({
          examId: String(er[0]),
          timestamp: String(er[1]),
          school: String(er[2]),
          className: String(er[3]),
          seatNo: String(er[4]),
          studentName: String(er[5]),
          stageId: String(er[6]),
          stageTitle: String(er[7]),
          score: Number(er[8]),
          correctCount: Number(er[9]),
          totalQuestions: Number(er[10]),
          durationSec: Number(er[11]),
          passed: String(er[12]) === '是',
          answersDetail: answersDetail
        });
      }
    }
  }

  // 查詢錯題庫
  var wrongSheet = ss.getSheetByName('學生錯題庫');
  var wrongQuestions = [];
  if (wrongSheet) {
    var wrongRows = wrongSheet.getDataRange().getValues();
    for (var k = 1; k < wrongRows.length; k++) {
      var wr = wrongRows[k];
      var wrSchool = String(wr[2] || '').trim().toLowerCase();
      var wrClass = String(wr[3] || '').trim().toLowerCase();
      if ((!cleanSchool || wrSchool === cleanSchool) && classSet[wrClass]) {
        wrongQuestions.push({
          id: String(wr[0]),
          timestamp: String(wr[1]),
          school: String(wr[2]),
          className: String(wr[3]),
          seatNo: String(wr[4]),
          studentName: String(wr[5]),
          stageId: String(wr[6]),
          qId: String(wr[7]),
          concept: String(wr[8]),
          prompt: String(wr[9]),
          userAnswer: String(wr[10]),
          correctAnswer: String(wr[11]),
          mastered: String(wr[12]) === '是'
        });
      }
    }
  }

  return createJsonResponse({
    ok: true,
    students: students,
    exams: exams,
    wrongQuestions: wrongQuestions
  });
}
