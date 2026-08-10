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
      <header className="bg-[#0f1938]/95 backdrop-blur-md border-b border-cyan-500/20 flex flex-col z-[60] relative select-none sticky top-0 shadow-lg shadow-black/20">
        {/* Top Navbar */}
        <div className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={toggleSidebar} className="p-2 hover:bg-cyan-500/10 rounded-xl text-neutral-300 hover:text-cyan-400 transition hidden fold:flex" aria-label="Toggle sidebar">
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/" className="hover:opacity-95 active:scale-95 transition">
              <Logo />
            </Link>
          </div>

          <form onSubmit={handleFormSubmit} className="flex-1 max-w-[540px] mx-3 md:mx-6 relative hidden md:flex">
            <div className="relative flex items-center w-full bg-[#142044] hover:bg-[#1a2957] focus-within:bg-[#1a2957] rounded-full border border-cyan-500/20 focus-within:border-cyan-400 transition duration-200 shadow-inner">
              <Search className="absolute left-4 w-4 h-4 text-cyan-400/70 pointer-events-none" />
              <input type="text" value={query} onChange={(e) => handleSearch(e.target.value)}
                placeholder="Tìm bài hát, ca sĩ, album, lyric..."
                className="w-full pl-11 pr-24 py-2 bg-transparent text-white placeholder-neutral-400 text-sm font-medium focus:outline-none" />
              <button type="submit" className="absolute right-1.5 px-3 py-1 bg-gradient-to-r from-[#00a8ff] to-[#2e86de] hover:brightness-110 text-white text-xs font-semibold rounded-full shadow transition">
                Tìm kiếm
              </button>
            </div>
          </form>

          <div className="flex items-center gap-2 md:gap-3 text-neutral-300">
            <button onClick={toggleNowPlaying} className="hover:text-cyan-400 active:scale-95 transition p-2 rounded-xl hover:bg-cyan-500/10 hidden lg:block" title="Toggle player panel">
              {isNowPlayingOpen ? <PanelRightClose className="w-5 h-5 text-cyan-400" /> : <PanelRightOpen className="w-5 h-5" />}
            </button>

            <button onClick={() => setIsSettingsOpen(true)} className="hover:text-cyan-400 active:scale-95 transition p-2 rounded-xl hover:bg-cyan-500/10">
              <Settings className="w-5 h-5" />
            </button>

            <div className="relative" ref={dropdownRef}>
              <button onClick={handleAvatarClick}
                className="w-9 h-9 rounded-full text-white font-extrabold flex items-center justify-center text-sm shadow-md cursor-pointer border border-cyan-400/30 hover:scale-105 active:scale-95 transition select-none shadow-cyan-500/20"
                style={{ background: avatarGradient }}>
                {isLoggedIn ? displayLetter : '?'}
              </button>

              {isLoggedIn && isDropdownOpen && (
                <div className="absolute right-0 top-11 w-48 bg-[#142044] border border-cyan-500/20 rounded-xl shadow-2xl py-1 z-[70] animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-cyan-500/10">
                    <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                    <p className="text-[10px] text-cyan-400 font-medium uppercase tracking-wider">Thành viên VIP</p>
                  </div>
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-cyan-500/10 transition">
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span>Đăng Xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Bar (full width, always visible on mobile) */}
        <form onSubmit={handleFormSubmit} className="md:hidden px-3 pb-2.5">
          <div className="relative flex items-center w-full bg-[#142044] hover:bg-[#1a2957] focus-within:bg-[#1a2957] rounded-full border border-cyan-500/20 focus-within:border-cyan-400 transition duration-200 shadow-inner">
            <Search className="absolute left-4 w-4 h-4 text-cyan-400/70 pointer-events-none" />
            <input type="text" value={query} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Tìm bài hát, ca sĩ, album, playlist..."
              className="w-full pl-11 pr-20 py-2.5 bg-transparent text-white placeholder-neutral-400 text-sm font-medium focus:outline-none" />
            <button type="submit" className="absolute right-1.5 px-3 py-1.5 bg-gradient-to-r from-[#00a8ff] to-[#2e86de] hover:brightness-110 text-white text-xs font-semibold rounded-full shadow transition">
              Tìm kiếm
            </button>
          </div>
        </form>

        {/* Sub-Navigation Category Bar (NCT Header Menu) */}
        <div className="hidden fold:flex items-center gap-1 md:gap-6 px-4 md:px-8 py-1.5 border-t border-cyan-500/10 text-xs md:text-sm font-bold text-neutral-300 overflow-x-auto no-scrollbar">
          <Link to="/" className="text-cyan-400 hover:text-white transition py-1 border-b-2 border-cyan-400 px-1">
            BÀI HÁT
          </Link>
          <Link to="/library" className="hover:text-cyan-400 transition py-1 px-1">
            PLAYLIST
          </Link>
          <Link to="/charts" className="hover:text-cyan-400 transition py-1 px-1 flex items-center gap-1">
            <span>BXH REALTIME</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          </Link>
          <Link to="/artists" className="hover:text-cyan-400 transition py-1 px-1">
            ARTISTS
          </Link>
        </div>
      </header>
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}
