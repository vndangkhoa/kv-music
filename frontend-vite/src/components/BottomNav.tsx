import { Home, Compass, Library, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { haptic } from '../utils/haptic';

const NAV_TABS = [
  { to: '/', label: 'Home', icon: Home, match: (p: string) => p === '/' },
  { to: '/feed', label: 'Explore', icon: Compass, match: (p: string) => p === '/feed' || p === '/explore' },
  { to: '/library', label: 'Library', icon: Library, match: (p: string) => p === '/library' },
  { to: '/profile', label: 'Profile', icon: User, match: (p: string) => p === '/profile' },
] as const;

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNav = (to: string) => {
    haptic(6);
    navigate(to);
  };

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-[env(safe-area-inset-bottom)] bg-[#1D1D1D] border-t border-white/[0.08] select-none"
    >
      <div className="grid grid-cols-4 h-[56px]">
        {NAV_TABS.map(({ to, label, icon: Icon, match }) => {
          const active = match(location.pathname);
          return (
            <button
              key={to}
              type="button"
              onClick={() => handleNav(to)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? 'text-white' : 'text-white/65 hover:text-white'
              }`}
            >
              <Icon className="w-6 h-6" strokeWidth={active ? 2.2 : 1.75} />
              <span className={`text-[10px] leading-3 tracking-tight ${active ? 'font-medium' : 'font-normal'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
