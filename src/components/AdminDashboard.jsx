import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Play,
  Edit3,
  Copy,
  Trash2,
  BarChart3,
  Grid,
  List,
  HelpCircle,
  Users,
  Award,
  Share2,
  Download,
  CheckCircle2,
  Sparkles,
  FileText,
  KeyRound,
  Search,
  Music,
  Image as ImageIcon,
  Folder,
  Heart,
  Upload
} from 'lucide-react';
import { THEME_OPTIONS } from '../data/defaultGames';
import { saveGame, deleteGame, fetchSessionPlayers } from '../services/db';
import { getDefaultMusicConfig } from '../utils/musicEngine';
import MusicPresetManager from './MusicPresetManager';

const EMPTY_QUESTION = () => ({
  id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
  text: '',
  timeLimit: 20,
  points: 1000,
  bingoLabel: '',
  options: ['', '', '', ''],
  correctIndex: 0
});

// Romantic Wedding & Event Cover Presets (used when user wants 1-click cover or generated cover)
const COVER_GRADIENTS = [
  {
    bg: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 48%, #f5d0fe 100%)',
    accent: '#9d174d',
    sub: '#be185d',
    badge: '💍 Wedding'
  },
  {
    bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)',
    accent: '#92400e',
    sub: '#b45309',
    badge: '🥂 Celebration'
  },
  {
    bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)',
    accent: '#1e40af',
    sub: '#1d4ed8',
    badge: '✨ Love Story'
  },
  {
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)',
    accent: '#166534',
    sub: '#15803d',
    badge: '🌿 Garden Wedding'
  },
  {
    bg: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #e9d5ff 100%)',
    accent: '#6b21a8',
    sub: '#7e22ce',
    badge: '💖 Forever'
  }
];

function compressCoverImageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 640;
        const maxH = 400;
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        if (h > maxH) {
          w = Math.round((w * maxH) / h);
          h = maxH;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminDashboard({
  games,
  sessions,
  activeSection = 'library',
  onChangeSection,
  globalSearch = '',
  onChangeGlobalSearch,
  createTriggerCount = 0,
  onRefresh,
  onLaunchSession,
  onOpenClientPortal
}) {
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'quiz' | 'bingo' | 'wedding' | 'seminar'
  const [localSearch, setLocalSearch] = useState('');
  const [viewLayout, setViewLayout] = useState('grid'); // 'grid' | 'list'
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [selectedReportSession, setSelectedReportSession] = useState(null);
  const [reportPlayers, setReportPlayers] = useState([]);

  // Standalone Preset Manager state (for 'presets' sidebar section)
  const [standaloneMusic, setStandaloneMusic] = useState(getDefaultMusicConfig());

  // Builder State
  const [editingGame, setEditingGame] = useState(null);

  const setSection = (sec) => {
    if (onChangeSection) onChangeSection(sec);
  };

  const stats = useMemo(() => {
    const totalGames = games.length;
    const quizCount = games.filter((g) => g.game_mode === 'quiz').length;
    const bingoCount = games.filter((g) => g.game_mode === 'bingo').length;
    const weddingCount = games.filter((g) => g.event_type === 'wedding').length;
    const seminarCount = games.filter((g) => g.event_type === 'seminar').length;
    const totalSessions = sessions.length;
    const totalGuests = sessions.reduce((acc, s) => acc + (Number(s.player_count) || 0), 0);
    return {
      totalGames,
      quizCount,
      bingoCount,
      weddingCount,
      seminarCount,
      totalSessions,
      totalGuests
    };
  }, [games, sessions]);

  const effectiveSearch = (globalSearch || localSearch || '').trim().toLowerCase();

  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      if (filterMode === 'quiz' && g.game_mode !== 'quiz') return false;
      if (filterMode === 'bingo' && g.game_mode !== 'bingo') return false;
      if (filterMode === 'wedding' && g.event_type !== 'wedding') return false;
      if (filterMode === 'seminar' && g.event_type !== 'seminar') return false;
      if (effectiveSearch) {
        const matchTitle = (g.title || '').toLowerCase().includes(effectiveSearch);
        const matchCouple = (g.couple_names || '').toLowerCase().includes(effectiveSearch);
        const matchCode = (g.client_code || '').toLowerCase().includes(effectiveSearch);
        return matchTitle || matchCouple || matchCode;
      }
      return true;
    });
  }, [games, filterMode, effectiveSearch]);

  const startCreateNewGame = (presetMode = 'quiz', presetSubmode = 'quiz_grid') => {
    const defaultQuestions =
      presetMode === 'bingo' && presetSubmode === 'quiz_grid'
        ? Array.from({ length: 9 }, (_, i) => ({
            id: `bq_${Date.now()}_${i}`,
            text: `คำถามเกี่ยวกับบ่าวสาวข้อที่ ${i + 1}`,
            timeLimit: 20,
            points: 500,
            bingoLabel: `คำตอบข้อ ${i + 1}`,
            options: [`ตัวเลือก A`, `ตัวเลือก B`, `ตัวเลือก C`, `ตัวเลือก D`],
            correctIndex: 0
          }))
        : [
            {
              id: `q_${Date.now()}_1`,
              text: 'เจ้าบ่าวและเจ้าสาวพบกันครั้งแรกที่ไหน?',
              timeLimit: 20,
              points: 1000,
              bingoLabel: 'มหาวิทยาลัย',
              options: ['มหาวิทยาลัย', 'ที่ทำงานเดียวกัน', 'งานแต่งเพื่อน', 'ร้านกาแฟ'],
              correctIndex: 0
            },
            {
              id: `q_${Date.now()}_2`,
              text: 'เมนูโปรดที่บ่าวสาวชอบไปทานด้วยกันทุกสัปดาห์คืออะไร?',
              timeLimit: 20,
              points: 1000,
              bingoLabel: 'ชาบูหม่าล่า',
              options: ['ชาบูหม่าล่า', 'ซูชิโอมากาเสะ', 'ส้มตำไก่ย่าง', 'หมูกระทะ'],
              correctIndex: 0
            }
          ];

    const defaultMusic = getDefaultMusicConfig();

    setEditingGame({
      id: '',
      title:
        presetMode === 'bingo'
          ? presetSubmode === 'number_classic'
            ? 'Lucky Wedding Number Bingo — บิงโกตัวเลขมงคล'
            : 'Love Story Quiz Bingo — บิงโกคำถามบ่าวสาว'
          : 'แฟนพันธุ์แท้บ่าวสาว — Wedding Speed Quiz',
      subtitle:
        presetMode === 'bingo'
          ? 'เกมบิงโกสุดพิเศษสำหรับแขกในงาน สแกน QR Code ร่วมสนุกได้สูงสุด 200 ท่าน'
          : 'เกมตอบคำถามชิงความไวสไตล์ Kahoot พร้อมสรุปคะแนนบนจอโปรเจกเตอร์',
      event_type: 'wedding',
      game_mode: presetMode,
      bingo_submode: presetSubmode,
      bingo_grid_size: presetMode === 'bingo' ? (presetSubmode === 'number_classic' ? 5 : 3) : 4,
      bingo_fill_mode: 'sequential',
      theme: 'rose_gold',
      couple_names: 'คุณเจ้าสาว ❤️ คุณเจ้าบ่าว',
      cover_image: '',
      event_date: new Date().toISOString().slice(0, 10),
      client_code: `WED-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      package_name: 'แพ็กเกจนายพิธี + เกมงานแต่ง (VIP)',
      max_players: 200,
      ...defaultMusic,
      questions: presetSubmode === 'number_classic' ? [] : defaultQuestions,
      bingo_items:
        presetSubmode === 'number_classic'
          ? Array.from({ length: 25 }, (_, i) => String(i + 1))
          : []
    });
    setSection('builder');
  };

  // Triggered when user clicks the top blue "+ สร้าง" button in App header
  useEffect(() => {
    if (createTriggerCount > 0) {
      startCreateNewGame('quiz', 'quiz_grid');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createTriggerCount]);

  const handleEditExisting = (game) => {
    setEditingGame(JSON.parse(JSON.stringify(game)));
    setSection('builder');
  };

  const handleDuplicateForClient = async (game) => {
    const copy = {
      ...JSON.parse(JSON.stringify(game)),
      id: `game-${Date.now()}`,
      title: `${game.title} (ชุดลูกค้าใหม่)`,
      client_code: `VIP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      play_count: 0,
      created_at: new Date().toISOString()
    };
    await saveGame(copy);
    if (onRefresh) onRefresh();
  };

  const handleDeleteGame = async (gameId) => {
    await deleteGame(gameId);
    if (onRefresh) onRefresh();
  };

  const handleCopyClientLink = (game) => {
    const url = `${window.location.origin}${window.location.pathname}?client=${encodeURIComponent(
      game.client_code
    )}`;
    navigator.clipboard.writeText(url);
    setCopiedCodeId(game.id);
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  const handleSaveBuilder = async (e) => {
    e.preventDefault();
    if (!editingGame) return;

    const finalRecord = { ...editingGame };
    if (
      finalRecord.game_mode === 'bingo' &&
      finalRecord.bingo_submode === 'quiz_grid'
    ) {
      finalRecord.bingo_items = (finalRecord.questions || []).map(
        (q, idx) => q.bingoLabel || q.options?.[q.correctIndex] || `ข้อ ${idx + 1}`
      );
    }

    await saveGame(finalRecord);
    if (onRefresh) await onRefresh();
    setSection('library');
    setEditingGame(null);
  };

  const handleOpenSessionReport = async (session) => {
    setSelectedReportSession(session);
    const players = await fetchSessionPlayers(session.id);
    setReportPlayers(players);
  };

  const handleExportSessionCSV = async (session) => {
    const players = await fetchSessionPlayers(session.id);
    const rows = [
      ['อันดับ', 'ชื่อผู้เล่น', 'โต๊ะ', 'คะแนนรวม', 'ตอบถูก (ข้อ)', 'ชนะบิงโก', 'คำอวยพรบ่าวสาว']
    ];

    const list =
      players.length > 0
        ? [...players].sort((a, b) => (b.score || 0) - (a.score || 0))
        : session.winner_summary || [];

    list.forEach((p, idx) => {
      rows.push([
        idx + 1,
        `"${(p.nickname || '').replace(/"/g, '""')}"`,
        `"${(p.table_name || '-').replace(/"/g, '""')}"`,
        p.score || 0,
        p.correct_count || 0,
        p.is_bingo_winner ? 'BINGO!' : '-',
        `"${(p.wish_message || '').replace(/"/g, '""')}"`
      ]);
    });

    const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${session.pin}-${session.couple_names || 'event'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderCardThumbnail = (game, idx) => {
    const palette = COVER_GRADIENTS[idx % COVER_GRADIENTS.length];
    const isBingo = game.game_mode === 'bingo';
    const itemCountText = isBingo
      ? game.bingo_submode === 'number_classic'
        ? `Bingo ${game.bingo_grid_size || 5}x${game.bingo_grid_size || 5}`
        : `${game.questions?.length || 9} คำถาม (${game.bingo_grid_size || 3}x${
            game.bingo_grid_size || 3
          })`
      : `${game.questions?.length || 0} คำถาม`;

    return (
      <div
        className="kahoot-card-cover"
        onClick={() => onLaunchSession(game)}
        title="คลิกเพื่อเปิดจอโปรเจกเตอร์ QR Code เริ่มเกม"
      >
        {game.cover_image ? (
          <img src={game.cover_image} alt={game.couple_names || game.title} />
        ) : (
          <div
            className="kahoot-generated-cover"
            style={{
              background: palette.bg
            }}
          >
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: palette.sub,
                background: 'rgba(255,255,255,0.75)',
                padding: '0.12rem 0.5rem',
                borderRadius: '999px',
                marginBottom: '0.35rem'
              }}
            >
              {game.event_type === 'seminar' ? '🎤 Seminar / Event' : palette.badge}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '1.05rem',
                color: palette.accent,
                lineHeight: 1.25,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {game.couple_names || game.title}
            </div>
            <div
              style={{
                fontSize: '0.72rem',
                color: palette.sub,
                opacity: 0.85,
                marginTop: '0.2rem',
                maxWidth: '92%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {game.title}
            </div>
          </div>
        )}

        {/* Top-left mode badge if bingo */}
        {isBingo && (
          <span className="kahoot-cover-mode-ribbon bingo">
            {game.bingo_submode === 'number_classic' ? 'BINGO ตัวเลข' : 'BINGO บ่าวสาว'}
          </span>
        )}

        {/* Bottom-right dark question count pill just like create.kahoot.it */}
        <span className="kahoot-cover-pill-count">{itemCountText}</span>

        {/* Hover quick play overlay */}
        <div className="kahoot-cover-hover-play">
          <span
            style={{
              background: '#ffffff',
              color: 'var(--accent-navy)',
              fontWeight: 700,
              fontSize: '0.82rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
            }}
          >
            <Play size={14} fill="currentColor" />
            เปิดจอ QR เริ่มเกม
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flex: 1, minWidth: 0 }}>
      {/* Secondary Sub-Rail ONLY when inside Library view (just like Kahoot! One 'ไลบรารี' folder tree) */}
      {activeSection === 'library' && (
        <div className="kahoot-library-subrail">
          <div
            style={{
              fontSize: '0.76rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              padding: '0.35rem 0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            ไลบรารี
          </div>

          <button
            type="button"
            className={`subrail-item ${filterMode === 'all' ? 'active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
              <Folder size={15} />
              เกมทั้งหมด
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{stats.totalGames}</span>
          </button>

          <button
            type="button"
            className={`subrail-item ${filterMode === 'quiz' ? 'active' : ''}`}
            onClick={() => setFilterMode('quiz')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
              <HelpCircle size={15} />
              Kahoot Quiz
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{stats.quizCount}</span>
          </button>

          <button
            type="button"
            className={`subrail-item ${filterMode === 'bingo' ? 'active' : ''}`}
            onClick={() => setFilterMode('bingo')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
              <Grid size={15} />
              Bingo งานแต่ง
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{stats.bingoCount}</span>
          </button>

          <div
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              padding: '0.9rem 0.75rem 0.3rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            โฟลเดอร์งาน
          </div>

          <button
            type="button"
            className={`subrail-item ${filterMode === 'wedding' ? 'active' : ''}`}
            onClick={() => setFilterMode('wedding')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
              <Heart size={15} />
              งานแต่งงาน
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{stats.weddingCount}</span>
          </button>

          <button
            type="button"
            className={`subrail-item ${filterMode === 'seminar' ? 'active' : ''}`}
            onClick={() => setFilterMode('seminar')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
              <Users size={15} />
              งานสัมมนา
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{stats.seminarCount}</span>
          </button>

          <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
              onClick={() => startCreateNewGame('bingo', 'quiz_grid')}
            >
              <Plus size={14} />
              สร้าง Bingo บ่าวสาว
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Canvas (#f2f2f2 airy light gray) */}
      <div className="kahoot-main-canvas">
        {/* ====================================================================
            VIEW 1: LIBRARY (DEFAULT — KAHOOT! ONE COMPACT CARD GRID)
           ==================================================================== */}
        {activeSection === 'library' && (
          <div>
            {/* Top Filter Tabs + Quick Create Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '0.85rem'
              }}
            >
              <div className="kahoot-canvas-tabs" style={{ marginBottom: 0 }}>
                <button
                  type="button"
                  className={`kahoot-canvas-tab ${filterMode === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterMode('all')}
                >
                  ล่าสุด ({stats.totalGames})
                </button>
                <button
                  type="button"
                  className={`kahoot-canvas-tab ${filterMode === 'quiz' ? 'active' : ''}`}
                  onClick={() => setFilterMode('quiz')}
                >
                  Kahoot ตอบคำถาม ({stats.quizCount})
                </button>
                <button
                  type="button"
                  className={`kahoot-canvas-tab ${filterMode === 'bingo' ? 'active' : ''}`}
                  onClick={() => setFilterMode('bingo')}
                >
                  Bingo บ่าวสาว & ตัวเลข ({stats.bingoCount})
                </button>
                <button
                  type="button"
                  className={`kahoot-canvas-tab ${filterMode === 'wedding' ? 'active' : ''}`}
                  onClick={() => setFilterMode('wedding')}
                >
                  งานแต่งงาน ({stats.weddingCount})
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
                  onClick={() => startCreateNewGame('quiz', 'quiz_grid')}
                >
                  <Plus size={15} />
                  สร้าง Kahoot ใหม่
                </button>
                <button
                  type="button"
                  className="btn btn-gold"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
                  onClick={() => startCreateNewGame('bingo', 'quiz_grid')}
                >
                  <Grid size={15} />
                  สร้าง Bingo คำถามบ่าวสาว
                </button>
              </div>
            </div>

            {/* Second Row: Local Search + Grid/List View Toggle (just like create.kahoot.it) */}
            <div className="kahoot-toolbar-row">
              <div className="kahoot-local-search">
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '0.7rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
                <input
                  type="text"
                  placeholder="ค้นหาในไลบรารี..."
                  value={globalSearch || localSearch}
                  onChange={(e) => {
                    setLocalSearch(e.target.value);
                    if (onChangeGlobalSearch) onChangeGlobalSearch(e.target.value);
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  แสดง {filteredGames.length} เกม
                </span>
                <div className="view-toggle-group" role="group" aria-label="สลับมุมมองการ์ด">
                  <button
                    type="button"
                    className={`view-toggle-btn ${viewLayout === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewLayout('grid')}
                    title="มุมมองตารางการ์ด (Grid)"
                  >
                    <Grid size={16} />
                  </button>
                  <button
                    type="button"
                    className={`view-toggle-btn ${viewLayout === 'list' ? 'active' : ''}`}
                    onClick={() => setViewLayout('list')}
                    title="มุมมองรายการแถว (List)"
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Empty State if no games match search */}
            {filteredGames.length === 0 ? (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '3rem 1.5rem',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>🎴</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
                  ไม่พบเกมในหมวดหมู่นี้
                </h3>
                <p
                  style={{
                    fontSize: '0.86rem',
                    color: 'var(--text-secondary)',
                    marginTop: '0.25rem',
                    marginBottom: '1rem'
                  }}
                >
                  กดปุ่มด้านล่างเพื่อสร้างเกม Kahoot หรือ Bingo คำถามบ่าวสาวชุดใหม่ได้ทันที
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => startCreateNewGame('quiz', 'quiz_grid')}
                >
                  <Plus size={16} />
                  สร้างเกมใหม่
                </button>
              </div>
            ) : viewLayout === 'grid' ? (
              /* KAHOOT COMPACT THUMBNAIL GRID (5-6 cards per row) */
              <div className="kahoot-cards-grid">
                {filteredGames.map((game, idx) => {
                  const isBingo = game.game_mode === 'bingo';
                  const hasCustomYt =
                    game.music_mode === 'youtube' &&
                    (game.music_lobby_yt || game.music_play_yt || game.music_winner_yt);

                  return (
                    <article key={game.id} className="kahoot-thumb-card">
                      <div>
                        {/* Top white mini header: 4-color Kahoot icon + Kahoot / Bingo label */}
                        <div className="kahoot-card-topstrip">
                          <span className="kahoot-mini-type-tag">
                            <span className="kahoot-color-square">
                              <span />
                              <span />
                              <span />
                              <span />
                            </span>
                            <span>{isBingo ? 'Bingo' : 'Kahoot'}</span>
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              color: hasCustomYt ? '#cf222e' : 'var(--text-muted)'
                            }}
                            title={
                              hasCustomYt ? 'ตั้งค่าเพลง YouTube แล้ว' : 'เพลงระบบ Wedding Synth'
                            }
                          >
                            {hasCustomYt ? '🎵 YT' : '🎵 เพลงแต่ง'}
                          </span>
                        </div>

                        {/* 16:10 Couple Photo / Generated Romantic Thumbnail */}
                        {renderCardThumbnail(game, idx)}

                        {/* Card Title & Couple Names */}
                        <div className="kahoot-card-body">
                          <div>
                            <div className="kahoot-card-title-row">
                              <h3
                                className="kahoot-card-couple-title"
                                onClick={() => handleEditExisting(game)}
                                title={game.title}
                              >
                                {game.couple_names || game.title}
                              </h3>
                            </div>
                            <div
                              style={{
                                fontSize: '0.78rem',
                                color: 'var(--text-secondary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                marginTop: '0.15rem'
                              }}
                              title={game.title}
                            >
                              {game.title}
                            </div>
                          </div>

                          <div>
                            <div className="kahoot-card-footer">
                              <span>bluessocietys</span>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: 600,
                                  color: 'var(--accent-primary)'
                                }}
                                title="รหัสแพ็กเกจสำหรับส่งให้ลูกค้า"
                              >
                                {game.client_code}
                              </span>
                            </div>

                            {/* Compact Quick Actions Bar */}
                            <div className="kahoot-card-quick-actions">
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{
                                  flex: 1,
                                  padding: '0.34rem 0.5rem',
                                  fontSize: '0.76rem',
                                  borderRadius: '6px'
                                }}
                                onClick={() => onLaunchSession(game)}
                              >
                                <Play size={13} />
                                เริ่มเกม QR
                              </button>

                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '0.32rem 0.45rem' }}
                                onClick={() => handleEditExisting(game)}
                                title="แก้ไขคำถาม / รูปหน้าปก / เพลง"
                              >
                                <Edit3 size={14} />
                              </button>

                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '0.32rem 0.45rem' }}
                                onClick={() => handleCopyClientLink(game)}
                                title="คัดลอกลิงก์แพ็กเกจขายลูกค้า"
                              >
                                {copiedCodeId === game.id ? (
                                  <CheckCircle2 size={14} color="var(--status-success)" />
                                ) : (
                                  <Share2 size={14} />
                                )}
                              </button>

                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '0.32rem 0.45rem' }}
                                onClick={() => handleDuplicateForClient(game)}
                                title="ทำซ้ำเกมนี้สำหรับลูกค้าคู่ถัดไป"
                              >
                                <Copy size={14} />
                              </button>

                              {games.length > 1 && (
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  style={{
                                    padding: '0.32rem 0.45rem',
                                    color: 'var(--status-danger)'
                                  }}
                                  onClick={() => handleDeleteGame(game.id)}
                                  title="ลบเกมนี้"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* COMPACT LIST VIEW */
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>รูปแบบ</th>
                      <th>บ่าวสาว / งาน</th>
                      <th>ชื่อเกม</th>
                      <th>จำนวนข้อ</th>
                      <th>รหัสลูกค้า</th>
                      <th>เล่นแล้ว</th>
                      <th>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGames.map((game) => (
                      <tr key={game.id}>
                        <td>
                          <span
                            className={`badge ${
                              game.game_mode === 'bingo' ? 'badge-bingo' : 'badge-quiz'
                            }`}
                          >
                            {game.game_mode === 'bingo' ? 'Bingo' : 'Kahoot'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{game.couple_names}</td>
                        <td>{game.title}</td>
                        <td>
                          {game.game_mode === 'bingo' &&
                          game.bingo_submode === 'number_classic'
                            ? `${game.bingo_items?.length || 25} ตัวเลข`
                            : `${game.questions?.length || 0} คำถาม`}
                        </td>
                        <td>
                          <span className="license-code-tag">{game.client_code}</span>
                        </td>
                        <td>{game.play_count || 0} ครั้ง</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                              onClick={() => onLaunchSession(game)}
                            >
                              <Play size={13} /> เริ่มเกม
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                              onClick={() => handleEditExisting(game)}
                            >
                              <Edit3 size={13} /> แก้ไข
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                              onClick={() => handleCopyClientLink(game)}
                            >
                              <Share2 size={13} /> ลิงก์ลูกค้า
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            VIEW 2: HOME OVERVIEW (ภาพรวมสถิตินายพิธี & ห้องล่าสุด)
           ==================================================================== */}
        {activeSection === 'home' && (
          <div className="page-container">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.25rem'
              }}
            >
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem' }}>
                  สวัสดี bluessocietys 👋
                </h1>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  แดชบอร์ดภาพรวมระบบเกมงานแต่ง & งานสัมมนา (Kahoot Speed Quiz + Couple Bingo 200 คน)
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.55rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => startCreateNewGame('quiz', 'quiz_grid')}
                >
                  <Plus size={16} />
                  สร้าง Kahoot ใหม่
                </button>
                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={() => startCreateNewGame('bingo', 'quiz_grid')}
                >
                  <Grid size={16} />
                  สร้าง Bingo บ่าวสาว
                </button>
              </div>
            </div>

            {/* Clean Airy Metrics Row */}
            <section className="metrics-row">
              <div className="metric-card">
                <div className="metric-header">
                  <span>เกมทั้งหมดในไลบรารี</span>
                  <div className="metric-icon-box">
                    <FileText size={18} />
                  </div>
                </div>
                <div className="metric-value">{stats.totalGames} เกม</div>
                <div className="metric-caption">
                  Kahoot {stats.quizCount} • Bingo {stats.bingoCount}
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span>งานที่จัดเล่นไปแล้ว</span>
                  <div className="metric-icon-box">
                    <Award size={18} />
                  </div>
                </div>
                <div className="metric-value">{stats.totalSessions} รอบงาน</div>
                <div className="metric-caption">พร้อมรายงาน CSV ดาวน์โหลดส่งบ่าวสาว</div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span>แขกร่วมสนุกสะสม</span>
                  <div className="metric-icon-box">
                    <Users size={18} />
                  </div>
                </div>
                <div className="metric-value">{stats.totalGuests.toLocaleString()} คน</div>
                <div className="metric-caption">รองรับสูงสุด 200 คน/ห้อง</div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span>พอร์ทัลแพ็กเกจขายลูกค้า</span>
                  <div className="metric-icon-box">
                    <KeyRound size={18} />
                  </div>
                </div>
                <div className="metric-value">AccessPass</div>
                <div className="metric-caption">
                  <button
                    type="button"
                    style={{
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
                      textDecoration: 'underline'
                    }}
                    onClick={onOpenClientPortal}
                  >
                    เปิดหน้าพอร์ทัลลูกค้า →
                  </button>
                </div>
              </div>
            </section>

            {/* Quick Recent Games Preview */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem'
              }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
                เกมล่าสุดในไลบรารี
              </h2>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '0.84rem', color: 'var(--accent-primary)' }}
                onClick={() => setSection('library')}
              >
                ดูทั้งหมดในไลบรารี ({games.length}) →
              </button>
            </div>

            <div className="kahoot-cards-grid">
              {games.slice(0, 5).map((game, idx) => (
                <article key={game.id} className="kahoot-thumb-card">
                  <div>
                    <div className="kahoot-card-topstrip">
                      <span className="kahoot-mini-type-tag">
                        <span className="kahoot-color-square">
                          <span />
                          <span />
                          <span />
                          <span />
                        </span>
                        <span>{game.game_mode === 'bingo' ? 'Bingo' : 'Kahoot'}</span>
                      </span>
                      <span>{game.client_code}</span>
                    </div>
                    {renderCardThumbnail(game, idx)}
                    <div className="kahoot-card-body">
                      <h3
                        className="kahoot-card-couple-title"
                        onClick={() => handleEditExisting(game)}
                      >
                        {game.couple_names || game.title}
                      </h3>
                      <div className="kahoot-card-quick-actions">
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{
                            flex: 1,
                            padding: '0.34rem 0.5rem',
                            fontSize: '0.76rem'
                          }}
                          onClick={() => onLaunchSession(game)}
                        >
                          <Play size={13} /> เริ่มเกม QR
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '0.32rem 0.45rem' }}
                          onClick={() => handleEditExisting(game)}
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* ====================================================================
            VIEW 3: STANDALONE MUSIC PRESET STUDIO (คลังเพลง Preset 3 ช่วง)
           ==================================================================== */}
        {activeSection === 'presets' && (
          <div className="page-container">
            <div style={{ marginBottom: '1rem' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>
                🎵 คลังเพลงงานแต่ง & จัดการ Preset เพลง 3 ช่วง
              </h1>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                ทดลองฟังพรีวิวเพลงทั้ง 3 ช่วง (ช่วงรอแขกเข้าห้อง • ช่วงเล่นเกม • ช่วงประกาศผู้ชนะ)
                และบันทึกเป็น Preset ไว้เลือกใช้กับเกมงานแต่งคู่อื่นๆ ได้ทันที
              </p>
            </div>

            <MusicPresetManager
              musicMode={standaloneMusic.music_mode || 'builtin'}
              lobbyYt={standaloneMusic.music_lobby_yt || ''}
              playYt={standaloneMusic.music_play_yt || ''}
              winnerYt={standaloneMusic.music_winner_yt || ''}
              onChangeMusic={(patch) =>
                setStandaloneMusic((prev) => ({
                  ...prev,
                  ...patch
                }))
              }
            />
          </div>
        )}

        {/* ====================================================================
            VIEW 4: GAME BUILDER / EDITOR (สร้าง & แก้ไขเกม + อัปโหลดรูปปกบ่าวสาว)
           ==================================================================== */}
        {activeSection === 'builder' && editingGame && (
          <form className="builder-panel page-container" onSubmit={handleSaveBuilder}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.25rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--border-subtle)'
              }}
            >
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem' }}>
                  {editingGame.id ? 'แก้ไขชุดเกมและแพ็กเกจ' : 'สร้างชุดเกมใหม่ (Kahoot / Bingo)'}
                </h2>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  ปรับแต่งรูปหน้าปกบ่าวสาว เพลงประกอบ 3 ช่วง และชุดคำถามได้ตามต้องการ
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSection('library');
                    setEditingGame(null);
                  }}
                >
                  กลับไปไลบรารี
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={16} />
                  บันทึกเกมเข้าไลบรารี
                </button>
              </div>
            </div>

            {/* Step 1: Select Game Format */}
            <h3 style={{ fontSize: '0.96rem', marginBottom: '0.65rem' }}>
              1. เลือกรูปแบบเกม (Kahoot Quiz หรือ Wedding Bingo)
            </h3>
            <div className="mode-selector-cards">
              <button
                type="button"
                className={`mode-option-card ${
                  editingGame.game_mode === 'quiz' ? 'selected' : ''
                }`}
                onClick={() =>
                  setEditingGame({
                    ...editingGame,
                    game_mode: 'quiz'
                  })
                }
              >
                <div className="mode-option-title">
                  <HelpCircle size={19} color="var(--accent-primary)" />
                  Kahoot Speed Quiz (ตอบคำถามชิงความไว)
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  แขกเลือกตอบ 4 ตัวเลือกบนมือถือ ยิ่งตอบถูกและไว ยิ่งได้คะแนนสูง
                </p>
              </button>

              <button
                type="button"
                className={`mode-option-card ${
                  editingGame.game_mode === 'bingo' &&
                  editingGame.bingo_submode === 'quiz_grid'
                    ? 'selected'
                    : ''
                }`}
                onClick={() =>
                  setEditingGame({
                    ...editingGame,
                    game_mode: 'bingo',
                    bingo_submode: 'quiz_grid',
                    bingo_grid_size: editingGame.bingo_grid_size || 3
                  })
                }
              >
                <div className="mode-option-title">
                  <Grid size={19} color="#d89e00" />
                  Bingo คำถามบ่าวสาว (Couple Quiz Bingo)
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  ใช้คำถามจากเรื่องราวบ่าวสาว เมื่อแขกตอบถูกจะได้รับตราประทับเรียงช่องจนครบแถว BINGO!
                </p>
              </button>

              <button
                type="button"
                className={`mode-option-card ${
                  editingGame.game_mode === 'bingo' &&
                  editingGame.bingo_submode === 'number_classic'
                    ? 'selected'
                    : ''
                }`}
                onClick={() =>
                  setEditingGame({
                    ...editingGame,
                    game_mode: 'bingo',
                    bingo_submode: 'number_classic',
                    bingo_grid_size: 5,
                    bingo_items:
                      editingGame.bingo_items?.length >= 16
                        ? editingGame.bingo_items
                        : Array.from({ length: 25 }, (_, i) => String(i + 1))
                  })
                }
              >
                <div className="mode-option-title">
                  <Sparkles size={19} color="var(--accent-secondary)" />
                  Bingo ตัวเลขมงคล (Classic Number Bingo)
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  หน้าจอโปรเจกเตอร์หมุนสุ่มตัวเลข (1-25 หรือ 1-75) แขกกดแตะเลขบนการ์ดมือถือ
                </p>
              </button>
            </div>

            {/* Step 2: General Details & Couple Cover Thumbnail */}
            <h3 style={{ fontSize: '0.96rem', marginBottom: '0.65rem' }}>
              2. ข้อมูลบ่าวสาว • รูปหน้าปกการ์ด (เหมือน Kahoot) • รหัสแพ็กเกจลูกค้า
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label>ชื่อบ่าวสาว หรือ ชื่องาน (แสดงเป็นหัวข้อหลักบนการ์ด) *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="เช่น คุณพลอย ❤️ คุณนนท์"
                  value={editingGame.couple_names}
                  onChange={(e) =>
                    setEditingGame({ ...editingGame, couple_names: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>ชื่อเกม / คำอธิบายชุดคำถาม *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={editingGame.title}
                  onChange={(e) => setEditingGame({ ...editingGame, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>รูปหน้าปกการ์ดบ่าวสาว (วางลิงก์รูปภาพ หรือ อัปโหลดจากเครื่อง)</label>
                <div style={{ display: 'flex', gap: '0.45rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: 1 }}
                    placeholder="วาง URL รูปบ่าวสาว หรือกดปุ่มอัปโหลดรูป..."
                    value={editingGame.cover_image || ''}
                    onChange={(e) =>
                      setEditingGame({ ...editingGame, cover_image: e.target.value })
                    }
                  />
                  <label
                    className="btn btn-secondary"
                    style={{ cursor: 'pointer', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                    title="เลือกรูปบ่าวสาวจากคอมพิวเตอร์/มือถือ"
                  >
                    <Upload size={14} />
                    อัปโหลดรูป
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const dataUrl = await compressCoverImageToDataUrl(file);
                          setEditingGame((prev) => ({ ...prev, cover_image: dataUrl }));
                        } catch (err) {
                          console.warn('Image compress failed:', err);
                        }
                      }}
                    />
                  </label>
                  {editingGame.cover_image && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setEditingGame({ ...editingGame, cover_image: '' })}
                      title="ลบรูปหน้าปก"
                    >
                      ล้าง
                    </button>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>ประเภทงาน</label>
                <select
                  className="form-select"
                  value={editingGame.event_type}
                  onChange={(e) =>
                    setEditingGame({ ...editingGame, event_type: e.target.value })
                  }
                >
                  <option value="wedding">งานแต่งงาน (Wedding Reception / After Party)</option>
                  <option value="seminar">งานสัมมนา / องค์กร (Seminar & Corporate)</option>
                </select>
              </div>

              <div className="form-group">
                <label>ธีมสีหน้าจอเวทีและมือถือแขก</label>
                <select
                  className="form-select"
                  value={editingGame.theme}
                  onChange={(e) => setEditingGame({ ...editingGame, theme: e.target.value })}
                >
                  {THEME_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>รหัสแพ็กเกจลูกค้า (Client Access Code สำหรับทำขาย)</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingGame.client_code}
                  onChange={(e) =>
                    setEditingGame({
                      ...editingGame,
                      client_code: e.target.value.toUpperCase()
                    })
                  }
                />
              </div>
            </div>

            {/* 3-Phase Wedding Theme Music & Preset Manager with Audio Preview */}
            <MusicPresetManager
              musicMode={editingGame.music_mode || 'builtin'}
              lobbyYt={editingGame.music_lobby_yt || ''}
              playYt={editingGame.music_play_yt || ''}
              winnerYt={editingGame.music_winner_yt || ''}
              onChangeMusic={(patch) =>
                setEditingGame({
                  ...editingGame,
                  ...patch
                })
              }
            />

            {/* Bingo Specific Options */}
            {editingGame.game_mode === 'bingo' && (
              <div
                style={{
                  background: '#f8fafc',
                  padding: '1.15rem',
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: '1.35rem',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                  ตั้งค่าตารางบิงโก (Bingo Configuration)
                </h3>
                <div className="form-grid" style={{ marginBottom: 0 }}>
                  <div className="form-group">
                    <label>ขนาดตารางบิงโกบนมือถือแขก</label>
                    <select
                      className="form-select"
                      value={editingGame.bingo_grid_size || 3}
                      onChange={(e) =>
                        setEditingGame({
                          ...editingGame,
                          bingo_grid_size: Number(e.target.value)
                        })
                      }
                    >
                      <option value={3}>3 x 3 (9 ช่อง — เหมาะกับคำถามบ่าวสาว 9 ข้อ กระชับสนุก)</option>
                      <option value={4}>4 x 4 (16 ช่อง — เหมาะกับคำถาม 12-16 ข้อ)</option>
                      <option value={5}>5 x 5 (25 ช่อง — มีช่อง FREE ตรงกลาง เหมาะกับบิงโกตัวเลข)</option>
                    </select>
                  </div>

                  {editingGame.bingo_submode === 'quiz_grid' && (
                    <div className="form-group">
                      <label>รูปแบบการเรียงช่องเมื่อแขกตอบคำถามบ่าวสาวถูก</label>
                      <select
                        className="form-select"
                        value={editingGame.bingo_fill_mode || 'sequential'}
                        onChange={(e) =>
                          setEditingGame({
                            ...editingGame,
                            bingo_fill_mode: e.target.value
                          })
                        }
                      >
                        <option value="sequential">
                          ตอบถูกแล้วเรียงช่องไปเรื่อยๆ ตามลำดับ (Sequential Fill)
                        </option>
                        <option value="random_card">
                          สุ่มตำแหน่งคำตอบบนการ์ดแขกแต่ละคน (Randomized Bingo Card)
                        </option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Questions or Bingo Numbers Editor */}
            {editingGame.game_mode === 'bingo' &&
            editingGame.bingo_submode === 'number_classic' ? (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    marginBottom: '0.75rem'
                  }}
                >
                  <h3 style={{ fontSize: '0.96rem' }}>
                    3. รายการตัวเลข หรือ คำมงคลที่จะใช้หมุนสุ่มบิงโก (คั่นด้วยเครื่องหมายจุลภาค ,)
                  </h3>
                  <div style={{ display: 'flex', gap: '0.45rem' }}>
                    {[25, 50, 75].map((num) => (
                      <button
                        key={num}
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                        onClick={() =>
                          setEditingGame({
                            ...editingGame,
                            bingo_items: Array.from({ length: num }, (_, i) => String(i + 1))
                          })
                        }
                      >
                        ใช้ตัวเลข 1 - {num}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={(editingGame.bingo_items || []).join(', ')}
                  onChange={(e) => {
                    const arr = e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean);
                    setEditingGame({ ...editingGame, bingo_items: arr });
                  }}
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  จำนวนรายการปัจจุบัน: {(editingGame.bingo_items || []).length} รายการ
                </p>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}
                >
                  <h3 style={{ fontSize: '0.96rem' }}>
                    3. รายการคำถาม ({editingGame.questions?.length || 0} ข้อ)
                  </h3>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      setEditingGame({
                        ...editingGame,
                        questions: [...(editingGame.questions || []), EMPTY_QUESTION()]
                      })
                    }
                  >
                    <Plus size={16} />
                    เพิ่มข้อคำถาม
                  </button>
                </div>

                <div className="question-editor-list">
                  {(editingGame.questions || []).map((q, qIdx) => (
                    <div key={q.id || qIdx} className="question-editor-item">
                      <div className="question-editor-header">
                        <strong style={{ color: 'var(--accent-primary)' }}>
                          ข้อที่ {qIdx + 1}
                        </strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <label style={{ fontSize: '0.82rem' }}>
                            เวลา (วินาที):{' '}
                            <input
                              type="number"
                              min={5}
                              max={90}
                              className="form-input"
                              style={{ width: '70px', padding: '0.28rem 0.5rem' }}
                              value={q.timeLimit || 20}
                              onChange={(e) => {
                                const next = [...editingGame.questions];
                                next[qIdx] = { ...q, timeLimit: Number(e.target.value) };
                                setEditingGame({ ...editingGame, questions: next });
                              }}
                            />
                          </label>
                          {editingGame.questions.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-danger"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.76rem' }}
                              onClick={() => {
                                const next = editingGame.questions.filter((_, i) => i !== qIdx);
                                setEditingGame({ ...editingGame, questions: next });
                              }}
                            >
                              ลบข้อนี้
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="form-grid" style={{ marginBottom: '0.7rem' }}>
                        <div className="form-group">
                          <label>โจทย์คำถาม *</label>
                          <input
                            type="text"
                            className="form-input"
                            required
                            placeholder="เช่น บ่าวสาวไปเดทแรกกันที่ไหน?"
                            value={q.text}
                            onChange={(e) => {
                              const next = [...editingGame.questions];
                              next[qIdx] = { ...q, text: e.target.value };
                              setEditingGame({ ...editingGame, questions: next });
                            }}
                          />
                        </div>

                        {editingGame.game_mode === 'bingo' && (
                          <div className="form-group">
                            <label>ข้อความบนช่องบิงโก (เว้นว่างเพื่อใช้คำตอบที่ถูกอัตโนมัติ)</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder={q.options?.[q.correctIndex] || 'ข้อความบนช่องบิงโก'}
                              value={q.bingoLabel || ''}
                              onChange={(e) => {
                                const next = [...editingGame.questions];
                                next[qIdx] = { ...q, bingoLabel: e.target.value };
                                setEditingGame({ ...editingGame, questions: next });
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="options-editor-grid">
                        {[0, 1, 2, 3].map((optIdx) => {
                          const isCorrect = Number(q.correctIndex) === optIdx;
                          const labels = ['A', 'B', 'C', 'D'];
                          return (
                            <div
                              key={optIdx}
                              className={`option-input-row ${isCorrect ? 'correct' : ''}`}
                            >
                              <input
                                type="radio"
                                name={`correct_${q.id || qIdx}`}
                                checked={isCorrect}
                                onChange={() => {
                                  const next = [...editingGame.questions];
                                  next[qIdx] = { ...q, correctIndex: optIdx };
                                  setEditingGame({ ...editingGame, questions: next });
                                }}
                                title="คลิกเพื่อตั้งเป็นคำตอบที่ถูกต้อง"
                              />
                              <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                                {labels[optIdx]}:
                              </span>
                              <input
                                type="text"
                                className="form-input"
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  width: '100%',
                                  padding: '0.28rem'
                                }}
                                required
                                placeholder={`ตัวเลือก ${labels[optIdx]}`}
                                value={q.options?.[optIdx] || ''}
                                onChange={(e) => {
                                  const next = [...editingGame.questions];
                                  const nextOpts = [...(q.options || ['', '', '', ''])];
                                  nextOpts[optIdx] = e.target.value;
                                  next[qIdx] = { ...q, options: nextOpts };
                                  setEditingGame({ ...editingGame, questions: next });
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}

        {/* ====================================================================
            VIEW 5: REPORTS & PLAY HISTORY (รายงาน & ประวัติการเล่น)
           ==================================================================== */}
        {activeSection === 'reports' && (
          <section className="page-container">
            <div style={{ marginBottom: '1rem' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem' }}>
                📊 รายงานผลการเล่น & ประวัติการจัดงาน ({sessions.length} รอบงาน)
              </h1>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                ดูอันดับผู้ชนะ คำอวยพรจากแขกในงาน และดาวน์โหลดไฟล์ CSV ส่งมอบให้บ่าวสาว
              </p>
            </div>

            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>รหัสห้อง (PIN)</th>
                    <th>ชื่อเกม / กิจกรรม</th>
                    <th>บ่าวสาว / งาน</th>
                    <th>รูปแบบเกม</th>
                    <th>จำนวนแขกเข้าร่วม</th>
                    <th>ผู้ชนะอันดับ 1</th>
                    <th>วันที่เล่น</th>
                    <th>จัดการรายงาน</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => {
                    const topWinner = s.winner_summary?.[0];
                    return (
                      <tr key={s.id}>
                        <td>
                          <span className="license-code-tag">{s.pin}</span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{s.game_title}</td>
                        <td>{s.couple_names || '-'}</td>
                        <td>
                          <span
                            className={`badge ${
                              s.game_mode === 'bingo' ? 'badge-bingo' : 'badge-quiz'
                            }`}
                          >
                            {s.game_mode === 'bingo'
                              ? s.bingo_submode === 'number_classic'
                                ? 'Bingo ตัวเลข'
                                : 'Bingo คำถามบ่าวสาว'
                              : 'Kahoot Quiz'}
                          </span>
                        </td>
                        <td>
                          <strong>{s.player_count || 0}</strong> / 200 คน
                        </td>
                        <td>
                          {topWinner ? (
                            <span>
                              {topWinner.avatar || '🏆'} <strong>{topWinner.nickname}</strong> (
                              {topWinner.score} คะแนน)
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>กำลังดำเนินการ</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                          {s.started_at ? new Date(s.started_at).toLocaleDateString('th-TH') : '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.45rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '0.32rem 0.65rem', fontSize: '0.78rem' }}
                              onClick={() => handleOpenSessionReport(s)}
                            >
                              ดูรายละเอียด
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '0.32rem 0.65rem', fontSize: '0.78rem' }}
                              onClick={() => handleExportSessionCSV(s)}
                              title="ดาวน์โหลดไฟล์ CSV ส่งให้บ่าวสาว"
                            >
                              <Download size={14} />
                              CSV
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Modal: Session Detailed Report */}
        {selectedReportSession && (
          <div className="modal-backdrop" onClick={() => setSelectedReportSession(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
                    รายงานผลการเล่น: {selectedReportSession.game_title}
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    งานของ {selectedReportSession.couple_names} • รหัสห้อง PIN:{' '}
                    <strong>{selectedReportSession.pin}</strong> • ผู้เข้าร่วม{' '}
                    <strong>{selectedReportSession.player_count} คน</strong>
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleExportSessionCSV(selectedReportSession)}
                >
                  <Download size={16} />
                  ดาวน์โหลด CSV
                </button>
              </div>

              <h4 style={{ marginBottom: '0.75rem' }}>อันดับผู้ชนะและคะแนนสูงสุด</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(reportPlayers.length > 0
                  ? [...reportPlayers].sort((a, b) => (b.score || 0) - (a.score || 0))
                  : selectedReportSession.winner_summary || []
                )
                  .slice(0, 15)
                  .map((p, idx) => (
                    <div
                      key={p.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.95rem',
                        background: idx < 3 ? 'var(--accent-gold-soft)' : 'var(--bg-primary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <strong style={{ width: '28px' }}>#{idx + 1}</strong>
                        <span style={{ fontSize: '1.2rem' }}>{p.avatar || '🥂'}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.nickname}</div>
                          {p.wish_message && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              💌 "{p.wish_message}"
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {(p.score || 0).toLocaleString()} คะแนน
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ตอบถูก {p.correct_count || 0} ข้อ{' '}
                          {p.is_bingo_winner ? '• 🏆 BINGO!' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
