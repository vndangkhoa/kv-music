import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../Header';
import BottomNav from '../BottomNav';
import MobileMiniBar from '../player/MobileMiniBar';
import MobileFullPlayer from '../player/MobileFullPlayer';
import PlayerBar from './PlayerBar';
import MiniPlayer from '../player/MiniPlayer';
import SettingsModal from '../SettingsModal';
import Toast from '../Toast';
import SWUpdateBanner from '../SWUpdateBanner';
import { YtmGuideSidebar } from '../SoundCloudSidebar';
import { usePlayerStore } from '../../stores/playerStore';
import { libraryService } from '../../services/library';

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

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
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isCompactDesktop = useMediaQuery('(max-width: 1149px)');
  const [guideCollapsed, setGuideCollapsed] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1149px)').matches : false
  );
  const [isScrolled, setIsScrolled] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  const isSettingsOpen = usePlayerStore(s => s.isSettingsOpen);
  const setIsSettingsOpen = usePlayerStore(s => s.setIsSettingsOpen);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const loadTrack = usePlayerStore(s => s.loadTrack);

  // Auto-collapse guide below 1150px and expand at >=1150px
  useEffect(() => {
    setGuideCollapsed(isCompactDesktop);
  }, [isCompactDesktop]);

  useEffect(() => {
    setIsScrolled((mainRef.current?.scrollTop ?? 0) > 4);
  }, [location.pathname]);

  useEffect(() => {
    if (isMobile && !currentTrack) {
      libraryService.getInitialTrendingTracks().then(tracks => {
        if (tracks.length > 0) {
          loadTrack(tracks[0], tracks);
        }
      }).catch(() => {});
    }
  }, [isMobile, currentTrack, loadTrack]);

  useEffect(() => {
    const interval = setInterval(() => {
      libraryService.getInitialTrendingTracks().catch(() => {});
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const guideWidth = isMobile ? '0px' : guideCollapsed ? '72px' : '240px';

  return (
    <div
      style={{ '--ytm-guide-width': guideWidth } as React.CSSProperties}
      className="h-[100dvh] w-screen flex flex-col overflow-hidden bg-[#030303] text-white relative select-none"
    >
      {/* YouTube Music Web Top Header (64px) */}
      <Header
        onToggleGuide={() => setGuideCollapsed(v => !v)}
        isGuideCollapsed={guideCollapsed}
        scrolled={isScrolled}
      />

      {/* Main Shell Body: Left Guide Rail + Scrollable Content Canvas */}
      <div className="flex-1 min-h-0 flex relative bg-[#030303]">
        <div className="hidden md:flex shrink-0 h-full">
          <YtmGuideSidebar collapsed={guideCollapsed} />
        </div>

        <main
          ref={mainRef}
          onScroll={(e) => {
            const next = e.currentTarget.scrollTop > 4;
            if (next !== isScrolled) setIsScrolled(next);
          }}
          className="flex-1 min-w-0 overflow-y-auto ytm-scroller relative bg-[#030303] pb-[136px] md:pb-[88px]"
        >
          {/* Subtle top 220px YTM ambient radial gradient wash */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[220px] z-0"
            style={{
              background:
                'radial-gradient(ellipse 80% 100% at 35% 0%, rgba(110, 28, 42, 0.28) 0%, rgba(58, 22, 16, 0.14) 45%, rgba(3, 3, 3, 0) 100%)',
            }}
          />

          <div className="relative z-10 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Player & Navigation */}
      <MobileMiniBar />
      <BottomNav />

      {/* Desktop Bottom Footer Player + Split Player Overlay */}
      <PlayerBar />

      {/* HTML5 Audio Playback Engine */}
      <MiniPlayer />

      {/* Mobile Full Screen Player Drawer */}
      {isMobile && <MobileFullPlayer />}

      {/* PWA update banner (new version available -> reload) */}
      <SWUpdateBanner />

      {/* Modals & Toasts */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <Toast />
    </div>
  );
}
