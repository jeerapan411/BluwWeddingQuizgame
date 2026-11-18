import { createClient } from '@supabase/supabase-js';
import { DEFAULT_GAMES, DEFAULT_HISTORY_SESSIONS, WEDDING_AVATARS } from '../data/defaultGames';

const STORAGE_KEYS = {
  GAMES: 'bluw_wedding_games_v2',
  SESSIONS: 'bluw_wedding_sessions_v2',
  PLAYERS: 'bluw_wedding_players_v2',
  SUPABASE_CFG: 'bluw_supabase_config_v1'
};

// Clean up legacy v1 keys that could hold stale pre-Supabase data
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('bluw_wedding_games_v1');
    localStorage.removeItem('bluw_wedding_sessions_v1');
    localStorage.removeItem('bluw_wedding_players_v1');
  } catch {
    // Ignore
  }
}

let supabaseClient = null;

const DEFAULT_SUPABASE_URL = 'https://isegvrwoupoqguvzcvud.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_7H3hcI69lNcr314lZ9c-fw_cCuNHwpu';

export function normalizeSupabaseUrl(rawUrl) {
  return (rawUrl || '')
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

export function getSupabaseConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SUPABASE_CFG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return {
          url: normalizeSupabaseUrl(parsed.url),
          anonKey: parsed.anonKey.trim(),
          source: 'local'
        };
      }
    }
  } catch (e) {
    console.warn('Failed to read Supabase config:', e);
  }

  const envUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL);
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY).trim();
  if (envUrl && envKey && !envUrl.includes('your-project-id')) {
    return { url: envUrl, anonKey: envKey, source: 'env' };
  }
  return { url: '', anonKey: '', source: 'none' };
}

export function saveSupabaseConfig(url, anonKey) {
  const cleanUrl = normalizeSupabaseUrl(url);
  const cleanKey = (anonKey || '').trim();
  if (!cleanUrl || !cleanKey) {
    localStorage.removeItem(STORAGE_KEYS.SUPABASE_CFG);
    supabaseClient = null;
    return false;
  }
  localStorage.setItem(
    STORAGE_KEYS.SUPABASE_CFG,
    JSON.stringify({ url: cleanUrl, anonKey: cleanKey })
  );
  supabaseClient = null;
  getSupabase();
  return true;
}

export async function checkSupabaseTablesStatus() {
  const sb = getSupabase();
  if (!sb) {
    return { connected: false, tablesReady: false, message: 'ยังไม่ได้ตั้งค่า URL และ Key' };
  }
  try {
    const { error } = await sb.from('games').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST205' || (error.message || '').includes('Could not find the table')) {
        return {
          connected: true,
          tablesReady: false,
          message: 'เชื่อมต่อ Supabase สำเร็จแล้ว แต่ยังไม่ได้รันคำสั่ง SQL สร้างตาราง (games, game_sessions, session_players)'
        };
      }
      return { connected: true, tablesReady: false, message: error.message };
    }
    return {
      connected: true,
      tablesReady: true,
      message: 'เชื่อมต่อ Supabase สำเร็จ และตารางฐานข้อมูลพร้อมใช้งานครบถ้วน!'
    };
  } catch (err) {
    return { connected: false, tablesReady: false, message: err.message };
  }
}

export function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const cfg = getSupabaseConfig();
  if (cfg.url && cfg.anonKey) {
    try {
      supabaseClient = createClient(cfg.url, cfg.anonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
      return supabaseClient;
    } catch (err) {
      console.warn('Supabase init error:', err);
    }
  }
  return null;
}

export function isSupabaseConnected() {
  return Boolean(getSupabase());
}

// ============================================================================
// BINGO CARD & LINE VERIFICATION UTILITIES
// ============================================================================

