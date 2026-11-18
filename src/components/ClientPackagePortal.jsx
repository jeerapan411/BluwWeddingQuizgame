import React, { useState, useEffect } from 'react';
import { KeyRound, Play, Sparkles, Users, HelpCircle, Grid, CheckCircle2 } from 'lucide-react';
import { findGameByClientCode } from '../services/db';

export default function ClientPackagePortal({
  initialCode = '',
  games = [],
  onLaunchClientGame
}) {
  const [codeInput, setCodeInput] = useState(initialCode || '');
  const [matchedGame, setMatchedGame] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialCode) {
      setCodeInput(initialCode);
      handleLookup(initialCode);
    }
  }, [initialCode]);

  const handleLookup = async (codeToSearch) => {
    setErrorMsg('');
    const found = await findGameByClientCode(codeToSearch);
    if (!found) {
      setMatchedGame(null);
      setErrorMsg('ไม่พบรหัสแพ็กเกจนี้ กรุณาตรวจสอบรหัสที่ได้รับจากนายพิธีอีกครั้ง');
    } else {
      setMatchedGame(found);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '760px' }}>
      <div className="builder-panel" style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'var(--accent-soft)',
            color: 'var(--accent-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.85rem'
          }}
        >
          <KeyRound size={26} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem' }}>
          พอร์ทัลเปิดเกมสำหรับลูกค้า (Client Event Package)
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>
          สำหรับคู่บ่าวสาวหรือผู้จัดงานที่ซื้อแพ็กเกจเกม กรอกรหัสแพ็กเกจ (Client Code)
          เพื่อเปิดหน้าจอ QR Code บนโปรเจกเตอร์ในงานของคุณได้ทันที
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup(codeInput);
          }}
          style={{
            display: 'flex',
            gap: '0.65rem',
            maxWidth: '480px',
            margin: '1.5rem auto 1rem',
            flexWrap: 'wrap'
          }}
        >
          <input
            type="text"
            className="form-input"
            style={{
              flex: 1,
              fontFamily: 'monospace',
              fontSize: '1.05rem',
              fontWeight: 700,
              textAlign: 'center'
            }}
            placeholder="เช่น WED-PLOYNON-2026"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
          />
          <button type="submit" className="btn btn-primary">
            ตรวจสอบรหัสแพ็กเกจ
          </button>
        </form>

        {/* Quick Demo Codes for Testing */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          รหัสตัวอย่างสำหรับทดสอบคลิกได้เลย:{' '}
          {games.slice(0, 3).map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                setCodeInput(g.client_code);
                handleLookup(g.client_code);
              }}
              style={{
                marginInline: '0.3rem',
                color: 'var(--accent-primary)',
                fontWeight: 600,
                textDecoration: 'underline'
              }}
            >
              {g.client_code}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'var(--status-danger-bg)',
              color: 'var(--status-danger)',
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.88rem'
            }}
          >
            {errorMsg}
          </div>
        )}

        {matchedGame && (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-primary)',
              border: '2px solid var(--accent-primary)',
              textAlign: 'left'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginBottom: '0.65rem'
              }}
            >
              <span className="badge badge-success">
                <CheckCircle2 size={14} />
                แพ็กเกจพร้อมใช้งาน ({matchedGame.client_code})
              </span>
              <span className="badge badge-event">
                รองรับผู้เล่นสูงสุด {matchedGame.max_players || 200} คน
              </span>
            </div>

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem' }}>
              {matchedGame.title}
            </h2>
            <div
              style={{
                color: 'var(--accent-primary)',
                fontWeight: 600,
                marginTop: '0.2rem',
                marginBottom: '0.6rem'
              }}
            >
              งานของ: {matchedGame.couple_names}
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              {matchedGame.subtitle}
            </p>

            <div
              style={{
                marginTop: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                รูปแบบ:{' '}
                <strong>
                  {matchedGame.game_mode === 'bingo'
                    ? matchedGame.bingo_submode === 'number_classic'
                      ? 'บิงโกตัวเลขมงคล'
                      : 'บิงโกคำถามบ่าวสาว'
                    : 'เกมตอบคำถามชิงความไวสไตล์ Kahoot'}
                </strong>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => onLaunchClientGame(matchedGame)}
              >
                <Play size={19} />
                ออก QR Code เปิดจอโปรเจกเตอร์เริ่มเกม
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
