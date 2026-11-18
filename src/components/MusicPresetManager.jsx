import React, { useState, useEffect } from 'react';
import {
  Music,
  Play,
  Square,
  Star,
  BookmarkPlus,
  CheckCircle2,
  Trash2,
  Sparkles,
  Youtube,
  Headphones,
  Pin
} from 'lucide-react';
import {
  getAllMusicPresets,
  saveCustomMusicPreset,
  deleteCustomMusicPreset,
  getDefaultPresetId,
  setDefaultPresetId,
  extractYouTubeId,
  previewSynth
} from '../utils/musicEngine';

const PHASE_NAMES = {
  lobby: 'ช่วงที่ 1: รอคนเข้า (Lobby)',
  gameplay: 'ช่วงที่ 2: เล่นเกม (Gameplay)',
  winner: 'ช่วงที่ 3: ประกาศผู้ชนะ (Winner)'
};

export default function MusicPresetManager({
  musicMode = 'builtin',
  lobbyYt = '',
  playYt = '',
  winnerYt = '',
  onChangeMusic
}) {
  const [presets, setPresets] = useState(() => getAllMusicPresets());
  const [defaultPresetId, setDefaultIdState] = useState(() => getDefaultPresetId());

  // Save new preset form state
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [makeDefaultOnSave, setMakeDefaultOnSave] = useState(true);
  const [savedToast, setSavedToast] = useState('');

  // Active Preview State: { presetId, phase, type: 'builtin' | 'youtube', youtubeId, label }
  const [activePreview, setActivePreview] = useState(null);

  useEffect(() => {
    return () => {
      previewSynth.stop();
    };
  }, []);

  const stopPreview = () => {
    previewSynth.stop();
    setActivePreview(null);
  };

  const startPhasePreview = ({ presetId, phase, mode, url, title }) => {
    // Toggle off if clicking the same active preview
    if (
      activePreview &&
      activePreview.presetId === presetId &&
      activePreview.phase === phase
    ) {
      stopPreview();
      return;
    }

    previewSynth.stop();
    const ytId = mode === 'youtube' ? extractYouTubeId(url) : null;

    if (ytId) {
      setActivePreview({
        presetId,
        phase,
        type: 'youtube',
        youtubeId: ytId,
        label: `${title} — ${PHASE_NAMES[phase]}`
      });
    } else {
      previewSynth.start(phase);
      setActivePreview({
        presetId,
        phase,
        type: 'builtin',
        youtubeId: null,
        label: `${title} — ${PHASE_NAMES[phase]} (เสียงกล่องดนตรีงานแต่งของระบบ)`
      });
    }
  };

  const handleSelectPreset = (preset) => {
    stopPreview();
    if (onChangeMusic) {
      onChangeMusic({
        music_preset_id: preset.id,
        music_mode: preset.music_mode || 'builtin',
        music_lobby_yt: preset.lobbyUrl || '',
        music_play_yt: preset.playUrl || '',
        music_winner_yt: preset.winnerUrl || ''
      });
    }
    setSavedToast(`เลือกใช้ Preset "${preset.name}" เรียบร้อยแล้ว`);
    setTimeout(() => setSavedToast(''), 2800);
  };

  const handleSetAsDefault = (preset) => {
    setDefaultPresetId(preset.id);
    setDefaultIdState(preset.id);
    setSavedToast(`ตั้ง "${preset.name}" เป็นค่าเริ่มต้นสำหรับเกมใหม่แล้ว`);
    setTimeout(() => setSavedToast(''), 2800);
  };

  const handleSaveCurrentAsPreset = (e) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const created = saveCustomMusicPreset({
      name: newPresetName.trim(),
      description: newPresetDesc.trim(),
      music_mode: musicMode,
      lobbyUrl: lobbyYt,
      playUrl: playYt,
      winnerUrl: winnerYt
    });

    if (makeDefaultOnSave) {
      setDefaultPresetId(created.id);
      setDefaultIdState(created.id);
    }

    setPresets(getAllMusicPresets());
    setNewPresetName('');
    setNewPresetDesc('');
    setShowSaveForm(false);
    setSavedToast(`บันทึก Preset "${created.name}" เก็บไว้ใช้ในเกมอื่นเรียบร้อยแล้ว!`);
    setTimeout(() => setSavedToast(''), 3200);
  };

  const handleDeletePreset = (presetId) => {
    deleteCustomMusicPreset(presetId);
    setPresets(getAllMusicPresets());
    setDefaultIdState(getDefaultPresetId());
  };

  const isPresetCurrentlyApplied = (preset) => {
    if (preset.music_mode === 'builtin' && musicMode === 'builtin') return true;
    if (
      preset.music_mode === 'youtube' &&
      musicMode === 'youtube' &&
      (preset.lobbyUrl || '') === (lobbyYt || '') &&
      (preset.playUrl || '') === (playYt || '') &&
      (preset.winnerUrl || '') === (winnerYt || '')
    ) {
      return true;
    }
    return false;
  };

  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        padding: '1.35rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        marginBottom: '1.5rem'
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '1.05rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-primary)'
            }}
          >
            <Music size={19} color="var(--accent-primary)" />
            ตั้งค่าเพลงบรรเลง 3 ช่วงเวลา & คลัง Preset เพลงโปรด
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            กดฟังพรีวิวเพลงทั้ง 3 ช่วงก่อนเลือกใช้ หรือบันทึกชุดเพลงที่ถูกใจเป็น Preset เพื่อนำไปใช้ในเกมอื่นๆ ได้ทันที
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${musicMode === 'builtin' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
            onClick={() =>
              onChangeMusic &&
              onChangeMusic({
                music_mode: 'builtin',
                music_lobby_yt: lobbyYt,
                music_play_yt: playYt,
                music_winner_yt: winnerYt
              })
            }
          >
            <Sparkles size={15} />
            ใช้เพลงหวานๆ ของระบบ
          </button>

          <button
            type="button"
            className="btn btn-gold"
            style={{ padding: '0.45rem 0.95rem', fontSize: '0.82rem' }}
            onClick={() => setShowSaveForm((prev) => !prev)}
          >
            <BookmarkPlus size={16} />
            บันทึกชุดเพลงนี้เป็น Preset ใหม่
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {savedToast && (
        <div
          style={{
            background: 'var(--status-success-bg)',
            color: 'var(--status-success)',
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <CheckCircle2 size={17} />
          <span>{savedToast}</span>
        </div>
      )}

      {/* Save Custom Preset Drawer */}
      {showSaveForm && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '2px solid var(--accent-primary)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.15rem',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.75rem' }}>
            ⭐ บันทึกการตั้งค่าเพลง 3 ช่วงปัจจุบันเป็น Preset เก็บไว้ใช้ในเกมอื่น
          </div>
          <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
            <div className="form-group">
              <label>ตั้งชื่อ Preset เพลงชุดนี้ *</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น เซ็ตเพลงงานแต่งโรแมนติก (คู่คุณพลอย)"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>รายละเอียดสั้นๆ (ไม่บังคับ)</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น เปียโนช่วงรอ + เพลงสนุกช่วงบิงโก + เพลงฉลองรางวัล"
                value={newPresetDesc}
                onChange={(e) => setNewPresetDesc(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={makeDefaultOnSave}
                onChange={(e) => setMakeDefaultOnSave(e.target.checked)}
              />
              <span>ตั้งเป็น Preset เริ่มต้นอัตโนมัติเวลาสร้างเกมใหม่</span>
            </label>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
                onClick={() => setShowSaveForm(false)}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '0.4rem 1rem', fontSize: '0.82rem' }}
                onClick={handleSaveCurrentAsPreset}
              >
                <CheckCircle2 size={15} />
                บันทึก Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Audio / YouTube Preview Player Banner */}
      {activePreview && (
        <div
          style={{
            background: '#1c1518',
            color: '#fdf9f6',
            borderRadius: 'var(--radius-lg)',
            padding: '0.85rem 1.15rem',
            marginBottom: '1.15rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            border: '1px solid rgba(246, 213, 158, 0.4)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Headphones size={20} color="#f6d59e" />
            <div>
              <div style={{ fontSize: '0.76rem', color: '#f6d59e' }}>
                กำลังพรีวิวทดลองฟังเพลง:
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {activePreview.label}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {activePreview.type === 'youtube' && activePreview.youtubeId && (
              <iframe
                width="250"
                height="68"
                src={`https://www.youtube.com/embed/${activePreview.youtubeId}?autoplay=1`}
                title="YouTube Preset Preview"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                style={{ borderRadius: '8px', background: '#000' }}
              />
            )}
            <button
              type="button"
              className="btn btn-danger"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
              onClick={stopPreview}
            >
              <Square size={14} />
              หยุดพรีวิว
            </button>
          </div>
        </div>
      )}

      {/* 3-Phase Direct YouTube Inputs with Per-Phase Instant Preview Buttons */}
      <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
        {/* Phase 1: Lobby */}
        <div className="form-group">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.4rem'
            }}
          >
            <label>1. เพลงช่วงรอคนเข้า (Waiting Lobby)</label>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.2rem 0.55rem', fontSize: '0.74rem' }}
              onClick={() =>
                startPhasePreview({
                  presetId: 'current_input',
                  phase: 'lobby',
                  mode: lobbyYt.trim() ? 'youtube' : 'builtin',
                  url: lobbyYt,
                  title: 'เพลงที่ตั้งค่าอยู่'
                })
              }
            >
              <Play size={12} />
              ฟังพรีวิวช่วงที่ 1
            </button>
          </div>
          <input
            type="text"
            className="form-input"
            placeholder="วางลิงก์ YouTube (เว้นว่าง = ใช้เพลงหวานๆ ของระบบ)"
            value={lobbyYt}
            onChange={(e) =>
              onChangeMusic &&
              onChangeMusic({
                music_mode: e.target.value.trim() ? 'youtube' : musicMode,
                music_lobby_yt: e.target.value,
                music_play_yt: playYt,
                music_winner_yt: winnerYt
              })
            }
          />
        </div>

        {/* Phase 2: Gameplay */}
        <div className="form-group">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.4rem'
            }}
          >
            <label>2. เพลงช่วงระหว่างเล่นเกม (Gameplay)</label>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.2rem 0.55rem', fontSize: '0.74rem' }}
              onClick={() =>
                startPhasePreview({
                  presetId: 'current_input',
                  phase: 'gameplay',
                  mode: playYt.trim() ? 'youtube' : 'builtin',
                  url: playYt,
                  title: 'เพลงที่ตั้งค่าอยู่'
                })
              }
            >
              <Play size={12} />
              ฟังพรีวิวช่วงที่ 2
            </button>
          </div>
          <input
            type="text"
            className="form-input"
            placeholder="วางลิงก์ YouTube (เว้นว่าง = ใช้เพลงสนุกๆ ของระบบ)"
            value={playYt}
            onChange={(e) =>
              onChangeMusic &&
              onChangeMusic({
                music_mode: e.target.value.trim() ? 'youtube' : musicMode,
                music_lobby_yt: lobbyYt,
                music_play_yt: e.target.value,
                music_winner_yt: winnerYt
              })
            }
          />
        </div>

        {/* Phase 3: Winner Finale */}
        <div className="form-group">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.4rem'
            }}
          >
            <label>3. เพลงช่วงประกาศผู้ชนะ (Winner Finale)</label>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.2rem 0.55rem', fontSize: '0.74rem' }}
              onClick={() =>
                startPhasePreview({
                  presetId: 'current_input',
                  phase: 'winner',
                  mode: winnerYt.trim() ? 'youtube' : 'builtin',
                  url: winnerYt,
                  title: 'เพลงที่ตั้งค่าอยู่'
                })
              }
            >
              <Play size={12} />
              ฟังพรีวิวช่วงที่ 3
            </button>
          </div>
          <input
            type="text"
            className="form-input"
            placeholder="วางลิงก์ YouTube (เว้นว่าง = ใช้เพลงฉลองรางวัลของระบบ)"
            value={winnerYt}
            onChange={(e) =>
              onChangeMusic &&
              onChangeMusic({
                music_mode: e.target.value.trim() ? 'youtube' : musicMode,
                music_lobby_yt: lobbyYt,
                music_play_yt: playYt,
                music_winner_yt: e.target.value
              })
            }
          />
        </div>
      </div>

      {/* Presets Catalog with 3-Phase Preview Before Selecting */}
      <div>
        <div
          style={{
            fontWeight: 700,
            fontSize: '0.88rem',
            marginBottom: '0.6rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>📂 รายการ Preset เพลงทั้งหมด ({presets.length} ชุด — กดพรีวิวฟังเสียงก่อนเลือกได้)</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {presets.map((preset) => {
            const isApplied = isPresetCurrentlyApplied(preset);
            const isDefault = defaultPresetId === preset.id;

            return (
              <div
                key={preset.id}
                style={{
                  background: isApplied ? 'var(--accent-soft)' : 'var(--bg-surface)',
                  border: isApplied
                    ? '2px solid var(--accent-primary)'
                    : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1.05rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <strong style={{ fontSize: '0.93rem' }}>{preset.name}</strong>
                      <span
                        className={`badge ${
                          preset.music_mode === 'builtin' ? 'badge-quiz' : 'badge-bingo'
                        }`}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {preset.music_mode === 'builtin' ? 'เพลงระบบในตัว' : 'YouTube 3 ช่วง'}
                      </span>
                      {!preset.isSystem && (
                        <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                          ⭐ Preset ของคุณ
                        </span>
                      )}
                      {isDefault && (
                        <span className="badge badge-event" style={{ fontSize: '0.7rem' }}>
                          📌 ค่าเริ่มต้นเกมใหม่
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                        marginTop: '0.18rem'
                      }}
                    >
                      {preset.description}
                    </div>
                  </div>

                  {/* Select / Set Default / Delete Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`btn ${isApplied ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
                      onClick={() => handleSelectPreset(preset)}
                    >
                      <CheckCircle2 size={14} />
                      {isApplied ? 'กำลังใช้งานชุดนี้' : 'เลือกใช้ Preset นี้'}
                    </button>

                    {!isDefault && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                        onClick={() => handleSetAsDefault(preset)}
                        title="ตั้งเป็น Preset เริ่มต้นสำหรับเกมใหม่ทุกเกม"
                      >
                        <Pin size={13} />
                        ตั้งเป็นค่าเริ่มต้น
                      </button>
                    )}

                    {!preset.isSystem && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => handleDeletePreset(preset.id)}
                        title="ลบ Preset นี้"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 3-Phase Audio Preview Buttons Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    flexWrap: 'wrap',
                    paddingTop: '0.45rem',
                    borderTop: '1px dashed var(--border-subtle)'
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.76rem',
                      color: 'var(--text-muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      marginRight: '0.2rem'
                    }}
                  >
                    <Headphones size={13} />
                    กดฟังพรีวิวก่อนเลือก:
                  </span>

                  {[
                    { phase: 'lobby', label: '1. ช่วงรอคนเข้า', url: preset.lobbyUrl },
                    { phase: 'gameplay', label: '2. ช่วงเล่นเกม', url: preset.playUrl },
                    { phase: 'winner', label: '3. ช่วงผู้ชนะ', url: preset.winnerUrl }
                  ].map((item) => {
                    const isThisPlaying =
                      activePreview &&
                      activePreview.presetId === preset.id &&
                      activePreview.phase === item.phase;

                    return (
                      <button
                        key={item.phase}
                        type="button"
                        className={`btn ${isThisPlaying ? 'btn-gold' : 'btn-secondary'}`}
                        style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                        onClick={() =>
                          startPhasePreview({
                            presetId: preset.id,
                            phase: item.phase,
                            mode: preset.music_mode,
                            url: item.url,
                            title: preset.name
                          })
                        }
                      >
                        {isThisPlaying ? <Square size={11} /> : <Play size={11} />}
                        {isThisPlaying ? `หยุดฟัง (${item.label})` : `พรีวิว ${item.label}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
