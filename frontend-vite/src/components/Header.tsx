import { useState, useEffect, useRef } from 'react';
import { Search, Settings, LogOut, Menu, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Logo from './Logo';
import { usePlayerStore } from '../stores/playerStore';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import LoginModal from './LoginModal';

interface GradientColor {
  from: string;
  to: string;
}

function getAvatarGradient(avatarColor: string): string {
  try {
    const parsed: GradientColor = JSON.parse(avatarColor);
    return `linear-gradient(135deg, ${parsed.from}, ${parsed.to})`;
  } catch {
    return 'linear-gradient(135deg, #ff6b6b, #ee5a24)';
  }
}

export default function Header() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(urlQuery);
  const setIsSettingsOpen = usePlayerStore(s => s.setIsSettingsOpen);
  const addRecentSearch = usePlayerStore(s => s.addRecentSearch);
  const user = useAuthStore(s => s.user);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const logout = useAuthStore(s => s.logout);
  const toggleSidebar = useUIStore(s => s.toggleSidebar);
  const isNowPlayingOpen = useUIStore(s => s.isNowPlayingOpen);
  const toggleNowPlaying = useUIStore(s => s.toggleNowPlaying);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQuery(urlQuery); }, [urlQuery]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val.trim()) {
        addRecentSearch(val);
        navigate(`/search?q=${encodeURIComponent(val)}`);
      }
    }, 500);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim()) {
      addRecentSearch(query);
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleAvatarClick = () => {
    if (!isLoggedIn) {
      setIsLoginOpen(true);
    } else {
      setIsDropdownOpen(!isDropdownOpen);
    }
  };

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  const displayLetter = user ? user.name.trim()[0].toUpperCase() : '?';
  const avatarGradient = user ? getAvatarGradient(user.avatarColor) : 'linear-gradient(135deg, #535353, #282828)';

  return (
    <>
      <header className="h-14 md:h-16 bg-[#0f0f0f] border-b border-white/5 flex items-center justify-between px-3 md:px-6 z-[60] relative select-none">
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={toggleSidebar} className="p-2 hover:bg-white/10 rounded-lg transition hidden fold:flex" aria-label="Toggle sidebar">
            <Menu className="w-5 h-5 text-neutral-300" />
          </button>
          <Link to="/" className="hover:opacity-95 active:scale-95 transition">
            <Logo />
          </Link>
        </div>

        <form onSubmit={handleFormSubmit} className="flex-1 max-w-[480px] mx-4 relative">
          <div className="relative flex items-center w-full bg-[#212121] hover:bg-[#2b2b2b] focus-within:bg-[#2b2b2b] rounded-full border border-transparent focus-within:border-neutral-700 transition duration-200">
            <Search className="absolute left-4 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input type="text" value={query} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search songs, albums, artists"
              className="w-full pl-11 pr-4 py-2 bg-transparent text-white placeholder-neutral-400 text-sm font-medium focus:outline-none" />
          </div>
        </form>

        <div className="flex items-center gap-3 md:gap-4 text-neutral-300">
          <button onClick={toggleNowPlaying} className="hover:text-white active:scale-95 transition p-1 hidden lg:block" title="Toggle player panel">
            {isNowPlayingOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </button>

          <button onClick={() => setIsSettingsOpen(true)} className="hover:text-white active:scale-95 transition p-1">
            <Settings className="w-5 h-5" />
          </button>

          <div className="relative" ref={dropdownRef}>
            <button onClick={handleAvatarClick}
              className="w-8 h-8 rounded-full text-white font-extrabold flex items-center justify-center text-sm shadow-md cursor-pointer border border-white/10 hover:scale-105 active:scale-95 transition select-none"
              style={{ background: avatarGradient }}>
              {isLoggedIn ? displayLetter : '?'}
            </button>

            {isLoggedIn && isDropdownOpen && (
              <div className="absolute right-0 top-10 w-48 bg-[#282828] border border-white/10 rounded-xl shadow-2xl py-1 z-[70] animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                  <p className="text-[10px] text-neutral-400">Local Profile</p>
                </div>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-white/5 transition">
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}
