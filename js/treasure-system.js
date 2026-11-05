// ============================================================================
// 偉大航道神秘寶箱系統 (treasure-system.js)
// 包含 4 大類別、16+ 種隨機寶物、海賊夥伴語音彩蛋與實用學習加成
// ============================================================================

const TREASURE_POOL = [
  // 1. 航海王專屬神級道具與食物補給 (加 EXP / 懸賞金)
  {
    id: 'meat_feast',
    name: '魯夫特製・巨無霸帶骨烤肉盛宴 🍖',
    category: '補給品',
    rarity: 'SSR',
    color: '#e63946',
    desc: '肉！肉！好多的肉！吃下後瞬間充滿活力，熱血沸騰！',
    effectText: '獲得額外 100 EXP ＆ ฿ 5,000,000 懸賞金！',
    expBonus: 100,
    bountyBonus: 5000000,
    characterQuote: {
      char: '魯夫',
      avatar: '👒',
      text: 'ヒヒヒ！這可是我藏在船底最大的烤肉！分你吃一口，一起把下一座島嶼秒殺吧！'
    }
  },
  {
    id: 'rumble_ball',
    name: '喬巴的萬能金色藍波球 💊',
    category: '果實強化',
    rarity: 'SSR',
    color: '#f4a261',
    desc: '經過喬巴極限研發的「數學頭腦強化藍波球」，能大幅提升邏輯運算速度！',
    effectText: '獲得額外 120 EXP ＆ 解鎖「頭腦強化診斷」狀態！',
    expBonus: 120,
    bountyBonus: 3000000,
    characterQuote: {
      char: '喬巴',
      avatar: '🦌',
      text: '這是我的最新研究成果喔！吃下去之後，就算看到多步驟的四則運算也不會頭暈了！'
    }
  },
  {
    id: 'nami_gold',
    name: '娜美的秘密黃金寶藏箱 💰',
    category: '金幣財富',
    rarity: 'SR',
    color: '#eab308',
    desc: '從海底打撈上來的純金寶箱，裡面塞滿了閃閃發亮的金幣！',
    effectText: '獲得額外 80 EXP ＆ ฿ 8,888,888 懸賞金！',
    expBonus: 80,
    bountyBonus: 8888888,
    characterQuote: {
      char: '娜美',
      avatar: '🍊',
      text: '哇～好多的貝里！看在你是優秀航海助手的份上，這次就分你一些吧！'
    }
  },
  {
    id: 'sanji_dessert',
    name: '香吉士的皇家特調甜點 🍰',
    category: '補給品',
    rarity: 'SR',
    color: '#ec4899',
    desc: '香吉士主廚親手烘烤的頂級舒芙蕾，甜而不膩，提神醒腦！',
    effectText: '獲得額外 70 EXP ＆ ฿ 2,000,000 懸賞金！',
    expBonus: 70,
    bountyBonus: 2000000,
    characterQuote: {
      char: '香吉士',
      avatar: '🍳',
      text: '算數學傷腦筋了吧？嚐嚐這道特製甜點，優雅地迎接接下來的挑戰吧！'
    }
  },

  // 2. 康軒七上數學必勝通關秘笈 (秒殺觀念卡)
  {
    id: 'secret_scroll_1',
    name: '【航海密技】負負得正與去括號口訣卷軸 📜',
    category: '數學秘笈',
    rarity: 'SSR',
    color: '#8b5cf6',
    desc: '「括號前面若是減，拆開通通要變臉；負負相乘得正數，大數減小定正負！」',
    effectText: '觀念大突破！獲得 90 EXP ＆ 第1章運算免疫護盾！',
    expBonus: 90,
    bountyBonus: 4000000,
    characterQuote: {
      char: '羅賓',
      avatar: '🌸',
      text: '呵呵，這份古老卷軸記載了古代航海士快速化簡代數式的智慧，非常適合你喔。'
    }
  },
  {
    id: 'secret_scroll_2',
    name: '【航海密技】倍數秒殺法典 📜',
    category: '數學秘笈',
    rarity: 'SR',
    color: '#06b6d4',
    desc: '「末位0/2/4/6/8是2倍，各位數相加是3/9倍，奇偶位差是11倍！」',
    effectText: '秒殺因倍數！獲得 80 EXP ＆ ฿ 3,000,000 懸賞金！',
    expBonus: 80,
    bountyBonus: 3000000,
    characterQuote: {
      char: '索隆',
      avatar: '⚔️',
      text: '把這些倍數規則看成敵人的破綻，一刀斬下去就對了，根本不用除法硬算！'
    }
  },
  {
    id: 'secret_scroll_3',
    name: '【航海密技】一元一次方程式等量天平 ⚖️',
    category: '數學秘笈',
    rarity: 'SSR',
    color: '#10b981',
    desc: '「移項加變減、乘變除；分數等式兩邊同乘公倍數，去分母無壓力！」',
    effectText: '解方程式神技！獲得 100 EXP ＆ ฿ 6,000,000 懸賞金！',
    expBonus: 100,
    bountyBonus: 6000000,
    characterQuote: {
      char: '弗蘭奇',
      avatar: '🤖',
      text: 'SUPER——！方程式就像天平兩邊的齒輪，兩邊同乘同除就超級平衡啦！'
    }
  },

  // 3. 傳奇航海裝備
  {
    id: 'eternal_pose',
    name: '偉大航道・永久指針 (拉夫德爾方向) 🧭',
    category: '傳奇航海具',
    rarity: 'UR',
    color: '#f97316',
    desc: '永不失真、永遠鎖定數學大秘寶終點島嶼的神秘指針！',
    effectText: '傳說級寶物！獲得 150 EXP ＆ ฿ 10,000,000 懸賞金！',
    expBonus: 150,
    bountyBonus: 10000000,
    characterQuote: {
      char: '魯夫',
      avatar: '👒',
      text: '哇喔喔喔！這顆指針正朝著大秘寶的方向轉動耶！跟著它前進準沒錯！'
    }
  },
  {
    id: 'wado_ichimonji',
    name: '大快刀二十一工・和道一文字 🗡️',
    category: '傳奇名刀',
    rarity: 'UR',
    color: '#3b82f6',
    desc: '純白刀鞘的傳奇名刀，能一刀斬斷所有繁雜的計算盲點！',
    effectText: '神刀出鞘！獲得 150 EXP ＆ ฿ 10,000,000 懸賞金！',
    expBonus: 150,
    bountyBonus: 10000000,
    characterQuote: {
      char: '索隆',
      avatar: '⚔️',
      text: '……拿好它。揮刀時心要靜，看清題目的已知條件再出招！'
    }
  }
];

class TreasureService {
  drawRandomTreasure() {
    const idx = Math.floor(Math.random() * TREASURE_POOL.length);
    return TREASURE_POOL[idx];
  }

  applyTreasureReward(student, treasure) {
    if (!student) return null;
    student.exp = (student.exp || 0) + (treasure.expBonus || 50);
    student.bounty = (student.bounty || 0) + (treasure.bountyBonus || 1000000);
    return student;
  }
}

const treasureService = new TreasureService();