export function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateBingoCard(game) {
  const size = Number(game.bingo_grid_size) || 4;
  const totalCells = size * size;
  const submode = game.bingo_submode || 'quiz_grid';
  const fillMode = game.bingo_fill_mode || 'random_card';

  let pool = [];

  if (submode === 'quiz_grid') {
    const questions = game.questions || [];
    pool = questions.map((q, idx) => ({
      key: q.id || `q_${idx}`,
      label: q.bingoLabel || q.options?.[q.correctIndex] || `ข้อที่ ${idx + 1}`,
      questionIndex: idx
    }));
    while (pool.length < totalCells) {
      const idx = pool.length;
      pool.push({
        key: `bonus_${idx}`,
        label: idx % 2 === 0 ? '💖 FREE LOVE' : '🥂 โชคดี',
        isFree: true
      });
    }
    pool = pool.slice(0, totalCells);
    if (fillMode === 'random_card') {
      pool = shuffleArray(pool);
    }
  } else {
    const rawItems =
      Array.isArray(game.bingo_items) && game.bingo_items.length >= totalCells
        ? game.bingo_items
        : Array.from({ length: Math.max(totalCells, 25) }, (_, i) => String(i + 1));

    const shuffled = shuffleArray(rawItems).slice(0, totalCells);
    pool = shuffled.map((val, idx) => ({
      key: `num_${val}_${idx}`,
      label: String(val),
      value: String(val)
    }));
  }

  if (size === 5 && pool[12]) {
    pool[12] = {
      key: 'center_free',
      label: '💖 FREE',
      value: 'FREE',
      isFree: true
    };
  }

  return pool;
}

export function getInitialMarkedCells(card) {
  return card.map((cell) => Boolean(cell.isFree));
}

export function countBingoLines(markedArray, gridSize) {
  const size = Number(gridSize) || 4;
  if (!Array.isArray(markedArray) || markedArray.length < size * size) {
    return { lines: 0, winningIndices: [], bestProgress: 0, nearBingo: false };
  }

  let lines = 0;
  const winningSet = new Set();
  let bestProgress = 0;

  for (let r = 0; r < size; r++) {
    let count = 0;
    const rowIndices = [];
    for (let c = 0; c < size; c++) {
      const idx = r * size + c;
      rowIndices.push(idx);
      if (markedArray[idx]) count++;
    }
    if (count > bestProgress) bestProgress = count;
    if (count === size) {
      lines++;
      rowIndices.forEach((i) => winningSet.add(i));
    }
  }

  for (let c = 0; c < size; c++) {
    let count = 0;
    const colIndices = [];
    for (let r = 0; r < size; r++) {
      const idx = r * size + c;
      colIndices.push(idx);
      if (markedArray[idx]) count++;
    }
    if (count > bestProgress) bestProgress = count;
    if (count === size) {
      lines++;
      colIndices.forEach((i) => winningSet.add(i));
    }
  }

  let diag1Count = 0;
  const diag1Indices = [];
  for (let i = 0; i < size; i++) {
    const idx = i * size + i;
    diag1Indices.push(idx);
    if (markedArray[idx]) diag1Count++;
  }
  if (diag1Count > bestProgress) bestProgress = diag1Count;
  if (diag1Count === size) {
    lines++;
    diag1Indices.forEach((i) => winningSet.add(i));
  }

  let diag2Count = 0;
  const diag2Indices = [];
  for (let i = 0; i < size; i++) {
    const idx = i * size + (size - 1 - i);
    diag2Indices.push(idx);
    if (markedArray[idx]) diag2Count++;
  }
  if (diag2Count > bestProgress) bestProgress = diag2Count;
  if (diag2Count === size) {
    lines++;
    diag2Indices.forEach((i) => winningSet.add(i));
  }

  return {
    lines,
    winningIndices: Array.from(winningSet),
    bestProgress,
    nearBingo: lines === 0 && bestProgress === size - 1
  };
}

// ============================================================================
// LOCAL STORAGE HELPERS (Pure Silent Cache - Zero Automatic Event Loops)
// ============================================================================

function getLocalGames() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GAMES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(DEFAULT_GAMES));
      return DEFAULT_GAMES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_GAMES;
  }
}

function cacheLocalGames(games) {
  try {
    localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
  } catch {
    // Ignore storage errors
  }
}

function getLocalSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(DEFAULT_HISTORY_SESSIONS));
      return DEFAULT_HISTORY_SESSIONS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_HISTORY_SESSIONS;
  }
}

function cacheLocalSessions(sessions) {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch {
    // Ignore storage errors
  }
}

