import { useState, useEffect, useRef } from 'react';
import { Search, Settings, LogOut, X } from 'lucide-react';
import { useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import { usePlayerStore } from '../stores/playerStore';
import { useAuthStore } from '../stores/authStore';
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
    return 'linear-gradient(135deg, #ff5500, #ff7a00)';
  }
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(urlQuery);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const setIsSettingsOpen = usePlayerStore(s => s.setIsSettingsOpen);
  const addRecentSearch = usePlayerStore(s => s.addRecentSearch);
  const user = useAuthStore(s => s.user);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const logout = useAuthStore(s => s.logout);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQuery(urlQuery); }, [urlQuery]);

  useEffect(() => {
    setIsMobileSearchOpen(false);
  }, [location.pathname]);

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
    if (val.trim()) {
      fetch(`/api/suggestions?q=${encodeURIComponent(val.trim())}`)
        .then(r => r.json().catch(() => []))
        .then((list: string[]) => setSuggestions(Array.isArray(list) ? list.slice(0, 6) : []))
        .catch(() => setSuggestions([]));
      debounceRef.current = setTimeout(() => {
        addRecentSearch(val);
        navigate(`/search?q=${encodeURIComponent(val)}`);
      }, 700);
    } else {
      setSuggestions([]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim()) {
      addRecentSearch(query);
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const displayLetter = user ? user.name.trim()[0].toUpperCase() : '?';
  const avatarGradient = user ? getAvatarGradient(user.avatarColor) : 'linear-gradient(135deg, #ff5500, #ff7a00)';

  const navItems = [
    { to: '/', label: 'Home' },
    { to: '/feed', label: 'Feed' },
    { to: '/library', label: 'Library' },
  ];

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#121212] border-b border-white/10 select-none">
        <div className="max-w-[1280px] mx-auto h-12 md:h-14 px-3 md:px-6 flex items-center justify-between gap-2 md:gap-6">
          {/* Logo & Main Nav */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link to="/" className="hover:opacity-90 active:scale-95 transition flex-shrink-0 flex items-center gap-2">
              <Logo />
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ to, label }) => {
                const active = location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`px-3 py-1.5 text-xs md:text-sm transition uppercase tracking-wider font-bold ${
                      active
                        ? 'text-[#ff5500] border-b-2 border-[#ff5500]'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Search Bar (Centered) */}
          <form onSubmit={handleFormSubmit} className="hidden md:block flex-1 max-w-[500px] relative">
            <div className="relative flex items-center w-full bg-[#242424] hover:bg-[#2a2a2a] focus-within:bg-[#2a2a2a] rounded border border-white/10 focus-within:border-[#ff5500] transition duration-200">
              <input
                type="text"
                value={query}
                onChange={(e) => { handleSearch(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Search for artists, tracks, podcasts"
                className="w-full pl-3 pr-8 py-1.5 bg-transparent text-white placeholder-neutral-500 text-xs font-medium focus:outline-none"
              />
              <button type="submit" className="absolute right-2 text-neutral-400 hover:text-white transition">
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Live Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && query.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1c1c1c] border border-white/10 rounded shadow-2xl overflow-hidden z-[70]">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={() => {
                      setQuery(s);
                      setShowSuggestions(false);
                      addRecentSearch(s);
                      navigate(`/search?q=${encodeURIComponent(s)}`);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs text-neutral-200 hover:bg-white/5 transition text-left"
                  >
                    <Search className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="truncate">{s}</span>
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Right Action Items */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hidden md:flex p-1.5 text-neutral-400 hover:text-white transition"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsMobileSearchOpen(v => !v)}
              className="md:hidden p-1.5 text-neutral-400 hover:text-white transition"
              aria-label="Search"
            >
              {isMobileSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>

            {/* Account Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => { if (!isLoggedIn) setIsLoginOpen(true); else setIsDropdownOpen(v => !v); }}
                className="w-7 h-7 rounded-full text-white font-extrabold flex items-center justify-center text-xs cursor-pointer border border-[#ff5500]/60 hover:scale-105 active:scale-95 transition select-none"
                style={{ background: avatarGradient }}
                aria-label="Account"
              >
                {isLoggedIn ? displayLetter : '?'}
              </button>

              {isLoggedIn && isDropdownOpen && (
                <div className="absolute right-0 top-9 w-44 bg-[#1c1c1c] border border-white/10 rounded shadow-2xl py-1 z-[70]">
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                    <p className="text-[10px] text-[#ff5500] font-semibold uppercase tracking-wider">Member Pro</p>
                  </div>
                  <button onClick={() => { setIsDropdownOpen(false); setIsSettingsOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition">
                    <Settings className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Settings</span>
                  </button>
                  <button onClick={async () => { await logout(); setIsDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition">
                    <LogOut className="w-3.5 h-3.5 text-red-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search row */}
        {isMobileSearchOpen && (
          <form onSubmit={handleFormSubmit} className="md:hidden px-3 pb-2 pt-1">
            <div className="relative flex items-center w-full bg-[#242424] rounded border border-[#ff5500]">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search tracks, artists, podcasts..."
                className="w-full pl-3 pr-8 py-2 bg-transparent text-white placeholder-neutral-500 text-xs font-medium focus:outline-none"
              />
              <button type="submit" className="absolute right-2 text-neutral-400 hover:text-white">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </header>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}
