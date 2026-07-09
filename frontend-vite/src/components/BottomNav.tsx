import { Play, Pause, AudioWaveform, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../stores/playerStore';

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const isBuffering = usePlayerStore(s => s.isBuffering);
  const isFullScreenOpen = usePlayerStore(s => s.isFullScreenOpen);
  const setIsFullScreenOpen = usePlayerStore(s => s.setIsFullScreenOpen);
  const navigate = useNavigate();

  const isActive = (p: string) => path === p;

  const handlePlayPause = () => {
    if (!isFullScreenOpen) {
      setIsFullScreenOpen(true);
    } else {
      togglePlay();
    }
  };

  const handleNav = (to: string) => {
    if (isFullScreenOpen) setIsFullScreenOpen(false);
    navigate(to);
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 border-t border-white/5 pb-safe md:hidden z-50 transition-colors ${
      isFullScreenOpen ? 'border-white/10' : 'bg-[#0a0a0a]/95 backdrop-blur-xl border-white/5'
    }`}>
      <div className="flex items-center justify-around h-16 px-4">
        <button
          onClick={handlePlayPause}
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg"
        >
          {isBuffering ? (
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5 text-black fill-current" />
          ) : (
            <Play className="w-5 h-5 text-black fill-current ml-0.5" />
          )}
        </button>

        <button
          onClick={() => handleNav('/')}
          className={`flex flex-col items-center justify-center transition-colors ${
            isActive('/') ? 'text-white' : 'text-neutral-500'
          }`}
        >
          <AudioWaveform className="w-6 h-6 mb-1" strokeWidth={isActive('/') ? 2.5 : 2} />
          <span className="text-[10px] uppercase font-medium tracking-wide">Discovery</span>
        </button>

        <button
          onClick={() => handleNav('/library')}
          className={`flex flex-col items-center justify-center transition-colors ${
            isActive('/library') ? 'text-white' : 'text-neutral-500'
          }`}
        >
          <User className="w-6 h-6 mb-1" strokeWidth={isActive('/library') ? 2.5 : 2} />
          <span className="text-[10px] uppercase font-medium tracking-wide">Me</span>
        </button>
      </div>
    </div>
  );
}
