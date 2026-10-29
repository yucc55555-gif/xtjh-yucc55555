# Google Apps Script (GAS) 與 Google 試算表部署指南

本測驗系統支援將成績、完整作答紀錄、錯題本與教師任教班級名冊即時同步至雲端 **Google 試算表**。
請依照以下 4 個簡單步驟完成設置：

---

## 步驟一：建立 Google 試算表

1. 開啟 [Google 雲端硬碟](https://drive.google.com/) 或 [Google 試算表](https://sheets.new/)。
2. 建立一份新的空白試算表，並為其命名（例如：`七上數學第二章RPG測驗成績冊`）。
3. **不用手動新增工作表**，系統程式碼會自動建立並美化：
   - `Teachers`（教師註冊與任教班級）
   - `Students`（學生帳號與經驗等級）
   - `ExamRecords`（測驗紀錄與每題詳細作答JSON）
   - `Mistakes`（未克服與已克服錯題庫）

---

## 步驟二：開啟 Apps Script 編輯器並貼上程式碼

1. 在試算表上方選單點選 **「擴充功能」 (Extensions)** ➔ **「Apps Script」**。
2. 進入 Apps Script 程式碼編輯器畫面。
3. 將預設檔案 `程式碼.gs`（或 `Code.gs`）裡面的內容清空。
4. 打開本機資料夾中的 `gas/Code.gs`，將全部程式碼複製並貼入編輯器中。
5. 點選工具列上方的 **「儲存」圖示（💾）** 或按下 `Ctrl + S`。

---

## 步驟三：部署為網頁應用程式 (Web App)

1. 點擊編輯器右上角的藍色按鈕 **「部署」 (Deploy)** ➔ 選擇 **「新增部署作業」 (New deployment)**。
2. 在左側齒輪圖示點選 **「選取類型」**，勾選 **「網頁應用程式」 (Web app)**。
3. 填寫部署設定（非常關鍵！）：
   - **說明**：`七上數學RPG測驗後端`
   - **以何身分執行 (Execute as)**：選擇 **「我」 (Me - 你的 Google 帳號)**
   - **誰可以存取 (Who has access)**：務必選擇 **「所有人」 (Anyone)**（如此學生與老師才能免登入 Google 順暢上傳成績）
4. 點擊右下角的 **「部署」 (Deploy)**。
5. 首次部署時，Google 會要求授權存取：
   - 點選 **「審查權限」 (Review permissions)**。
   - 選擇你的 Google 帳號。
   - 若出現「Google 尚未驗證這個應用程式」，請點擊左下方 **「進階」 (Advanced)** ➔ 點擊 **「前往「...」（不安全）」**。
   - 點擊 **「允許」 (Allow)**。
6. 部署成功後，畫面會顯示 **網頁應用程式網址 (Web app URL)**，格式如下：
   `https://script.google.com/macros/s/AKfycbx.../exec`
7. 點擊 **「複製」** 複製該網址。

---

## 步驟四：將網址填入 RPG 測驗系統

系統現已預設固定設置您的專屬 Web App URL：
`https://script.google.com/macros/s/AKfycbwMOYotVfGZHoLUDG6Q8ohYJ6y_W0HtaCWgA3XsE2lW5FaL_72QNsPX4oSxMV2QQ2pj/exec`

打開 `index.html` 即可直接連線 Google 試算表使用！若日後重新發布新版本 Web App，亦可點擊右上角「⚙️ 雲端試算表設定」進行更新更換。

> 💡 **離線與單機備援提示**：
> 若在無網路環境下，系統會自動無縫切換為「本機離線模式 (LocalStorage)」，所有學生測驗、教師選班與錯題複習依然可順暢使用！
