import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Trophy,
  Heart,
  Grid,
  Send,
  Users,
  UserPlus,
  Download
} from 'lucide-react';
import { WEDDING_AVATARS } from '../data/defaultGames';
import {
  joinSessionAsGuest,
  getSessionByPin,
  fetchSessionPlayers,
  submitQuizAnswer,
  toggleClassicBingoCell,
  countBingoLines
} from '../services/db';
import {
  generateSouvenirCardDataUrl,
  downloadOrShareSouvenirCard
} from '../utils/souvenirCard';

const CHOICE_SHAPES = ['▲', '◆', '●', '■'];

export default function GuestMobileView({
  initialPin = '',
  activeSessions = [],
  onPlayerJoined
}) {
  const [pinInput, setPinInput] = useState(initialPin || '');
  const [nickname, setNickname] = useState('');
  const [tableName, setTableName] = useState('');
  const [wishMessage, setWishMessage] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(WEDDING_AVATARS[0]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const [session, setSession] = useState(null);
  const [player, setPlayer] = useState(null);
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [souvenirCardUrl, setSouvenirCardUrl] = useState('');

  const playerIdRef = useRef('');
  const sessionPinRef = useRef('');

  const myRank = useMemo(() => {
    if (!player?.id || roomPlayers.length === 0) return 1;
    const isBingoMode = session?.game_mode === 'bingo';
    const sorted = [...roomPlayers].sort((a, b) => {
      if (isBingoMode && b.is_bingo_winner !== a.is_bingo_winner) {
        return b.is_bingo_winner ? 1 : -1;
      }
      if ((b.score || 0) !== (a.score || 0)) {
        return (b.score || 0) - (a.score || 0);
      }
      return (b.correct_count || 0) - (a.correct_count || 0);
    });
    const idx = sorted.findIndex((p) => p.id === player.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [player?.id, player?.score, player?.is_bingo_winner, roomPlayers, session?.game_mode]);

  // Auto-generate downloadable souvenir card when game finishes or player achieves BINGO
  useEffect(() => {
    if (!session || !player) return;
    if (session.status === 'finished' || player.is_bingo_winner) {
      generateSouvenirCardDataUrl({
        session,
        player,
        rank: myRank,
        totalPlayers: Math.max(1, roomPlayers.length)
      })
        .then((url) => setSouvenirCardUrl(url))
        .catch((err) => console.warn('Souvenir card generation error:', err));
    }
  }, [
    session?.status,
    player?.id,
    player?.score,
    player?.correct_count,
    player?.bingo_lines,
    player?.is_bingo_winner,
    myRank,
    roomPlayers.length
  ]);

  useEffect(() => {
    playerIdRef.current = player?.id || '';
    sessionPinRef.current = session?.pin || '';
  }, [player?.id, session?.pin]);

  useEffect(() => {
    if (initialPin) {
      setPinInput(initialPin);
    } else if (!pinInput && activeSessions.length > 0) {
      const lobbySession = activeSessions.find((s) => s.status !== 'finished');
      if (lobbySession) setPinInput(lobbySession.pin);
    }
  }, [initialPin, activeSessions]);

  // Sync live session & player state without race conditions or overlapping requests
  useEffect(() => {
    if (!session?.pin || !player?.id) return;
    let isMounted = true;
    let isFetching = false;

    const refreshLiveState = async () => {
      if (isFetching) return;
      const currentPin = sessionPinRef.current;
      const currentPlayerId = playerIdRef.current;
      if (!currentPin || !currentPlayerId) return;

      isFetching = true;
      try {
        const latestSession = await getSessionByPin(currentPin);
        if (!isMounted || !latestSession) return;

        setSession((prev) => {
          if (
            prev &&
            (latestSession.current_question_index !== prev.current_question_index ||
              latestSession.status !== prev.status)
          ) {
            setQuestionStartTime(Date.now());
          }
          return latestSession;
        });

        const playersList = await fetchSessionPlayers(latestSession.id);
        if (!isMounted) return;
        setRoomPlayers(playersList);

        const me = playersList.find((p) => p.id === currentPlayerId);
        if (me && playerIdRef.current === currentPlayerId) {
          setPlayer(me);
        }
      } finally {
        isFetching = false;
      }
    };

    refreshLiveState();
    const timer = setInterval(refreshLiveState, 2500);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [session?.pin, player?.id]);

  // Fire confetti when guest achieves BINGO!
  useEffect(() => {
    if (player?.is_bingo_winner) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.65 }
        });
      } catch {
        // Ignore in headless
      }
    }
  }, [player?.is_bingo_winner]);

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!pinInput.trim()) {
      setErrorMsg('กรุณากรอกรหัสห้อง PIN 6 หลัก');
      return;
    }
    if (!nickname.trim()) {
      setErrorMsg('กรุณาตั้งชื่อเล่นหรือฉายาของคุณ');
      return;
    }
    setIsJoining(true);
    try {
      const res = await joinSessionAsGuest({
        pin: pinInput.trim(),
        nickname: nickname.trim(),
        avatar: selectedAvatar,
        tableName,
        wishMessage
      });
      playerIdRef.current = res.player.id;
      sessionPinRef.current = res.session.pin;
      setSession(res.session);
      setPlayer(res.player);
      const allInRoom = await fetchSessionPlayers(res.session.id);
      setRoomPlayers(allInRoom);
      setQuestionStartTime(Date.now());
      if (onPlayerJoined) onPlayerJoined();
    } catch (err) {
      setErrorMsg(err.message || 'ไม่สามารถเข้าร่วมห้องได้');
    } finally {
      setIsJoining(false);
    }
  };

  const handleResetToJoinAnotherGuest = () => {
    playerIdRef.current = '';
    setPlayer(null);
    setNickname('');
    setTableName('');
    setWishMessage('');
    const nextAvatarIdx = (WEDDING_AVATARS.indexOf(selectedAvatar) + 1) % WEDDING_AVATARS.length;
    setSelectedAvatar(WEDDING_AVATARS[nextAvatarIdx]);
  };

  const game = session?.game_snapshot || {};
  const questions = game.questions || [];
  const currentQIndex = Number(session?.current_question_index) || 0;
  const currentQuestion = questions[currentQIndex] || null;
  const myAnswerForCurrentQ = player?.answers?.[currentQIndex] || null;
  const isBingo = session?.game_mode === 'bingo';
  const isNumberBingo = isBingo && session?.bingo_submode === 'number_classic';
  const gridSize = Number(session?.bingo_grid_size) || 4;

  const bingoLineStatus = useMemo(() => {
    if (!isBingo || !player?.bingo_marked) {
      return { lines: 0, winningIndices: [], nearBingo: false };
    }
    return countBingoLines(player.bingo_marked, gridSize);
  }, [isBingo, player?.bingo_marked, gridSize]);

  const handleTapQuizOption = async (optionIndex) => {
    if (!session || !player || myAnswerForCurrentQ) return;
    const elapsedSeconds = (Date.now() - questionStartTime) / 1000;
    const updated = await submitQuizAnswer({
      session,
      playerId: player.id,
      questionIndex: currentQIndex,
      optionIndex,
      elapsedSeconds
    });
    if (updated) setPlayer(updated);
  };

  const handleTapBingoCell = async (cellIndex) => {
    if (!isNumberBingo || !session || !player) return;
    const updated = await toggleClassicBingoCell({
      session,
      playerId: player.id,
      cellIndex
    });
    if (updated) setPlayer(updated);
  };

  // ==========================================================================
  // VIEW 1: GUEST JOIN SCREEN (QR LANDING FORM)
  // ==========================================================================
  if (!session || !player) {
    return (
      <div className="guest-mobile-shell">
        <div className="guest-card">
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'var(--accent-soft)',
                color: 'var(--accent-primary)',
                padding: '0.3rem 0.85rem',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                marginBottom: '0.6rem'
              }}
            >
              <Heart size={14} />
              ยินดีต้อนรับสู่เกมงานแต่ง & อีเวนต์
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem' }}>
              ลงทะเบียนเข้าห้องเล่นเกม
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              กรอกชื่อเล่นเพื่อแสดงบนจอโปรเจกเตอร์ในงาน
            </p>
          </div>

          {errorMsg && (
            <div
              style={{
                background: 'var(--status-danger-bg)',
                color: 'var(--status-danger)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.86rem',
                marginBottom: '1rem',
                fontWeight: 500
              }}
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleJoinSubmit}>
            <div className="form-group" style={{ marginBottom: '0.9rem' }}>
              <label>รหัสห้อง 6 หลัก (Room PIN) *</label>
              <input
                type="text"
                className="form-input"
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textAlign: 'center'
                }}
                placeholder="เช่น 526640"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '0.9rem' }}>
              <label>ชื่อเล่น / ฉายาของคุณ (จะแสดงบนจอหน้างาน) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น น้องมายด์ เพื่อนเจ้าสาว"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '0.9rem' }}>
              <label>เลือกอวตารประจำตัว</label>
              <div className="avatar-picker-grid">
                {WEDDING_AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    className={`avatar-choice-btn ${selectedAvatar === av ? 'selected' : ''}`}
                    onClick={() => setSelectedAvatar(av)}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '0.9rem' }}>
              <label>หมายเลขโต๊ะ / ทีม (ไม่บังคับ)</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น โต๊ะ VIP 2 หรือ แก๊งมัธยม"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label>คำอวยพรสั้นๆ ถึงบ่าวสาว (ไม่บังคับ)</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น ขอให้มีความสุขมากๆ รักกันตลอดไปนะคะ"
                value={wishMessage}
                onChange={(e) => setWishMessage(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={isJoining}
            >
              <Send size={18} />
              {isJoining ? 'กำลังเข้าสู่ห้อง...' : 'เข้าร่วมห้องเกมทันที'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW 2: INSIDE THE LIVE ROOM ON GUEST SMARTPHONE
  // ==========================================================================
  const drawnSet = new Set((session.drawn_bingo_items || []).map(String));

  return (
    <div className="guest-mobile-shell">
      <div>
        {/* Guest Top Profile Strip */}
        <div
          className="guest-card"
          style={{
            padding: '0.9rem 1.15rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.6rem' }}>{player.avatar}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>{player.nickname}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ห้อง PIN: {session.pin} • {session.couple_names}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '1.15rem',
                color: 'var(--accent-primary)'
              }}
            >
              {(player.score || 0).toLocaleString()} pts
            </div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
              ถูก {player.correct_count || 0} ข้อ
            </div>
          </div>
        </div>

        {/* BINGO WINNER CELEBRATION BANNER */}
        {isBingo && player.is_bingo_winner && (
          <div
            style={{
              background: 'linear-gradient(135deg, #c89b57, #b85d6f)',
              color: '#ffffff',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '1rem',
              textAlign: 'center',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>
              🎉 BINGO! คุณเรียงบิงโกสำเร็จแล้ว ({player.bingo_lines} แถว)!
            </div>
            <div style={{ fontSize: '0.84rem', opacity: 0.92 }}>
              ชื่อของคุณขึ้นแจ้งเตือนผู้ชนะบนหน้าจอโปรเจกเตอร์หน้างานแล้ว!
            </div>
          </div>
        )}

        {/* WAITING IN LOBBY */}
        {session.status === 'lobby' && (
          <div className="guest-card" style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <Sparkles size={34} color="var(--accent-primary)" style={{ marginBottom: '0.5rem' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>
              คุณเข้าสู่ห้องเกมเรียบร้อยแล้ว!
            </h2>
            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--text-secondary)',
                marginTop: '0.35rem',
                marginBottom: '1rem'
              }}
            >
              ชื่อ <strong>"{player.nickname}"</strong> ของคุณขึ้นบนจอโปรเจกเตอร์หน้างานแล้ว
              รอพิธีกรกดเริ่มเกมสักครู่...
            </p>

            {/* Show All Guests Currently in the Room Side-by-Side (No Overlap) */}
            <div
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.9rem',
                textAlign: 'left',
                marginBottom: '1rem'
              }}
            >
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '0.55rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Users size={15} color="var(--accent-primary)" />
                เพื่อนๆ ที่เข้าร่วมในห้องนี้แล้ว ({roomPlayers.length} คน):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {roomPlayers.map((rp) => {
                  const isMe = rp.id === player.id;
                  return (
                    <span
                      key={rp.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.3rem 0.7rem',
                        borderRadius: '999px',
                        fontSize: '0.82rem',
                        fontWeight: isMe ? 700 : 500,
                        background: isMe ? 'var(--accent-soft)' : 'var(--bg-surface)',
                        color: isMe ? 'var(--accent-primary)' : 'var(--text-primary)',
                        border: isMe
                          ? '1.5px solid var(--accent-primary)'
                          : '1px solid var(--border-subtle)'
                      }}
                    >
                      <span>{rp.avatar || '🥂'}</span>
                      <span>{rp.nickname}</span>
                      {rp.table_name && (
                        <span style={{ fontSize: '0.72rem', opacity: 0.75 }}>
                          ({rp.table_name})
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.84rem' }}
              onClick={handleResetToJoinAnotherGuest}
            >
              <UserPlus size={16} />
              ทดสอบลงทะเบียนเพิ่มแขกคนถัดไป (คนที่ {roomPlayers.length + 1})
            </button>
          </div>
        )}

        {/* ACTIVE QUIZ QUESTION (FOR BOTH KAHOOT QUIZ & QUIZ-BINGO) */}
        {(session.status === 'question' || session.status === 'reveal') &&
          currentQuestion &&
          !isNumberBingo && (
            <div className="guest-card" style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--accent-primary)',
                  marginBottom: '0.3rem'
                }}
              >
                ข้อที่ {currentQIndex + 1} / {questions.length}
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.15rem',
                  marginBottom: '0.75rem'
                }}
              >
                {currentQuestion.text}
              </h2>

              {!myAnswerForCurrentQ && session.status === 'question' ? (
                <div className="mobile-choices-grid">
                  {(currentQuestion.options || []).map((optText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`mobile-choice-btn choice-${idx}`}
                      onClick={() => handleTapQuizOption(idx)}
                    >
                      <span style={{ fontSize: '1.4rem' }}>{CHOICE_SHAPES[idx]}</span>
                      <span>{optText}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '1.15rem',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center',
                    background: myAnswerForCurrentQ?.isCorrect
                      ? 'var(--status-success-bg)'
                      : 'var(--status-danger-bg)',
                    color: myAnswerForCurrentQ?.isCorrect
                      ? 'var(--status-success)'
                      : 'var(--status-danger)'
                  }}
                >
                  {myAnswerForCurrentQ ? (
                    myAnswerForCurrentQ.isCorrect ? (
                      <>
                        <CheckCircle2 size={28} style={{ marginBottom: '0.35rem' }} />
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                          ตอบถูกต้อง! (+{myAnswerForCurrentQ.earnedPoints} คะแนน)
                        </div>
                        {isBingo && (
                          <div style={{ fontSize: '0.84rem', marginTop: '0.25rem' }}>
                            💖 ประทับตราลงช่องบิงโกของคุณแล้ว!
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <XCircle size={28} style={{ marginBottom: '0.35rem' }} />
                        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                          ข้อนี้ยังไม่ถูก รอลุ้นข้อถัดไปนะ!
                        </div>
                      </>
                    )
                  ) : (
                    <div>หมดเวลาสำหรับข้อนี้ รอพิธีกรเปิดข้อถัดไป</div>
                  )}
                </div>
              )}
            </div>
          )}

        {/* CLASSIC NUMBER BINGO LIVE CALLER INFO ON MOBILE */}
        {isNumberBingo && session.status === 'bingo_live' && (
          <div
            className="guest-card"
            style={{ marginBottom: '1rem', textAlign: 'center', padding: '1rem' }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              หมายเลขล่าสุดที่ออกบนเวที:
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.1rem',
                fontWeight: 700,
                color: 'var(--accent-primary)',
                margin: '0.2rem 0'
              }}
            >
              {session.drawn_bingo_items?.[0] || 'รอหมุนวงล้อ...'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              แตะช่องหมายเลขบนกระดานของคุณที่ตรงกับเลขที่ออกแล้วเพื่อประทับตรา!
            </div>
          </div>
        )}

        {/* INTERACTIVE BINGO CARD ON GUEST PHONE (SHOWN WHENEVER GAME MODE IS BINGO) */}
        {isBingo && Array.isArray(player.bingo_card) && player.bingo_card.length > 0 && (
          <div className="guest-card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem'
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Grid size={16} color="var(--accent-primary)" />
                กระดานบิงโกของคุณ ({gridSize}x{gridSize})
              </span>
              <span className="badge badge-bingo">
                {bingoLineStatus.lines > 0
                  ? `🏆 BINGO ${bingoLineStatus.lines} แถว!`
                  : bingoLineStatus.nearBingo
                  ? '🔥 รออีก 1 ช่องจะบิงโก!'
                  : `เปิดแล้ว ${(player.bingo_marked || []).filter(Boolean).length} ช่อง`}
              </span>
            </div>

            <div className={`bingo-board-grid size-${gridSize}`}>
              {player.bingo_card.map((cell, idx) => {
                const isMarked = Boolean(player.bingo_marked?.[idx]);
                const isWinningCell = bingoLineStatus.winningIndices.includes(idx);
                const isClickableNumber =
                  isNumberBingo && !isMarked && drawnSet.has(String(cell.label));

                return (
                  <button
                    key={cell.key || idx}
                    type="button"
                    className={`bingo-cell ${isMarked ? 'marked' : ''}`}
                    style={{
                      outline: isWinningCell
                        ? '3px solid var(--accent-secondary)'
                        : isClickableNumber
                        ? '2px dashed var(--accent-primary)'
                        : 'none',
                      background: isClickableNumber ? 'var(--accent-soft)' : undefined
                    }}
                    onClick={() => handleTapBingoCell(idx)}
                  >
                    {isMarked && <span className="bingo-cell-stamp">💖</span>}
                    <span>{cell.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SOUVENIR CARD & SAVE TO PHONE (SHOWN ON GAME FINISH OR WHEN BINGO WON) */}
        {(session.status === 'finished' || player.is_bingo_winner) && (
          <div className="guest-card" style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Trophy size={38} color="var(--accent-secondary)" style={{ marginBottom: '0.4rem' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem' }}>
              {session.status === 'finished'
                ? '🎉 จบเกมแล้ว! การ์ดที่ระลึกของคุณพร้อมแล้ว'
                : '🏆 ยินดีด้วย! การ์ดผู้พิชิต BINGO ของคุณ'}
            </h2>
            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--text-secondary)',
                marginTop: '0.25rem',
                marginBottom: '1rem'
              }}
            >
              คุณได้ลำดับที่ <strong>#{myRank}</strong> (คะแนนรวม{' '}
              <strong style={{ color: 'var(--accent-primary)' }}>
                {(player.score || 0).toLocaleString()} คะแนน
              </strong>
              ) กดบันทึกภาพเก็บไว้เป็นที่ระลึกหรือแชร์ลงโซเชียลได้เลย!
            </p>

            {souvenirCardUrl && (
              <div style={{ marginBottom: '1rem' }}>
                <img
                  src={souvenirCardUrl}
                  alt="การ์ดที่ระลึกงานแต่ง"
                  style={{
                    width: '100%',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-md)',
                    border: '1px solid var(--border-subtle)'
                  }}
                />
              </div>
            )}

            <button
              type="button"
              id="btn-save-souvenir-card"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginBottom: '0.5rem' }}
              onClick={async () => {
                let url = souvenirCardUrl;
                if (!url) {
                  url = await generateSouvenirCardDataUrl({
                    session,
                    player,
                    rank: myRank,
                    totalPlayers: Math.max(1, roomPlayers.length)
                  });
                  setSouvenirCardUrl(url);
                }
                await downloadOrShareSouvenirCard(
                  url,
                  `souvenir-${session.pin}-${player.nickname}.png`
                );
              }}
            >
              <Download size={19} />
              บันทึกภาพการ์ดที่ระลึกเข้ามือถือ
            </button>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              💡 เคล็ดลับ: บน iPhone หรือแอป LINE สามารถแตะค้างที่รูปการ์ดด้านบนแล้วเลือก "บันทึกรูปภาพ" ได้เช่นกัน
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
