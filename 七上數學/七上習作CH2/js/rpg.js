/**
 * 國中七上數學第二章金庸武俠 RPG 引擎
 * 包含 Web Audio API 合成音效、俠客角色屬性、稱號系統與戰鬥特效
 */

class WuxiaAudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  // 劍氣破空音效 (答題攻擊)
  playSwordSlash() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  // 擊中暴擊音效 (正確命中)
  playHit() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(350, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  // 受創音效 (答錯受擊)
  playHurt() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(70, ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  }

  // 勝利喝彩和弦
  playVictory() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime + idx * 0.12;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.65);
    });
  }

  // 戰敗嘆息低音
  playDefeat() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [400, 350, 300, 240];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime + idx * 0.18;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }
}

// 俠客頭銜計算
function getHeroTitle(level) {
  if (level >= 20) return '武林盟主·一代宗師';
  if (level >= 15) return '華山論劍·絕頂高手';
  if (level >= 12) return '名門掌門·威震一方';
  if (level >= 9) return '傳功長老·深不可測';
  if (level >= 6) return '江湖俠客·行俠仗義';
  if (level >= 3) return '武林新秀·初露鋒芒';
  return '江湖少俠·潛心修煉';
}

// 門派代表絕學
const WUXIA_SECTS = [
  { name: '武當派', skill: '太極乾坤劍', icon: '☯️', desc: '以柔克剛，分數通分化繁為簡' },
  { name: '少林派', skill: '易筋金剛掌', icon: '📿', desc: '佛法無邊，質因公倍溯本求源' },
  { name: '華山派', skill: '獨孤九劍', icon: '🗡️', desc: '無招勝有招，指數乘方連綿不絕' },
  { name: '桃花島', skill: '奇門八卦術', icon: '🌸', desc: '運轉乾坤，生活素養通盤算計' },
  { name: '大理段氏', skill: '六脈神劍', icon: '👑', desc: '指點江山，除法逆算百步穿楊' }
];

// 全域音效實例
window.wuxiaAudio = new WuxiaAudioEngine();
window.getHeroTitle = getHeroTitle;
window.WUXIA_SECTS = WUXIA_SECTS;
