import { Home, Rss, Library, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { haptic } from '../utils/haptic';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (p: string) => location.pathname === p;

  const handleNav = (to: string) => {
    haptic(6);
    navigate(to);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-[env(safe-area-inset-bottom)] bg-[#121212] border-t border-white/10 select-none">
      <div className="flex items-center justify-around h-14 px-2 relative">
        {/* Home */}
        <button
          onClick={() => handleNav('/')}
          className={`flex flex-col items-center justify-center w-14 py-1 transition ${
            isActive('/') ? 'text-[#ff5500]' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Home className="w-5 h-5" strokeWidth={isActive('/') ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">Home</span>
        </button>

        {/* Stream / Feed */}
        <button
          onClick={() => handleNav('/feed')}
          className={`flex flex-col items-center justify-center w-14 py-1 transition ${
            isActive('/feed') ? 'text-[#ff5500]' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Rss className="w-5 h-5" strokeWidth={isActive('/feed') ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">Stream</span>
        </button>

        {/* Library */}
        <button
          onClick={() => handleNav('/library')}
          className={`flex flex-col items-center justify-center w-14 py-1 transition ${
            isActive('/library') ? 'text-[#ff5500]' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Library className="w-5 h-5" strokeWidth={isActive('/library') ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">Library</span>
        </button>

        {/* Profile */}
        <button
          onClick={() => handleNav('/profile')}
          className={`flex flex-col items-center justify-center w-14 py-1 transition ${
            isActive('/profile') ? 'text-[#ff5500]' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <User className="w-5 h-5" strokeWidth={isActive('/profile') ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">Profile</span>
        </button>
      </div>
    </div>
  );
}
