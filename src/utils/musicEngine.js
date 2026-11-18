// ============================================================================
// BLUW WEDDING 3-PHASE MUSIC ENGINE & PRESET MANAGER
// Supports:
//   - Built-in Romantic Wedding Music Box & Upbeat Synthesizer
//   - 3-Phase YouTube Links (Lobby / Gameplay / Winner Finale)
//   - Custom Music Presets (Save, Preview 3 Phases, Set Default, Delete)
// ============================================================================

const PRESETS_STORAGE_KEY = 'bluw_wedding_music_presets_v1';
const DEFAULT_PRESET_ID_KEY = 'bluw_wedding_default_preset_id_v1';

export const BUILTIN_AND_RECOMMENDED_PRESETS = [
  {
    id: 'preset_builtin_musicbox',
    name: 'กล่องดนตรีงานแต่งโรแมนติก (Built-in Wedding Music Box)',
    description: 'เสียงกล่องดนตรีและเปียโนหวานละมุนของระบบ ไม่ใช้เน็ต ไม่ติดโฆษณา 100%',
    music_mode: 'builtin',
    lobbyUrl: '',
    playUrl: '',
    winnerUrl: '',
    isSystem: true
  },
  {
    id: 'preset_sweet_piano',
    name: 'เซ็ตเปียโนงานแต่งหวานละมุน & สดใส (Romantic Wedding Piano YouTube)',
    description: 'เปียโนโรแมนติกช่วงรอแขก + จังหวะสนุกช่วงเล่นเกม + เพลงฉลองผู้ชนะ',
    music_mode: 'youtube',
    lobbyUrl: 'https://www.youtube.com/watch?v=2ccaHpy5Ewo',
    playUrl: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
    winnerUrl: 'https://www.youtube.com/watch?v=ZbZSe6N_BXs',
    isSystem: true
  },
  {
    id: 'preset_acoustic_love',
    name: 'เซ็ตอะคูสติก & แจ๊สงานแต่งในสวน (Garden Acoustic & Bossa YouTube)',
    description: 'กีตาร์อะคูสติกอบอุ่นเหมาะกับงานแต่งในสวนและงานเลี้ยงฉลอง',
    music_mode: 'youtube',
    lobbyUrl: 'https://www.youtube.com/watch?v=Dx5qFachd3A',
    playUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    winnerUrl: 'https://www.youtube.com/watch?v=c1K4_2o3DqQ',
    isSystem: true
  }
];

// Keep backwards-compatible export
export const RECOMMENDED_YOUTUBE_PRESETS = BUILTIN_AND_RECOMMENDED_PRESETS.filter(
  (p) => p.music_mode === 'youtube'
);

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
    title: '3. บันทึกเป็น Preset เก็บไว้ใช้ในงานถัดไป',
    detail: 'เมื่อได้ชุดเพลง 3 ช่วงที่ถูกใจแล้ว กดปุ่ม "บันทึกเป็น Preset ใหม่" เพื่อเก็บไว้เลือกใช้ในเกมอื่นๆ พร้อมกดฟังพรีวิวได้ตลอดเวลา'
  }
];

export function getCustomMusicPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getAllMusicPresets() {
  const custom = getCustomMusicPresets();
  return [...BUILTIN_AND_RECOMMENDED_PRESETS, ...custom];
}

export function saveCustomMusicPreset({
  id,
  name,
  description,
  music_mode = 'youtube',
  lobbyUrl = '',
  playUrl = '',
  winnerUrl = ''
}) {
  const custom = getCustomMusicPresets();
  const presetId = id || `custom_preset_${Date.now()}`;
  const newPreset = {
    id: presetId,
    name: (name || 'ชุดเพลงงานแต่งของฉัน').trim(),
    description:
      (description || '').trim() ||
      (music_mode === 'builtin'
        ? 'เพลงกล่องดนตรีงานแต่งของระบบ'
        : 'ชุดลิงก์เพลง YouTube 3 ช่วงที่บันทึกไว้'),
    music_mode: music_mode || 'youtube',
    lobbyUrl: (lobbyUrl || '').trim(),
    playUrl: (playUrl || '').trim(),
    winnerUrl: (winnerUrl || '').trim(),
    isSystem: false,
    createdAt: new Date().toISOString()
  };

  const existingIdx = custom.findIndex((p) => p.id === presetId);
  if (existingIdx >= 0) {
    custom[existingIdx] = newPreset;
  } else {
    custom.unshift(newPreset);
  }

  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(custom));
  } catch {
    // Ignore storage error
  }
  return newPreset;
}

export function deleteCustomMusicPreset(presetId) {
  const custom = getCustomMusicPresets().filter((p) => p.id !== presetId);
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(custom));
    if (getDefaultPresetId() === presetId) {
      localStorage.removeItem(DEFAULT_PRESET_ID_KEY);
    }
  } catch {
    // Ignore
  }
  return custom;
}

export function getDefaultPresetId() {
  try {
    return localStorage.getItem(DEFAULT_PRESET_ID_KEY) || 'preset_builtin_musicbox';
  } catch {
    return 'preset_builtin_musicbox';
  }
}

export function setDefaultPresetId(presetId) {
  try {
    localStorage.setItem(DEFAULT_PRESET_ID_KEY, presetId);
  } catch {
    // Ignore
  }
}

export function getDefaultMusicConfig() {
  const defaultId = getDefaultPresetId();
  const all = getAllMusicPresets();
  const found = all.find((p) => p.id === defaultId) || BUILTIN_AND_RECOMMENDED_PRESETS[0];
  return {
    music_preset_id: found.id,
    music_mode: found.music_mode || 'builtin',
    music_lobby_yt: found.lobbyUrl || '',
    music_play_yt: found.playUrl || '',
    music_winner_yt: found.winnerUrl || ''
  };
}

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

    const lobbyMelody = [
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
export const previewSynth = new WeddingSynthesizer();