function getLocalPlayers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PLAYERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function cacheLocalPlayers(players) {
  try {
    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// GAMES CRUD (Backoffice & Client Package Lookup — Pure Read, No Side Effects)
// ============================================================================

function packGameForSupabase(record) {
  const musicMeta = {
    music_mode: record.music_mode || 'builtin',
    music_lobby_yt: record.music_lobby_yt || '',
    music_play_yt: record.music_play_yt || '',
    music_winner_yt: record.music_winner_yt || ''
  };

  const cleanQuestions = Array.isArray(record.questions)
    ? record.questions.filter((q) => !q?.__musicMetaOnly)
    : [];

  const packedQuestions =
    cleanQuestions.length > 0
      ? cleanQuestions.map((q, idx) => (idx === 0 ? { ...q, __musicMeta: musicMeta } : q))
      : [{ __musicMetaOnly: true, __musicMeta: musicMeta }];

  return {
    id: record.id,
    title: record.title,
    subtitle: record.subtitle || '',
    event_type: record.event_type || 'wedding',
    game_mode: record.game_mode || 'quiz',
    bingo_submode: record.bingo_submode || 'quiz_grid',
    bingo_grid_size: Number(record.bingo_grid_size) || 4,
    bingo_fill_mode: record.bingo_fill_mode || 'random_card',
    theme: record.theme || 'rose_gold',
    couple_names: record.couple_names || '',
    event_date: record.event_date || '',
    client_code: record.client_code || '',
    package_name: record.package_name || '',
    max_players: Number(record.max_players) || 200,
    questions: packedQuestions,
    bingo_items: Array.isArray(record.bingo_items) ? record.bingo_items : [],
    play_count: Number(record.play_count) || 0,
    created_at: record.created_at,
    updated_at: record.updated_at
  };
}

function unpackGameFromSupabase(row) {
  if (!row) return row;
  const rawQuestions = Array.isArray(row.questions) ? row.questions : [];
  const metaHolder = rawQuestions.find((q) => q?.__musicMeta);
  const musicMeta = metaHolder?.__musicMeta || {};
  const cleanQuestions = rawQuestions
    .filter((q) => !q?.__musicMetaOnly)
    .map((q) => {
      if (!q || !q.__musicMeta) return q;
      const copy = { ...q };
      delete copy.__musicMeta;
      return copy;
    });

  return {
    ...row,
    questions: cleanQuestions,
    music_mode: row.music_mode || musicMeta.music_mode || 'builtin',
    music_lobby_yt: row.music_lobby_yt || musicMeta.music_lobby_yt || '',
    music_play_yt: row.music_play_yt || musicMeta.music_play_yt || '',
    music_winner_yt: row.music_winner_yt || musicMeta.music_winner_yt || ''
  };
}

export async function fetchGames() {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('games')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        if (data.length > 0) {
          const unpacked = data.map(unpackGameFromSupabase);
          cacheLocalGames(unpacked);
          return unpacked;
        }
        return DEFAULT_GAMES;
      }
    } catch (e) {
      console.warn('Supabase fetchGames fallback to local:', e);
    }
  }
  return getLocalGames();
}

