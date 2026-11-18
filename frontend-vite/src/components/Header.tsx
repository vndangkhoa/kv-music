import { useState, useEffect, useRef } from 'react';
import { Search, Settings, LogOut, X, Menu, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import { usePlayerStore } from '../stores/playerStore';
import { useAuthStore } from '../stores/authStore';
import LoginModal from './LoginModal';

export interface HeaderProps {
  onToggleGuide?: () => void;
  isGuideCollapsed?: boolean;
  scrolled?: boolean;
}

interface GradientColor {
  from: string;
  to: string;
}

function getAvatarGradient(avatarColor: string): string {
  try {
    const parsed: GradientColor = JSON.parse(avatarColor);
    return `linear-gradient(135deg, ${parsed.from}, ${parsed.to})`;
  } catch {
    return 'linear-gradient(135deg, #FF0033, #FF2791)';
  }
}

export default function Header({ onToggleGuide, isGuideCollapsed, scrolled }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(urlQuery);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [internalScrolled, setInternalScrolled] = useState(false);
  const setIsSettingsOpen = usePlayerStore(s => s.setIsSettingsOpen);
  const addRecentSearch = usePlayerStore(s => s.addRecentSearch);
  const user = useAuthStore(s => s.user);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const logout = useAuthStore(s => s.logout);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const isFocusedRef = useRef(false);
  const isComposingRef = useRef(false);

  useEffect(() => {
    if (scrolled !== undefined) return;
    const onScroll = () => setInternalScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [scrolled]);

  useEffect(() => {
    if (!isFocusedRef.current && !isComposingRef.current) {
      setQuery(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => {
    if (location.pathname !== '/search') {
      setIsMobileSearchOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
      suggestAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const scheduleSearchAndSuggestions = (val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    suggestAbortRef.current?.abort();

    const trimmed = val.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }

    suggestTimerRef.current = setTimeout(() => {
      const controller = new AbortController();
      suggestAbortRef.current = controller;
      fetch(`/api/suggestions?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then(r => r.json().catch(() => []))
        .then((list: string[]) => {
          if (!controller.signal.aborted) {
            setSuggestions(Array.isArray(list) ? list.slice(0, 6) : []);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestions([]);
          }
        });
    }, 200);

    debounceRef.current = setTimeout(() => {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`, {
        replace: location.pathname === '/search',
      });
    }, 500);
  };

  const handleSearch = (val: string) => {
    setQuery(val);
    if (isComposingRef.current) return;
    scheduleSearchAndSuggestions(val);
  };

  const handleClearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    suggestAbortRef.current?.abort();
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    suggestAbortRef.current?.abort();
    const trimmed = query.trim();
    if (trimmed) {
      setShowSuggestions(false);
      setIsMobileSearchOpen(false);
      addRecentSearch(trimmed);
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleSuggestionSelect = (s: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    suggestAbortRef.current?.abort();
    setQuery(s);
    setShowSuggestions(false);
    setIsMobileSearchOpen(false);
    addRecentSearch(s);
    navigate(`/search?q=${encodeURIComponent(s)}`);
  };

  const isScrolled = scrolled ?? internalScrolled;
  const hasDropdown = showSuggestions && suggestions.length > 0 && Boolean(query.trim());
  const displayLetter = user ? user.name.trim()[0]?.toUpperCase() || '?' : '?';
  const avatarGradient = user ? getAvatarGradient(user.avatarColor) : 'linear-gradient(135deg, #FF0033, #FF2791)';

  return (
    <>
      <header
        className={`sticky top-0 z-[60] h-16 shrink-0 bg-[#030303]/95 backdrop-blur-md border-b transition-colors duration-200 select-none ${
          isScrolled ? 'border-white/10' : 'border-transparent'
        }`}
      >
        <div className="h-full px-4 md:px-6 flex items-center justify-between gap-3 md:gap-6">
          {/* Left: Guide Toggle + Brand Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => onToggleGuide?.()}
              aria-label="Toggle navigation guide"
              aria-expanded={isGuideCollapsed !== undefined ? !isGuideCollapsed : undefined}
              className="hidden md:inline-flex w-10 h-10 rounded-full items-center justify-center text-white hover:bg-white/10 transition"
            >
              <Menu className="w-6 h-6" />
            </button>

            <Link
              to="/"
              className="hover:opacity-90 active:scale-95 transition flex-shrink-0 flex items-center"
              aria-label="KV Music Home"
            >
              <Logo size={28} showBadge={false} showSubtitle={false} />
            </Link>
          </div>

          {/* Center: Desktop/Tablet YTM Search Box */}
          <form onSubmit={handleFormSubmit} className="hidden md:block flex-1 max-w-[480px] relative">
            <div
              className={`relative flex items-center w-full h-10 bg-[#212121] focus-within:bg-[#030303] border border-white/15 focus-within:border-white/30 transition-colors ${
                hasDropdown ? 'rounded-t-[8px]' : 'rounded-[8px]'
              }`}
            >
              <button
                type="submit"
                className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white transition flex-shrink-0"
                aria-label="Search"
              >
                <Search className="w-[18px] h-[18px]" />
              </button>

              <input
                type="text"
                value={query}
                onChange={(e) => {
                  handleSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onCompositionStart={() => {
                  isComposingRef.current = true;
                }}
                onCompositionEnd={(e) => {
                  isComposingRef.current = false;
                  scheduleSearchAndSuggestions((e.target as HTMLInputElement).value);
                }}
                onFocus={() => {
                  isFocusedRef.current = true;
                  setShowSuggestions(true);
                }}
                onBlur={() => {
                  isFocusedRef.current = false;
                  setTimeout(() => setShowSuggestions(false), 150);
                }}
                placeholder="Search songs, albums, artists, podcasts"
                className="flex-1 min-w-0 bg-transparent text-white placeholder:text-white/50 text-[15px] leading-[22px] font-normal focus:outline-none pr-2"
              />

              {query && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleClearSearch}
                  className="w-9 h-9 mr-0.5 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition flex-shrink-0"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Autocomplete Dropdown (ytmusic-search-suggestions-section) */}
            {hasDropdown && (
              <div className="absolute top-full left-0 right-0 bg-[#212121] border-x border-b border-white/15 rounded-b-[8px] shadow-2xl py-2 overflow-hidden z-[70]">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s}-${i}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSuggestionSelect(s);
                    }}
                    className="w-full flex items-center gap-3.5 px-4 py-2 text-[14px] text-white/90 hover:bg-white/10 transition text-left"
                  >
                    <Search className="w-4 h-4 text-white/50 flex-shrink-0" />
                    <span className="truncate">{s}</span>
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Right: Mobile Search Trigger, Settings, Account */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(v => !v)}
              className="md:hidden w-10 h-10 rounded-full inline-flex items-center justify-center text-white hover:bg-white/10 transition"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 rounded-full inline-flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition"
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            <div className="relative" ref={dropdownRef}>
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(v => !v)}
                  className="w-8 h-8 rounded-full text-white font-bold flex items-center justify-center text-xs cursor-pointer border border-white/20 hover:opacity-90 active:scale-95 transition select-none"
                  style={{ background: avatarGradient }}
                  aria-label="Account menu"
                  aria-expanded={isDropdownOpen}
                >
                  {displayLetter}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLoginOpen(true)}
                  className="h-8 px-4 rounded-full bg-white text-[#030303] hover:bg-white/90 text-[14px] font-medium transition active:scale-95 whitespace-nowrap"
                >
                  Sign in
                </button>
              )}

              {isLoggedIn && isDropdownOpen && (
                <div className="absolute right-0 top-10 w-52 bg-[#212121] border border-white/15 rounded-[8px] shadow-2xl py-1.5 z-[70]">
                  <div className="px-4 py-2.5 border-b border-white/10">
                    <p className="text-[14px] font-medium text-white truncate">{user?.name}</p>
                    <p className="text-[12px] text-white/60 truncate">KV Music Member</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsSettingsOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-white/90 hover:text-white hover:bg-white/10 transition text-left"
                  >
                    <Settings className="w-4 h-4 text-white/70" />
                    <span>Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-white/90 hover:text-white hover:bg-white/10 transition text-left"
                  >
                    <LogOut className="w-4 h-4 text-white/70" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Expandable Top Search Overlay */}
        {isMobileSearchOpen && (
          <div className="md:hidden absolute inset-0 z-[65] h-16 bg-[#030303] px-3 flex items-center gap-2 border-b border-white/10">
            <button
              type="button"
              onClick={() => {
                setIsMobileSearchOpen(false);
                setShowSuggestions(false);
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition flex-shrink-0"
              aria-label="Close search"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <form onSubmit={handleFormSubmit} className="flex-1 min-w-0 relative">
              <div className="flex items-center w-full h-10 bg-[#212121] focus-within:bg-[#030303] rounded-[8px] border border-white/15 focus-within:border-white/30 px-3">
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => {
                    handleSearch(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onCompositionStart={() => {
                    isComposingRef.current = true;
                  }}
                  onCompositionEnd={(e) => {
                    isComposingRef.current = false;
                    scheduleSearchAndSuggestions((e.target as HTMLInputElement).value);
                  }}
                  onFocus={() => {
                    isFocusedRef.current = true;
                    setShowSuggestions(true);
                  }}
                  onBlur={() => {
                    isFocusedRef.current = false;
                    setTimeout(() => setShowSuggestions(false), 150);
                  }}
                  placeholder="Search songs, albums, artists..."
                  className="flex-1 min-w-0 bg-transparent text-white placeholder:text-white/50 text-[15px] focus:outline-none pr-2"
                />
                {query && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleClearSearch}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white transition"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {hasDropdown && (
                <div className="fixed top-16 left-0 right-0 bg-[#212121] border-b border-white/15 shadow-2xl py-2 z-[70]">
                  {suggestions.map((s, i) => (
                    <button
                      key={`mob-${s}-${i}`}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSuggestionSelect(s);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-white/90 hover:bg-white/10 transition text-left"
                    >
                      <Search className="w-4 h-4 text-white/50 flex-shrink-0" />
                      <span className="truncate">{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </form>
          </div>
        )}
      </header>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}
