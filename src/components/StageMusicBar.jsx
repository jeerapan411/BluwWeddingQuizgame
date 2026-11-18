import React, { useState, useEffect } from 'react';
import {
  Music,
  Volume2,
  VolumeX,
  Youtube,
  Sparkles,
  X,
  CheckCircle2
} from 'lucide-react';
import {
  builtInSynth,
  extractYouTubeId,
  getPhaseFromSessionStatus,
  MUSIC_SOURCES_GUIDE
} from '../utils/musicEngine';
import MusicPresetManager from './MusicPresetManager';

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
    game.music_mode || 'builtin'
  );
  const [lobbyYt, setLobbyYt] = useState(game.music_lobby_yt || '');
  const [playYt, setPlayYt] = useState(game.music_play_yt || '');
  const [winnerYt, setWinnerYt] = useState(game.music_winner_yt || '');
  const [showMusicModal, setShowMusicModal] = useState(false);

  // Sync local state if session snapshot updates
  useEffect(() => {
    setMusicSourceMode(game.music_mode || 'builtin');
    setLobbyYt(game.music_lobby_yt || '');
    setPlayYt(game.music_play_yt || '');
    setWinnerYt(game.music_winner_yt || '');
  }, [
    game.music_mode,
    game.music_lobby_yt,
    game.music_play_yt,
    game.music_winner_yt
  ]);

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
    if (isMuted || showMusicModal) {
      builtInSynth.stop();
      return;
    }

    if (musicSourceMode === 'builtin' || !activeYoutubeId) {
      builtInSynth.start(currentPhase);
    } else {
      builtInSynth.stop();
    }

    return () => {
      builtInSynth.stop();
    };
  }, [isMuted, showMusicModal, musicSourceMode, currentPhase, activeYoutubeId]);

  const handleTogglePlayMusic = () => {
    setIsMuted((prev) => !prev);
  };

  const handleUseBuiltInImmediately = () => {
    setMusicSourceMode('builtin');
    setIsMuted(false);
    if (onUpdateSessionMusic) {
      onUpdateSessionMusic({
        music_mode: 'builtin',
        music_lobby_yt: lobbyYt,
        music_play_yt: playYt,
        music_winner_yt: winnerYt
      });
    }
  };

  const handleSaveMusicSettings = () => {
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
            เลือก Preset เพลง / ตั้งค่าลิงก์ YouTube 3 ช่วง
          </button>
        </div>
      </div>

      {/* Embedded YouTube Audio/Video Bar when active & unmuted */}
      {!isMuted && !showMusicModal && activeYoutubeId && (
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

      {/* Modal: Configure 3-Phase YouTube Links & Music Presets with Preview */}
      {showMusicModal && (
        <div className="modal-backdrop" onClick={() => setShowMusicModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '860px', color: 'var(--text-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Music size={22} color="var(--accent-primary)" />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
                  จัดการ Preset เพลงงานแต่ง & ลิงก์ YouTube 3 ช่วง (พร้อมพรีวิวฟังเสียง)
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

            <MusicPresetManager
              musicMode={musicSourceMode}
              lobbyYt={lobbyYt}
              playYt={playYt}
              winnerYt={winnerYt}
              onChangeMusic={(patch) => {
                if (patch.music_mode !== undefined) setMusicSourceMode(patch.music_mode);
                if (patch.music_lobby_yt !== undefined) setLobbyYt(patch.music_lobby_yt);
                if (patch.music_play_yt !== undefined) setPlayYt(patch.music_play_yt);
                if (patch.music_winner_yt !== undefined) setWinnerYt(patch.music_winner_yt);
              }}
            />

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
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveMusicSettings}
              >
                <CheckCircle2 size={17} />
                บันทึกและนำไปใช้กับห้องเกมนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
