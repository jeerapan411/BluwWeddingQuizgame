import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  Users,
  Play,
  SkipForward,
  Trophy,
  Sparkles,
  CheckCircle2,
  QrCode,
  UserPlus,
  Smartphone,
  RotateCw,
  Award,
  ArrowLeft,
  Heart,
  Download,
  X
} from 'lucide-react';
import {
  updateSessionState,
  simulateGuestsBatch,
  simulateCrowdAnswersForQuestion,
  simulateCrowdMarkDrawnNumber,
  countBingoLines,
  shuffleArray
} from '../services/db';
import StageMusicBar from './StageMusicBar';
import {
  generateSouvenirCardDataUrl,
  downloadOrShareSouvenirCard
} from '../utils/souvenirCard';

const CHOICE_SHAPES = ['▲', '◆', '●', '■'];

export default function HostStageView({
  session,
  players,
  onRefreshSession,
  onOpenGuestPreview,
  onBackToAdmin
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState(20);
  const [isSpinningNumber, setIsSpinningNumber] = useState(false);
  const [previewCardData, setPreviewCardData] = useState(null);

  const game = session?.game_snapshot || {};
  const questions = game.questions || [];
  const currentQIndex = Number(session?.current_question_index) || 0;
  const currentQuestion = questions[currentQIndex] || null;
  const isBingo = session?.game_mode === 'bingo';
  const isNumberBingo = isBingo && session?.bingo_submode === 'number_classic';

  const joinUrl = useMemo(() => {
    if (!session?.pin) return window.location.origin;
    return `${window.location.origin}${window.location.pathname}?pin=${session.pin}`;
  }, [session?.pin]);

  // Generate QR Code image
  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, {
      width: 320,
      margin: 1,
      color: {
        dark: '#23191d',
        light: '#ffffff'
      }
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn('QR generation error:', err));
  }, [joinUrl]);

  // Countdown Timer during active question
  useEffect(() => {
    if (session?.status !== 'question' || !currentQuestion) return;
    const limit = Number(currentQuestion.timeLimit) || 20;
    setTimeLeft(limit);

    // Trigger simulated crowd answers after 2.2 seconds for demo realism
    const simTimer = setTimeout(() => {
      simulateCrowdAnswersForQuestion(session, currentQIndex);
    }, 1800);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(simTimer);
      clearInterval(interval);
    };
  }, [session?.id, session?.status, currentQIndex]);

  // Fire confetti when game finishes or someone wins Bingo
  useEffect(() => {
    if (session?.status === 'finished') {
      try {
        confetti({
          particleCount: 110,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {
        // Ignore confetti errors in headless browser
      }
    }
  }, [session?.status]);

  const sortedLeaderboard = useMemo(() => {
    return [...players].sort((a, b) => {
      if (isBingo && b.is_bingo_winner !== a.is_bingo_winner) {
        return b.is_bingo_winner ? 1 : -1;
      }
      if ((b.score || 0) !== (a.score || 0)) {
        return (b.score || 0) - (a.score || 0);
      }
      return (b.correct_count || 0) - (a.correct_count || 0);
    });
  }, [players, isBingo]);

  const bingoWinners = useMemo(() => {
    return players
      .filter((p) => p.is_bingo_winner)
      .sort((a, b) => new Date(a.bingo_won_at || 0) - new Date(b.bingo_won_at || 0));
  }, [players]);

  const nearBingoPlayers = useMemo(() => {
    if (!isBingo) return [];
    const size = Number(session?.bingo_grid_size) || 4;
    return players.filter((p) => {
      if (p.is_bingo_winner) return false;
      const check = countBingoLines(p.bingo_marked || [], size);
      return check.nearBingo;
    });
  }, [players, isBingo, session?.bingo_grid_size]);

  const answeredCountForCurrentQ = useMemo(() => {
    if (!currentQuestion) return 0;
    return players.filter((p) => p.answers && p.answers[currentQIndex] !== undefined).length;
  }, [players, currentQIndex, currentQuestion]);

  const optionDistribution = useMemo(() => {
    const counts = [0, 0, 0, 0];
    players.forEach((p) => {
      const ans = p.answers?.[currentQIndex];
      if (ans && ans.optionIndex >= 0 && ans.optionIndex < 4) {
        counts[ans.optionIndex]++;
      }
    });
    return counts;
  }, [players, currentQIndex]);

  // Actions
  const handleStartGameFromLobby = async () => {
    if (isNumberBingo) {
      await updateSessionState(session.id, {
        status: 'bingo_live',
        drawn_bingo_items: []
      });
    } else {
      await updateSessionState(session.id, {
        status: 'question',
        current_question_index: 0,
        question_started_at: new Date().toISOString()
      });
    }
    if (onRefreshSession) onRefreshSession();
  };

  const handleRevealAnswer = async () => {
    await updateSessionState(session.id, { status: 'reveal' });
    if (onRefreshSession) onRefreshSession();
  };

  const handleShowLeaderboard = async () => {
    await updateSessionState(session.id, { status: 'leaderboard' });
    if (onRefreshSession) onRefreshSession();
  };

  const handleNextQuestionOrFinish = async () => {
    if (currentQIndex + 1 < questions.length) {
      await updateSessionState(session.id, {
        status: 'question',
        current_question_index: currentQIndex + 1,
        question_started_at: new Date().toISOString()
      });
    } else {
      await handleFinishGame();
    }
    if (onRefreshSession) onRefreshSession();
  };

  const handleDrawNextBingoItem = async () => {
    if (isSpinningNumber) return;
    const allPool =
      Array.isArray(game.bingo_items) && game.bingo_items.length > 0
        ? game.bingo_items.map(String)
        : Array.from({ length: 25 }, (_, i) => String(i + 1));

    const drawn = (session.drawn_bingo_items || []).map(String);
    const remaining = allPool.filter((item) => !drawn.includes(item));
    if (remaining.length === 0) return;

    setIsSpinningNumber(true);
    setTimeout(async () => {
      const picked = shuffleArray(remaining)[0];
      const nextDrawn = [picked, ...drawn];
      await updateSessionState(session.id, {
        drawn_bingo_items: nextDrawn
      });
      await simulateCrowdMarkDrawnNumber(session, picked);
      setIsSpinningNumber(false);
      if (onRefreshSession) onRefreshSession();
    }, 450);
  };

  const handleFinishGame = async () => {
    const top3 = sortedLeaderboard.slice(0, 3).map((p, idx) => ({
      rank: idx + 1,
      nickname: p.nickname,
      avatar: p.avatar,
      score: p.score || 0,
      correct_count: p.correct_count || 0,
      is_bingo_winner: Boolean(p.is_bingo_winner)
    }));

    await updateSessionState(session.id, {
      status: 'finished',
      ended_at: new Date().toISOString(),
      player_count: players.length,
      winner_summary: top3
    });
    if (onRefreshSession) onRefreshSession();
  };

  const handleOpenWinnerSouvenirCard = async (winnerPlayer, rank) => {
    const dataUrl = await generateSouvenirCardDataUrl({
      session,
      player: winnerPlayer,
      rank,
      totalPlayers: players.length || 1
    });
    setPreviewCardData({
      dataUrl,
      nickname: winnerPlayer.nickname,
      rank
    });
  };

  const handleUpdateSessionMusic = async (musicPatch) => {
    const nextSnapshot = {
      ...(session.game_snapshot || {}),
      ...musicPatch
    };
    await updateSessionState(session.id, {
      game_snapshot: nextSnapshot
    });
    if (onRefreshSession) onRefreshSession();
  };

  if (!session) return null;

  return (
    <div className="stage-screen">
      {/* Stage Top Bar */}
      <div>
        <header className="stage-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.2)'
              }}
              onClick={onBackToAdmin}
            >
              <ArrowLeft size={16} />
              กลับหลังบ้าน
            </button>
            <div>
              <div className="stage-event-title">{session.game_title}</div>
              <div style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.7)' }}>
                {isBingo
                  ? isNumberBingo
                    ? `โหมด: บิงโกตัวเลขมงคล (${session.bingo_grid_size}x${session.bingo_grid_size})`
                    : `โหมด: บิงโกคำถามบ่าวสาว (${
                        session.bingo_fill_mode === 'sequential'
                          ? 'ตอบถูกเรียงช่องตามลำดับ'
                          : 'สุ่มตำแหน่งการ์ด'
                      })`
                  : 'โหมด: เกมตอบคำถามชิงความไวสไตล์ Kahoot'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {session.couple_names && (
              <span className="stage-couple-badge">
                <Heart size={15} />
                {session.couple_names}
              </span>
            )}
            <span
              className="stage-couple-badge"
              style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)' }}
            >
              PIN ห้อง: <strong style={{ fontSize: '1.1rem' }}>{session.pin}</strong>
            </span>
            <button
              type="button"
              className="btn btn-gold"
              onClick={() => onOpenGuestPreview(session.pin)}
            >
              <Smartphone size={16} />
              จำลองหน้าจอมือถือแขก
            </button>
          </div>
        </header>

        {/* 3-Phase Wedding Theme Music Controller Bar (Lobby / Gameplay / Winner) */}
        <StageMusicBar
          session={session}
          onUpdateSessionMusic={handleUpdateSessionMusic}
        />
      </div>

      {/* ====================================================================
          PHASE 1: WAITING LOBBY WITH GIANT QR CODE & GUEST STREAM
          ==================================================================== */}
      {session.status === 'lobby' && (
        <div className="lobby-grid">
          {/* Left: Giant QR Code & Room PIN */}
          <aside className="qr-panel">
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--accent-primary)',
                background: 'var(--accent-soft)',
                padding: '0.3rem 0.85rem',
                borderRadius: '999px'
              }}
            >
              <QrCode size={16} />
              สแกน QR Code เพื่อเข้าเล่นเกม
            </div>

            <div className="qr-image-frame">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`QR Code เข้าห้องเกม ${session.pin}`} />
              ) : (
                <span>กำลังสร้าง QR Code...</span>
              )}
            </div>

            <div className="room-pin-box">
              <div className="room-pin-label">หรือกรอกรหัสห้อง (ROOM PIN)</div>
              <div className="room-pin-digits">{session.pin}</div>
            </div>

            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                marginTop: '0.75rem'
              }}
            >
              ใช้กล้องมือถือ หรือสแกนผ่าน LINE ได้ทันที ไม่ต้องดาวน์โหลดแอป
            </p>
          </aside>

          {/* Right: Live Guest Waiting Room (Up to 200 Players) */}
          <section className="guests-lobby-panel">
            <div>
              <div className="guests-counter-header">
                <div className="capacity-meter">
                  <Users size={30} color="#f6d59e" />
                  <div>
                    <div className="capacity-count-big">
                      {players.length}{' '}
                      <span style={{ fontSize: '1.15rem', fontWeight: 400, opacity: 0.75 }}>
                        / {game.max_players || 200} คน
                      </span>
                    </div>
                    <div style={{ fontSize: '0.86rem', color: 'rgba(255,255,255,0.75)' }}>
                      รายชื่อแขกที่สแกนเข้าร่วมแล้ว (อัปเดตสดแบบเรียลไทม์)
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.25)',
                      fontSize: '0.82rem'
                    }}
                    onClick={async () => {
                      await simulateGuestsBatch(session, 25);
                      if (onRefreshSession) onRefreshSession();
                    }}
                  >
                    <UserPlus size={15} />
                    +25 แขกจำลอง
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.25)',
                      fontSize: '0.82rem'
                    }}
                    onClick={async () => {
                      await simulateGuestsBatch(session, 200);
                      if (onRefreshSession) onRefreshSession();
                    }}
                  >
                    <Users size={15} />
                    จำลองเต็มห้อง 200 คน
                  </button>
                </div>
              </div>

              {players.length === 0 ? (
                <div
                  style={{
                    padding: '4rem 2rem',
                    textAlign: 'center',
                    border: '2px dashed rgba(255,255,255,0.16)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'rgba(255,255,255,0.7)'
                  }}
                >
                  <Sparkles size={36} color="#f6d59e" style={{ marginBottom: '0.75rem' }} />
                  <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '0.35rem' }}>
                    กำลังรอแขกสแกน QR Code เข้าสู่ห้องเกม...
                  </h3>
                  <p style={{ fontSize: '0.9rem' }}>
                    เมื่อแขกสแกนแล้ว ชื่อและอวตารจะเด้งขึ้นมาบนหน้าจอนี้ทันที (หรือกดปุ่ม "+25 แขกจำลอง" ด้านบนเพื่อทดสอบระบบ)
                  </p>
                </div>
              ) : (
                <div className="guests-wall-grid">
                  {players.map((p) => (
                    <div key={p.id} className="guest-chip-card">
                      <span style={{ fontSize: '1.25rem' }}>{p.avatar || '🥂'}</span>
                      <span>{p.nickname}</span>
                      {p.table_name && (
                        <span
                          style={{
                            fontSize: '0.74rem',
                            opacity: 0.75,
                            background: 'rgba(0,0,0,0.25)',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '999px'
                          }}
                        >
                          {p.table_name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid rgba(255,255,255,0.14)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.8)' }}>
                เมื่อแขกในงานสแกนเข้าครบแล้ว กดปุ่มเริ่มเกมเพื่อเข้าสู่คำถามแรกได้เลย
              </div>
              <button
                type="button"
                id="btn-start-live-game"
                className="btn btn-gold btn-lg"
                onClick={handleStartGameFromLobby}
              >
                <Play size={22} />
                เริ่มเกมเข้าสู่เวที ({players.length} คนพร้อม!)
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ====================================================================
          PHASE 2A: KAHOOT QUIZ & QUIZ-BINGO QUESTION / REVEAL
          ==================================================================== */}
      {(session.status === 'question' || session.status === 'reveal') && currentQuestion && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Bingo Live Alert Strip (When playing Quiz Bingo) */}
          {isBingo && (
            <div
              style={{
                background: 'rgba(200, 155, 87, 0.2)',
                border: '1px solid rgba(246, 213, 158, 0.4)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.75rem 1.25rem',
                marginTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Trophy size={20} color="#f6d59e" />
                <span>
                  สถานะบิงโกคำถามบ่าวสาว: มีผู้ชนะ BINGO แล้ว{' '}
                  <strong style={{ color: '#f6d59e', fontSize: '1.1rem' }}>
                    {bingoWinners.length} คน
                  </strong>{' '}
                  • ลุ้นรออีกช่องเดียว (Near Bingo){' '}
                  <strong style={{ color: '#f6d59e' }}>{nearBingoPlayers.length} คน</strong>
                </span>
              </div>
              {bingoWinners.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {bingoWinners.slice(0, 4).map((w) => (
                    <span
                      key={w.id}
                      style={{
                        background: '#f6d59e',
                        color: '#1c1518',
                        padding: '0.2rem 0.7rem',
                        borderRadius: '999px',
                        fontWeight: 700,
                        fontSize: '0.82rem'
                      }}
                    >
                      🏆 {w.avatar} {w.nickname} (BINGO!)
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="stage-question-box">
            <div className="stage-question-number">
              คำถามข้อที่ {currentQIndex + 1} จาก {questions.length}
              {isBingo && currentQuestion.bingoLabel
                ? ` • ช่องบิงโก: "${currentQuestion.bingoLabel}"`
                : ''}
            </div>
            <h2 className="stage-question-title">{currentQuestion.text}</h2>

            <div className="stage-timer-bar-row">
              <div className="timer-circle">
                <span>{session.status === 'reveal' ? '✓' : timeLeft}</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 400 }}>วินาที</span>
              </div>

              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f6d59e' }}>
                  ส่งคำตอบแล้ว {answeredCountForCurrentQ} / {players.length} คน
                </div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                  {session.status === 'question'
                    ? 'แขกกำลังกดเลือกคำตอบบนหน้าจอมือถือ...'
                    : 'เฉลยคำตอบที่ถูกต้อง!'}
                </div>
              </div>
            </div>

            <div className="stage-choices-grid">
              {(currentQuestion.options || []).map((optText, idx) => {
                const isCorrect = Number(currentQuestion.correctIndex) === idx;
                const isReveal = session.status === 'reveal';
                const pickCount = optionDistribution[idx] || 0;

                return (
                  <div
                    key={idx}
                    className={`stage-choice-card choice-${idx} ${
                      isReveal && !isCorrect ? 'dimmed' : ''
                    } ${isReveal && isCorrect ? 'correct-highlight' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                      <span className="choice-shape-icon">{CHOICE_SHAPES[idx]}</span>
                      <span style={{ textAlign: 'left' }}>{optText}</span>
                    </div>

                    {isReveal && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: 'rgba(0,0,0,0.28)',
                          padding: '0.35rem 0.85rem',
                          borderRadius: '999px',
                          fontSize: '1rem'
                        }}
                      >
                        {isCorrect && <CheckCircle2 size={18} color="#f6d59e" />}
                        <span>{pickCount} คน</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.85rem',
              marginTop: '0.5rem'
            }}
          >
            {session.status === 'question' ? (
              <button
                type="button"
                className="btn btn-gold btn-lg"
                onClick={handleRevealAnswer}
              >
                <CheckCircle2 size={20} />
                เฉลยคำตอบข้อนี้
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-lg"
                  style={{
                    background: 'rgba(255,255,255,0.14)',
                    color: '#fff',
                    borderColor: 'rgba(255,255,255,0.25)'
                  }}
                  onClick={handleShowLeaderboard}
                >
                  <Trophy size={20} />
                  ดูอันดับคะแนน Top 5
                </button>
                <button
                  type="button"
                  className="btn btn-gold btn-lg"
                  onClick={handleNextQuestionOrFinish}
                >
                  <SkipForward size={20} />
                  {currentQIndex + 1 < questions.length
                    ? 'ไปคำถามข้อถัดไป'
                    : 'สรุปผลผู้ชนะและจบเกม'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          PHASE 2B: INTERMEDIATE LEADERBOARD TOP 5
          ==================================================================== */}
      {session.status === 'leaderboard' && (
        <div
          style={{
            maxWidth: '820px',
            width: '100%',
            margin: '1.5rem auto',
            background: 'var(--bg-stage-card)',
            padding: '2rem',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid rgba(255,255,255,0.14)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem'
            }}
          >
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem' }}>
                🏆 ผู้นำคะแนนสูงสุด (Top Leaderboard)
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.92rem' }}>
                หลังจบคำถามข้อที่ {currentQIndex + 1} จาก {questions.length}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-gold btn-lg"
              onClick={handleNextQuestionOrFinish}
            >
              <SkipForward size={20} />
              {currentQIndex + 1 < questions.length ? 'ไปข้อถัดไป' : 'ประกาศรางวัลชนะเลิศ'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sortedLeaderboard.slice(0, 6).map((p, idx) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.35rem',
                  borderRadius: 'var(--radius-lg)',
                  background:
                    idx === 0
                      ? 'linear-gradient(90deg, rgba(200,155,87,0.35), rgba(255,255,255,0.08))'
                      : 'rgba(255,255,255,0.07)',
                  border: idx === 0 ? '1px solid #f6d59e' : '1px solid rgba(255,255,255,0.12)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.4rem',
                      fontWeight: 700,
                      color: idx === 0 ? '#f6d59e' : '#ffffff',
                      width: '36px'
                    }}
                  >
                    #{idx + 1}
                  </span>
                  <span style={{ fontSize: '1.6rem' }}>{p.avatar || '🥂'}</span>
                  <div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 600 }}>{p.nickname}</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)' }}>
                      ตอบถูก {p.correct_count || 0} ข้อ{' '}
                      {p.is_bingo_winner ? '• 🏆 BINGO สำเร็จแล้ว!' : ''}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.45rem',
                    fontWeight: 700,
                    color: '#f6d59e'
                  }}
                >
                  {(p.score || 0).toLocaleString()} คะแนน
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          PHASE 2C: CLASSIC NUMBER / WORD BINGO CALLER ON STAGE
          ==================================================================== */}
      {session.status === 'bingo_live' && (
        <div className="bingo-stage-layout">
          {/* Left: Golden Bingo Drum */}
          <section className="bingo-caller-drum">
            <span
              style={{
                fontSize: '0.88rem',
                color: '#f6d59e',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}
            >
              วงล้อสุ่มบิงโกบนเวที ({session.drawn_bingo_items?.length || 0} รายการที่ออกแล้ว)
            </span>

            <div className="bingo-big-ball">
              {isSpinningNumber
                ? '...'
                : session.drawn_bingo_items?.[0] || 'พร้อม!'}
            </div>

            <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-gold btn-lg"
                onClick={handleDrawNextBingoItem}
                disabled={isSpinningNumber}
              >
                <RotateCw size={20} />
                หมุนสุ่มหมายเลขถัดไป
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.25)'
                }}
                onClick={handleFinishGame}
              >
                <Trophy size={20} />
                ประกาศผู้ชนะ & จบเกม
              </button>
            </div>

            <div style={{ marginTop: '1.5rem', width: '100%' }}>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                หมายเลข/คำที่ออกไปแล้ว:
              </div>
              <div className="drawn-history-pills">
                {(session.drawn_bingo_items || []).map((item, idx) => (
                  <span key={idx} className="drawn-pill">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Right: Live Bingo Winners & Near-Bingo Tracker */}
          <section className="guests-lobby-panel">
            <div>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.45rem',
                  color: '#f6d59e',
                  marginBottom: '0.35rem'
                }}
              >
                🏆 ทำเนียบผู้พิชิต BINGO! ({bingoWinners.length} คน)
              </h3>
              <p style={{ fontSize: '0.86rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>
                กำลังลุ้นรออีก 1 ช่องจะบิงโก (Near Bingo):{' '}
                <strong style={{ color: '#fff' }}>{nearBingoPlayers.length} คน</strong>
              </p>

              {bingoWinners.length === 0 ? (
                <div
                  style={{
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    border: '1px dashed rgba(255,255,255,0.2)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'rgba(255,255,255,0.7)'
                  }}
                >
                  ยังไม่มีผู้เรียงครบแถว กดหมุนสุ่มหมายเลขถัดไปเพื่อลุ้นผู้ชนะคนแรก!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {bingoWinners.slice(0, 8).map((w, idx) => (
                    <div
                      key={w.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1.15rem',
                        borderRadius: 'var(--radius-md)',
                        background:
                          idx === 0
                            ? 'rgba(200, 155, 87, 0.32)'
                            : 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(246, 213, 158, 0.45)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <strong style={{ color: '#f6d59e' }}>BINGO #{idx + 1}</strong>
                        <span style={{ fontSize: '1.35rem' }}>{w.avatar}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{w.nickname}</div>
                          {w.table_name && (
                            <div style={{ fontSize: '0.76rem', opacity: 0.75 }}>{w.table_name}</div>
                          )}
                        </div>
                      </div>
                      <span
                        style={{
                          background: '#f6d59e',
                          color: '#1c1518',
                          padding: '0.25rem 0.7rem',
                          borderRadius: '999px',
                          fontWeight: 700,
                          fontSize: '0.8rem'
                        }}
                      >
                        ชนะ {w.bingo_lines} แถว!
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ====================================================================
          PHASE 3: GRAND FINALE PODIUM & WEDDING WISHES
          ==================================================================== */}
      {session.status === 'finished' && (
        <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 1.1rem',
              borderRadius: '999px',
              background: 'rgba(200, 155, 87, 0.25)',
              color: '#f6d59e',
              marginBottom: '0.75rem'
            }}
          >
            <Award size={18} />
            ขอแสดงความยินดีกับผู้ชนะทุกท่านในงานของ {session.couple_names}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.35rem' }}>
            🎉 ประกาศผลผู้ชนะประจำค่ำคืนนี้ 🎉
          </h2>

          <div className="podium-row">
            {/* Rank 2 */}
            {sortedLeaderboard[1] && (
              <div className="podium-column rank-2">
                <div style={{ fontSize: '2.2rem' }}>{sortedLeaderboard[1].avatar}</div>
                <div style={{ fontSize: '0.85rem', color: '#f6d59e', marginTop: '0.35rem' }}>
                  อันดับที่ 2 🥈
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.15rem', margin: '0.25rem 0' }}>
                  {sortedLeaderboard[1].nickname}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.85, marginBottom: '0.75rem' }}>
                  {(sortedLeaderboard[1].score || 0).toLocaleString()} คะแนน
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.76rem',
                    background: 'rgba(255,255,255,0.14)',
                    color: '#fff',
                    borderColor: 'rgba(255,255,255,0.28)'
                  }}
                  onClick={() => handleOpenWinnerSouvenirCard(sortedLeaderboard[1], 2)}
                >
                  <Download size={13} />
                  บันทึกการ์ดที่ระลึก
                </button>
              </div>
            )}

            {/* Rank 1 */}
            {sortedLeaderboard[0] && (
              <div className="podium-column rank-1">
                <div style={{ fontSize: '2.85rem' }}>{sortedLeaderboard[0].avatar}</div>
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#f6d59e',
                    marginTop: '0.35rem'
                  }}
                >
                  ชนะเลิศอันดับ 1 👑
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.35rem', margin: '0.3rem 0' }}>
                  {sortedLeaderboard[0].nickname}
                </div>
                <div
                  style={{
                    fontSize: '1.05rem',
                    color: '#f6d59e',
                    fontWeight: 600,
                    marginBottom: '0.85rem'
                  }}
                >
                  {(sortedLeaderboard[0].score || 0).toLocaleString()} คะแนน
                </div>
                <button
                  type="button"
                  className="btn btn-gold"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                  onClick={() => handleOpenWinnerSouvenirCard(sortedLeaderboard[0], 1)}
                >
                  <Download size={14} />
                  บันทึกการ์ดแชมป์อันดับ 1
                </button>
              </div>
            )}

            {/* Rank 3 */}
            {sortedLeaderboard[2] && (
              <div className="podium-column rank-3">
                <div style={{ fontSize: '2.2rem' }}>{sortedLeaderboard[2].avatar}</div>
                <div style={{ fontSize: '0.85rem', color: '#f6d59e', marginTop: '0.35rem' }}>
                  อันดับที่ 3 🥉
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.15rem', margin: '0.25rem 0' }}>
                  {sortedLeaderboard[2].nickname}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.85, marginBottom: '0.75rem' }}>
                  {(sortedLeaderboard[2].score || 0).toLocaleString()} คะแนน
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.76rem',
                    background: 'rgba(255,255,255,0.14)',
                    color: '#fff',
                    borderColor: 'rgba(255,255,255,0.28)'
                  }}
                  onClick={() => handleOpenWinnerSouvenirCard(sortedLeaderboard[2], 3)}
                >
                  <Download size={13} />
                  บันทึกการ์ดที่ระลึก
                </button>
              </div>
            )}
          </div>

          <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', marginTop: '0.5rem' }}>
            📱 แขกทุกท่านในงานสามารถกดปุ่ม <strong>"บันทึกภาพการ์ดที่ระลึกเข้ามือถือ"</strong> บนหน้าจอมือถือของตนเองได้ทันที!
          </p>

          <div style={{ marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-gold btn-lg"
              onClick={onBackToAdmin}
            >
              ดูรายงานสรุปผลฉบับเต็มในระบบหลังบ้าน
            </button>
          </div>
        </div>
      )}

      {/* Modal: Preview & Download Winner Souvenir Card on Stage */}
      {previewCardData && (
        <div className="modal-backdrop" onClick={() => setPreviewCardData(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '460px', textAlign: 'center', color: 'var(--text-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
                การ์ดที่ระลึกผู้ชนะ: {previewCardData.nickname}
              </h3>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPreviewCardData(null)}
              >
                <X size={20} />
              </button>
            </div>
            <img
              src={previewCardData.dataUrl}
              alt="Souvenir Winner Card"
              style={{
                width: '100%',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
                marginBottom: '1rem'
              }}
            />
            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              onClick={() =>
                downloadOrShareSouvenirCard(
                  previewCardData.dataUrl,
                  `winner-rank${previewCardData.rank}-${previewCardData.nickname}.png`
                )
              }
            >
              <Download size={18} />
              บันทึกภาพการ์ดผู้ชนะ (PNG)
            </button>
          </div>
        </div>
      )}

      {/* Stage Footer */}
      <footer
        style={{
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.82rem',
          color: 'rgba(255,255,255,0.6)',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}
      >
        <span>BLUW Wedding Quiz & Bingo Stage System • รองรับแขกพร้อมกันสูงสุด 200 ท่าน</span>
        <span>สแกน QR Code หรือเข้าลิงก์ด้วยรหัส PIN: {session.pin}</span>
      </footer>
    </div>
  );
}