export async function saveGame(gameData) {
  const games = getLocalGames();
  const now = new Date().toISOString();
  const id = gameData.id || `game-${Date.now()}`;
  const clientCode =
    gameData.client_code ||
    `BLUW-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const record = {
    ...gameData,
    id,
    client_code: clientCode,
    max_players: Number(gameData.max_players) || 200,
    play_count: Number(gameData.play_count) || 0,
    updated_at: now,
    created_at: gameData.created_at || now
  };

  const existingIndex = games.findIndex((g) => g.id === id);
  if (existingIndex >= 0) {
    games[existingIndex] = record;
  } else {
    games.unshift(record);
  }
  cacheLocalGames(games);

  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('games').upsert(packGameForSupabase(record));
    } catch (e) {
      console.warn('Supabase saveGame fallback:', e);
    }
  }
  return record;
}

export async function deleteGame(gameId) {
  const games = getLocalGames().filter((g) => g.id !== gameId);
  cacheLocalGames(games);
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('games').delete().eq('id', gameId);
    } catch (e) {
      console.warn('Supabase deleteGame error:', e);
    }
  }
}

export async function findGameByClientCode(code) {
  const normalized = (code || '').trim().toUpperCase();
  if (!normalized) return null;
  const games = await fetchGames();
  return games.find((g) => (g.client_code || '').toUpperCase() === normalized) || null;
}

// ============================================================================
// LIVE SESSION & ROOM PIN MANAGEMENT (Supports 200 Concurrent Guests)
// ============================================================================

export async function createLiveSession(game) {
  const pin = String(Math.floor(100000 + Math.random() * 900000));
  const sessionId = `sess-${Date.now()}-${pin}`;
  const now = new Date().toISOString();

  const session = {
    id: sessionId,
    pin,
    game_id: game.id,
    game_title: game.title,
    game_mode: game.game_mode || 'quiz',
    bingo_submode: game.bingo_submode || 'quiz_grid',
    bingo_grid_size: Number(game.bingo_grid_size) || 4,
    bingo_fill_mode: game.bingo_fill_mode || 'random_card',
    couple_names: game.couple_names || '',
    event_type: game.event_type || 'wedding',
    theme: game.theme || 'rose_gold',
    status: 'lobby',
    current_question_index: 0,
    question_started_at: null,
    drawn_bingo_items: [],
    game_snapshot: game,
    player_count: 0,
    winner_summary: [],
    started_at: now,
    ended_at: null
  };

  const sessions = getLocalSessions();
  sessions.unshift(session);
  cacheLocalSessions(sessions);

  const games = getLocalGames().map((g) =>
    g.id === game.id ? { ...g, play_count: (g.play_count || 0) + 1 } : g
  );
  cacheLocalGames(games);

  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('game_sessions').insert(session);
      await sb
        .from('games')
        .update({ play_count: (game.play_count || 0) + 1 })
        .eq('id', game.id);
    } catch (e) {
      console.warn('Supabase createLiveSession fallback:', e);
    }
  }

  return session;
}

export async function fetchSessionsHistory() {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('game_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);
      if (!error && Array.isArray(data) && data.length > 0) {
        cacheLocalSessions(data);
        return data;
      }
    } catch (e) {
      console.warn('Supabase fetchSessionsHistory fallback:', e);
    }
  }
  return getLocalSessions();
}

export async function getSessionByPin(pin) {
  const cleanPin = String(pin || '').trim();
  if (!cleanPin) return null;

  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('game_sessions')
        .select('*')
        .eq('pin', cleanPin)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('Supabase getSessionByPin fallback:', e);
    }
  }

  const sessions = getLocalSessions();
  return sessions.find((s) => String(s.pin) === cleanPin) || null;
}

export async function updateSessionState(sessionId, patch) {
  const sessions = getLocalSessions();
  let updated = null;
  const next = sessions.map((s) => {
    if (s.id === sessionId) {
      updated = { ...s, ...patch };
      return updated;
    }
    return s;
  });
  cacheLocalSessions(next);

  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('game_sessions').update(patch).eq('id', sessionId);
    } catch (e) {
      console.warn('Supabase updateSessionState fallback:', e);
    }
  }

  return updated;
}

// ============================================================================
// GUEST PLAYERS & ANSWERS (Pure Read / Write without Side-Effect Loops)
// ============================================================================

export async function fetchSessionPlayers(sessionId) {
  if (!sessionId) return [];

  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('session_players')
        .select('*')
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true });
      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      console.warn('Supabase fetchSessionPlayers fallback:', e);
    }
  }
  return getLocalPlayers().filter((p) => p.session_id === sessionId);
}

export async function joinSessionAsGuest({ pin, nickname, avatar, tableName, wishMessage }) {
  const session = await getSessionByPin(pin);
  if (!session) {
    throw new Error('ไม่พบรหัสห้องเกมนี้ กรุณาตรวจสอบรหัส PIN 6 หลักอีกครั้ง');
  }
  if (session.status === 'finished') {
    throw new Error('เกมในห้องนี้จบลงแล้ว');
  }

  const currentPlayers = await fetchSessionPlayers(session.id);
  const maxPlayers = session.game_snapshot?.max_players || 200;
  if (currentPlayers.length >= maxPlayers) {
    throw new Error(`ห้องนี้มีผู้เข้าร่วมเต็มจำนวน ${maxPlayers} คนแล้ว`);
  }

  const game = session.game_snapshot || {};
  const bingoCard = game.game_mode === 'bingo' ? generateBingoCard(game) : [];
  const bingoMarked = game.game_mode === 'bingo' ? getInitialMarkedCells(bingoCard) : [];

  const uniqueSuffix =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : `${Math.random().toString(36).substring(2, 8)}${Math.floor(Math.random() * 1000)}`;

  const player = {
    id: `guest-${Date.now()}-${uniqueSuffix}`,
    session_id: session.id,
    pin: session.pin,
    nickname: nickname.trim(),
    avatar: avatar || '🥂',
    table_name: (tableName || '').trim(),
    wish_message: (wishMessage || '').trim(),
    score: 0,
    correct_count: 0,
    streak: 0,
    bingo_card: bingoCard,
    bingo_marked: bingoMarked,
    bingo_lines: 0,
    is_bingo_winner: false,
    bingo_won_at: null,
    answers: {},
    joined_at: new Date().toISOString()
  };

  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from('session_players').insert(player);
    if (error) {
      console.warn('Supabase insert player error:', error);
    }
  }

  const allLocal = getLocalPlayers().filter((p) => p.id !== player.id);
  allLocal.push(player);
  cacheLocalPlayers(allLocal);

  const updatedCount = currentPlayers.length + 1;
  await updateSessionState(session.id, {
    player_count: updatedCount
  });

  return { session: { ...session, player_count: updatedCount }, player };
}

export async function submitQuizAnswer({ session, playerId, questionIndex, optionIndex, elapsedSeconds }) {
  const game = session.game_snapshot || {};
  const question = (game.questions || [])[questionIndex];
  if (!question) return null;

  const isCorrect = Number(optionIndex) === Number(question.correctIndex);
  const timeLimit = Number(question.timeLimit) || 20;
  const basePoints = Number(question.points) || 1000;

  const clampedElapsed = Math.max(0, Math.min(timeLimit, Number(elapsedSeconds) || 2));
  const speedRatio = 1 - clampedElapsed / timeLimit / 2;
  const earnedPoints = isCorrect ? Math.round(basePoints * speedRatio) : 0;

  const players = await fetchSessionPlayers(session.id);
  let updatedPlayer = null;

  const nextSessionPlayers = players.map((p) => {
    if (p.id !== playerId) return p;
    if (p.answers && p.answers[questionIndex] !== undefined) {
      updatedPlayer = p;
      return p;
    }

    const nextAnswers = {
      ...(p.answers || {}),
      [questionIndex]: {
        optionIndex,
        isCorrect,
        earnedPoints,
        answeredAt: new Date().toISOString()
      }
    };

    let nextMarked = Array.isArray(p.bingo_marked) ? [...p.bingo_marked] : [];
    let nextLines = p.bingo_lines || 0;
    let isBingoWinner = p.is_bingo_winner || false;
    let bingoWonAt = p.bingo_won_at || null;

    if (session.game_mode === 'bingo' && session.bingo_submode === 'quiz_grid' && isCorrect) {
      const card = Array.isArray(p.bingo_card) ? p.bingo_card : [];
      if (session.bingo_fill_mode === 'sequential') {
        const nextEmptyIdx = nextMarked.findIndex((m) => !m);
        if (nextEmptyIdx >= 0) {
          nextMarked[nextEmptyIdx] = true;
        }
      } else {
        const matchIdx = card.findIndex((c) => c.questionIndex === questionIndex);
        if (matchIdx >= 0) {
          nextMarked[matchIdx] = true;
        } else {
          const fallbackIdx = nextMarked.findIndex((m) => !m);
          if (fallbackIdx >= 0) nextMarked[fallbackIdx] = true;
        }
      }

      const lineCheck = countBingoLines(nextMarked, session.bingo_grid_size || 4);
      nextLines = lineCheck.lines;
      if (nextLines > 0 && !isBingoWinner) {
        isBingoWinner = true;
        bingoWonAt = new Date().toISOString();
      }
    }

    updatedPlayer = {
      ...p,
      score: (p.score || 0) + earnedPoints + nextLines * 300,
      correct_count: (p.correct_count || 0) + (isCorrect ? 1 : 0),
      streak: isCorrect ? (p.streak || 0) + 1 : 0,
      bingo_marked: nextMarked,
      bingo_lines: nextLines,
      is_bingo_winner: isBingoWinner,
      bingo_won_at: bingoWonAt,
      answers: nextAnswers
    };
    return updatedPlayer;
  });

  const otherPlayers = getLocalPlayers().filter((p) => p.session_id !== session.id);
  cacheLocalPlayers([...otherPlayers, ...nextSessionPlayers]);

  const sb = getSupabase();
  if (sb && updatedPlayer) {
    try {
      await sb
        .from('session_players')
        .update({
          score: updatedPlayer.score,
          correct_count: updatedPlayer.correct_count,
          streak: updatedPlayer.streak,
          bingo_marked: updatedPlayer.bingo_marked,
          bingo_lines: updatedPlayer.bingo_lines,
          is_bingo_winner: updatedPlayer.is_bingo_winner,
          bingo_won_at: updatedPlayer.bingo_won_at,
          answers: updatedPlayer.answers
        })
        .eq('id', playerId);
    } catch (e) {
      console.warn('Supabase submitQuizAnswer fallback:', e);
    }
  }

  return updatedPlayer;
}

export async function toggleClassicBingoCell({ session, playerId, cellIndex }) {
  const players = await fetchSessionPlayers(session.id);
  let updatedPlayer = null;
  const drawnSet = new Set((session.drawn_bingo_items || []).map(String));

  const nextSessionPlayers = players.map((p) => {
    if (p.id !== playerId) return p;
    const card = Array.isArray(p.bingo_card) ? p.bingo_card : [];
    const cell = card[cellIndex];
    if (!cell) return p;

    if (!cell.isFree && !drawnSet.has(String(cell.label))) {
      updatedPlayer = p;
      return p;
    }

    const nextMarked = Array.isArray(p.bingo_marked) ? [...p.bingo_marked] : [];
    nextMarked[cellIndex] = true;

    const lineCheck = countBingoLines(nextMarked, session.bingo_grid_size || 5);
    const nextLines = lineCheck.lines;
    const wonNow = nextLines > 0 && !p.is_bingo_winner;

    updatedPlayer = {
      ...p,
      bingo_marked: nextMarked,
      bingo_lines: nextLines,
      score: nextLines * 1000 + nextMarked.filter(Boolean).length * 50,
      correct_count: nextMarked.filter(Boolean).length,
      is_bingo_winner: p.is_bingo_winner || nextLines > 0,
      bingo_won_at: wonNow ? new Date().toISOString() : p.bingo_won_at
    };
    return updatedPlayer;
  });

  const otherPlayers = getLocalPlayers().filter((p) => p.session_id !== session.id);
  cacheLocalPlayers([...otherPlayers, ...nextSessionPlayers]);

  const sb = getSupabase();
  if (sb && updatedPlayer) {
    try {
      await sb
        .from('session_players')
        .update({
          bingo_marked: updatedPlayer.bingo_marked,
          bingo_lines: updatedPlayer.bingo_lines,
          score: updatedPlayer.score,
          correct_count: updatedPlayer.correct_count,
          is_bingo_winner: updatedPlayer.is_bingo_winner,
          bingo_won_at: updatedPlayer.bingo_won_at
        })
        .eq('id', playerId);
    } catch (e) {
      console.warn('Supabase toggleClassicBingoCell fallback:', e);
    }
  }

  return updatedPlayer;
}

// ============================================================================
// SIMULATE CROWD (For Testing 20 to 200 Wedding Guests Live!)
// ============================================================================

const SAMPLE_GUEST_NAMES = [
  'เพื่อนเจ้าสาวโต๊ะ 1', 'แก๊งมัธยมเจ้าบ่าว', 'คุณอาสมชาย VIP', 'น้องแพรว จุฬาฯ',
  'พี่ก้อง วิศวะ', 'คุณน้าวิภา', 'เจนนี่ แก๊งเพื่อนเจ้าสาว', 'บอสใหญ่ฝ่ายบริหาร',
  'น้องภูมิ หลานเจ้าสาว', 'แก๊งออฟฟิศอารีย์', 'พี่ตั้ม สายปาร์ตี้', 'คุณป้าสมศรี',
  'หมอเมย์ โต๊ะ 5', 'กัปตันต้น', 'น้องมายด์ บัญชี', 'พี่เอก ถ่ายภาพ',
  'คุณหญิงแม่โต๊ะหน้า', 'แชมป์ เพื่อนรด.', 'น้องฟ้า พยาบาล', 'ทีมงานเจ้าบ่าวสายดื่ม'
];

const SAMPLE_WISHES = [
  'ขอให้รักกันหวานชื่นตลอดไป มีเบบี๋เร็วๆ นะครับ!',
  'ยินดีด้วยมากๆ เลยเพื่อนรัก มีความสุขมากๆ นะ',
  'ถือไม้เท้ายอดทอง กระบอกยอดเพชรนะคะ',
  'งานอบอุ่นและน่ารักมาก ขอให้เฮงๆ รวยๆ คู่กันเลย'
];

export async function simulateGuestsBatch(session, count = 25) {
  if (!session) return [];
  const currentPlayers = await fetchSessionPlayers(session.id);
  const maxPlayers = session.game_snapshot?.max_players || 200;
  const remainingSlots = Math.max(0, maxPlayers - currentPlayers.length);
  const toCreate = Math.min(count, remainingSlots);
  if (toCreate <= 0) return currentPlayers;

  const game = session.game_snapshot || {};
  const newPlayers = [];
  const baseIdx = currentPlayers.length;
  const baseTime = Date.now();

  for (let i = 0; i < toCreate; i++) {
    const num = baseIdx + i + 1;
    const baseName = SAMPLE_GUEST_NAMES[(num - 1) % SAMPLE_GUEST_NAMES.length];
    const nickname = num <= SAMPLE_GUEST_NAMES.length ? baseName : `${baseName} #${num}`;
    const avatar = WEDDING_AVATARS[num % WEDDING_AVATARS.length];
    const bingoCard = game.game_mode === 'bingo' ? generateBingoCard(game) : [];
    const bingoMarked = game.game_mode === 'bingo' ? getInitialMarkedCells(bingoCard) : [];

    newPlayers.push({
      id: `sim-${session.id}-${num}-${Math.random().toString(36).substring(2, 6)}`,
      session_id: session.id,
      pin: session.pin,
      nickname,
      avatar,
      table_name: `โต๊ะ ${(num % 20) + 1}`,
      wish_message: SAMPLE_WISHES[num % SAMPLE_WISHES.length],
      score: 0,
      correct_count: 0,
      streak: 0,
      bingo_card: bingoCard,
      bingo_marked: bingoMarked,
      bingo_lines: 0,
      is_bingo_winner: false,
      bingo_won_at: null,
      answers: {},
      joined_at: new Date(baseTime + i).toISOString()
    });
  }

  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('session_players').insert(newPlayers);
    } catch (e) {
      console.warn('Supabase simulateGuestsBatch fallback:', e);
    }
  }

  const allLocal = [...getLocalPlayers(), ...newPlayers];
  cacheLocalPlayers(allLocal);

  await updateSessionState(session.id, {
    player_count: currentPlayers.length + newPlayers.length
  });

  return [...currentPlayers, ...newPlayers];
}

