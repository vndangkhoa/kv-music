import React, { useEffect, useId, useRef, useState } from 'react';
import { useAuthStore, type AuthModalTab } from '../stores/authStore';
import { useModalDialog } from '../hooks/useModalDialog';
import { toast } from '../stores/toastStore';
import {
  LogIn,
  UserPlus,
  QrCode,
  X,
  Check,
  Copy,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import Logo from './Logo';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: AuthModalTab;
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

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login',
}) => {
  const login = useAuthStore(s => s.login);
  const register = useAuthStore(s => s.register);
  const linkPairCode = useAuthStore(s => s.linkPairCode);
  const loading = useAuthStore(s => s.loading);
  const error = useAuthStore(s => s.error);
  const clearError = useAuthStore(s => s.clearError);
  const currentUser = useAuthStore(s => s.user);

  const [activeTab, setActiveTab] = useState<AuthModalTab>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pairInput, setPairInput] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [pairSuccess, setPairSuccess] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useModalDialog(dialogRef, isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setShowPassword(false);
      setPairSuccess(false);
      clearError();
    }
  }, [isOpen, initialTab, clearError]);

  const selectedColor = AVATAR_COLORS[selectedColorIndex];
  const displayLetter = name.trim().length > 0 ? name.trim()[0].toUpperCase() : '?';

  const handleTabChange = (tab: AuthModalTab) => {
    setActiveTab(tab);
    setShowPassword(false);
    clearError();
  };

  const handleLoginSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    const ok = await login(email.trim(), password);
    if (ok) {
      toast('Signed in — playlists synced');
      dialogRef.current?.close('submitted');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    if (password.length < 6) return;
    const ok = await register(name.trim(), email.trim(), password, JSON.stringify(selectedColor));
    if (ok) {
      toast('Account created — playlists synced');
      dialogRef.current?.close('submitted');
    }
  };

  const handlePairSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setPairSuccess(false);
    if (!pairInput.trim()) return;
    const ok = await linkPairCode(pairInput.trim());
    if (ok) {
      setPairSuccess(true);
      toast('Device paired — playlists synced');
      setTimeout(() => {
        setPairSuccess(false);
        dialogRef.current?.close('submitted');
      }, 700);
    }
  };

  const copyCurrentPairCode = () => {
    if (currentUser?.pairCode) {
      navigator.clipboard.writeText(currentUser.pairCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const inputCls =
    'w-full bg-[#121212] border border-white/15 rounded-xl px-4 py-2.5 text-white placeholder-neutral-500 text-sm focus:border-[#ff5500] focus:outline-none transition';
  const labelCls = 'block text-xs font-bold text-neutral-300 mb-1.5';

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as any)}
      className="m-auto w-[calc(100%-1.5rem)] max-w-md max-h-[90dvh] overflow-y-auto ytm-scroller rounded-2xl bg-[#181818] border border-white/10 text-white p-0 shadow-2xl"
    >
      <div className="relative p-6 sm:p-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close dialog"
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex justify-center mb-3">
            <Logo />
          </div>
          <h1 id={titleId} className="text-2xl font-extrabold text-white tracking-tight">
            Account &amp; Sync
          </h1>
          <p className="text-neutral-400 text-xs mt-1">
            Sign in or register to save and sync your playlists across devices
          </p>
        </div>

        {/* Tab Navigation */}
        <div
          role="tablist"
          aria-label="Account options"
          className="grid grid-cols-3 gap-1 bg-[#121212] p-1 rounded-xl text-xs font-extrabold text-center mb-6 border border-white/5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'login'}
            onClick={() => handleTabChange('login')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'login' ? 'bg-[#ff5500] text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'register'}
            onClick={() => handleTabChange('register')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'register' ? 'bg-[#ff5500] text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pair'}
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
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: SIGN IN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-login-email" className={labelCls}>
                Email Address
              </label>
              <input
                id="auth-login-email"
                name="email"
                type="email"
                autoComplete="username"
                spellCheck={false}
                enterKeyHint="next"
                required
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="auth-login-password" className={labelCls}>
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  enterKeyHint="done"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputCls} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full mt-2 bg-[#ff5500] hover:bg-[#ff7a00] text-white font-extrabold py-3 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Sign In</span>
            </button>

            <p className="text-center text-xs text-neutral-400 pt-1">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => handleTabChange('register')}
                className="text-white font-semibold hover:underline"
              >
                Create one
              </button>
            </p>
          </form>
        )}

        {/* TAB 2: REGISTER */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-register-name" className={labelCls}>
                Full Name
              </label>
              <input
                id="auth-register-name"
                name="name"
                type="text"
                autoComplete="name"
                enterKeyHint="next"
                required
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your display name"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="auth-register-email" className={labelCls}>
                Email Address
              </label>
              <input
                id="auth-register-email"
                name="email"
                type="email"
                autoComplete="username"
                spellCheck={false}
                enterKeyHint="next"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="auth-register-password" className={labelCls}>
                Password (at least 6 characters)
              </label>
              <div className="relative">
                <input
                  id="auth-register-password"
                  name="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={6}
                  enterKeyHint="done"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputCls} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && password.length < 6 && (
                <p className="text-[11px] text-red-400 mt-1">
                  Password must be at least 6 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim() || !email.trim() || password.length < 6}
              className="w-full bg-[#ff5500] hover:bg-[#ff7a00] text-white font-extrabold py-3 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Create Account</span>
            </button>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full text-white text-sm font-black flex items-center justify-center border border-white/20 flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${selectedColor.from}, ${selectedColor.to})`,
                  }}
                  aria-hidden="true"
                >
                  {displayLetter}
                </div>
                <span className="text-xs font-bold text-neutral-400">Avatar Accent</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {AVATAR_COLORS.map((color, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Select avatar color ${idx + 1}`}
                    aria-pressed={selectedColorIndex === idx}
                    onClick={() => setSelectedColorIndex(idx)}
                    className="w-6 h-6 rounded-full border-2 transition transform active:scale-95"
                    style={{
                      background: `linear-gradient(135deg, ${color.from}, ${color.to})`,
                      borderColor: selectedColorIndex === idx ? '#ffffff' : 'transparent',
                      transform: selectedColorIndex === idx ? 'scale(1.12)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>

            <p className="text-center text-xs text-neutral-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleTabChange('login')}
                className="text-white font-semibold hover:underline"
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* TAB 3: DEVICE PAIR CODE SYNC */}
        {activeTab === 'pair' && (
          <div className="space-y-5">
            {currentUser?.pairCode && (
              <div className="p-4 bg-[#121212] border border-white/10 rounded-xl text-center">
                <p className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider mb-1">
                  Your Device Pair Code
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-black tracking-widest text-[#ff5500]">
                    {currentUser.pairCode}
                  </span>
                  <button
                    type="button"
                    onClick={copyCurrentPairCode}
                    className="p-1.5 rounded-lg bg-white/5 text-[#ff5500] hover:bg-white/10 transition"
                    aria-label="Copy pair code"
                    title="Copy code"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Enter this code on another device to pair!
                </p>
              </div>
            )}

            <form onSubmit={handlePairSubmit} className="space-y-3">
              <label htmlFor="auth-pair-code" className="block text-xs font-bold text-neutral-300">
                Enter Pair Code From Other Device
              </label>
              <input
                id="auth-pair-code"
                name="pairCode"
                type="text"
                autoFocus
                maxLength={12}
                enterKeyHint="done"
                required
                value={pairInput}
                onChange={e => setPairInput(e.target.value)}
                placeholder="KV-849201 or 849201"
                className="w-full bg-[#121212] border border-white/15 rounded-xl px-4 py-3 text-center text-lg font-black tracking-widest text-[#ff5500] placeholder-neutral-500 uppercase focus:border-[#ff5500] focus:outline-none transition"
              />

              {pairSuccess && (
                <p className="text-xs text-green-400 text-center font-bold">Pair successful!</p>
              )}

              <button
                type="submit"
                disabled={loading || !pairInput.trim()}
                className="w-full bg-[#ff5500] hover:bg-[#ff7a00] text-white font-extrabold py-3 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Connect &amp; Sync Device</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </dialog>
  );
};

export default LoginModal;
