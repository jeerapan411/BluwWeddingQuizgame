-- ============================================================================
-- BLUW WEDDING QUIZ & BINGO — SUPABASE SCHEMA (OPTIMIZED FOR 200+ PLAYERS)
-- วิธีใช้งาน: คัดลอก SQL ทั้งหมดนี้ไปรันในเมนู SQL Editor ของ Supabase
-- ============================================================================

-- 1. ตาราง games (เก็บแม่แบบเกมทั้งแบบ Kahoot Quiz และ Wedding/Number Bingo)
CREATE TABLE IF NOT EXISTS public.games (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  event_type TEXT NOT NULL DEFAULT 'wedding', -- 'wedding' | 'seminar' | 'party'
  game_mode TEXT NOT NULL DEFAULT 'quiz',     -- 'quiz' | 'bingo'
  bingo_submode TEXT DEFAULT 'quiz_grid',     -- 'quiz_grid' (คำถามบ่าวสาวเรียงบิงโก) | 'number_classic' (บิงโกตัวเลข/คำมงคล)
  bingo_grid_size INT DEFAULT 4,              -- 3 (3x3), 4 (4x4), 5 (5x5)
  bingo_fill_mode TEXT DEFAULT 'random_card', -- 'sequential' (ตอบถูกเรียงช่องตามลำดับ) | 'random_card' (สุ่มตำแหน่งคำตอบบนการ์ดแต่ละคน)
  theme TEXT DEFAULT 'rose_gold',             -- 'rose_gold' | 'champagne_ivory' | 'royal_navy' | 'seminar_slate'
  couple_names TEXT DEFAULT '',
  event_date TEXT DEFAULT '',
  client_code TEXT DEFAULT '',                -- รหัสแพ็กเกจสำหรับขายให้ลูกค้า/บ่าวสาวเปิดเล่นเอง
  package_name TEXT DEFAULT 'MC VIP Package',
  max_players INT DEFAULT 200,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  bingo_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  play_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ตาราง game_sessions (เก็บห้องที่เปิดเล่นสดด้วย QR Code / PIN และประวัติรายงาน)
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id TEXT PRIMARY KEY,
  pin TEXT NOT NULL,
  game_id TEXT REFERENCES public.games(id) ON DELETE SET NULL,
  game_title TEXT NOT NULL,
  game_mode TEXT NOT NULL,
  bingo_submode TEXT DEFAULT 'quiz_grid',
  bingo_grid_size INT DEFAULT 4,
  bingo_fill_mode TEXT DEFAULT 'random_card',
  couple_names TEXT DEFAULT '',
  event_type TEXT DEFAULT 'wedding',
  theme TEXT DEFAULT 'rose_gold',
  status TEXT NOT NULL DEFAULT 'lobby',       -- 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'bingo_live' | 'finished'
  current_question_index INT DEFAULT 0,
  question_started_at TIMESTAMPTZ,
  drawn_bingo_items JSONB DEFAULT '[]'::jsonb,
  game_snapshot JSONB DEFAULT '{}'::jsonb,
  player_count INT DEFAULT 0,
  winner_summary JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_pin ON public.game_sessions(pin);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON public.game_sessions(status);

-- 3. ตาราง session_players (รองรับแขก 200 คนต่อห้องอย่างรวดเร็ว)
CREATE TABLE IF NOT EXISTS public.session_players (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_session_players_session_id ON public.session_players(session_id);
CREATE INDEX IF NOT EXISTS idx_session_players_pin ON public.session_players(pin);

-- 4. เปิดใช้งาน Row Level Security (RLS) แบบ Public Event Access เพื่อให้แขกสแกน QR เข้าเล่นได้ทันทีโดยไม่ต้องสมัครสมาชิก
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read/write games" ON public.games;
CREATE POLICY "Allow public read/write games" ON public.games FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write game_sessions" ON public.game_sessions;
CREATE POLICY "Allow public read/write game_sessions" ON public.game_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write session_players" ON public.session_players;
CREATE POLICY "Allow public read/write session_players" ON public.session_players FOR ALL USING (true) WITH CHECK (true);

-- 5. เปิด Realtime Publication สำหรับซิงค์ข้อมูลสด
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_players;
