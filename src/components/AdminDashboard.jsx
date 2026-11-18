import React, { useState, useMemo } from 'react';
import {
  Plus,
  Play,
  Edit3,
  Copy,
  Trash2,
  BarChart3,
  Grid,
  HelpCircle,
  Users,
  Award,
  Calendar,
  Share2,
  Download,
  CheckCircle2,
  Sparkles,
  FileText,
  KeyRound,
  Search,
  Music
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

export default function AdminDashboard({
  games,
  sessions,
  onRefresh,
  onLaunchSession,
  onOpenClientPortal
}) {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'builder' | 'reports'
  const [filterMode, setFilterMode] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [selectedReportSession, setSelectedReportSession] = useState(null);
  const [reportPlayers, setReportPlayers] = useState([]);

  // Builder State
  const [editingGame, setEditingGame] = useState(null);

  const stats = useMemo(() => {
    const totalGames = games.length;
    const quizCount = games.filter((g) => g.game_mode === 'quiz').length;
    const bingoCount = games.filter((g) => g.game_mode === 'bingo').length;
    const totalSessions = sessions.length;
    const totalGuests = sessions.reduce((acc, s) => acc + (Number(s.player_count) || 0), 0);
    return { totalGames, quizCount, bingoCount, totalSessions, totalGuests };
  }, [games, sessions]);

  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      if (filterMode === 'quiz' && g.game_mode !== 'quiz') return false;
      if (filterMode === 'bingo' && g.game_mode !== 'bingo') return false;
      if (filterMode === 'wedding' && g.event_type !== 'wedding') return false;
      if (filterMode === 'seminar' && g.event_type !== 'seminar') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (g.title || '').toLowerCase().includes(q);
        const matchCouple = (g.couple_names || '').toLowerCase().includes(q);
        const matchCode = (g.client_code || '').toLowerCase().includes(q);
        return matchTitle || matchCouple || matchCode;
      }
      return true;
    });
  }, [games, filterMode, searchQuery]);

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
      couple_names: 'คุณเจ้าสาว & คุณเจ้าบ่าว',
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
    setActiveTab('builder');
  };

  const handleEditExisting = (game) => {
    setEditingGame(JSON.parse(JSON.stringify(game)));
    setActiveTab('builder');
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
    setActiveTab('catalog');
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

  return (
    <div className="page-container">
      {/* Hero Banner */}
      <section className="admin-hero-banner">
        <div className="admin-hero-text">
          <h1>ระบบหลังบ้านนายพิธี & จัดการแพ็กเกจเกมงานแต่ง (Admin Console)</h1>
          <p>
            สร้างเกมตอบคำถามสไตล์ Kahoot และบิงโกคำถามบ่าวสาว ออก QR Code รองรับแขก 200 คน
            พร้อมระบบออกรหัสแพ็กเกจสำหรับทำขายให้ลูกค้า
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            id="btn-create-kahoot-game"
            onClick={() => startCreateNewGame('quiz', 'quiz_grid')}
          >
            <Plus size={18} />
            สร้างเกม Kahoot ตอบคำถาม
          </button>
          <button
            type="button"
            className="btn btn-gold"
            id="btn-create-bingo-game"
            onClick={() => startCreateNewGame('bingo', 'quiz_grid')}
          >
            <Grid size={18} />
            สร้างเกม Bingo บ่าวสาว / ตัวเลข
          </button>
        </div>
      </section>

      {/* Metrics Summary Row */}
      <section className="metrics-row" aria-label="สถิติภาพรวมระบบ">
        <div className="metric-card">
          <div className="metric-header">
            <span>จำนวนเกมทั้งหมดในระบบ</span>
            <div className="metric-icon-box">
              <Sparkles size={19} />
            </div>
          </div>
          <div className="metric-value">{stats.totalGames} เกม</div>
          <div className="metric-caption">
            Kahoot Quiz {stats.quizCount} เกม • Bingo {stats.bingoCount} เกม
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>ประวัติการเปิดเล่นทั้งหมด</span>
            <div className="metric-icon-box">
              <BarChart3 size={19} />
            </div>
          </div>
          <div className="metric-value">{stats.totalSessions} รอบงาน</div>
          <div className="metric-caption">บันทึกผลผู้ชนะและรายงานครบทุกงาน</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>จำนวนแขกที่ร่วมสนุกสะสม</span>
            <div className="metric-icon-box">
              <Users size={19} />
            </div>
          </div>
          <div className="metric-value">{stats.totalGuests.toLocaleString()} คน</div>
          <div className="metric-caption">รองรับสูงสุด 200 คน/รอบ พร้อมกันผ่าน QR Code</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>แพ็กเกจพร้อมขาย / ส่งลูกค้า</span>
            <div className="metric-icon-box">
              <KeyRound size={19} />
            </div>
          </div>
          <div className="metric-value">{stats.totalGames} รหัส</div>
          <div className="metric-caption">
            <button
              type="button"
              onClick={onOpenClientPortal}
              style={{
                color: 'var(--accent-primary)',
                fontWeight: 600,
                textDecoration: 'underline'
              }}
            >
              เปิดหน้า Portal สำหรับลูกค้าที่ซื้อเกม →
            </button>
          </div>
        </div>
      </section>

      {/* Sub-navigation Tabs */}
      <nav className="admin-subnav" aria-label="เมนูจัดการหลังบ้าน">
        <button
          type="button"
          className={`subnav-tab ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          <Sparkles size={18} />
          คลังเกม & รหัสแพ็กเกจลูกค้า ({games.length})
        </button>
        <button
          type="button"
          className={`subnav-tab ${activeTab === 'builder' ? 'active' : ''}`}
          onClick={() => {
            if (!editingGame) startCreateNewGame('quiz', 'quiz_grid');
            else setActiveTab('builder');
          }}
        >
          <Plus size={18} />
          {editingGame?.id ? 'แก้ไขเกม' : 'สร้างเกมใหม่ (Kahoot / Bingo)'}
        </button>
        <button
          type="button"
          className={`subnav-tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <FileText size={18} />
          รายงาน & ประวัติการเล่น ({sessions.length})
        </button>
      </nav>

      {/* TAB 1: GAME CATALOG & PACKAGE SALES */}
      {activeTab === 'catalog' && (
        <section>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'quiz', label: 'เกมตอบคำถาม Kahoot' },
                { id: 'bingo', label: 'เกมบิงโก (คำถามบ่าวสาว / ตัวเลข)' },
                { id: 'wedding', label: 'งานแต่งงาน' },
                { id: 'seminar', label: 'งานสัมมนา / องค์กร' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`btn ${filterMode === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.45rem 0.95rem', fontSize: '0.84rem' }}
                  onClick={() => setFilterMode(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', minWidth: '270px' }}>
              <Search
                size={17}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.2rem', paddingBlock: '0.5rem' }}
                placeholder="ค้นหาชื่อบ่าวสาว, ชื่อเกม, รหัสลูกค้า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="games-grid">
            {filteredGames.map((game) => {
              const isBingo = game.game_mode === 'bingo';
              const isNumberBingo = isBingo && game.bingo_submode === 'number_classic';

              return (
                <article key={game.id} className="game-card">
                  <div>
                    <div className="game-card-badges">
                      <span className={`badge ${isBingo ? 'badge-bingo' : 'badge-quiz'}`}>
                        {isBingo ? (
                          <>
                            <Grid size={13} />
                            {isNumberBingo
                              ? `Bingo ตัวเลข (${game.bingo_grid_size || 5}x${game.bingo_grid_size || 5})`
                              : `Bingo คำถามบ่าวสาว (${game.bingo_grid_size || 3}x${
                                  game.bingo_grid_size || 3
                                })`}
                          </>
                        ) : (
                          <>
                            <HelpCircle size={13} />
                            Kahoot Speed Quiz
                          </>
                        )}
                      </span>
                      <span className="badge badge-event">
                        {game.event_type === 'seminar' ? 'งานสัมมนา / องค์กร' : 'งานแต่งงาน'}
                      </span>
                    </div>

                    <h3 className="game-card-title">{game.title}</h3>
                    <div className="game-card-couple">
                      {game.couple_names || 'ไม่ระบุชื่อบ่าวสาว/หน่วยงาน'}
                    </div>
                    <p
                      style={{
                        fontSize: '0.84rem',
                        color: 'var(--text-secondary)',
                        marginTop: '0.45rem'
                      }}
                    >
                      {game.subtitle}
                    </p>
                  </div>

                  <div>
                    <div className="game-card-meta" style={{ marginBottom: '0.85rem' }}>
                      <span>
                        <HelpCircle size={14} />
                        {isNumberBingo
                          ? `${(game.bingo_items || []).length} ตัวเลข/คำมงคล`
                          : `${(game.questions || []).length} คำถาม`}
                      </span>
                      <span>
                        <Users size={14} />
                        รองรับ {game.max_players || 200} คน
                      </span>
                      <span>
                        <Award size={14} />
                        เล่นแล้ว {game.play_count || 0} รอบ
                      </span>
                    </div>

                    {/* Client Package Code Box for Selling Games */}
                    <div className="client-license-box" style={{ marginBottom: '0.95rem' }}>
                      <div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                          {game.package_name || 'รหัสสำหรับส่งให้ลูกค้าเปิดเกม'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                          <span className="license-code-tag">{game.client_code}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.38rem 0.7rem', fontSize: '0.78rem' }}
                        onClick={() => handleCopyClientLink(game)}
                        title="คัดลอกลิงก์สำหรับส่งให้ลูกค้าที่ซื้อเกมไปเปิดเล่นเอง"
                      >
                        <Share2 size={14} />
                        {copiedCodeId === game.id ? 'คัดลอกลิงก์แล้ว!' : 'ลิงก์ส่งลูกค้า'}
                      </button>
                    </div>

                    <div className="game-card-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        onClick={() => onLaunchSession(game)}
                      >
                        <Play size={17} />
                        ออก QR เปิดห้องเริ่มเกม
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleEditExisting(game)}
                        title="แก้ไขคำถามและการตั้งค่า"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleDuplicateForClient(game)}
                        title="คัดลอกเกมนี้เพื่อทำขายลูกค้าคู่ถัดไป"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleDeleteGame(game.id)}
                        title="ลบเกม"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 2: CREATE / EDIT GAME BUILDER */}
      {activeTab === 'builder' && editingGame && (
        <form className="builder-panel" onSubmit={handleSaveBuilder}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--border-subtle)'
            }}
          >
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem' }}>
                {editingGame.id ? 'แก้ไขชุดเกมและคำถาม' : 'สร้างเกมใหม่สำหรับงานแต่ง / งานสัมมนา'}
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                เลือกรูปแบบเกมแบบ Kahoot หรือ Bingo คำถามบ่าวสาว / Bingo ตัวเลข พร้อมตั้งค่ารหัสแพ็กเกจขายลูกค้า
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveTab('catalog')}
              >
                ยกเลิก
              </button>
              <button type="submit" className="btn btn-primary">
                <CheckCircle2 size={18} />
                บันทึกเกมเข้าคลัง
              </button>
            </div>
          </div>

          {/* Step 1: Choose Game Mode */}
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
            1. เลือกรูปแบบเกม (Game Mode)
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
                  game_mode: 'quiz',
                  questions:
                    editingGame.questions?.length > 0
                      ? editingGame.questions
                      : [EMPTY_QUESTION()]
                })
              }
            >
              <div className="mode-option-title">
                <HelpCircle size={20} color="var(--accent-primary)" />
                Kahoot Speed Quiz (ตอบคำถามชิงความไว)
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                คำถาม 4 ตัวเลือก แขกแข่งกันตอบถูกและไวที่สุด มีกราฟเฉลยและจัดอันดับ Leaderboard ทุกข้อ
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
                  bingo_grid_size: editingGame.bingo_grid_size || 3,
                  questions:
                    editingGame.questions?.length > 0
                      ? editingGame.questions
                      : Array.from({ length: 9 }, () => EMPTY_QUESTION())
                })
              }
            >
              <div className="mode-option-title">
                <Grid size={20} color="var(--accent-primary)" />
                Bingo คำถามบ่าวสาว (รูปแบบใหม่ยอดฮิต!)
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                นำคำถามจากบ่าวสาวมาใช้ แขกตอบถูกจะได้ประทับตราช่องบิงโก (เลือกแบบเรียงช่องไปเรื่อยๆ หรือสุ่มตำแหน่งบนการ์ดได้)
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
                <Sparkles size={20} color="var(--accent-secondary)" />
                Bingo ตัวเลข / คำมงคล (Classic Number Bingo)
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                หน้าจอโปรเจกเตอร์หมุนสุ่มตัวเลข (เช่น 1-25 หรือ 1-75) แขกกดแตะเลขบนการ์ดมือถือ ใครเรียงครบแถวก่อนชนะ!
              </p>
            </button>
          </div>

          {/* Step 2: General Details & Package Info */}
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
            2. ข้อมูลงานแต่ง / งานสัมมนา & รหัสแพ็กเกจขายลูกค้า
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label>ชื่อเกม / หัวข้อกิจกรรม *</label>
              <input
                type="text"
                className="form-input"
                required
                value={editingGame.title}
                onChange={(e) => setEditingGame({ ...editingGame, title: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>ชื่อบ่าวสาว หรือ ชื่อหน่วยงาน/บริษัท *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="เช่น คุณพลอย & คุณนนท์"
                value={editingGame.couple_names}
                onChange={(e) =>
                  setEditingGame({ ...editingGame, couple_names: e.target.value })
                }
              />
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
                <option value="seminar">งานสัมมนา / ทาวน์ฮอลล์องค์กร (Seminar & Corporate)</option>
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

            <div className="form-group">
              <label>ชื่อแพ็กเกจ / หมายเหตุการขาย</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น แพ็กเกจนายพิธีพ่วงเกม / ขายแยกเฉพาะเกม"
                value={editingGame.package_name || ''}
                onChange={(e) =>
                  setEditingGame({ ...editingGame, package_name: e.target.value })
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
                background: 'var(--bg-secondary)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '1.5rem',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <h3 style={{ fontSize: '1rem', marginBottom: '0.85rem' }}>
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
                <h3 style={{ fontSize: '1rem' }}>
                  3. รายการตัวเลข หรือ คำมงคลที่จะใช้หมุนสุ่มบิงโก (คั่นด้วยเครื่องหมายจุลภาค ,)
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                    onClick={() =>
                      setEditingGame({
                        ...editingGame,
                        bingo_items: Array.from({ length: 25 }, (_, i) => String(i + 1))
                      })
                    }
                  >
                    ใช้ตัวเลข 1 - 25
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                    onClick={() =>
                      setEditingGame({
                        ...editingGame,
                        bingo_items: Array.from({ length: 50 }, (_, i) => String(i + 1))
                      })
                    }
                  >
                    ใช้ตัวเลข 1 - 50
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                    onClick={() =>
                      setEditingGame({
                        ...editingGame,
                        bingo_items: Array.from({ length: 75 }, (_, i) => String(i + 1))
                      })
                    }
                  >
                    ใช้ตัวเลข 1 - 75
                  </button>
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
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                จำนวนรายการปัจจุบัน: {(editingGame.bingo_items || []).length} รายการ (ระบบจะสุ่มแจกใส่กระดานของแขกแต่ละคนอัตโนมัติ)
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
                <h3 style={{ fontSize: '1rem' }}>
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
                            style={{ width: '72px', padding: '0.3rem 0.5rem' }}
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
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
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

                    <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
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
                          <label>ข้อความที่แสดงในช่องบิงโก (เว้นว่างเพื่อใช้คำตอบที่ถูกอัตโนมัติ)</label>
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
                            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                              {labels[optIdx]}:
                            </span>
                            <input
                              type="text"
                              className="form-input"
                              style={{
                                border: 'none',
                                background: 'transparent',
                                width: '100%',
                                padding: '0.3rem'
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

      {/* TAB 3: REPORTS & PLAY HISTORY */}
      {activeTab === 'reports' && (
        <section>
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
                            style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                            onClick={() => handleOpenSessionReport(s)}
                          >
                            ดูรายละเอียด
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
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
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>
                  รายงานผลการเล่น: {selectedReportSession.game_title}
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
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
                      padding: '0.7rem 1rem',
                      background: idx < 3 ? 'var(--accent-gold-soft)' : 'var(--bg-primary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <strong style={{ width: '28px' }}>#{idx + 1}</strong>
                      <span style={{ fontSize: '1.25rem' }}>{p.avatar || '🥂'}</span>
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
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
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
  );
}
