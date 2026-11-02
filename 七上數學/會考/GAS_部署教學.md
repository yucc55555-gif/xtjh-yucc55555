# 🔔 小叮噹國中數學 RPG 線上測驗 — Google 試算表 (GAS) 成績登錄部署教學

本系統支援將**老師註冊與任課班級資料**、**學生歷次測驗成績與完整作答卷**、以及**學生錯題複習紀錄**即時同步登錄至您的 Google 試算表（Google Sheets）。同時內建「本機百寶袋快取」，即使尚未設定 GAS 網址，也可直接在瀏覽器上完整體驗所有功能！

---

## 步驟一：建立 Google 試算表並開啟 Apps Script

1. 前往 [Google 試算表 (Google Sheets)](https://docs.google.com/spreadsheets/) 並建立一份**空白試算表**。
2. 將試算表命名為：`小叮噹國中數學RPG測驗成績庫`。
3. 點選上方選單列的 **「擴充功能 (Extensions)」** -> **「Apps Script」**。

---

## 步驟二：貼上 `Code.gs` 程式碼

1. 在開啟的 Apps Script 編輯器中，將預設的 `function myFunction() {}` 全部刪除。
2. 打開本資料夾中的 [`Code.gs`](file:///c:/Users/hp/Desktop/七上數學/會考/Code.gs) 檔案，將裡面的程式碼**全選並複製**，完整貼入 Apps Script 編輯器中。
3. 按下 `Ctrl + S`（或點擊上方磁碟片圖示）儲存專案。
4. （選用）您可以在上方函式下拉選單選擇 `setupSheets` 並點選 **「執行 (Run)」**，系統會自動在您的試算表中建立三個工作表並設定好小叮噹藍色標題列：
   - **`Teachers`（教師註冊與任課班級）**：記錄註冊學校、帳號、教師姓名、密碼、勾選班級（最多 5 班）、自訂其他班級（最多 5 班）與全部任課班級。
   - **`QuizRecords`（學生測驗成績與作答完整卷）**：記錄測驗單號、時間、學校、班級、座號、姓名、年級冊別、章節、得分、答對題數、總題數、花費秒數與完整作答明細 JSON。
   - **`WrongQuestions`（學生錯題紀錄）**：記錄學生各題答錯次數、最後選擇選項、是否已透過記憶吐司複習訂正通過。

> 💡 即使不手動執行 `setupSheets`，當網頁第一次連線送出資料時，`Code.gs` 也會自動檢查並建立這三個工作表！

---

## 步驟三：部署為網頁應用程式 (Web App)

1. 點選 Apps Script 右上角的藍色按鈕 **「部署 (Deploy)」** -> **「新增部署作業 (New deployment)」**。
2. 點選左上角齒輪圖示 **「選取類型」** -> 勾選 **「網頁應用程式 (Web app)」**。
3. 填寫以下設定：
   - **說明**：`小叮噹數學 RPG 成績登錄 API v1`
   - **執行身分 (Execute as)**：選擇 **「我 (Me)」**
   - **誰可以存取 (Who has access)**：**務必選擇「所有人 (Anyone)」**（這樣學生與老師在前端測驗時才能免 Google 帳號授權直接寫入成績）。
4. 點選 **「部署 (Deploy)」**。
5. 若跳出「需要授權 (Authorize access)」視窗：
   - 點選「審查權限」-> 選擇您的 Google 帳號 -> 點選左下角「進階 (Advanced)」-> 點選「前往『...』(不安全)」-> 點選「允許 (Allow)」。
6. 部署完成後，複製畫面上的 **「網頁應用程式網址 (Web app URL)」**（格式為 `https://script.google.com/macros/s/AKfycb.../exec`）。

---

## 步驟四：在測驗網頁綁定 GAS 網址

### 方法 A：直接從網頁右上角設定（最方便）
1. 用瀏覽器打開 [`index.html`](file:///c:/Users/hp/Desktop/七上數學/會考/index.html)。
2. 點選導覽列右上角的 **「⚙️ 設定 GAS Google 試算表網址」** 按鈕。
3. 貼上剛剛複製的 `https://script.google.com/macros/s/.../exec` 網址，並點擊 **「🔔 儲存並測試連線」**。

### 方法 B：固定寫入全班共用的程式碼中
如果您希望將網頁放到學校伺服器或 GitHub Pages 讓全校師生打開就自動連線，無需每台電腦設定，只需打開 [`app.js`](file:///c:/Users/hp/Desktop/七上數學/會考/app.js) 第 24 行，將網址填入預設值即可：

```javascript
gasUrl: localStorage.getItem(STORAGE_KEYS.GAS_URL) || 'https://script.google.com/macros/s/您的部署ID/exec',
```
