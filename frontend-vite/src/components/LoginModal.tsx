import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { LogIn, UserPlus, QrCode, X, Check, Copy, Loader2, AlertCircle } from 'lucide-react';
import Logo from './Logo';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GradientColor {
  from: string;
  to: string;
}

const AVATAR_COLORS: GradientColor[] = [
  { from: '#ff5500', to: '#ff7a00' },
  { from: '#00b894', to: '#0984e3' },
  { from: '#ff6b6b', to: '#ee5a24' },
  { from: '#a29bfe', to: '#6c5ce7' },
  { from: '#fdcb6e', to: '#e17055' },
  { from: '#74b9ff', to: '#0984e3' },
  { from: '#fd79a8', to: '#e84393' },
  { from: '#55efc4', to: '#00b894' },
];

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const login = useAuthStore(s => s.login);
  const register = useAuthStore(s => s.register);
  const linkPairCode = useAuthStore(s => s.linkPairCode);
  const loading = useAuthStore(s => s.loading);
  const error = useAuthStore(s => s.error);
  const clearError = useAuthStore(s => s.clearError);
  const currentUser = useAuthStore(s => s.user);

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'pair'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pairInput, setPairInput] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [pairSuccess, setPairSuccess] = useState(false);

  if (!isOpen) return null;

  const selectedColor = AVATAR_COLORS[selectedColorIndex];
  const displayLetter = name.trim().length > 0 ? name.trim()[0].toUpperCase() : '?';

  const handleTabChange = (tab: 'login' | 'register' | 'pair') => {
    setActiveTab(tab);
    clearError();
  };

  const handleLoginSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    const ok = await login(email.trim(), password);
    if (ok) onClose();
  };

  const handleRegisterSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    if (password.length < 6) return;
    if (password !== confirmPassword) return;
    const ok = await register(name.trim(), email.trim(), password, JSON.stringify(selectedColor));
    if (ok) onClose();
  };

  const handlePairSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setPairSuccess(false);
    if (!pairInput.trim()) return;
    const ok = await linkPairCode(pairInput.trim());
    if (ok) {
      setPairSuccess(true);
      setTimeout(() => {
        setPairSuccess(false);
        onClose();
      }, 1000);
    }
  };

  const copyCurrentPairCode = () => {
    if (currentUser?.pairCode) {
      navigator.clipboard.writeText(currentUser.pairCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const inputCls = "w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-neutral-500 text-sm focus:border-[#ff5500] focus:outline-none transition";
  const labelCls = "block text-xs font-bold text-neutral-300 mb-1.5";

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-[#181818] border border-white/10 rounded-t-[28px] md:rounded-2xl p-6 sm:p-8 pb-[calc(1.75rem+env(safe-area-inset-bottom))] shadow-2xl text-white overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="flex justify-center md:hidden pt-1 pb-3">
          <div className="w-9 h-1.5 rounded-full bg-white/20" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* SoundCloud Header Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex justify-center mb-3">
            <Logo />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Account & Sync</h2>
          <p className="text-neutral-400 text-xs mt-1">Sign in to sync your music and playlists across devices</p>
        </div>

        {/* SoundCloud Filter Tab Navigation */}
        <div className="grid grid-cols-3 gap-1 bg-[#121212] p-1 rounded-xl text-xs font-extrabold text-center mb-6 border border-white/5">
          <button
            onClick={() => handleTabChange('login')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'login' ? 'bg-[#ff5500] text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            onClick={() => handleTabChange('register')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'register' ? 'bg-[#ff5500] text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign Up</span>
          </button>
          <button
            onClick={() => handleTabChange('pair')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'pair' ? 'bg-[#ff5500] text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Pair Code</span>
          </button>
        </div>

        {/* Error Notification Banner */}
        {error && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="khoavo@kvmusic.com"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full mt-2 bg-[#ff5500] hover:bg-[#ff7a00] text-white font-extrabold py-3 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign In
            </button>
          </form>
        )}

        {/* TAB 2: REGISTER */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="flex justify-center mb-2">
              <div
                className="w-16 h-16 rounded-full text-white text-2xl font-black flex items-center justify-center shadow-lg border-2 border-[#ff5500]"
                style={{ background: `linear-gradient(135deg, ${selectedColor.from}, ${selectedColor.to})` }}
              >
                {displayLetter}
              </div>
            </div>

            <div>
              <label className={labelCls}>Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your Display Name"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@kvmusic.com"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Password (at least 6 characters)</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
              />
              {password.length > 0 && password.length < 6 && (
                <p className="text-[11px] text-red-400 mt-1">Password must be at least 6 characters</p>
              )}
            </div>

            <div>
              <label className={labelCls}>Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
              />
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <p className="text-[11px] text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-2">Avatar Color Accent</label>
              <div className="flex items-center justify-center gap-2.5 flex-wrap">
                {AVATAR_COLORS.map((color, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedColorIndex(idx)}
                    className="w-7 h-7 rounded-full border-2 transition transform active:scale-95"
                    style={{
                      background: `linear-gradient(135deg, ${color.from}, ${color.to})`,
                      borderColor: selectedColorIndex === idx ? '#ffffff' : 'transparent',
                      transform: selectedColorIndex === idx ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim() || !email.trim() || password.length < 6 || confirmPassword !== password}
              className="w-full mt-2 bg-[#ff5500] hover:bg-[#ff7a00] text-white font-extrabold py-3 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Account
            </button>
          </form>
        )}

        {/* TAB 3: DEVICE PAIR CODE SYNC */}
        {activeTab === 'pair' && (
          <div className="space-y-5">
            {currentUser?.pairCode && (
              <div className="p-4 bg-[#121212] border border-white/10 rounded-xl text-center">
                <p className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Your Device Pair Code</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-black tracking-widest text-[#ff5500]">{currentUser.pairCode}</span>
                  <button
                    onClick={copyCurrentPairCode}
                    className="p-1.5 rounded-lg bg-white/5 text-[#ff5500] hover:bg-white/10 transition"
                    title="Copy code"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">Enter this code on your TV or other device to pair!</p>
              </div>
            )}

            <form onSubmit={handlePairSubmit} className="space-y-3">
              <label className="block text-xs font-bold text-neutral-300">Enter Pair Code From Other Device</label>
              <input
                type="text"
                value={pairInput}
                onChange={e => setPairInput(e.target.value)}
                placeholder="EX: KV-849201"
                className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-center text-lg font-black tracking-widest text-[#ff5500] placeholder-neutral-500 uppercase focus:border-[#ff5500] focus:outline-none transition"
              />

              {pairSuccess && <p className="text-xs text-green-400 text-center font-bold">✅ Pair successful!</p>}

              <button
                type="submit"
                disabled={loading || !pairInput.trim()}
                className="w-full bg-[#ff5500] hover:bg-[#ff7a00] text-white font-extrabold py-3 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Connect & Sync Device
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
