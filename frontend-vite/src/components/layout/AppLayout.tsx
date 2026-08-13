import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../Header';
import BottomNav from '../BottomNav';
import MobileMiniBar from '../player/MobileMiniBar';
import MobileFullPlayer from '../player/MobileFullPlayer';
import PlayerBar from './PlayerBar';
import MiniPlayer from '../player/MiniPlayer';
import SettingsModal from '../SettingsModal';
import Toast from '../Toast';
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
  const isSettingsOpen = usePlayerStore(s => s.isSettingsOpen);
  const setIsSettingsOpen = usePlayerStore(s => s.setIsSettingsOpen);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const loadTrack = usePlayerStore(s => s.loadTrack);

  useEffect(() => {
    if (isMobile && !currentTrack) {
      libraryService.getInitialTrendingTracks().then(tracks => {
        if (tracks.length > 0) {
          loadTrack(tracks[0], tracks);
        }
      }).catch(() => {});
    }
  }, [isMobile]);

  useEffect(() => {
    const interval = setInterval(() => {
      libraryService.getInitialTrendingTracks().catch(() => {});
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-[100dvh] w-screen flex flex-col overflow-hidden bg-[#121212] text-white relative select-none">
      {/* SoundCloud Top Header */}
      <Header />

      {/* Main Responsive Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-[130px] md:pb-[68px] relative scroll-smooth bg-[#121212]">
        <Outlet />
      </main>

      {/* Mobile Player & Navigation */}
      <MobileMiniBar />
      <BottomNav />

      {/* Desktop Bottom Footer Player */}
      <PlayerBar />

      {/* HTML5 Audio Playback Engine */}
      <MiniPlayer />

      {/* Mobile Full Screen Player Drawer */}
      {isMobile && <MobileFullPlayer />}

      {/* Modals & Toasts */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <Toast />
    </div>
  );
}
