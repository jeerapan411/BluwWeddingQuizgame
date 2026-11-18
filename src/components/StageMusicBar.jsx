import React, { useState, useEffect } from 'react';
import {
  Music,
  Volume2,
  VolumeX,
  Youtube,
  Sparkles,
  Settings,
  X,
  CheckCircle2
} from 'lucide-react';
import {
  builtInSynth,
  extractYouTubeId,
  getPhaseFromSessionStatus,
  RECOMMENDED_YOUTUBE_PRESETS,
  MUSIC_SOURCES_GUIDE
} from '../utils/musicEngine';

const PHASE_LABELS = {
  lobby: 'ช่วงที่ 1: รอแขกสแกน QR เข้างาน (Lobby Music)',
  gameplay: 'ช่วงที่ 2: กำลังเล่นเกมลุ้นคำตอบ (Gameplay Music)',
  winner: 'ช่วงที่ 3: ประกาศรางวัลผู้ชนะ (Winner Finale)'
};

export default function StageMusicBar({ session, onUpdateSessionMusic }) {
  const game = session?.game_snapshot || {};
  const currentPhase = getPhaseFromSessionStatus(session?.status);

  const [isMuted, setIsMuted] = useState(true);
  const [musicSourceMode, setMusicSourceMode] = useState(
    game.music_mode || 'builtin' // 'builtin' | 'youtube'
  );
  const [lobbyYt, setLobbyYt] = useState(game.music_lobby_yt || '');
  const [playYt, setPlayYt] = useState(game.music_play_yt || '');
  const [winnerYt, setWinnerYt] = useState(game.music_winner_yt || '');
  const [showMusicModal, setShowMusicModal] = useState(false);

  // Determine active YouTube video ID for the current phase
  const currentYtUrl =
    currentPhase === 'winner'
      ? winnerYt
      : currentPhase === 'gameplay'
      ? playYt
      : lobbyYt;
  const activeYoutubeId =
    musicSourceMode === 'youtube' ? extractYouTubeId(currentYtUrl) : null;

  // Sync built-in synthesizer whenever phase, mute, or source mode changes
  useEffect(() => {
    if (isMuted) {
      builtInSynth.stop();
      return;
    }

    // If mode is builtin OR no valid YouTube link was provided for this phase, play built-in wedding music!
    if (musicSourceMode === 'builtin' || !activeYoutubeId) {
      builtInSynth.start(currentPhase);
    } else {
      builtInSynth.stop();
    }

    return () => {
      builtInSynth.stop();
    };
  }, [isMuted, musicSourceMode, currentPhase, activeYoutubeId]);

  const handleTogglePlayMusic = () => {
    setIsMuted((prev) => !prev);
  };

  const handleUseBuiltInImmediately = () => {
    setMusicSourceMode('builtin');
    setIsMuted(false);
  };

  const handleApplyPreset = (preset) => {
    setLobbyYt(preset.lobbyUrl);
    setPlayYt(preset.playUrl);
    setWinnerYt(preset.winnerUrl);
    setMusicSourceMode('youtube');
  };

  const handleSaveMusicSettings = (e) => {
    e.preventDefault();
    if (onUpdateSessionMusic) {
      onUpdateSessionMusic({
        music_mode: musicSourceMode,
        music_lobby_yt: lobbyYt,
        music_play_yt: playYt,
        music_winner_yt: winnerYt
      });
    }
    setShowMusicModal(false);
  };

  return (
    <>
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(246, 213, 158, 0.28)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.6rem 1.1rem',
          marginTop: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${isMuted ? 'btn-gold' : 'btn-primary'}`}
            style={{ padding: '0.42rem 0.95rem', fontSize: '0.84rem' }}
            onClick={handleTogglePlayMusic}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            {isMuted ? 'กดเปิดเพลงบรรเลงในงาน' : 'กำลังเล่นเพลง (กดเพื่อปิดเสียง)'}
          </button>

          <span style={{ fontSize: '0.84rem', color: '#f6d59e', fontWeight: 500 }}>
            🎵 {PHASE_LABELS[currentPhase]}
          </span>

          <span
            style={{
              fontSize: '0.76rem',
              background: 'rgba(0,0,0,0.3)',
              padding: '0.2rem 0.65rem',
              borderRadius: '999px',
              color: 'rgba(255,255,255,0.85)'
            }}
          >
            {activeYoutubeId
              ? 'กำลังใช้เพลงจากลิงก์ YouTube'
              : 'กำลังใช้เพลงหวานๆ ของระบบ (Wedding Music Box)'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              padding: '0.38rem 0.8rem',
              fontSize: '0.8rem',
              background:
                musicSourceMode === 'builtin'
                  ? 'rgba(200, 155, 87, 0.35)'
                  : 'rgba(255,255,255,0.1)',
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.25)'
            }}
            onClick={handleUseBuiltInImmediately}
          >
            <Sparkles size={14} />
            ใช้เพลงหวานๆ ของระบบ
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{
              padding: '0.38rem 0.8rem',
              fontSize: '0.8rem',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.25)'
            }}
            onClick={() => setShowMusicModal(true)}
          >
            <Youtube size={15} color="#ff6b6b" />
            ตั้งค่าลิงก์เพลง YouTube 3 ช่วง
          </button>
        </div>
      </div>

      {/* Embedded YouTube Audio/Video Bar when active & unmuted */}
      {!isMuted && activeYoutubeId && (
        <div
          style={{
            marginTop: '0.6rem',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
            กำลังเล่นเพลง YouTube สำหรับ <strong>{PHASE_LABELS[currentPhase]}</strong> (หากเบราว์เซอร์บล็อกเสียงอัตโนมัติ สามารถกดปุ่ม Play บนกรอบวิดีโอด้านขวาได้เลย)
          </div>
          <iframe
            width="240"
            height="65"
            src={`https://www.youtube.com/embed/${activeYoutubeId}?autoplay=1&loop=1&playlist=${activeYoutubeId}`}
            title="YouTube Stage Theme Music"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            style={{ borderRadius: '8px' }}
          />
        </div>
      )}

      {/* Modal: Configure 3-Phase YouTube Links or System Wedding Music */}
      {showMusicModal && (
        <div className="modal-backdrop" onClick={() => setShowMusicModal(false)}>
          <div
            className="modal-content"
            style={{ color: 'var(--text-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Music size={22} color="var(--accent-primary)" />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
                  ตั้งค่าเพลงประกอบงานแต่ง 3 ช่วง (YouTube & เพลงระบบ)
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowMusicModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMusicSettings}>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn ${
                    musicSourceMode === 'builtin' ? 'btn-primary' : 'btn-secondary'
                  }`}
                  onClick={() => setMusicSourceMode('builtin')}
                >
                  <Sparkles size={16} />
                  ใช้เพลงหวานๆ ของระบบ (ไม่ต้องใส่ลิงก์)
                </button>
                <button
                  type="button"
                  className={`btn ${
                    musicSourceMode === 'youtube' ? 'btn-primary' : 'btn-secondary'
                  }`}
                  onClick={() => setMusicSourceMode('youtube')}
                >
                  <Youtube size={16} />
                  ใช้เพลงจากลิงก์ YouTube 3 ช่วง
                </button>
              </div>

              <div
                style={{
                  background: 'var(--bg-primary)',
                  padding: '1.15rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.65rem' }}>
                  ใส่ลิงก์ YouTube แยกตาม 3 ช่วงเวลา (หากช่องไหนเว้นว่าง ระบบจะเล่นเพลงหวานๆ ของระบบแทนอัตโนมัติ)
                </div>

                <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                  <label>1. ลิงก์ YouTube ช่วงรอแขกสแกน QR เข้าเล่น (Waiting Lobby)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="เช่น https://www.youtube.com/watch?v=..."
                    value={lobbyYt}
                    onChange={(e) => {
                      setLobbyYt(e.target.value);
                      if (e.target.value.trim()) setMusicSourceMode('youtube');
                    }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                  <label>2. ลิงก์ YouTube ช่วงระหว่างเล่นเกม / ตอบคำถาม / หมุนบิงโก (Gameplay)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="เช่น https://www.youtube.com/watch?v=..."
                    value={playYt}
                    onChange={(e) => {
                      setPlayYt(e.target.value);
                      if (e.target.value.trim()) setMusicSourceMode('youtube');
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>3. ลิงก์ YouTube ช่วงประกาศรางวัลผู้ชนะ (Winner Finale Podium)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="เช่น https://www.youtube.com/watch?v=..."
                    value={winnerYt}
                    onChange={(e) => {
                      setWinnerYt(e.target.value);
                      if (e.target.value.trim()) setMusicSourceMode('youtube');
                    }}
                  />
                </div>
              </div>

              {/* Preset YouTube Collections */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.5rem' }}>
                  หรือกดเลือกเซ็ตลิงก์ YouTube แนะนำสำหรับงานแต่ง:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {RECOMMENDED_YOUTUBE_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        padding: '0.65rem 0.95rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.84rem'
                      }}
                    >
                      <div>
                        <strong>{preset.name}</strong>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          {preset.description}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                        onClick={() => handleApplyPreset(preset)}
                      >
                        ใช้เซ็ตนี้
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guide on where to find great wedding music */}
              <div
                style={{
                  background: 'var(--accent-gold-soft)',
                  padding: '0.9rem 1.1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  marginBottom: '1.25rem'
                }}
              >
                <strong>💡 แหล่งหาเพลงงานแต่งเพราะๆ สำหรับนำลิงก์มาใส่:</strong>
                <ul style={{ paddingLeft: '1.2rem', marginTop: '0.35rem' }}>
                  {MUSIC_SOURCES_GUIDE.map((g, i) => (
                    <li key={i} style={{ marginBottom: '0.2rem' }}>
                      <strong>{g.title}:</strong> {g.detail}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowMusicModal(false)}
                >
                  ปิดหน้าต่าง
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={17} />
                  บันทึกและเปิดใช้งานเพลง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
