import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Home,
  FolderHeart,
  BarChart3,
  Music,
  Tv,
  Smartphone,
  KeyRound,
  Database,
  Search,
  Plus
} from 'lucide-react';
import AdminDashboard from './components/AdminDashboard';
import HostStageView from './components/HostStageView';
import GuestMobileView from './components/GuestMobileView';
import ClientPackagePortal from './components/ClientPackagePortal';
import SupabaseModal from './components/SupabaseModal';
import {
  fetchGames,
  fetchSessionsHistory,
  createLiveSession,
  fetchSessionPlayers,
  getSessionByPin,
  isSupabaseConnected
} from './services/db';

const ACTIVE_PIN_STORAGE_KEY = 'bluw_active_host_pin_v2';

export default function App() {
  const [viewMode, setViewMode] = useState('admin'); // 'admin' | 'stage' | 'guest' | 'client'
  const [adminSection, setAdminSection] = useState('library'); // 'library' | 'home' | 'reports' | 'presets' | 'builder'
  const [globalSearch, setGlobalSearch] = useState('');
  const [createTriggerCount, setCreateTriggerCount] = useState(0);

  const [games, setGames] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [activePlayers, setActivePlayers] = useState([]);
  const [guestInitialPin, setGuestInitialPin] = useState('');
  const [clientInitialCode, setClientInitialCode] = useState('');
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [dbOnline, setDbOnline] = useState(isSupabaseConnected());

  const activePinRef = useRef('');
  const isFetchingAdminRef = useRef(false);
  const isFetchingStageRef = useRef(false);

  // 1. Load Admin Catalog (Games & Session History) — ONLY called on initial mount or explicit admin actions
  const loadAdminCatalog = useCallback(async () => {
    if (isFetchingAdminRef.current) return;
    isFetchingAdminRef.current = true;
    try {
      const [gList, sList] = await Promise.all([
        fetchGames(),
        fetchSessionsHistory()
      ]);
      setGames(gList);
      setSessions(sList);
      setDbOnline(isSupabaseConnected());

      if (!activePinRef.current && sList.length > 0) {
        const openSession = sList.find((s) => s.status !== 'finished');
        if (openSession) {
          activePinRef.current = openSession.pin;
          setActiveSession(openSession);
        }
      }
    } finally {
      isFetchingAdminRef.current = false;
    }
  }, []);

  // 2. Refresh ONLY the Active Live Room (Session + Players) when on Stage view
  const refreshActiveStageRoom = useCallback(async () => {
    const targetPin = activePinRef.current;
    if (!targetPin || isFetchingStageRef.current) return;
    isFetchingStageRef.current = true;
    try {
      const updatedSession = await getSessionByPin(targetPin);
      if (updatedSession) {
        setActiveSession(updatedSession);
        const pList = await fetchSessionPlayers(updatedSession.id);
        setActivePlayers(pList);
      }
    } finally {
      isFetchingStageRef.current = false;
    }
  }, []);

  // Initial mount: check URL params and load catalog once
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    const clientParam = params.get('client');
    const savedPin = localStorage.getItem(ACTIVE_PIN_STORAGE_KEY) || '';

    if (pinParam) {
      setGuestInitialPin(pinParam);
      activePinRef.current = pinParam;
      setViewMode('guest');
    } else if (clientParam) {
      setClientInitialCode(clientParam);
      setViewMode('client');
    } else if (savedPin) {
      activePinRef.current = savedPin;
    }

    loadAdminCatalog();
  }, [loadAdminCatalog]);

  // Poll ONLY when actively viewing the Stage Projector screen (every 2.5 seconds, guarded against overlap)
  useEffect(() => {
    if (viewMode !== 'stage') return;
    refreshActiveStageRoom();
    const timer = setInterval(() => {
      refreshActiveStageRoom();
    }, 2500);
    return () => clearInterval(timer);
  }, [viewMode, refreshActiveStageRoom]);

  // Apply dynamic wedding/seminar theme attribute
  useEffect(() => {
    const currentTheme = activeSession?.theme || 'rose_gold';
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [activeSession?.theme]);

  const handleLaunchLiveSession = async (game) => {
    const newSession = await createLiveSession(game);
    activePinRef.current = newSession.pin;
    localStorage.setItem(ACTIVE_PIN_STORAGE_KEY, newSession.pin);
    setActiveSession(newSession);
    setActivePlayers([]);
    setGuestInitialPin(newSession.pin);
    setViewMode('stage');
    await loadAdminCatalog();
  };

  const handleOpenStageView = async () => {
    if (activeSession) {
      activePinRef.current = activeSession.pin;
      setViewMode('stage');
      return;
    }
    const existingOpen = sessions.find((s) => s.status !== 'finished');
    if (existingOpen) {
      activePinRef.current = existingOpen.pin;
      localStorage.setItem(ACTIVE_PIN_STORAGE_KEY, existingOpen.pin);
      setActiveSession(existingOpen);
      setGuestInitialPin(existingOpen.pin);
      setViewMode('stage');
      return;
    }
    if (games.length > 0) {
      await handleLaunchLiveSession(games[0]);
    }
  };

  const handleTopCreateClick = () => {
    setViewMode('admin');
    setAdminSection('builder');
    setCreateTriggerCount((c) => c + 1);
  };

  return (
    <div>
      {/* Kahoot! One Style Clean White Top Header */}
      <header className="kahoot-top-header">
        <div
          className="kahoot-logo-group"
          onClick={() => {
            setViewMode('admin');
            setAdminSection('library');
            loadAdminCatalog();
          }}
        >
          <span className="kahoot-wordmark">BLUW!</span>
          <span className="kahoot-one-badge">One</span>
        </div>

        {/* Center Global Search Bar (like create.kahoot.it) */}
        <div className="kahoot-top-search">
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.8rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
          <input
            type="text"
            placeholder="ค้นหาชื่อบ่าวสาว, ชื่อเกม Kahoot / Bingo, หรือรหัสลูกค้า..."
            value={globalSearch}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              if (viewMode !== 'admin') {
                setViewMode('admin');
                setAdminSection('library');
              }
            }}
          />
        </div>

        {/* Right Actions: Blue Create Button + Quick Stage/Guest Toggle + Supabase Pill */}
        <div className="kahoot-top-actions">
          <button
            type="button"
            id="btn-top-create-game"
            className="btn-kahoot-create"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={handleTopCreateClick}
          >
            <Plus size={16} />
            สร้าง
          </button>

          <button
            type="button"
            id="btn-open-supabase-settings"
            className="btn btn-secondary"
            style={{
              padding: '0.38rem 0.75rem',
              fontSize: '0.78rem',
              borderRadius: '999px',
              gap: '0.35rem'
            }}
            onClick={() => setShowSupabaseModal(true)}
            title="ตั้งค่าฐานข้อมูล Supabase (รองรับ 200 คน)"
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: dbOnline ? '#1a7f37' : '#d89e00',
                display: 'inline-block'
              }}
            />
            <Database size={13} />
            <span>{dbOnline ? 'Supabase Online' : 'Local Mode'}</span>
          </button>
        </div>
      </header>

      {/* Main Layout: Left Sidebar + Workspace / Stage / Guest / Client */}
      {viewMode === 'admin' ? (
        <div className="kahoot-app-body">
          {/* Primary Left Sidebar Rail (like create.kahoot.it) */}
          <aside className="kahoot-left-sidebar" aria-label="เมนูหลัก">
            <div>
              <div className="workspace-profile-box">
                <div className="workspace-avatar">B</div>
                <div className="workspace-profile-info">
                  <div className="workspace-name">bluessocietys</div>
                  <div className="workspace-sub">พื้นที่ส่วนตัว • นายพิธี</div>
                </div>
              </div>

              <nav className="sidebar-nav-list">
                <button
                  type="button"
                  id="nav-side-home"
                  className={`sidebar-nav-item ${adminSection === 'home' ? 'active' : ''}`}
                  onClick={() => setAdminSection('home')}
                >
                  <Home size={18} />
                  <span className="sidebar-text">หน้าแรก</span>
                </button>

                <button
                  type="button"
                  id="nav-side-library"
                  className={`sidebar-nav-item ${
                    adminSection === 'library' || adminSection === 'builder' ? 'active' : ''
                  }`}
                  onClick={() => setAdminSection('library')}
                >
                  <FolderHeart size={18} />
                  <span className="sidebar-text">ไลบรารี ({games.length})</span>
                </button>

                <button
                  type="button"
                  id="nav-side-reports"
                  className={`sidebar-nav-item ${adminSection === 'reports' ? 'active' : ''}`}
                  onClick={() => setAdminSection('reports')}
                >
                  <BarChart3 size={18} />
                  <span className="sidebar-text">รายงาน ({sessions.length})</span>
                </button>

                <button
                  type="button"
                  id="nav-side-presets"
                  className={`sidebar-nav-item ${adminSection === 'presets' ? 'active' : ''}`}
                  onClick={() => setAdminSection('presets')}
                >
                  <Music size={18} />
                  <span className="sidebar-text">คลังเพลง Preset</span>
                </button>
              </nav>

              <div
                style={{
                  margin: '1rem 0.5rem 0.45rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
                className="sidebar-text"
              >
                หน้าจอแสดงผล & ลูกค้า
              </div>

              <nav className="sidebar-nav-list">
                <button
                  type="button"
                  id="nav-btn-stage"
                  className="sidebar-nav-item"
                  onClick={handleOpenStageView}
                >
                  <Tv size={18} />
                  <span className="sidebar-text">จอโปรเจกเตอร์ (QR)</span>
                </button>

                <button
                  type="button"
                  id="nav-btn-guest"
                  className="sidebar-nav-item"
                  onClick={() => setViewMode('guest')}
                >
                  <Smartphone size={18} />
                  <span className="sidebar-text">จอมือถือแขก</span>
                </button>

                <button
                  type="button"
                  id="nav-btn-client"
                  className="sidebar-nav-item"
                  onClick={() => setViewMode('client')}
                >
                  <KeyRound size={18} />
                  <span className="sidebar-text">พอร์ทัลลูกค้าซื้อเกม</span>
                </button>
              </nav>
            </div>

            <div
              className="sidebar-text"
              style={{
                padding: '0.7rem',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)'
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                รองรับแขกสูงสุด 200 คน
              </div>
              <div>Kahoot Quiz & Couple Bingo</div>
            </div>
          </aside>

          {/* Admin Workspace Content */}
          <AdminDashboard
            games={games}
            sessions={sessions}
            activeSection={adminSection}
            onChangeSection={setAdminSection}
            globalSearch={globalSearch}
            onChangeGlobalSearch={setGlobalSearch}
            createTriggerCount={createTriggerCount}
            onRefresh={loadAdminCatalog}
            onLaunchSession={handleLaunchLiveSession}
            onOpenClientPortal={() => setViewMode('client')}
          />
        </div>
      ) : (
        <main>
          {viewMode === 'stage' && activeSession && (
            <HostStageView
              session={activeSession}
              players={activePlayers}
              onRefreshSession={refreshActiveStageRoom}
              onOpenGuestPreview={(pin) => {
                setGuestInitialPin(pin);
                setViewMode('guest');
              }}
              onBackToAdmin={() => {
                setViewMode('admin');
                setAdminSection('library');
                loadAdminCatalog();
              }}
            />
          )}

          {viewMode === 'guest' && (
            <GuestMobileView
              initialPin={guestInitialPin || activeSession?.pin || ''}
              onBackToStage={() => {
                if (activeSession) {
                  setViewMode('stage');
                } else {
                  setViewMode('admin');
                }
              }}
            />
          )}

          {viewMode === 'client' && (
            <ClientPackagePortal
              initialCode={clientInitialCode}
              onLaunchSession={handleLaunchLiveSession}
            />
          )}
        </main>
      )}

      {/* Modal: Supabase Live 200-Guest Connection Config */}
      {showSupabaseModal && (
        <SupabaseModal
          onClose={() => setShowSupabaseModal(false)}
          onSaved={() => {
            setDbOnline(isSupabaseConnected());
            loadAdminCatalog();
          }}
        />
      )}
    </div>
  );
}