export async function simulateCrowdAnswersForQuestion(session, questionIndex) {
  const players = await fetchSessionPlayers(session.id);
  const game = session.game_snapshot || {};
  const question = (game.questions || [])[questionIndex];
  if (!question) return;

  const updatedBots = [];
  const nextSessionPlayers = players.map((p) => {
    if (p.session_id !== session.id) return p;
    if (!p.id.startsWith('sim-')) return p;
    if (p.answers && p.answers[questionIndex] !== undefined) return p;

    const willBeCorrect = Math.random() < 0.68;
    const optionIndex = willBeCorrect
      ? Number(question.correctIndex)
      : Math.floor(Math.random() * 4);
    const isCorrect = optionIndex === Number(question.correctIndex);
    const elapsed = 1.5 + Math.random() * ((question.timeLimit || 20) * 0.75);
    const speedRatio = 1 - elapsed / (question.timeLimit || 20) / 2;
    const earnedPoints = isCorrect ? Math.round((question.points || 1000) * speedRatio) : 0;

    let nextMarked = Array.isArray(p.bingo_marked) ? [...p.bingo_marked] : [];
    let nextLines = p.bingo_lines || 0;
    let isBingoWinner = p.is_bingo_winner || false;
    let bingoWonAt = p.bingo_won_at || null;

    if (session.game_mode === 'bingo' && session.bingo_submode === 'quiz_grid' && isCorrect) {
      const card = Array.isArray(p.bingo_card) ? p.bingo_card : [];
      if (session.bingo_fill_mode === 'sequential') {
        const nextEmptyIdx = nextMarked.findIndex((m) => !m);
        if (nextEmptyIdx >= 0) nextMarked[nextEmptyIdx] = true;
      } else {
        const matchIdx = card.findIndex((c) => c.questionIndex === questionIndex);
        if (matchIdx >= 0) nextMarked[matchIdx] = true;
      }
      const lineCheck = countBingoLines(nextMarked, session.bingo_grid_size || 4);
      nextLines = lineCheck.lines;
      if (nextLines > 0 && !isBingoWinner) {
        isBingoWinner = true;
        bingoWonAt = new Date().toISOString();
      }
    }

    const updated = {
      ...p,
      score: (p.score || 0) + earnedPoints + nextLines * 300,
      correct_count: (p.correct_count || 0) + (isCorrect ? 1 : 0),
      streak: isCorrect ? (p.streak || 0) + 1 : 0,
      bingo_marked: nextMarked,
      bingo_lines: nextLines,
      is_bingo_winner: isBingoWinner,
      bingo_won_at: bingoWonAt,
      answers: {
        ...(p.answers || {}),
        [questionIndex]: {
          optionIndex,
          isCorrect,
          earnedPoints,
          answeredAt: new Date().toISOString()
        }
      }
    };
    updatedBots.push(updated);
    return updated;
  });

  const otherPlayers = getLocalPlayers().filter((p) => p.session_id !== session.id);
  cacheLocalPlayers([...otherPlayers, ...nextSessionPlayers]);

  const sb = getSupabase();
  if (sb && updatedBots.length > 0) {
    try {
      await sb.from('session_players').upsert(updatedBots);
    } catch (e) {
      console.warn('Supabase simulateCrowdAnswersForQuestion fallback:', e);
    }
  }
}

