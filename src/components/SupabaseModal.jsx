import React, { useState } from 'react';
import { Database, CheckCircle2, Copy, ExternalLink, X, ShieldCheck, Server } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig, isSupabaseConnected } from '../services/db';

const SQL_SCHEMA_SNIPPET = `-- คัดลอกไปรันใน Supabase -> SQL Editor
CREATE TABLE IF NOT EXISTS public.games (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  event_type TEXT NOT NULL DEFAULT 'wedding',
  game_mode TEXT NOT NULL DEFAULT 'quiz',
  bingo_submode TEXT DEFAULT 'quiz_grid',
  bingo_grid_size INT DEFAULT 4,
  bingo_fill_mode TEXT DEFAULT 'random_card',
  theme TEXT DEFAULT 'rose_gold',
  couple_names TEXT DEFAULT '',
  event_date TEXT DEFAULT '',
  client_code TEXT DEFAULT '',
  package_name TEXT DEFAULT 'MC VIP Package',
  max_players INT DEFAULT 200,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  bingo_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  play_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.game_sessions (
  id TEXT PRIMARY KEY,
  pin TEXT NOT NULL,
  game_id TEXT,
  game_title TEXT NOT NULL,
  game_mode TEXT NOT NULL,
  bingo_submode TEXT DEFAULT 'quiz_grid',
  bingo_grid_size INT DEFAULT 4,
  bingo_fill_mode TEXT DEFAULT 'random_card',
  couple_names TEXT DEFAULT '',
  event_type TEXT DEFAULT 'wedding',
  theme TEXT DEFAULT 'rose_gold',
  status TEXT NOT NULL DEFAULT 'lobby',
  current_question_index INT DEFAULT 0,
  question_started_at TIMESTAMPTZ,
  drawn_bingo_items JSONB DEFAULT '[]'::jsonb,
  game_snapshot JSONB DEFAULT '{}'::jsonb,
  player_count INT DEFAULT 0,
  winner_summary JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.session_players (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  pin TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar TEXT DEFAULT '🥂',
  table_name TEXT DEFAULT '',
  wish_message TEXT DEFAULT '',
  score INT DEFAULT 0,
  correct_count INT DEFAULT 0,
  streak INT DEFAULT 0,
  bingo_card JSONB DEFAULT '[]'::jsonb,
  bingo_marked JSONB DEFAULT '[]'::jsonb,
  bingo_lines INT DEFAULT 0,
  is_bingo_winner BOOLEAN DEFAULT FALSE,
  bingo_won_at TIMESTAMPTZ,
  answers JSONB DEFAULT '{}'::jsonb,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access games" ON public.games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access sessions" ON public.game_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access players" ON public.session_players FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_players;`;

export default function SupabaseModal({ onClose, onSaved }) {
  const current = getSupabaseConfig();
  const [url, setUrl] = useState(current.url || '');
  const [anonKey, setAnonKey] = useState(current.anonKey || '');
  const [copiedSql, setCopiedSql] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    saveSupabaseConfig(url, anonKey);
    setSavedMsg('บันทึกการตั้งค่าเรียบร้อยแล้ว!');
    if (onSaved) onSaved();
    setTimeout(() => setSavedMsg(''), 2500);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_SNIPPET);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const connected = isSupabaseConnected();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Database size={22} color="var(--accent-primary)" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
              ตั้งค่าฐานข้อมูล Supabase & Vercel (รองรับ 200 คนฟรี)
            </h2>
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            padding: '0.9rem 1.1rem',
            borderRadius: 'var(--radius-md)',
            background: connected ? 'var(--status-success-bg)' : 'var(--status-warning-bg)',
            color: connected ? 'var(--status-success)' : 'var(--status-warning)',
            marginBottom: '1.25rem',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}
        >
          <ShieldCheck size={20} />
          <div>
            <strong>
              สถานะปัจจุบัน:{' '}
              {connected
                ? 'เชื่อมต่อ Supabase Cloud Realtime แล้ว (พร้อมใช้งานข้ามมือถือ 200 เครื่อง)'
                : 'โหมด Local Instant Demo (ทดสอบเปิดหลายแท็บและจำลองแขก 200 คนได้ทันที)'}
            </strong>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Supabase Project URL (VITE_SUPABASE_URL)</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://xxxxxxxxxxxx.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Supabase Anon Public Key (VITE_SUPABASE_ANON_KEY)</label>
            <input
              type="text"
              className="form-input"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button type="submit" className="btn btn-primary">
              <CheckCircle2 size={18} />
              บันทึกการเชื่อมต่อ Supabase
            </button>
            {url && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setUrl('');
                  setAnonKey('');
                  saveSupabaseConfig('', '');
                  if (onSaved) onSaved();
                }}
              >
                สลับกลับโหมด Local Demo
              </button>
            )}
            {savedMsg && (
              <span style={{ color: 'var(--status-success)', fontSize: '0.88rem', fontWeight: 600 }}>
                {savedMsg}
              </span>
            )}
          </div>
        </form>

        <div
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.15rem'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.65rem'
            }}
          >
            <strong style={{ fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Server size={17} />
              SQL สำหรับสร้างตารางใน Supabase (คัดลอกไปรันใน SQL Editor)
            </strong>
            <button type="button" className="btn btn-secondary" onClick={handleCopySql}>
              <Copy size={15} />
              {copiedSql ? 'คัดลอก SQL แล้ว!' : 'คัดลอก SQL Schema'}
            </button>
          </div>
          <pre
            style={{
              background: '#1c1518',
              color: '#f6d59e',
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.76rem',
              maxHeight: '190px',
              overflowY: 'auto',
              lineHeight: 1.45
            }}
          >
            {SQL_SCHEMA_SNIPPET}
          </pre>
        </div>
      </div>
    </div>
  );
}
