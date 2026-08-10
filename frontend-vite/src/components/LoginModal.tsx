import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { User, LogIn, UserPlus, QrCode, Sparkles, X, Check, Copy, Loader2, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GradientColor {
  from: string;
  to: string;
}

const AVATAR_COLORS: GradientColor[] = [
  { from: '#00a8ff', to: '#2e86de' },  // NCT Cyan Blue
  { from: '#00d2d3', to: '#01a3a4' },  // Teal Glow
  { from: '#ff6b6b', to: '#ee5a24' },  // Coral
  { from: '#a29bfe', to: '#6c5ce7' },  // Lavender
  { from: '#fdcb6e', to: '#e17055' },  // Sunset
  { from: '#74b9ff', to: '#0984e3' },  // Ocean
  { from: '#fd79a8', to: '#e84393' },  // Pink
  { from: '#55efc4', to: '#00b894' },  // Emerald
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

  const inputCls = "w-full bg-[#142044] border border-cyan-500/20 rounded-xl px-4 py-2.5 text-white placeholder-neutral-500 text-sm focus:border-cyan-400 focus:outline-none transition";
  const labelCls = "block text-xs font-bold text-neutral-300 mb-1.5";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-[#0d1636]/95 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-500/10 text-white overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow backdrop decorative effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-cyan-500/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-400 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>KV-MUSIC SYNC PASS</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Tài Khoản & Đồng Bộ</h2>
          <p className="text-neutral-400 text-xs mt-1">Đăng nhập để đồng bộ nhạc và danh sách phát mọi thiết bị</p>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-1 bg-[#142044] p-1 rounded-xl border border-cyan-500/20 mb-6 text-xs font-extrabold text-center">
          <button
            onClick={() => handleTabChange('login')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${activeTab === 'login' ? 'bg-gradient-to-r from-[#00a8ff] to-[#2e86de] text-white shadow' : 'text-neutral-400 hover:text-white'}`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng Nhập</span>
          </button>
          <button
            onClick={() => handleTabChange('register')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${activeTab === 'register' ? 'bg-gradient-to-r from-[#00a8ff] to-[#2e86de] text-white shadow' : 'text-neutral-400 hover:text-white'}`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Đăng Ký</span>
          </button>
          <button
            onClick={() => handleTabChange('pair')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${activeTab === 'pair' ? 'bg-gradient-to-r from-[#00a8ff] to-[#2e86de] text-white shadow' : 'text-neutral-400 hover:text-white'}`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Mã Pair</span>
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Email</label>
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
              <label className={labelCls}>Mật khẩu</label>
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
              className="w-full mt-2 bg-gradient-to-r from-[#00a8ff] to-[#2e86de] hover:brightness-110 text-white font-bold py-3 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Đăng Nhập
            </button>
          </form>
        )}

        {/* TAB 2: REGISTER */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="flex justify-center mb-2">
              <div
                className="w-16 h-16 rounded-full text-white text-2xl font-black flex items-center justify-center shadow-lg border-2 border-cyan-400/40"
                style={{ background: `linear-gradient(135deg, ${selectedColor.from}, ${selectedColor.to})` }}
              >
                {displayLetter}
              </div>
            </div>

            <div>
              <label className={labelCls}>Họ và Tên</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tên thành viên mới"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Địa chỉ Email</label>
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
              <label className={labelCls}>Mật khẩu (tối thiểu 6 ký tự)</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
              />
              {password.length > 0 && password.length < 6 && (
                <p className="text-[11px] text-red-400 mt-1">Mật khẩu phải có ít nhất 6 ký tự</p>
              )}
            </div>

            <div>
              <label className={labelCls}>Xác nhận mật khẩu</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
              />
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <p className="text-[11px] text-red-400 mt-1">Mật khẩu không khớp</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-2">Màu Avatar cá nhân</label>
              <div className="flex items-center justify-center gap-2.5 flex-wrap">
                {AVATAR_COLORS.map((color, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedColorIndex(idx)}
                    className="w-8 h-8 rounded-full border-2 transition transform active:scale-95"
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
              className="w-full mt-2 bg-gradient-to-r from-[#00a8ff] to-[#2e86de] hover:brightness-110 text-white font-bold py-3 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Đăng Ký Tài Khoản
            </button>
          </form>
        )}

        {/* TAB 3: DEVICE PAIR CODE SYNC */}
        {activeTab === 'pair' && (
          <div className="space-y-5">
            {/* Show Current Pair Code if logged in */}
            {currentUser?.pairCode && (
              <div className="p-4 bg-[#142044] border border-cyan-500/30 rounded-2xl text-center">
                <p className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Mã Pair Code Thiết Bị Này</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-black tracking-widest text-cyan-400">{currentUser.pairCode}</span>
                  <button
                    onClick={copyCurrentPairCode}
                    className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition"
                    title="Sao chép mã"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">Nhập mã này trên TV/Laptop khác để đồng bộ tài khoản!</p>
              </div>
            )}

            {/* Input box to pair another device */}
            <form onSubmit={handlePairSubmit} className="space-y-3">
              <label className="block text-xs font-bold text-neutral-300">Nhập Mã Pair Code Từ Thiết Bị Khác</label>
              <input
                type="text"
                value={pairInput}
                onChange={e => setPairInput(e.target.value)}
                placeholder="VD: KV-849201"
                className="w-full bg-[#142044] border border-cyan-500/30 rounded-xl px-4 py-3 text-center text-lg font-black tracking-widest text-cyan-300 placeholder-neutral-500 uppercase focus:border-cyan-400 focus:outline-none transition"
              />

              {pairSuccess && <p className="text-xs text-green-400 text-center font-bold">✅ Đồng bộ thành công!</p>}

              <button
                type="submit"
                disabled={loading || !pairInput.trim()}
                className="w-full bg-gradient-to-r from-teal-400 to-cyan-500 hover:brightness-110 text-black font-extrabold py-3 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Kết Nối & Đồng Bộ Thiết Bị
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