export async function simulateCrowdMarkDrawnNumber(session, drawnLabel) {
  const players = await fetchSessionPlayers(session.id);
  const updatedBots = [];

  const nextSessionPlayers = players.map((p) => {
    if (p.session_id !== session.id) return p;
    if (!p.id.startsWith('sim-')) return p;

    const card = Array.isArray(p.bingo_card) ? p.bingo_card : [];
    const matchIdx = card.findIndex((c) => String(c.label) === String(drawnLabel));
    if (matchIdx < 0) return p;

    const nextMarked = Array.isArray(p.bingo_marked) ? [...p.bingo_marked] : [];
    nextMarked[matchIdx] = true;

    const lineCheck = countBingoLines(nextMarked, session.bingo_grid_size || 5);
    const nextLines = lineCheck.lines;
    const wonNow = nextLines > 0 && !p.is_bingo_winner;

    const updated = {
      ...p,
      bingo_marked: nextMarked,
      bingo_lines: nextLines,
      score: nextLines * 1000 + nextMarked.filter(Boolean).length * 50,
      correct_count: nextMarked.filter(Boolean).length,
      is_bingo_winner: p.is_bingo_winner || nextLines > 0,
      bingo_won_at: wonNow ? new Date().toISOString() : p.bingo_won_at
    };
    updatedBots.push(updated);
    return updated;
  });

  const otherPlayers = getLocalPlayers().filter((p) => p.session_id !== session.id);
  cacheLocalPlayers([...otherPlayers, ...nextSessionPlayers]);

  const sb = getSupabase();
  if (sb && updatedBots.length > 0) {
    try {
      await sb.from('session_players').upsert(updatedBots);
    } catch (e) {
      console.warn('Supabase simulateCrowdMarkDrawnNumber fallback:', e);
    }
  }
}
