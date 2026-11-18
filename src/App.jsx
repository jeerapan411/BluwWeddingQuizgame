import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard,
  Tv,
  Smartphone,
  KeyRound,
  Database
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
  subscribeToRealtime,
  isSupabaseConnected
} from './services/db';

const ACTIVE_PIN_STORAGE_KEY = 'bluw_active_host_pin_v1';

export default function App() {
  const [viewMode, setViewMode] = useState('admin'); // 'admin' | 'stage' | 'guest' | 'client'
  const [games, setGames] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [activePlayers, setActivePlayers] = useState([]);
  const [guestInitialPin, setGuestInitialPin] = useState('');
  const [clientInitialCode, setClientInitialCode] = useState('');
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [dbOnline, setDbOnline] = useState(isSupabaseConnected());

  const activePinRef = useRef('');
  const requestSeqRef = useRef(0);

  useEffect(() => {
    activePinRef.current = activeSession?.pin || localStorage.getItem(ACTIVE_PIN_STORAGE_KEY) || '';
  }, [activeSession?.pin]);

  const loadData = useCallback(async () => {
    const seq = ++requestSeqRef.current;

    const [gList, sList] = await Promise.all([
      fetchGames(),
      fetchSessionsHistory()
    ]);

    if (seq !== requestSeqRef.current) return;

    setGames(gList);
    setSessions(sList);
    setDbOnline(isSupabaseConnected());

    // Determine which active session PIN to sync
    let targetPin = activePinRef.current;
    if (!targetPin && sList.length > 0) {
      const openSession = sList.find((s) => s.status !== 'finished');
      if (openSession) {
        targetPin = openSession.pin;
        activePinRef.current = targetPin;
      }
    }

    if (targetPin) {
      const updatedSession = await getSessionByPin(targetPin);
      if (updatedSession && seq === requestSeqRef.current) {
        setActiveSession(updatedSession);
        const pList = await fetchSessionPlayers(updatedSession.id);
        if (seq === requestSeqRef.current) {
          setActivePlayers(pList);
        }
      }
    }
  }, []);

  // Check URL query params for QR Code Guest scan (?pin=XXXXXX) or Client Package link (?client=XXXX)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    const clientParam = params.get('client');

    if (pinParam) {
      setGuestInitialPin(pinParam);
      activePinRef.current = pinParam;
      setViewMode('guest');
    } else if (clientParam) {
      setClientInitialCode(clientParam);
      setViewMode('client');
    }
    loadData();
  }, [loadData]);

  // Realtime subscription + periodic sync for Stage view
  useEffect(() => {
    const unsub = subscribeToRealtime(() => {
      loadData();
    });
    const pollInterval = setInterval(() => {
      if (activePinRef.current) {
        loadData();
      }
    }, 2500);

    return () => {
      unsub();
      clearInterval(pollInterval);
    };
  }, [loadData]);

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
    await loadData();
    setViewMode('stage');
  };

  const handleOpenStageView = async () => {
    if (activeSession) {
      setViewMode('stage');
      await loadData();
      return;
    }
    const existingOpen = sessions.find((s) => s.status !== 'finished');
    if (existingOpen) {
      activePinRef.current = existingOpen.pin;
      localStorage.setItem(ACTIVE_PIN_STORAGE_KEY, existingOpen.pin);
      setActiveSession(existingOpen);
      const pList = await fetchSessionPlayers(existingOpen.id);
      setActivePlayers(pList);
      setGuestInitialPin(existingOpen.pin);
      setViewMode('stage');
      return;
    }
    if (games.length > 0) {
      await handleLaunchLiveSession(games[0]);
    }
  };

  return (
    <div>
      {/* Top Global Navigation */}
      <header className="top-navbar">
        <div className="brand-group" onClick={() => setViewMode('admin')}>
          <div className="brand-emblem">B</div>
          <div>
            <div className="brand-title">BLUW Wedding Quiz & Bingo</div>
            <div className="brand-subtitle">
              ระบบเกมงานแต่ง & สัมมนา (Kahoot + Bingo คำถามบ่าวสาว • รองรับ 200 คน)
            </div>
          </div>
        </div>

        <nav className="nav-mode-switcher" aria-label="สลับมุมมองระบบ">
          <button
            type="button"
            id="nav-btn-admin"
            className={`nav-pill-btn ${viewMode === 'admin' ? 'active' : ''}`}
            onClick={() => setViewMode('admin')}
          >
            <LayoutDashboard size={16} />
            ระบบหลังบ้านนายพิธี
          </button>
          <button
            type="button"
            id="nav-btn-stage"
            className={`nav-pill-btn ${viewMode === 'stage' ? 'active' : ''}`}
            onClick={handleOpenStageView}
          >
            <Tv size={16} />
            จอโปรเจกเตอร์หน้างาน (QR)
          </button>
          <button
            type="button"
            id="nav-btn-guest"
            className={`nav-pill-btn ${viewMode === 'guest' ? 'active' : ''}`}
            onClick={() => setViewMode('guest')}
          >
            <Smartphone size={16} />
            จอมือถือแขกสแกนเล่น
          </button>
          <button
            type="button"
            id="nav-btn-client"
            className={`nav-pill-btn ${viewMode === 'client' ? 'active' : ''}`}
            onClick={() => setViewMode('client')}
          >
            <KeyRound size={16} />
            พอร์ทัลลูกค้าซื้อเกม
          </button>
        </nav>

        <div className="nav-right-actions">
          <button
            type="button"
            id="btn-open-supabase-settings"
            className="db-status-chip"
            onClick={() => setShowSupabaseModal(true)}
          >
            <span className={`status-dot ${dbOnline ? 'online' : 'local'}`} />
            <Database size={14} />
            <span>{dbOnline ? 'Supabase Connected' : 'ตั้งค่า Supabase (200 คน)'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main>
        {viewMode === 'admin' && (
          <AdminDashboard
            games={games}
            sessions={sessions}
            onRefresh={loadData}
            onLaunchSession={handleLaunchLiveSession}
            onOpenClientPortal={() => setViewMode('client')}
          />
        )}

        {viewMode === 'stage' && activeSession && (
          <HostStageView
            session={activeSession}
            players={activePlayers}
            onRefreshSession={loadData}
            onOpenGuestPreview={(pin) => {
              setGuestInitialPin(pin);
              setViewMode('guest');
            }}
            onBackToAdmin={() => setViewMode('admin')}
          />
        )}

        {viewMode === 'guest' && (
          <GuestMobileView
            initialPin={guestInitialPin || activeSession?.pin || ''}
            activeSessions={sessions}
            onPlayerJoined={loadData}
          />
        )}

        {viewMode === 'client' && (
          <ClientPackagePortal
            initialCode={clientInitialCode}
            games={games}
            onLaunchClientGame={handleLaunchLiveSession}
          />
        )}
      </main>

      {/* Supabase Setup & SQL Schema Modal */}
      {showSupabaseModal && (
        <SupabaseModal
          onClose={() => setShowSupabaseModal(false)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
