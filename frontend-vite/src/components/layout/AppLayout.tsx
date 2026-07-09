import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../Header';
import BottomNav from '../BottomNav';
import Sidebar from '../Sidebar';
import MiniPlayer from '../player/MiniPlayer';
import FullPlayer from '../player/FullPlayer';
import MobileFullPlayer from '../player/MobileFullPlayer';
import NowPlayingBar from './NowPlayingBar';
import AnimatedBackground from '../AnimatedBackground';
import SettingsModal from '../SettingsModal';
import { usePlayerStore } from '../../stores/playerStore';
import { libraryService } from '../../services/library';

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);
  return matches;
}

export default function AppLayout() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const location = useLocation();
  const isSettingsOpen = usePlayerStore(s => s.isSettingsOpen);
  const setIsSettingsOpen = usePlayerStore(s => s.setIsSettingsOpen);
  const closeRightPanel = usePlayerStore(s => s.closeRightPanel);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const loadTrack = usePlayerStore(s => s.loadTrack);

  const isFullScreenOpen = usePlayerStore(s => s.isFullScreenOpen);

  useEffect(() => {
    closeRightPanel();
  }, []);

  useEffect(() => {
    if (isMobile && !currentTrack) {
      libraryService.getInitialTrendingTracks().then(tracks => {
        if (tracks.length > 0) {
          loadTrack(tracks[0], tracks);
        }
      }).catch(() => {});
    }
  }, [isMobile]);

  const hideMiniPlayer = isMobile && (location.pathname === '/' || location.pathname === '/library');

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-spotify-base text-spotify-text-main transition-colors duration-500 relative">
      <AnimatedBackground />

      {!isMobile && <Header />}

      <div className="flex-1 flex overflow-hidden relative">
        {!isMobile && <Sidebar />}

        <main className="flex-1 overflow-y-auto no-scrollbar pb-24 fold:pb-0 relative bg-spotify-base text-spotify-text-main scroll-smooth">
          <Outlet />
        </main>

        {!isMobile && <NowPlayingBar />}
      </div>

      <MiniPlayer hideUI={hideMiniPlayer} />

      {isMobile ? <MobileFullPlayer /> : <FullPlayer />}

      <BottomNav />

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
