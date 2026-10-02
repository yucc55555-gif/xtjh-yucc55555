// ======================================================================
// Excel 70大圖解精選函數 (附帶獨立高清圖卡與範例表格資料)
// ======================================================================
window.top70Functions = [
  {
    id: 1,
    name: "SUM",
    zh: "求和 / 加總",
    cat: "math",
    catName: "數學與統計",
    desc: "計算範圍內所有數值的總和。",
    formula: "=SUM(A1:A10)",
    example: "若 A1 到 A10 為 1 到 10，結果為 55",
    tableHeader: ["A欄", "1", "2", "3", "...", "9", "10"],
    tableRows: [["合計", { text: "55", highlight: true, colspan: 6 }]],
    isTop70: true,
    keywords: "sum 求和 加總 總計 加法 total 累加 數值加總"
  },
  {
    id: 2,
    name: "SUMIF",
    zh: "條件求和 / 單條件加總",
    cat: "math",
    catName: "數學與統計",
    desc: "按單個條件求和，只加總符合特定標準的儲存格數值。",
    formula: '=SUMIF(A1:A10, ">5")',
    example: "若 A1 到 A10 為 1 到 10，加總大於 5 的數（6+7+8+9+10），結果為 40",
    tableHeader: ["A欄", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    tableRows: [
      [">5的數", "-", "-", "-", "-", "-", "6", "7", "8", "9", "10"],
      ["合計", { text: "40", highlight: true, colspan: 10 }]
    ],
    isTop70: true,
    keywords: "sumif 條件求和 條件加總 單條件 大於 小於 等於 符合條件 篩選加總"
  },
  {
    id: 3,
    name: "SUMIFS",
    zh: "多條件求和",
    cat: "math",
    catName: "數學與統計",
    desc: "按多個條件交叉篩選並求和。",
    formula: '=SUMIFS(A1:A10, B1:B10, ">5", C1:C10, "<10")',
    example: "當 B 列 > 5 且 C 列 < 10 時，返回對應 A 列數值之和",
    tableHeader: ["數值範圍", "A欄", "B欄 (>5)", "C欄 (<10)"],
    tableRows: [
      ["判定說明", "加總目標區間", "條件一:大於5", "條件二:小於10"],
      ["計算結果", { text: "返回同時滿足條件的A欄數值之和", highlight: true, colspan: 3 }]
    ],
    isTop70: true,
    keywords: "sumifs 多條件求和 多維度加總 同時符合 交叉條件"
  },
  {
    id: 4,
    name: "AVERAGE",
    zh: "平均值",
    cat: "stat",
    catName: "統計分析",
    desc: "計算指定範圍內數值的算術平均值。",
    formula: "=AVERAGE(A1:A10)",
    example: "若 A1 到 A10 為 1 到 10，結果為 5.5",
    tableHeader: ["A欄", "1", "2", "3", "...", "9", "10"],
    tableRows: [["平均值", { text: "5.5", highlight: true, colspan: 6 }]],
    isTop70: true,
    keywords: "average 平均值 算術平均 平均數 均值 mean"
  },
  {
    id: 5,
    name: "AVERAGEIF",
    zh: "條件平均",
    cat: "stat",
    catName: "統計分析",
    desc: "按單個指定條件求數值的平均值。",
    formula: '=AVERAGEIF(A1:A10, ">5")',
    example: "若 A1 到 A10 為 1 到 10，計算大於 5 之數的平均值，結果為 8",
    tableHeader: ["A欄", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    tableRows: [
      [">5的數", "-", "-", "-", "-", "-", "6", "7", "8", "9", "10"],
      ["平均值", { text: "8", highlight: true, colspan: 10 }]
    ],
    isTop70: true,
    keywords: "averageif 條件平均 單條件 符合條件平均"
  },
  {
    id: 6,
    name: "AVERAGEIFS",
    zh: "多條件平均",
    cat: "stat",
    catName: "統計分析",
    desc: "按多個條件求平均值。",
    formula: '=AVERAGEIFS(A1:A10, B1:B10, ">5", C1:C10, "<10")',
    example: "當 B 列 > 5 且 C 列 < 10 時，返回對應 A 列數值的平均值",
    tableHeader: ["數值範圍", "A欄", "B欄 (>5)", "C欄 (<10)"],
    tableRows: [
      ["運算目標", "平均目標範圍", "篩選標準一", "篩選標準二"],
      ["計算結果", { text: "返回滿足條件的A欄平均值", highlight: true, colspan: 3 }]
    ],
    isTop70: true,
    keywords: "averageifs 多條件平均 多重條件"
  },
  {
    id: 7,
    name: "COUNT",
    zh: "計數 / 數值個數",
    cat: "stat",
    catName: "統計分析",
    desc: "統計指定範圍內包含純數值的儲存格數量（自動忽略空白與文字）。",
    formula: "=COUNT(A1:A10)",
    example: "若 A1 到 A10 為 1 到 10，結果為 10",
    tableHeader: ["A欄", "1", "2", "3", "...", "9", "10"],
    tableRows: [["計數結果", { text: "10 (統計數值儲存格)", highlight: true, colspan: 6 }]],
    isTop70: true,
    keywords: "count 計數 統計數量 數值個數 算數量 個數"
  },
  {
    id: 8,
    name: "COUNTA",
    zh: "非空計數 / 內容筆數",
    cat: "stat",
    catName: "統計分析",
    desc: "統計範圍內所有非空儲存格數量（包含文字、數字、符號等）。",
    formula: "=COUNTA(A1:A10)",
    example: "若 A1 到 A10 均有內容，結果為 10",
    tableHeader: ["A欄", "1", "2", "3", "...", "9", "10"],
    tableRows: [["非空計數結果", { text: "10 (只要不為空白皆計入)", highlight: true, colspan: 6 }]],
    isTop70: true,
    keywords: "counta 非空計數 算有資料的筆數 不為空 資料列數"
  },
  {
    id: 9,
    name: "COUNTIF",
    zh: "條件計數 / 符合條件個數",
    cat: "stat",
    catName: "統計分析",
    desc: "按單個條件統計符合條件的儲存格數量。",
    formula: '=COUNTIF(A1:A10, ">5")',
    example: "若 A1 到 A10 為 1 到 10，大於 5 的個數為 5 個",
    tableHeader: ["A欄", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    tableRows: [
      [">5的個數", "-", "-", "-", "-", "-", "✓", "✓", "✓", "✓", "✓"],
      ["計數結果", { text: "5", highlight: true, colspan: 10 }]
    ],
    isTop70: true,
    keywords: "countif 條件計數 算大於 個數統計"
  },
  {
    id: 10,
    name: "COUNTIFS",
    zh: "多條件計數",
    cat: "stat",
    catName: "統計分析",
    desc: "按多個指定條件同時統計滿足條件的數量。",
    formula: '=COUNTIFS(A1:A10, ">5", B1:B10, "<10")',
    example: "若 A1 到 A10、B1 到 B10 為 1 到 10，當 A>5 且 B<10 時個數為 4",
    tableHeader: ["A欄", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    tableRows: [
      ["B欄", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
      ["統計結果", { text: "當 A>5 且 B<10 的個數為 4 (6,7,8,9)", highlight: true, colspan: 10 }]
    ],
    isTop70: true,
    keywords: "countifs 多條件計數 多重篩選計數"
  },
  {
    id: 11,
    name: "MIN",
    zh: "最小值",
    cat: "stat",
    catName: "統計分析",
    desc: "返回指定範圍內的最小值。",
    formula: "=MIN(A1:A10)",
    example: "若 A1 到 A10 為 1 到 10，結果為 1",
    tableHeader: ["A欄", "1", "2", "3", "...", "9", "10"],
    tableRows: [["最小值", { text: "1", highlight: true, colspan: 6 }]],
    isTop70: true,
    keywords: "min 最小值 最低 最小 minimum"
  },
  {
    id: 12,
    name: "MAX",
    zh: "最大值",
    cat: "stat",
    catName: "統計分析",
    desc: "返回指定範圍內的最大值。",
    formula: "=MAX(A1:A10)",
    example: "若 A1 到 A10 為 1 到 10，結果為 10",
    tableHeader: ["A欄", "1", "2", "3", "...", "9", "10"],
    tableRows: [["最大值", { text: "10", highlight: true, colspan: 6 }]],
    isTop70: true,
    keywords: "max 最大值 最高 最大 maximum"
  },
  {
    id: 13,
    name: "ABS",
    zh: "絕對值",
    cat: "math",
    catName: "數學與統計",
    desc: "返回數值的絕對值（將負數轉為正數）。",
    formula: "=ABS(A1)",
    example: "若 A1 為 -5，結果為 5；若為 3.5，結果仍為 3.5",
    tableHeader: ["A1 輸入", "計算結果", "說明"],
    tableRows: [
      ["-5", { text: "5", highlight: true }, "轉為正數"],
      ["3.5", { text: "3.5", highlight: true }, "始終為非負數"]
    ],
    isTop70: true,
    keywords: "abs 絕對值 負數轉正數 正數 負數 absolute"
  },
  {
    id: 14,
    name: "ROUND",
    zh: "四捨五入",
    cat: "math",
    catName: "數學與統計",
    desc: "按指定小數位數進行標準四捨五入。",
    formula: "=ROUND(A1, 2)",
    example: "若 A1 為 3.14159，結果為 3.14；若為 2.675，結果為 2.68",
    tableHeader: ["A1 輸入", "ROUND(A1, 2)", "規則"],
    tableRows: [
      ["3.14159", { text: "3.14", highlight: true }, "四捨五入至小數第2位"],
      ["2.675", { text: "2.68", highlight: true }, "5進位為8"]
    ],
    isTop70: true,
    keywords: "round 四捨五入 小數位數 取小數 進位"
  },
  {
    id: 15,
    name: "ROUNDUP",
    zh: "向上捨入 / 無條件進位",
    cat: "math",
    catName: "數學與統計",
    desc: "按指定小數位數向上捨入（無條件進位，遠離 0 的方向）。",
    formula: "=ROUNDUP(A1, 2)",
    example: "若 A1 為 3.14159，結果為 3.15；若為 2.671，結果為 2.68",
    tableHeader: ["A1 輸入", "ROUNDUP(A1, 2)", "規則"],
    tableRows: [
      ["3.14159", { text: "3.15", highlight: true }, "向上進位"],
      ["2.671", { text: "2.68", highlight: true }, "末尾只要有值即進位"]
    ],
    isTop70: true,
    keywords: "roundup 向上捨入 無條件進位 進位 roundup"
  },
  {
    id: 16,
    name: "ROUNDDOWN",
    zh: "向下捨入 / 無條件捨去",
    cat: "math",
    catName: "數學與統計",
    desc: "按指定小數位數向下捨入（無條件捨去，朝向 0 的方向）。",
    formula: "=ROUNDDOWN(A1, 2)",
    example: "若 A1 為 3.14159，結果為 3.14；若為 2.679，結果為 2.67",
    tableHeader: ["A1 輸入", "ROUNDDOWN(A1, 2)", "規則"],
    tableRows: [
      ["3.14159", { text: "3.14", highlight: true }, "向下捨去"],
      ["2.679", { text: "2.67", highlight: true }, "直接捨去後面小數"]
    ],
    isTop70: true,
    keywords: "rounddown 向下捨入 無條件捨去 捨去 截斷"
  },
  {
    id: 17,
    name: "INT",
    zh: "取整 / 向下取整數",
    cat: "math",
    catName: "數學與統計",
    desc: "返回小於等於該數值的最大整數（直接去除小數向下取整）。",
    formula: "=INT(A1)",
    example: "若 A1 為 3.9，結果為 3；若為 -2.3，結果為 -3",
    tableHeader: ["A1 輸入", "INT(A1)", "說明"],
    tableRows: [
      ["3.9", { text: "3", highlight: true }, "正數直接去掉小數"],
      ["-2.3", { text: "-3", highlight: true }, "負數向下取更小整數"]
    ],
    isTop70: true,
    keywords: "int 取整 整數 去掉小數 integer 向下取整"
  },
  {
    id: 18,
    name: "MOD",
    zh: "求餘數 / 模運算",
    cat: "math",
    catName: "數學與統計",
    desc: "返回兩數相除後的餘數。",
    formula: "=MOD(A1, A2)",
    example: "若 A1 為 10, A2 為 3，結果為 1；若 17 除以 5，結果為 2",
    tableHeader: ["被除數 A1", "除數 A2", "MOD 結果"],
    tableRows: [
      ["10", "3", { text: "1", highlight: true }],
      ["17", "5", { text: "2", highlight: true }]
    ],
    isTop70: true,
    keywords: "mod 餘數 求餘 相除求餘 奇偶判斷 整除"
  },
  {
    id: 19,
    name: "POWER",
    zh: "乘冪 / 次方計算",
    cat: "math",
    catName: "數學與統計",
    desc: "返回數值的乘冪（即底數的次方）。",
    formula: "=POWER(A1, 2)",
    example: "若 A1 為 3，3 的 2 次方結果為 9；若為 5 則結果為 25",
    tableHeader: ["底數 A1", "次方 (指數)", "計算結果"],
    tableRows: [
      ["3", "2", { text: "9 (3²)", highlight: true }],
      ["5", "2", { text: "25 (5²)", highlight: true }]
    ],
    isTop70: true,
    keywords: "power 乘冪 次方 平方 立方 指數 乘方"
  },
  {
    id: 20,
    name: "SQRT",
    zh: "平方根 / 開根號",
    cat: "math",
    catName: "數學與統計",
    desc: "返回數值的正平方根（開根號）。",
    formula: "=SQRT(A1)",
    example: "若 A1 為 9，結果為 3；若為 2.25，結果為 1.5",
    tableHeader: ["A1 數值", "SQRT 結果", "說明"],
    tableRows: [
      ["9", { text: "3", highlight: true }, "√9 = 3"],
      ["2.25", { text: "1.5", highlight: true }, "√2.25 = 1.5"]
    ],
    isTop70: true,
    keywords: "sqrt 平方根 開根號 開方 根號"
  },
  {
    id: 21,
    name: "IF",
    zh: "條件判斷",
    cat: "logic",
    catName: "邏輯判斷",
    desc: "根據指定條件判斷真假，返回不同的結果。",
    formula: '=IF(A1>5, "Yes", "No")',
    example: '若 A1 為 6，結果為 "Yes"；若 A1 為 4，結果為 "No"',
    tableHeader: ["A1 輸入", "條件 A1>5", "IF 結果"],
    tableRows: [
      ["6", "成立 (TRUE)", { text: '"Yes"', highlight: true }],
      ["4", "不成立 (FALSE)", { text: '"No"', highlight: true }]
    ],
    isTop70: true,
    keywords: "if 條件判斷 如果 是否 判斷式 若 條件"
  },
  {
    id: 22,
    name: "IFERROR",
    zh: "錯誤處理 / 容錯捕獲",
    cat: "logic",
    catName: "邏輯判斷",
    desc: "當公式計算出錯時返回自訂指定值，避免顯示 #DIV/0! 或 #N/A。",
    formula: '=IFERROR(A1/B1, "Error")',
    example: '若 A1 為 10 且 B1 為 0（除以零錯誤），結果返回自訂文字 "Error"',
    tableHeader: ["A1", "B1", "IFERROR(A1/B1, 'Error') 結果"],
    tableRows: [
      ["10", "0", { text: '"Error" (捕捉錯誤並替換)', highlight: true }],
      ["10", "2", { text: "5 (正常計算)", highlight: true }]
    ],
    isTop70: true,
    keywords: "iferror 錯誤處理 捕獲錯誤 容錯 避免報錯 #N/A #DIV/0"
  },
  {
    id: 23,
    name: "AND",
    zh: "邏輯與 / 並且",
    cat: "logic",
    catName: "邏輯判斷",
    desc: "所有條件皆為真時才返回 TRUE，只要有一個不符合即為 FALSE。",
    formula: "=AND(A1>5, B1<10)",
    example: "若 A1 為 6 且 B1 為 9，兩條件均成立，結果為 TRUE",
    tableHeader: ["A1", "條件A (A1>5)", "B1", "條件B (B1<10)", "AND 結果"],
    tableRows: [
      ["6", "TRUE", "9", "TRUE", { text: "TRUE (全部符合)", highlight: true }],
      ["4", "FALSE", "11", "FALSE", { text: "FALSE", highlight: false }]
    ],
    isTop70: true,
    keywords: "and 並且 而且 且 同時滿足 全部符合 邏輯與"
  },
  {
    id: 24,
    name: "OR",
    zh: "邏輯或 / 或者",
    cat: "logic",
    catName: "邏輯判斷",
    desc: "任一條件為真時即返回 TRUE，所有條件皆假才返回 FALSE。",
    formula: "=OR(A1>5, B1<10)",
    example: "若 A1 為 6 且 B1 為 11，因滿足 A1>5，結果仍為 TRUE",
    tableHeader: ["A1", "條件A", "B1", "條件B", "OR 結果"],
    tableRows: [
      ["6", "TRUE", "11", "FALSE", { text: "TRUE (任一成立即為真)", highlight: true }],
      ["4", "FALSE", "11", "FALSE", { text: "FALSE (皆不成立)", highlight: false }]
    ],
    isTop70: true,
    keywords: "or 或者 或 任一符合 滿足其一 邏輯或"
  },
  {
    id: 25,
    name: "NOT",
    zh: "邏輯非 / 取反",
    cat: "logic",
    catName: "邏輯判斷",
    desc: "返回與原邏輯值相反的結果（TRUE 變 FALSE，FALSE 變 TRUE）。",
    formula: "=NOT(A1>5)",
    example: "若 A1 為 4，原條件 A1>5 為假，取反後結果為 TRUE",
    tableHeader: ["A1", "原條件 (A1>5)", "NOT 結果"],
    tableRows: [
      ["4", "FALSE", { text: "TRUE (取反)", highlight: true }],
      ["6", "TRUE", { text: "FALSE (取反)", highlight: false }]
    ],
    isTop70: true,
    keywords: "not 取反 反向 否定 相反 邏輯非"
  },
  {
    id: 26,
    name: "XOR",
    zh: "邏輯異或 / 互斥或",
    cat: "logic",
    catName: "邏輯判斷",
    desc: "返回邏輯異或結果。奇數個條件為 TRUE 時返回 TRUE，若兩者同真或同假則為 FALSE。",
    formula: "=XOR(A1>5, B1<10)",
    example: "若 A1 為 6 且 B1 為 9（兩者皆真），結果為 FALSE；若一真一假則為 TRUE",
    tableHeader: ["A1", "條件A", "B1", "條件B", "XOR 結果"],
    tableRows: [
      ["6", "TRUE", "9", "TRUE", { text: "FALSE (同真為假)", highlight: false }],
      ["4", "FALSE", "9", "TRUE", { text: "TRUE (一真一假為真)", highlight: true }]
    ],
    isTop70: true,
    keywords: "xor 異或 互斥 互斥或 邏輯異或"
  },
  {
    id: 27,
    name: "CONCAT",
    zh: "文字連接 / 字串合併",
    cat: "text",
    catName: "文字處理",
    desc: "連接多個文字字串或儲存格內容為單一字串。",
    formula: "=CONCAT(A1, B1)",
    example: '若 A1 為 "Hello", B1 為 "World"，結果為 "HelloWorld"',
    tableHeader: ["A1", "B1", "CONCAT 結果"],
    tableRows: [
      ["Hello", "World", { text: "HelloWorld", highlight: true }]
    ],
    isTop70: true,
    keywords: "concat 文字連接 字串合併 合併文字 串接 組合"
  },
  {
    id: 28,
    name: "TEXTJOIN",
    zh: "帶分隔符連接 / 具分隔字串合併",
    cat: "text",
    catName: "文字處理",
    desc: "用指定分隔符連接多個文字，並可選擇自動忽略空白儲存格。",
    formula: '=TEXTJOIN(",", TRUE, A1:A3)',
    example: '若 A1 到 A3 為 Apple, Banana, Cherry，結果為 "Apple, Banana, Cherry"',
    tableHeader: ["儲存格", "內容", "TEXTJOIN 結果"],
    tableRows: [
      ["A1 ~ A3", "Apple / Banana / Cherry", { text: "Apple, Banana, Cherry", highlight: true }]
    ],
    isTop70: true,
    keywords: "textjoin 帶分隔符連接 逗號連接 忽略空白 合併文字 陣列合併"
  },
  {
    id: 29,
    name: "LEFT",
    zh: "取左 / 擷取左側字元",
    cat: "text",
    catName: "文字處理",
    desc: "從文字字串的最左側開始提取指定數量的字元。",
    formula: "=LEFT(A1, 3)",
    example: '若 A1 為 "Hello"，取左邊 3 個字元結果為 "Hel"',
    tableHeader: ["A1 原文", "擷取長度", "LEFT 結果"],
    tableRows: [
      ["Hello", "3", { text: "Hel", highlight: true }]
    ],
    isTop70: true,
    keywords: "left 取左 擷取左側 前幾個字 開頭文字 截取"
  },
  {
    id: 30,
    name: "RIGHT",
    zh: "取右 / 擷取右側字元",
    cat: "text",
    catName: "文字處理",
    desc: "從文字字串的最右側（尾端）開始提取指定數量的字元。",
    formula: "=RIGHT(A1, 3)",
    example: '若 A1 為 "Hello"，取右側 3 個字元結果為 "llo"',
    tableHeader: ["A1 原文", "擷取長度", "RIGHT 結果"],
    tableRows: [
      ["Hello", "3", { text: "llo", highlight: true }]
    ],
    isTop70: true,
    keywords: "right 取右 擷取右側 後幾個字 結尾文字 尾數"
  },
  {
    id: 31,
    name: "MID",
    zh: "取中間 / 指定位置擷取",
    cat: "text",
    catName: "文字處理",
    desc: "從文字字串的指定起始位置開始，提取指定長度的字元。",
    formula: "=MID(A1, 2, 3)",
    example: '若 A1 為 "Hello"，從第 2 個字元開始提取 3 個字元，結果為 "ell"',
    tableHeader: ["A1 (文字)", "起始位置", "擷取字數", "MID 結果"],
    tableRows: [
      ["Hello", "2", "3", { text: "ell", highlight: true }]
    ],
    isTop70: true,
    keywords: "mid 取中間 擷取中間 截取字元 截取字串 身分證字號截取"
  },
  {
    id: 32,
    name: "LEN",
    zh: "計算字串長度",
    cat: "text",
    catName: "文字處理",
    desc: "返回文字字串的總字元長度（包含字母、空格與標點）。",
    formula: "=LEN(A1)",
    example: '若 A1 為 "Hello"，計算長度結果為 5',
    tableHeader: ["A1 (文字)", "LEN 計算結果", "說明"],
    tableRows: [
      ["Hello", { text: "5", highlight: true }, "統計字串總字元數"]
    ],
    isTop70: true,
    keywords: "len 長度 計算字數 字元數 統計長度"
  },
  {
    id: 33,
    name: "TRIM",
    zh: "去空格 / 清除多餘空格",
    cat: "text",
    catName: "文字處理",
    desc: "移除文字前後所有多餘空格，並將單詞間連續空格縮減為單一空格。",
    formula: "=TRIM(A1)",
    example: '若 A1 為 " Hello "，去除首尾多餘空格後結果為 "Hello"',
    tableHeader: ["A1 (原始文字)", "TRIM 結果", "效果說明"],
    tableRows: [
      ["  Hello  ", { text: "Hello", highlight: true }, "去除首尾多餘空白"]
    ],
    isTop70: true,
    keywords: "trim 去空格 清除空格 刪除空白 資料清洗 trim"
  },
  {
    id: 34,
    name: "LOWER",
    zh: "轉小寫 / 英文轉小寫",
    cat: "text",
    catName: "文字處理",
    desc: "將文字中的所有英文字母轉換為小寫。",
    formula: "=LOWER(A1)",
    example: '若 A1 為 "Hello"，結果為 "hello"',
    tableHeader: ["A1 (原始文字)", "LOWER 結果"],
    tableRows: [
      ["Hello", { text: "hello", highlight: true }]
    ],
    isTop70: true,
    keywords: "lower 轉小寫 英文小寫 全部小寫"
  },
  {
    id: 35,
    name: "UPPER",
    zh: "轉大寫 / 英文轉大寫",
    cat: "text",
    catName: "文字處理",
    desc: "將文字中的所有英文字母轉換為大寫。",
    formula: "=UPPER(A1)",
    example: '若 A1 為 "Hello"，結果為 "HELLO"',
    tableHeader: ["A1 (原始文字)", "UPPER 結果"],
    tableRows: [
      ["Hello", { text: "HELLO", highlight: true }]
    ],
    isTop70: true,
    keywords: "upper 轉大寫 英文大寫 全部大寫"
  },
  {
    id: 36,
    name: "PROPER",
    zh: "首字母大寫 / 詞首大寫",
    cat: "text",
    catName: "文字處理",
    desc: "將文字中每個單詞的首字母轉換為大寫，其餘轉為小寫。",
    formula: "=PROPER(A1)",
    example: '若 A1 為 "hello world"，結果為 "Hello World"',
    tableHeader: ["A1 (文字)", "PROPER 結果", "說明"],
    tableRows: [
      ["hello world", { text: "Hello World", highlight: true }, "每個單詞首字母大寫"]
    ],
    isTop70: true,
    keywords: "proper 首字母大寫 英文名格式化 詞首大寫"
  },
  {
    id: 37,
    name: "SUBSTITUTE",
    zh: "替換舊文字 / 指定內容替換",
    cat: "text",
    catName: "文字處理",
    desc: "在文字字串中尋找指定內容並將其替換為新文字。",
    formula: '=SUBSTITUTE(A1, "old", "new")',
    example: '若 A1 為 "This is old"，替換後結果為 "This is new"',
    tableHeader: ["A1 原文", "替換目標", "替換成", "SUBSTITUTE 結果"],
    tableRows: [
      ["This is old", "old", "new", { text: "This is new", highlight: true }]
    ],
    isTop70: true,
    keywords: "substitute 替換文字 取代 取代內容 替換舊字串"
  },
  {
    id: 38,
    name: "REPLACE",
    zh: "替換部分文字 / 依位置替換",
    cat: "text",
    catName: "文字處理",
    desc: "根據指定的起始位置和字元長度，將原文字中的部分內容替換為新字元。",
    formula: '=REPLACE(A1, 1, 3, "new")',
    example: '若 A1 為 "Hello"，從第 1 個字元開始替換 3 個字元為 "new"，結果為 "newlo"',
    tableHeader: ["A1 原文", "起始", "長度", "REPLACE 結果"],
    tableRows: [
      ["Hello", "1", "3", { text: "newlo", highlight: true }]
    ],
    isTop70: true,
    keywords: "replace 依位置替換 部分替換 位置取代"
  },
  {
    id: 39,
    name: "FIND",
    zh: "區分大小寫查找位置",
    cat: "text",
    catName: "文字處理",
    desc: "在文字中查找特定字元的起始位置（嚴格區分大小寫，不支援萬用字元）。",
    formula: '=FIND("e", A1)',
    example: '若 A1 為 "Hello"，查找 "e" 出現的位置，結果為 2',
    tableHeader: ["A1 原文", "查找目標", "FIND 結果", "特性"],
    tableRows: [
      ["Hello", '"e"', { text: "2", highlight: true }, "區分大小寫 (第2個字元)"]
    ],
    isTop70: true,
    keywords: "find 查找位置 搜尋字元 區分大小寫 字元索引"
  },
  {
    id: 40,
    name: "SEARCH",
    zh: "不區分大小寫查找位置",
    cat: "text",
    catName: "文字處理",
    desc: "在文字中查找特定字元位置（不區分大小寫，支援萬用字元 * 與 ?）。",
    formula: '=SEARCH("e", A1)',
    example: '若 A1 為 "Hello"，查找 "e" 或 "E" 的位置，結果為 2',
    tableHeader: ["A1 原文", "查找目標", "SEARCH 結果", "特性"],
    tableRows: [
      ["Hello", '"e"', { text: "2", highlight: true }, "不區分大小寫"]
    ],
    isTop70: true,
    keywords: "search 不區分大小寫 查找 搜尋 萬用字元 搜尋字元位置"
  },
  {
    id: 41,
    name: "VLOOKUP",
    zh: "縱向查找 / 垂直查表",
    cat: "lookup",
    catName: "查找與引用",
    desc: "在表格的第一欄垂直向下搜尋目標值，並返回同一行指定欄位的內容。",
    formula: "=VLOOKUP(A1, B1:C10, 2, FALSE)",
    example: '若 A1 為 1，在對照表中 B 列找到 1 對應 C 列的 Apple，返回 "Apple"',
    tableHeader: ["A欄 (查詢條件)", "B欄 (比對欄位)", "C欄 (回傳目標)"],
    tableRows: [
      ["1", "1", { text: "Apple (回傳此值)", highlight: true }],
      ["2", "2", "Banana"],
      ["3", "3", "Cherry"]
    ],
    isTop70: true,
    keywords: "vlookup 垂直查表 縱向查找 查表 比對資料 精確匹配"
  },
  {
    id: 42,
    name: "HLOOKUP",
    zh: "橫向查找 / 水平查表",
    cat: "lookup",
    catName: "查找與引用",
    desc: "在表格的第一列水平向右搜尋目標值，並返回同一欄指定列號的數值。",
    formula: "=HLOOKUP(A1, A1:F10, 2, FALSE)",
    example: "若 A1 為 1，在第 1 列找到 1，並返回第 2 列對應之值",
    tableHeader: ["第1行 (條件)", "1", "2", "3", "4", "5", "6"],
    tableRows: [
      ["第2行 (回傳值)", { text: "Apple", highlight: true }, "Banana", "Cherry", "Date", "Elderberry", "Fig"]
    ],
    isTop70: true,
    keywords: "hlookup 橫向查找 水平查表 水平比對"
  },
  {
    id: 43,
    name: "LOOKUP",
    zh: "向量查找 / 陣列查表",
    cat: "lookup",
    catName: "查找與引用",
    desc: "在一行或一列中查找值，並從第二個範圍對應位置返回數值。",
    formula: "=LOOKUP(A1, A1:A10, B1:B10)",
    example: "若 A1 為 5，且 B 列為 10 到 100，返回不大於 A1 之最大值對應的 50",
    tableHeader: ["A欄 (查找區間)", "B欄 (對應值)", "LOOKUP 結果"],
    tableRows: [
      ["1 ~ 10", "10 ~ 100", { text: "50 (對應 A1=5)", highlight: true }]
    ],
    isTop70: true,
    keywords: "lookup 向量查找 陣列查表 級距查表 區間匹配"
  },
  {
    id: 44,
    name: "MATCH",
    zh: "位置匹配 / 尋找索引位置",
    cat: "lookup",
    catName: "查找與引用",
    desc: "返回目標值在指定範圍中的相對位置（序號/第幾個）。",
    formula: "=MATCH(A1, A1:A10, 0)",
    example: "若 A1 為 5，在 A1:A10 中尋找數值 5，返回其在第 5 個位置",
    tableHeader: ["搜尋值 A1", "搜尋範圍", "MATCH 結果"],
    tableRows: [
      ["5", "A1:A10 (內容1..10)", { text: "5 (代表在第5個位置)", highlight: true }]
    ],
    isTop70: true,
    keywords: "match 位置匹配 尋找位置 索引 第幾個 陣列索引"
  },
  {
    id: 45,
    name: "INDEX",
    zh: "引用取值 / 座標取值",
    cat: "lookup",
    catName: "查找與引用",
    desc: "根據指定的列號與欄號，返回表格中交叉點的值（常與 MATCH 搭配）。",
    formula: "=INDEX(A1:C10, 2, 3)",
    example: "在 A1:C10 範圍中，返回第 2 列第 3 欄（C2）的值",
    tableHeader: ["第1行", "A1", "B1", "C1"],
    tableRows: [
      ["第2行", "A2", "B2", { text: "C2 (第2行第3列交叉值)", highlight: true }]
    ],
    isTop70: true,
    keywords: "index 引用取值 座標取值 index match 交叉查找 取出值"
  },
  {
    id: 46,
    name: "CHOOSE",
    zh: "序號選值 / 依序挑選",
    cat: "lookup",
    catName: "查找與引用",
    desc: "按指定的序號數字，從清單參數中返回對應位置的值。",
    formula: '=CHOOSE(2, "Apple", "Banana", "Cherry")',
    example: '指定序號 2，從列表中挑選出第 2 個，結果為 "Banana"',
    tableHeader: ["序號", "1", "2", "3"],
    tableRows: [
      ["清單內容", "Apple", { text: "Banana (選中)", highlight: true }, "Cherry"]
    ],
    isTop70: true,
    keywords: "choose 序號選值 依序號挑選 清單選擇 條件分支"
  },
  {
    id: 47,
    name: "OFFSET",
    zh: "偏移引用 / 動態位移參照",
    cat: "lookup",
    catName: "查找與引用",
    desc: "以指定儲存格為基準點，按列數與欄數進行位移，返回目標儲存格引用。",
    formula: "=OFFSET(A1, 2, 3)",
    example: "從 A1 儲存格向下偏移 2 列、向右偏移 3 欄，返回該儲存格之值（D3）",
    tableHeader: ["基準點", "向下列數", "向右欄數", "OFFSET 目標"],
    tableRows: [
      ["A1", "+2 列", "+3 欄", { text: "目標儲存格 D3", highlight: true }]
    ],
    isTop70: true,
    keywords: "offset 偏移引用 動態範圍 基準位移 範圍位移"
  },
  {
    id: 48,
    name: "INDIRECT",
    zh: "間接引用 / 文字轉參照",
    cat: "lookup",
    catName: "查找與引用",
    desc: "將純文字字串轉換為實際的儲存格引用地址。",
    formula: '=INDIRECT("A1")',
    example: '輸入字串 "A1"，函數返回儲存格 A1 中的實際值',
    tableHeader: ["引數 (文字字串)", "轉換目標", "INDIRECT 結果"],
    tableRows: [
      ['"A1"', "參照到儲存格 A1", { text: "返回 A1 的數值內容", highlight: true }]
    ],
    isTop70: true,
    keywords: "indirect 間接引用 動態參照 文字轉參照 跨表引用"
  },
  {
    id: 49,
    name: "COLUMN",
    zh: "取得欄號 / 列號數字",
    cat: "lookup",
    catName: "查找與引用",
    desc: "返回指定儲存格的欄位序號（A 為 1，B 為 2，C 為 3...）。",
    formula: "=COLUMN(A1)",
    example: "若指定為 A1，結果為 1；若指定 C1 則結果為 3",
    tableHeader: ["欄位代號", "A", "B", "C", "D", "E"],
    tableRows: [
      ["COLUMN 序號", { text: "1", highlight: true }, "2", "3", "4", "5"]
    ],
    isTop70: true,
    keywords: "column 取得欄號 第幾欄 欄位編號 欄序號"
  },
  {
    id: 50,
    name: "ROW",
    zh: "取得行號 / 列序號",
    cat: "lookup",
    catName: "查找與引用",
    desc: "返回指定儲存格所在的列號序號（第幾行/第幾列）。",
    formula: "=ROW(A1)",
    example: "若指定為 A1，結果為 1；若指定 A10 則結果為 10",
    tableHeader: ["行號 / 列位置", "ROW 結果"],
    tableRows: [
      ["第 1 行", { text: "1", highlight: true }],
      ["第 2 行", "2"],
      ["第 3 行", "3"]
    ],
    isTop70: true,
    keywords: "row 取得行號 第幾列 第幾行 列序號 行號"
  },
  {
    id: 51,
    name: "TODAY",
    zh: "當前日期 / 今天日期",
    cat: "datetime",
    catName: "日期與時間",
    desc: "返回系統當前的日期（每次打開檔案會自動刷新為當天）。",
    formula: "=TODAY()",
    example: "若今天是 2024-05-23，結果即為 2024-05-23",
    tableHeader: ["公式", "返回結果", "特性說明"],
    tableRows: [
      ["=TODAY()", { text: "2024-05-23", highlight: true }, "每次打開文件都會自動更新為當天日期"]
    ],
    isTop70: true,
    keywords: "today 今天日期 當前日期 系統日期 今天"
  },
  {
    id: 52,
    name: "NOW",
    zh: "當前日期時間 / 現在時間",
    cat: "datetime",
    catName: "日期與時間",
    desc: "返回系統當前的日期與時間（包含時分秒，即時更新）。",
    formula: "=NOW()",
    example: "若當前時間為 2024-05-23 14:30，結果為 2024-05-23 14:30",
    tableHeader: ["公式", "返回結果", "特性說明"],
    tableRows: [
      ["=NOW()", { text: "2024-05-23 14:30", highlight: true }, "包含日期和時間，即時更新"]
    ],
    isTop70: true,
    keywords: "now 現在時間 當前日期時間 時間戳記 目前時間"
  },
  {
    id: 53,
    name: "DATE",
    zh: "生成日期 / 組裝年月日",
    cat: "datetime",
    catName: "日期與時間",
    desc: "根據指定的年、月、日數值生成標準日期格式。",
    formula: "=DATE(2024, 5, 23)",
    example: "輸入年=2024, 月=5, 日=23，結果合成 2024-05-23",
    tableHeader: ["年", "月", "日", "DATE 返回結果"],
    tableRows: [
      ["2024", "5", "23", { text: "2024-05-23", highlight: true }]
    ],
    isTop70: true,
    keywords: "date 生成日期 組裝日期 年月日 建立日期"
  },
  {
    id: 54,
    name: "TIME",
    zh: "生成時間 / 組裝時分秒",
    cat: "datetime",
    catName: "日期與時間",
    desc: "根據指定的時、分、秒數值生成標準時間格式。",
    formula: "=TIME(14, 30, 0)",
    example: "輸入時=14, 分=30, 秒=0，結果生成 14:30:00",
    tableHeader: ["時", "分", "秒", "TIME 返回結果"],
    tableRows: [
      ["14", "30", "0", { text: "14:30:00", highlight: true }]
    ],
    isTop70: true,
    keywords: "time 生成時間 組裝時間 時分秒 建立時間"
  },
  {
    id: 55,
    name: "YEAR",
    zh: "取年份 / 擷取年份",
    cat: "datetime",
    catName: "日期與時間",
    desc: "從日期中提取西元年份。",
    formula: "=YEAR(A1)",
    example: "若 A1 為 2024-05-23，結果為 2024",
    tableHeader: ["A1 (日期)", "YEAR 結果", "說明"],
    tableRows: [
      ["2024-05-23", { text: "2024", highlight: true }, "從日期中提取年份"]
    ],
    isTop70: true,
    keywords: "year 取年份 擷取年 西元年 年份"
  },
  {
    id: 56,
    name: "MONTH",
    zh: "取月份 / 擷取月份",
    cat: "datetime",
    catName: "日期與時間",
    desc: "從日期中提取月份（1 到 12 的整數）。",
    formula: "=MONTH(A1)",
    example: "若 A1 為 2024-05-23，結果為 5",
    tableHeader: ["A1 (日期)", "MONTH 結果", "說明"],
    tableRows: [
      ["2024-05-23", { text: "5", highlight: true }, "從日期中提取月份"]
    ],
    isTop70: true,
    keywords: "month 取月份 擷取月 幾月 月份"
  },
  {
    id: 57,
    name: "DAY",
    zh: "取日 / 擷取天數",
    cat: "datetime",
    catName: "日期與時間",
    desc: "從日期中提取日數（1 到 31 的整數）。",
    formula: "=DAY(A1)",
    example: "若 A1 為 2024-05-23，結果為 23",
    tableHeader: ["A1 (日期)", "DAY 結果", "說明"],
    tableRows: [
      ["2024-05-23", { text: "23", highlight: true }, "從日期中提取具體的日"]
    ],
    isTop70: true,
    keywords: "day 取日期 擷取日 幾號 幾日 天數"
  },
  {
    id: 58,
    name: "HOUR",
    zh: "取小時 / 擷取小時數",
    cat: "datetime",
    catName: "日期與時間",
    desc: "從時間中提取小時數（0 到 23 的整數）。",
    formula: "=HOUR(A1)",
    example: "若 A1 為 14:30:00，結果為 14",
    tableHeader: ["A1 (時間)", "HOUR 結果", "說明"],
    tableRows: [
      ["14:30:00", { text: "14", highlight: true }, "從時間中提取小時"]
    ],
    isTop70: true,
    keywords: "hour 取小時 擷取小時 幾點 小時"
  },
  {
    id: 59,
    name: "MINUTE",
    zh: "取分鐘 / 擷取分鐘數",
    cat: "datetime",
    catName: "日期與時間",
    desc: "從時間中提取分鐘數（0 到 59 的整數）。",
    formula: "=MINUTE(A1)",
    example: "若 A1 為 14:30:00，結果為 30",
    tableHeader: ["A1 (時間)", "MINUTE 結果", "說明"],
    tableRows: [
      ["14:30:00", { text: "30", highlight: true }, "從時間中提取分鐘"]
    ],
    isTop70: true,
    keywords: "minute 取分鐘 擷取分鐘 幾分 分鐘"
  },
  {
    id: 60,
    name: "SECOND",
    zh: "取秒 / 擷取秒數",
    cat: "datetime",
    catName: "日期與時間",
    desc: "從時間中提取秒數（0 到 59 的整數）。",
    formula: "=SECOND(A1)",
    example: "若 A1 為 14:30:30，結果為 30",
    tableHeader: ["A1 (時間)", "SECOND 結果", "說明"],
    tableRows: [
      ["14:30:30", { text: "30", highlight: true }, "從時間中提取秒數"]
    ],
    isTop70: true,
    keywords: "second 取秒 擷取秒 幾秒 秒數"
  },
  {
    id: 61,
    name: "WEEKDAY",
    zh: "星期幾 / 星期換算",
    cat: "datetime",
    catName: "日期與時間",
    desc: "返回日期是星期幾（參數 2 代表星期一為 1，星期日為 7）。",
    formula: "=WEEKDAY(A1, 2)",
    example: "若 A1 為 2024-05-23，結果為 4（代表週四）",
    tableHeader: ["日期", "WEEKDAY 結果", "說明"],
    tableRows: [
      ["2024-05-23", { text: "4 (週四)", highlight: true }, "參數2表示週一為1，週日為7"]
    ],
    isTop70: true,
    keywords: "weekday 星期幾 禮拜幾 週幾 星期代碼"
  },
  {
    id: 62,
    name: "WEEKNUM",
    zh: "第幾週 / 年週次",
    cat: "datetime",
    catName: "日期與時間",
    desc: "返回日期是一年中的第幾週。",
    formula: "=WEEKNUM(A1, 2)",
    example: "若 A1 為 2024-05-23，結果為 21",
    tableHeader: ["日期", "WEEKNUM 結果", "說明"],
    tableRows: [
      ["2024-05-23", { text: "21", highlight: true }, "代表該年第21週 (週一為起始)"]
    ],
    isTop70: true,
    keywords: "weeknum 第幾週 週次 年週 計算週"
  },
  {
    id: 63,
    name: "NETWORKDAYS",
    zh: "工作日天數 / 排除假日",
    cat: "datetime",
    catName: "日期與時間",
    desc: "計算兩個日期之間的工作日天數（自動排除週末與指定假期）。",
    formula: "=NETWORKDAYS(A1, B1, C1:C10)",
    example: "起止日期之間自動排除週末和假期，計算實際工作天數為 21 天",
    tableHeader: ["開始日期", "結束日期", "假期 (C欄)", "工作日天數結果"],
    tableRows: [
      ["2024-05-01", "2024-05-31", "若干假期", { text: "21 天 (自動扣週末)", highlight: true }]
    ],
    isTop70: true,
    keywords: "networkdays 工作日天數 排除週末 扣除假日 工時天數"
  },
  {
    id: 64,
    name: "WORKDAY",
    zh: "工作日日期 / 順延工作日",
    cat: "datetime",
    catName: "日期與時間",
    desc: "返回若干個工作日後的確切日期（跳過週末與指定假期）。",
    formula: "=WORKDAY(A1, 5, C1:C10)",
    example: "從 A1 起順延 5 個工作日，避開週末後返回 2024-05-30",
    tableHeader: ["起始日期", "工作天天數", "假期清單", "推算目標日期"],
    tableRows: [
      ["2024-05-23", "5", "若干假期", { text: "2024-05-30", highlight: true }]
    ],
    isTop70: true,
    keywords: "workday 順延工作日 完工日 到期日 推算工作日"
  },
  {
    id: 65,
    name: "EDATE",
    zh: "按月偏移 / 增減月份日期",
    cat: "datetime",
    catName: "日期與時間",
    desc: "返回指定月數之前或之後的對應日期（月數可正可負）。",
    formula: "=EDATE(A1, 3)",
    example: "若 A1 為 2024-05-01，往後推算 3 個月，結果為 2024-08-01",
    tableHeader: ["日期 (A1)", "偏移月數", "EDATE 結果", "說明"],
    tableRows: [
      ["2024-05-01", "3", { text: "2024-08-01", highlight: true }, "正數表示向後，負數向前"]
    ],
    isTop70: true,
    keywords: "edate 按月偏移 幾個月後 增減月份 到期日期"
  },
  {
    id: 66,
    name: "EOMONTH",
    zh: "月末日期 / 當月底最後一天",
    cat: "datetime",
    catName: "日期與時間",
    desc: "返回指定月份之前或之後的月末最後一天日期。",
    formula: "=EOMONTH(A1, 1)",
    example: "若 A1 為 2024-05-01，偏移 1 個月後的月末日期為 2024-06-30",
    tableHeader: ["日期 (A1)", "偏移月數", "EOMONTH 結果", "說明"],
    tableRows: [
      ["2024-05-01", "1", { text: "2024-06-30", highlight: true }, "返回該月最後一天 (月底)"]
    ],
    isTop70: true,
    keywords: "eomonth 月末日期 月底 最後一天 結算日 結帳日"
  },
  {
    id: 67,
    name: "PMT",
    zh: "每期還款額 / 貸款月供計算",
    cat: "finance",
    catName: "財務金融",
    desc: "計算貸款在固定利率下的每期等額還款金額（如房貸、車貸月供）。",
    formula: "=PMT(0.05/12, 60, -10000)",
    example: "年利率 5%，60 個月分期，借款 10,000 元，月供結果為 -188.71 元",
    tableHeader: ["年利率", "期數 (月)", "貸款金額", "每期還款額 (月供)"],
    tableRows: [
      ["5%", "60", "10000", { text: "-188.71", highlight: true }]
    ],
    isTop70: true,
    keywords: "pmt 每期還款額 房貸 車貸 月供 貸款利息 本息攤還"
  },
  {
    id: 68,
    name: "NPV",
    zh: "淨現值 / 投資折現評估",
    cat: "finance",
    catName: "財務金融",
    desc: "按指定折現率計算未來現金流的淨現值。",
    formula: "=NPV(0.05, A1:A10)",
    example: "折現率 5%，A1:A10 為未來各期現金流，淨現值結果為 1253.48",
    tableHeader: ["折現率", "現金流範圍", "NPV 淨現值結果"],
    tableRows: [
      ["5%", "A1:A10", { text: "1253.48", highlight: true }]
    ],
    isTop70: true,
    keywords: "npv 淨現值 折現率 現金流 投資報酬 財務評估"
  },
  {
    id: 69,
    name: "FV",
    zh: "未來值 / 投資終值複利",
    cat: "finance",
    catName: "財務金融",
    desc: "計算投資在固定利率與定額投入下的未來終值（本利和）。",
    formula: "=FV(0.05/12, 60, -100, -1000)",
    example: "每月投 100，初始本金 1000，第 60 個月後未來終值為 10340.59",
    tableHeader: ["年利率", "期數 (月)", "每期投入", "初始投入", "未來值 (終值)"],
    tableRows: [
      ["5%", "60", "100", "1000", { text: "10340.59", highlight: true }]
    ],
    isTop70: true,
    keywords: "fv 未來值 終值 複利 定存 投資本利和 退休金計算"
  },
  {
    id: 70,
    name: "PV",
    zh: "現值 / 現金流折現現值",
    cat: "finance",
    catName: "財務金融",
    desc: "計算一系列未來等額現金流在當前的總現值。",
    formula: "=PV(0.05/12, 60, -100)",
    example: "未來 60 個月每月收 100，年利率 5%，折算當前現值為 -4540.15",
    tableHeader: ["年利率", "期數 (月)", "每期現金流", "PV 現值結果"],
    tableRows: [
      ["5%", "60", "100", { text: "-4540.15", highlight: true }]
    ],
    isTop70: true,
    keywords: "pv 現值 折現 當前價值 年金現值 財務現值"
  }
];


