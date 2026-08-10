import { useState } from 'react';
import { X, RefreshCcw, Check, Trash2, Volume2, QrCode, Copy, Cpu } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { useAuthStore } from '../stores/authStore';
import Logo from './Logo';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const qualityPreference = usePlayerStore(s => s.qualityPreference);
    const setQualityPreference = usePlayerStore(s => s.setQualityPreference);
    const currentUser = useAuthStore(s => s.user);
    const generatePairCode = useAuthStore(s => s.generatePairCode);
    const linkPairCode = useAuthStore(s => s.linkPairCode);

    const [isUpdating, setIsUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [updateLog, setUpdateLog] = useState<string>('');
    const [isClearingCache, setIsClearingCache] = useState(false);
    const [pairInput, setPairInput] = useState('');
    const [pairMsg, setPairMsg] = useState('');
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleUpdateYtdlp = async () => {
        if (isUpdating) return;
        setIsUpdating(true);
        setUpdateStatus('loading');
        setUpdateLog('');

        try {
            const response = await fetch('/api/settings/update-ytdlp', { method: 'POST' });
            const data = await response.json();

            if (response.ok) {
                setUpdateStatus('success');
                setUpdateLog(data.output || 'Cập nhật thành công core extractor!');
            } else {
                setUpdateStatus('error');
                setUpdateLog(data.error || 'Cập nhật thất bại.');
            }
        } catch (e) {
            setUpdateStatus('error');
            setUpdateLog('Lỗi kết nối máy chủ.');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleClearCache = () => {
        setIsClearingCache(true);
        localStorage.removeItem('nct_browse_cache_v1');
        localStorage.removeItem('last_search_results');
        localStorage.removeItem('initial_tracks_cache_v1');

        setTimeout(() => {
            setIsClearingCache(false);
            alert("Đã xóa bộ nhớ đệm cache thành công! Ứng dụng sẽ tải dữ liệu mới.");
        }, 600);
    };

    const handleCopyPairCode = () => {
        if (currentUser?.pairCode) {
            navigator.clipboard.writeText(currentUser.pairCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleLinkPairCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPairMsg('');
        if (!pairInput.trim()) return;
        const ok = await linkPairCode(pairInput.trim());
        if (ok) {
            setPairMsg('✅ Đã đồng bộ tài khoản thành công!');
            setPairInput('');
        } else {
            setPairMsg('❌ Mã Pair Code không đúng.');
        }
    };

    const handleGeneratePairCode = async () => {
        const code = await generatePairCode();
        if (code) {
            setPairMsg('✅ Đã tạo mã mới: ' + code);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-2xl bg-[#0b132d] border border-cyan-500/30 md:rounded-3xl rounded-2xl overflow-hidden flex flex-col shadow-2xl shadow-cyan-500/10 text-white max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Top Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-[#0f1938]">
                    <div className="flex items-center gap-3">
                        <Logo />
                        <span className="text-xs font-bold text-neutral-400">| Cài Đặt Hệ Thống</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-cyan-500/10 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                    {/* SECTION 1: Audio Quality */}
                    <section className="bg-[#142044] border border-cyan-500/20 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Volume2 className="w-4 h-4 text-cyan-400" />
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">Chất Lượng Âm Thanh</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                                { id: 'auto', label: 'Tự Động', desc: 'Linh hoạt' },
                                { id: 'lossless', label: 'Lossless', desc: 'FLAC / 320kbps' },
                                { id: 'high', label: 'Cao (256k)', desc: 'Chất lượng cao' },
                                { id: 'standard', label: 'Tiêu Chuẩn', desc: 'Tiết kiệm data' },
                            ].map(q => (
                                <button
                                    key={q.id}
                                    onClick={() => setQualityPreference(q.id as any)}
                                    className={`p-3 rounded-xl border text-left transition ${qualityPreference === q.id ? 'bg-gradient-to-br from-[#00a8ff]/20 to-[#2e86de]/30 border-cyan-400 text-white shadow-md' : 'bg-[#0b132d]/60 border-cyan-500/10 text-neutral-400 hover:text-white'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-white">{q.label}</span>
                                        {qualityPreference === q.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                                    </div>
                                    <p className="text-[10px] text-neutral-400 mt-1">{q.desc}</p>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* SECTION 2: Device Pair Code Sync */}
                    <section className="bg-[#142044] border border-cyan-500/20 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <QrCode className="w-4 h-4 text-cyan-400" />
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">Đồng Bộ Mã Pair Code Thiết Bị</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-[#0b132d]/80 p-4 rounded-xl border border-cyan-500/20 text-center flex flex-col items-center justify-center">
                                <p className="text-[11px] text-neutral-400 font-bold mb-1">Mã Pair Code Hiện Tại</p>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl font-black text-cyan-400 tracking-widest">{currentUser?.pairCode || 'KV-849201'}</span>
                                    <button
                                        onClick={handleCopyPairCode}
                                        className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <button
                                    onClick={handleGeneratePairCode}
                                    className="text-[11px] font-bold text-cyan-400 hover:underline"
                                >
                                    Tạo Mã Mới
                                </button>
                            </div>

                            <form onSubmit={handleLinkPairCodeSubmit} className="bg-[#0b132d]/80 p-4 rounded-xl border border-cyan-500/20 space-y-2">
                                <label className="block text-[11px] font-bold text-neutral-300">Nhập Mã Pair Để Ghép Nối</label>
                                <input
                                    type="text"
                                    value={pairInput}
                                    onChange={e => setPairInput(e.target.value)}
                                    placeholder="VD: KV-849201"
                                    className="w-full bg-[#142044] border border-cyan-500/30 rounded-lg px-3 py-2 text-center text-sm font-bold text-cyan-300 placeholder-neutral-500 uppercase focus:border-cyan-400 focus:outline-none"
                                />
                                {pairMsg && <p className="text-[11px] font-bold text-cyan-400">{pairMsg}</p>}
                                <button
                                    type="submit"
                                    className="w-full py-2 bg-gradient-to-r from-[#00a8ff] to-[#2e86de] hover:brightness-110 text-white font-bold text-xs rounded-lg transition"
                                >
                                    Đồng Bộ Ngay
                                </button>
                            </form>
                        </div>
                    </section>

                    {/* SECTION 3: Storage & Core Update */}
                    <section className="bg-[#142044] border border-cyan-500/20 rounded-2xl p-4 space-y-4">
                        <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-cyan-400" />
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">Hệ Thống & Bộ Nhớ Cache</h3>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-[#0b132d]/80 border border-cyan-500/10 rounded-xl">
                            <div>
                                <h4 className="text-xs font-bold text-white">Xóa Bộ Nhớ Đệm Cache</h4>
                                <p className="text-[10px] text-neutral-400">Xóa dữ liệu duyệt tạm thời để làm mới danh sách bài hát</p>
                            </div>
                            <button
                                onClick={handleClearCache}
                                disabled={isClearingCache}
                                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/30 transition disabled:opacity-50"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Xóa Cache</span>
                            </button>
                        </div>

                        <div className="p-3 bg-[#0b132d]/80 border border-cyan-500/10 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-bold text-white">Cập Nhật Engine YouTube (yt-dlp)</h4>
                                    <p className="text-[10px] text-neutral-400">Cập nhật công cụ bóc tách nhạc mượt mà hơn</p>
                                </div>
                                <button
                                    onClick={handleUpdateYtdlp}
                                    disabled={isUpdating}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#00a8ff] to-[#2e86de] text-white rounded-lg text-xs font-bold hover:brightness-110 transition disabled:opacity-50"
                                >
                                    <RefreshCcw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                                    <span>{isUpdating ? 'Đang Cập Nhật...' : 'Check Update'}</span>
                                </button>
                            </div>
                            {updateLog && (
                                <pre className="p-2.5 bg-black/60 rounded-lg text-[10px] text-cyan-300 font-mono overflow-x-auto max-h-24 no-scrollbar border border-cyan-500/20">
                                    {updateLog}
                                </pre>
                            )}
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-cyan-500/20 bg-[#0f1938] text-center">
                    <p className="text-[11px] font-extrabold text-cyan-400">kv-music v2.5.0 PRO VIP</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Rust Axum & Tokio High-Performance Audio Engine</p>
                </div>
            </div>
        </div>
    );
}
