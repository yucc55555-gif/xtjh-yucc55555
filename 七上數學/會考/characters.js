/**
 * ============================================================================
 * 小叮噹 (哆啦A夢) 角色 SVG 立繪、秘密道具圖鑑、魔王造型與人物口氣台詞庫
 * ============================================================================
 */

window.DORA_CHARS = {
  // 角色 SVG 頭像繪製器
  getAvatarSvg(role) {
    switch (role) {
      case 'doraemon':
        return `
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <!-- 藍色圓頭 -->
          <circle cx="50" cy="50" r="45" fill="#00A0E9" stroke="#1E293B" stroke-width="4"/>
          <!-- 白色臉頰肚皮 -->
          <ellipse cx="50" cy="57" rx="37" ry="33" fill="#FFFFFF" stroke="#1E293B" stroke-width="3.5"/>
          <!-- 大眼睛 -->
          <ellipse cx="40" cy="33" rx="10" ry="13" fill="#FFFFFF" stroke="#1E293B" stroke-width="3"/>
          <ellipse cx="60" cy="33" rx="10" ry="13" fill="#FFFFFF" stroke="#1E293B" stroke-width="3"/>
          <circle cx="43" cy="34" r="4" fill="#1E293B"/>
          <circle cx="57" cy="34" r="4" fill="#1E293B"/>
          <circle cx="44" cy="32" r="1.5" fill="#FFFFFF"/>
          <circle cx="58" cy="32" r="1.5" fill="#FFFFFF"/>
          <!-- 紅鼻子 -->
          <circle cx="50" cy="44" r="7" fill="#E60012" stroke="#1E293B" stroke-width="3"/>
          <circle cx="48" cy="42" r="2.2" fill="#FFFFFF"/>
          <!-- 人中與大微笑 -->
          <line x1="50" y1="51" x2="50" y2="66" stroke="#1E293B" stroke-width="3"/>
          <path d="M 26 62 Q 50 82 74 62" fill="none" stroke="#1E293B" stroke-width="3.5" stroke-linecap="round"/>
          <!-- 鬍鬚 -->
          <line x1="16" y1="48" x2="34" y2="52" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="14" y1="56" x2="33" y2="56" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="16" y1="64" x2="34" y2="60" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="84" y1="48" x2="66" y2="52" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="86" y1="56" x2="67" y2="56" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="84" y1="64" x2="66" y2="60" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>
          <!-- 紅項圈與金鈴鐺 -->
          <path d="M 22 84 Q 50 92 78 84" fill="none" stroke="#E60012" stroke-width="7" stroke-linecap="round"/>
          <circle cx="50" cy="88" r="8" fill="#FFD700" stroke="#1E293B" stroke-width="2.5"/>
          <line x1="43" y1="87" x2="57" y2="87" stroke="#1E293B" stroke-width="2"/>
          <circle cx="50" cy="91" r="2" fill="#1E293B"/>
        </svg>`;

      case 'nobita':
        return `
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <circle cx="50" cy="52" r="38" fill="#FDE68A" stroke="#1E293B" stroke-width="3.5"/>
          <!-- 黑髮 -->
          <path d="M 14 48 C 12 18, 88 18, 86 48 C 75 32, 25 32, 14 48 Z" fill="#1E293B"/>
          <!-- 大圓眼鏡 -->
          <circle cx="37" cy="50" r="13" fill="#FFFFFF" stroke="#1E293B" stroke-width="3.5"/>
          <circle cx="63" cy="50" r="13" fill="#FFFFFF" stroke="#1E293B" stroke-width="3.5"/>
          <line x1="50" y1="50" x2="50" y2="50" stroke="#1E293B" stroke-width="4"/>
          <line x1="13" y1="48" x2="24" y2="50" stroke="#1E293B" stroke-width="3"/>
          <line x1="76" y1="50" x2="87" y2="48" stroke="#1E293B" stroke-width="3"/>
          <circle cx="37" cy="50" r="3.5" fill="#1E293B"/>
          <circle cx="63" cy="50" r="3.5" fill="#1E293B"/>
          <!-- 微笑 -->
          <path d="M 38 72 Q 50 81 62 72" fill="none" stroke="#1E293B" stroke-width="3" stroke-linecap="round"/>
        </svg>`;

      case 'shizuka':
        return `
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <!-- 雙馬尾 -->
          <circle cx="16" cy="62" r="11" fill="#3B2314" stroke="#1E293B" stroke-width="3"/>
          <circle cx="84" cy="62" r="11" fill="#3B2314" stroke="#1E293B" stroke-width="3"/>
          <circle cx="50" cy="52" r="36" fill="#FFEDD5" stroke="#1E293B" stroke-width="3.5"/>
          <path d="M 15 48 C 15 16, 85 16, 85 48 C 68 33, 32 33, 15 48 Z" fill="#3B2314"/>
          <circle cx="37" cy="50" r="4.5" fill="#1E293B"/>
          <circle cx="63" cy="50" r="4.5" fill="#1E293B"/>
          <circle cx="35" cy="48" r="1.5" fill="#FFFFFF"/>
          <circle cx="61" cy="48" r="1.5" fill="#FFFFFF"/>
          <ellipse cx="28" cy="59" rx="5" ry="3" fill="#FDA4AF"/>
          <ellipse cx="72" cy="59" rx="5" ry="3" fill="#FDA4AF"/>
          <path d="M 40 69 Q 50 78 60 69" fill="none" stroke="#E11D48" stroke-width="3.2" stroke-linecap="round"/>
        </svg>`;

      case 'dorami':
        return `
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <!-- 紅色蝴蝶結耳朵 -->
          <path d="M 32 16 L 18 6 L 26 28 Z" fill="#E60012" stroke="#1E293B" stroke-width="3"/>
          <path d="M 68 16 L 82 6 L 74 28 Z" fill="#E60012" stroke="#1E293B" stroke-width="3"/>
          <circle cx="50" cy="54" r="40" fill="#FFD700" stroke="#1E293B" stroke-width="3.5"/>
          <ellipse cx="50" cy="60" rx="33" ry="28" fill="#FFFFFF" stroke="#1E293B" stroke-width="3"/>
          <ellipse cx="40" cy="40" rx="8" ry="11" fill="#FFFFFF" stroke="#1E293B" stroke-width="2.8"/>
          <ellipse cx="60" cy="40" rx="8" ry="11" fill="#FFFFFF" stroke="#1E293B" stroke-width="2.8"/>
          <circle cx="42" cy="41" r="3.5" fill="#1E293B"/>
          <circle cx="58" cy="41" r="3.5" fill="#1E293B"/>
          <circle cx="50" cy="50" r="5" fill="#FF4D88" stroke="#1E293B" stroke-width="2.5"/>
          <path d="M 35 66 Q 50 78 65 66" fill="none" stroke="#E60012" stroke-width="3" stroke-linecap="round"/>
        </svg>`;

      case 'gian':
        return `
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <circle cx="50" cy="54" r="40" fill="#FDBA74" stroke="#1E293B" stroke-width="3.5"/>
          <path d="M 14 42 L 28 24 L 42 32 L 50 20 L 60 32 L 74 24 L 86 42 Z" fill="#1E293B"/>
          <circle cx="37" cy="49" r="4.5" fill="#1E293B"/>
          <circle cx="63" cy="49" r="4.5" fill="#1E293B"/>
          <line x1="28" y1="40" x2="44" y2="44" stroke="#1E293B" stroke-width="3.5" stroke-linecap="round"/>
          <line x1="72" y1="40" x2="56" y2="44" stroke="#1E293B" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="50" cy="57" r="5" fill="#EA580C"/>
          <path d="M 32 72 Q 50 82 68 72" fill="#FFFFFF" stroke="#1E293B" stroke-width="3"/>
        </svg>`;

      case 'suneo':
        return `
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <circle cx="50" cy="54" r="36" fill="#FDE68A" stroke="#1E293B" stroke-width="3.5"/>
          <!-- 阿福飛機頭 -->
          <path d="M 20 42 L 8 24 L 35 26 L 22 12 L 58 22 L 82 36 Z" fill="#1E293B"/>
          <circle cx="38" cy="50" r="4" fill="#1E293B"/>
          <circle cx="62" cy="50" r="4" fill="#1E293B"/>
          <!-- 尖嘴 -->
          <path d="M 30 66 L 16 70 L 45 75 L 68 68" fill="#FDE68A" stroke="#1E293B" stroke-width="3" stroke-linejoin="round"/>
        </svg>`;

      case 'boss':
      default:
        return `
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <polygon points="50,8 88,28 82,78 50,94 18,78 12,28" fill="#7C3AED" stroke="#1E293B" stroke-width="4"/>
          <polygon points="24,18 12,4 36,14" fill="#F59E0B" stroke="#1E293B" stroke-width="3"/>
          <polygon points="76,18 88,4 64,14" fill="#F59E0B" stroke="#1E293B" stroke-width="3"/>
          <circle cx="36" cy="46" r="9" fill="#FEF08A" stroke="#1E293B" stroke-width="3"/>
          <circle cx="64" cy="46" r="9" fill="#FEF08A" stroke="#1E293B" stroke-width="3"/>
          <circle cx="36" cy="46" r="4" fill="#DC2626"/>
          <circle cx="64" cy="46" r="4" fill="#DC2626"/>
          <path d="M 28 70 L 36 63 L 44 70 L 50 63 L 56 70 L 64 63 L 72 70" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/>
        </svg>`;
    }
  },

  // 角色口氣動態解說開場白增強器
  getDynamicStepVoice(step, idx, totalSteps, qId) {
    const hash = (qId || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + idx;
    const pool = [
      {
        speaker: 'doraemon',
        speakerName: '小叮噹',
        gadget: '🔍 翻譯蒟蒻＋分析放大鏡',
        intros: [
          '別慌別慌！從百寶袋拿出「翻譯蒟蒻」，我們先把題目的條件列成數學式子看看：',
          '交給我小叮噹吧！拿出「數學透視放大鏡」，第一步的關鍵線索就在這裡喔：',
          '大雄別哭～只要吃完銅鑼燒，先照著題目給的數字把關係式列出來就對了：'
        ]
      },
      {
        speaker: 'shizuka',
        speakerName: '宜靜',
        gadget: '✏️ 電腦鉛筆',
        intros: [
          '大雄你看，接著我們用「電腦鉛筆」一步一步化簡、推導中間的關鍵步驟喔：',
          '這一步其實很溫柔喔！只要細心把剛剛的式子整理一下，就會變得超清楚：',
          '我們一起耐心算算看，把條件代進去化簡，馬上就能看出規律囉：'
        ]
      },
      {
        speaker: 'nobita',
        speakerName: '大雄',
        gadget: '🍞 記憶吐司',
        intros: [
          '哇！原來用「記憶吐司」記住這個觀念後，整理開來就清楚多了，我們繼續算：',
          '太棒了！原來沒有我想像中那麼恐怖嘛，接著把數字算出來就是這樣：'
        ]
      },
      {
        speaker: 'gian',
        speakerName: '技安',
        gadget: '🎤 胖虎音波擴音器',
        intros: [
          '哈哈！本大爺一眼就看出來了，這邊直接大膽地把它算出來就對啦：',
          '聽我唱首歌幫你助陣！看清楚這個關鍵算式，誰都別想算錯：'
        ]
      },
      {
        speaker: 'suneo',
        speakerName: '阿福',
        gadget: '🤖 遙控解題小飛船',
        intros: [
          '哼哼～這題的解題巧思我早就發現囉！你看這邊只要這樣代換：',
          '看我的厲害！注意這個幾何與代數的關係，關鍵轉折就在這一行：'
        ]
      },
      {
        speaker: 'dorami',
        speakerName: '小叮鈴',
        gadget: '🔔 黃金鈴鐺驗證器',
        intros: [
          '哥哥說得沒錯！最後一步用「黃金鈴鐺驗證器」核對一下，就能鎖定正確答案啦：',
          '太好囉！把最後的結果對照選項檢查一遍，完美收工過關！'
        ]
      }
    ];

    if (idx === 0) {
      const c = pool[0];
      return {
        speaker: c.speaker,
        speakerName: c.speakerName,
        gadget: c.gadget,
        intro: c.intros[hash % c.intros.length]
      };
    }
    if (idx === totalSteps - 1 && totalSteps > 1) {
      const c = pool[5];
      return {
        speaker: c.speaker,
        speakerName: c.speakerName,
        gadget: c.gadget,
        intro: c.intros[hash % c.intros.length]
      };
    }
    const midPool = [pool[1], pool[2], pool[3], pool[4]];
    const chosen = midPool[(hash + idx) % midPool.length];
    return {
      speaker: chosen.speaker,
      speakerName: chosen.speakerName,
      gadget: chosen.gadget,
      intro: chosen.intros[hash % chosen.intros.length]
    };
  },

  // 章節守關魔王清單
  getBossForChapter(chapterCode, chapterName) {
    const bosses = [
      { title: '四次元數線機械獸', gadgetReward: '🚁 竹蜻蜓' },
      { title: '聯立迷宮銅鑼燒怪', gadgetReward: '🚪 任意門' },
      { title: '直角坐標飛碟魔王', gadgetReward: '🍞 記憶吐司' },
      { title: '比例放大縮小巨龍', gadgetReward: '🔦 縮小燈' },
      { title: '不等式天平守護神', gadgetReward: '✏️ 電腦鉛筆' },
      { title: '幾何全等幻影騎士', gadgetReward: '🧣 時光包巾' },
      { title: '畢氏定理雷霆巨人', gadgetReward: '🔫 空氣砲' },
      { title: '圓周角星際領主', gadgetReward: '🛸 時光機' },
      { title: '二次函數拋物線魔王', gadgetReward: '🍮 翻譯蒟蒻' }
    ];
    const sum = (chapterCode || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return bosses[sum % bosses.length];
  }
};
