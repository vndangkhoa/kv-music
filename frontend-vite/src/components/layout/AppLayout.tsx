import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../Header';
import BottomNav from '../BottomNav';
import Sidebar from '../Sidebar';
import MiniPlayer from '../player/MiniPlayer';
import FullPlayer from '../player/FullPlayer';
import NowPlayingBar from './NowPlayingBar';
import AnimatedBackground from '../AnimatedBackground';
import SettingsModal from '../SettingsModal';
import { usePlayerStore } from '../../stores/playerStore';

export default function AppLayout() {
  const isSettingsOpen = usePlayerStore(s => s.isSettingsOpen);
  const setIsSettingsOpen = usePlayerStore(s => s.setIsSettingsOpen);
  const closeRightPanel = usePlayerStore(s => s.closeRightPanel);

  useEffect(() => {
    closeRightPanel();
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-spotify-base text-spotify-text-main transition-colors duration-500 relative">
      <AnimatedBackground />

      {/* Global Header */}
      <Header />

      {/* Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-24 fold:pb-0 relative bg-spotify-base text-spotify-text-main scroll-smooth">
          <Outlet />
        </main>

        {/* Desktop Now Playing Panel (always visible) */}
        <NowPlayingBar />
      </div>

      {/* Audio Player - Mobile: MiniPlayer, Desktop: embedded in NowPlayingBar */}
      <MiniPlayer />

      {/* Full Screen Player Overlay (Mobile) */}
      <FullPlayer />

      {/* Mobile Bottom Nav */}
      <BottomNav />

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
