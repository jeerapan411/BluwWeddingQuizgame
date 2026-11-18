// ============================================================================
// BLUW WEDDING 3-PHASE MUSIC ENGINE (Web Audio Romantic Synthesizer + YouTube)
// Supports:
//   Phase 1 ('lobby')    : Sweet Romantic Wedding Music Box & Warm Piano
//   Phase 2 ('gameplay') : Cute Upbeat Wedding Marimba & Pop Groove
//   Phase 3 ('winner')   : Grand Romantic Celebration Fanfare & Chimes
// ============================================================================

export const RECOMMENDED_YOUTUBE_PRESETS = [
  {
    id: 'preset_sweet_piano',
    name: 'เซ็ตเพลงเปียโนงานแต่งโรแมนติก & สดใส (Romantic Wedding Piano Set)',
    description: 'เปียโนหวานละมุนช่วงรอแขก + จังหวะสนุกช่วงเล่นเกม + เพลงฉลองผู้ชนะ',
    lobbyUrl: 'https://www.youtube.com/watch?v=2ccaHpy5Ewo',
    playUrl: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
    winnerUrl: 'https://www.youtube.com/watch?v=ZbZSe6N_BXs'
  },
  {
    id: 'preset_acoustic_love',
    name: 'เซ็ตเพลงอะคูสติก & แจ๊สคาเฟ่ในสวน (Garden Wedding Acoustic & Bossa)',
    description: 'กีตาร์อะคูสติกอบอุ่นเหมาะกับงานแต่งในสวนและงานเลี้ยงฉลอง',
    lobbyUrl: 'https://www.youtube.com/watch?v=Dx5qFachd3A',
    playUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    winnerUrl: 'https://www.youtube.com/watch?v=c1K4_2o3DqQ'
  }
];

export const MUSIC_SOURCES_GUIDE = [
  {
    title: '1. เพลงหวานๆ ในตัวระบบ (Built-in Wedding Music Box)',
    detail: 'กดปุ่ม "ใช้เพลงหวานๆ ของระบบ" ได้เลย ไม่ต้องใช้ลิงก์ ไม่ติดโฆษณา และไม่ติดลิขสิทธิ์ 100%'
  },
  {
    title: '2. YouTube (ค้นหาด้วยคำว่า "Wedding Piano Instrumental" หรือ "Cute Game BGM")',
    detail: 'คัดลอกลิงก์จากช่อง YouTube (เช่น https://www.youtube.com/watch?v=... หรือ https://youtu.be/...) มาวางในช่องทั้ง 3 ช่วงได้ทันที'
  },
  {
    title: '3. เพลงธีมประจำตัวบ่าวสาว (Couple Theme Song บน YouTube)',
    detail: 'นำลิงก์ MV เพลงรักที่บ่าวสาวชอบมาใส่ในช่วงรอแขก (Lobby) และช่วงประกาศรางวัล (Winner) เพื่อสร้างบรรยากาศสุดพิเศษในงาน'
  }
];

export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();
  if (!clean) return null;

  const regExp =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
  const match = clean.match(regExp);
  if (match && match[1]) {
    return match[1];
  }
  // If user pasted raw 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }
  return null;
}

export function getPhaseFromSessionStatus(status) {
  if (!status || status === 'lobby') return 'lobby';
  if (status === 'finished') return 'winner';
  return 'gameplay';
}

// ============================================================================
// BUILT-IN SWEET WEDDING SYNTHESIZER (Web Audio API)
// ============================================================================

class WeddingSynthesizer {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.currentPhase = 'lobby';
    this.volume = 0.35;
    this.timerId = null;
    this.stepIndex = 0;
  }

  initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBellNote(freq, duration = 0.8, gainMult = 1, type = 'sine') {
    if (!this.ctx || !this.isPlaying) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    // Subtle warm harmonic overtone for music-box / romantic electric piano timbre
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(freq * 2, now);

    const peakGain = Math.max(0.001, this.volume * 0.22 * gainMult);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(peakGain * 0.25, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.6);

    osc.connect(gain);
    subOsc.connect(subGain);
    subGain.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    subOsc.start(now);
    osc.stop(now + duration + 0.05);
    subOsc.stop(now + duration + 0.05);
  }

  start(phase = 'lobby') {
    this.initContext();
    if (!this.ctx) return;

    this.stop();
    this.isPlaying = true;
    this.currentPhase = phase;
    this.stepIndex = 0;

    // Romantic note frequencies (Hz)
    // C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00, A4=440.00, B4=493.88
    // C5=523.25, D5=587.33, E5=659.25, F5=698.46, G5=783.99, A5=880.00, B5=987.77, C6=1046.50
    const lobbyMelody = [
      // Canon / Romantic Wedding Music Box Arpeggio in C Major / G Major
      { notes: [261.63, 523.25, 659.25], dur: 1.1 },
      { notes: [783.99], dur: 0.7 },
      { notes: [659.25], dur: 0.7 },
      { notes: [246.94, 493.88, 587.33], dur: 1.1 },
      { notes: [783.99], dur: 0.7 },
      { notes: [587.33], dur: 0.7 },
      { notes: [220.00, 440.00, 523.25], dur: 1.1 },
      { notes: [659.25], dur: 0.7 },
      { notes: [523.25], dur: 0.7 },
      { notes: [196.00, 392.00, 493.88], dur: 1.1 },
      { notes: [587.33], dur: 0.7 },
      { notes: [493.88], dur: 0.7 },
      { notes: [174.61, 349.23, 440.00], dur: 1.1 },
      { notes: [698.46], dur: 0.7 },
      { notes: [659.25], dur: 0.7 },
      { notes: [196.00, 392.00, 587.33], dur: 1.2 },
      { notes: [659.25], dur: 0.7 },
      { notes: [783.99], dur: 0.9 }
    ];

    const gameplayMelody = [
      // Cute Upbeat Bossa / Pop Marimba for Active Quiz & Bingo
      { notes: [261.63, 523.25], dur: 0.35 },
      { notes: [659.25], dur: 0.35 },
      { notes: [783.99], dur: 0.45 },
      { notes: [659.25], dur: 0.35 },
      { notes: [220.00, 523.25], dur: 0.35 },
      { notes: [659.25], dur: 0.35 },
      { notes: [880.00], dur: 0.45 },
      { notes: [783.99], dur: 0.35 },
      { notes: [174.61, 440.00], dur: 0.35 },
      { notes: [523.25], dur: 0.35 },
      { notes: [698.46], dur: 0.45 },
      { notes: [659.25], dur: 0.35 },
      { notes: [196.00, 493.88], dur: 0.35 },
      { notes: [587.33], dur: 0.35 },
      { notes: [783.99], dur: 0.5 },
      { notes: [587.33], dur: 0.35 }
    ];

    const winnerMelody = [
      // Grand Romantic Celebration Fanfare & Sparkling Chimes
      { notes: [261.63, 523.25, 659.25], dur: 0.5 },
      { notes: [523.25, 659.25, 783.99], dur: 0.5 },
      { notes: [523.25, 783.99, 1046.50], dur: 1.0 },
      { notes: [880.00, 1046.50], dur: 0.5 },
      { notes: [783.99, 987.77], dur: 0.5 },
      { notes: [349.23, 698.46, 880.00], dur: 0.8 },
      { notes: [392.00, 783.99, 987.77], dur: 0.8 },
      { notes: [261.63, 523.25, 659.25, 1046.50], dur: 1.3 }
    ];

    const sequence =
      phase === 'winner'
        ? winnerMelody
        : phase === 'gameplay'
        ? gameplayMelody
        : lobbyMelody;

    const intervalMs = phase === 'gameplay' ? 280 : phase === 'winner' ? 420 : 480;
    const waveType = phase === 'gameplay' ? 'triangle' : 'sine';

    const tick = () => {
      if (!this.isPlaying) return;
      const item = sequence[this.stepIndex % sequence.length];
      item.notes.forEach((n, idx) => {
        this.playBellNote(n, item.dur, idx === 0 ? 1 : 0.75, waveType);
      });
      this.stepIndex++;
    };

    tick();
    this.timerId = setInterval(tick, intervalMs);
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, Number(val) || 0.35));
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}

export const builtInSynth = new WeddingSynthesizer();
