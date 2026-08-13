import { useState } from 'react';
import { X, RefreshCcw, Check, Trash2, Volume2, QrCode, Copy, Cpu, Cookie } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { useAuthStore } from '../stores/authStore';
import Logo from './Logo';
import { safeStorage } from '../utils/safeStorage';

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
    const [updateLog, setUpdateLog] = useState<string>('');
    const [isFetchingCookies, setIsFetchingCookies] = useState(false);
    const [cookieLog, setCookieLog] = useState<string>('');
    const [isClearingCache, setIsClearingCache] = useState(false);
    const [pairInput, setPairInput] = useState('');
    const [pairMsg, setPairMsg] = useState('');
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleUpdateYtdlp = async () => {
        if (isUpdating) return;
        setIsUpdating(true);
        setUpdateLog('');

        try {
            const response = await fetch('/api/settings/update-ytdlp', { method: 'POST' });
            const data = await response.json();

            if (response.ok) {
                setUpdateLog(data.output || 'Successfully updated core extractor!');
            } else {
                setUpdateLog(data.error || 'Update failed.');
            }
        } catch {
            setUpdateLog('Server connection error.');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleFetchCookies = async () => {
        if (isFetchingCookies) return;
        setIsFetchingCookies(true);
        setCookieLog('');

        try {
            const response = await fetch('/api/settings/fetch-cookies', { method: 'POST' });
            const data = await response.json();

            if (response.ok) {
                setCookieLog(data.output || 'Successfully fetched new session cookies!');
            } else {
                setCookieLog(data.error || 'Could not fetch new cookies.');
            }
        } catch {
            setCookieLog('Server connection error.');
        } finally {
            setIsFetchingCookies(false);
        }
    };

    const handleClearCache = () => {
        setIsClearingCache(true);
        safeStorage.removeItem('nct_browse_cache_v1');
        safeStorage.removeItem('last_search_results');
        safeStorage.removeItem('initial_tracks_cache_v1');

        setTimeout(() => {
            setIsClearingCache(false);
            alert("Cache cleared successfully! Data will refresh.");
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
            setPairMsg('✅ Device paired successfully!');
            setPairInput('');
        } else {
            setPairMsg('❌ Invalid Pair Code.');
        }
    };

    const handleGeneratePairCode = async () => {
        const code = await generatePairCode();
        if (code) {
            setPairMsg('✅ New pair code generated: ' + code);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-2xl bg-[#181818] border border-white/10 md:rounded-2xl rounded-t-[28px] rounded-b-none overflow-hidden flex flex-col shadow-2xl text-white max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Mobile Drag Handle */}
                <div className="flex justify-center md:hidden pt-3 pb-1">
                    <div className="w-9 h-1.5 rounded-full bg-white/20" />
                </div>

                {/* Top Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#121212]">
                    <div className="flex items-center gap-3">
                        <Logo />
                        <span className="text-xs font-bold text-neutral-400">| System Settings</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                    {/* SECTION 1: Audio Quality */}
                    <section className="bg-[#121212] border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Volume2 className="w-4 h-4 text-[#ff5500]" />
                            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Audio Playback Quality</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                                { id: 'auto', label: 'Auto Stream', desc: 'Adaptive quality' },
                                { id: 'lossless', label: 'Lossless FLAC', desc: '320kbps High fidelity' },
                                { id: 'high', label: 'High (256k)', desc: 'Optimal audio' },
                                { id: 'standard', label: 'Standard', desc: 'Data saver' },
                            ].map(q => (
                                <button
                                    key={q.id}
                                    onClick={() => setQualityPreference(q.id as any)}
                                    className={`p-3 rounded-xl border text-left transition ${
                                        qualityPreference === q.id
                                            ? 'bg-[#ff5500]/10 border-[#ff5500] text-white shadow'
                                            : 'bg-[#181818] border-white/5 text-neutral-400 hover:text-white hover:border-white/20'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-white">{q.label}</span>
                                        {qualityPreference === q.id && <Check className="w-3.5 h-3.5 text-[#ff5500]" />}
                                    </div>
                                    <p className="text-[10px] text-neutral-400 mt-1">{q.desc}</p>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* SECTION 2: Device Pair Code Sync */}
                    <section className="bg-[#121212] border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <QrCode className="w-4 h-4 text-[#ff5500]" />
                            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Device Sync Pair Code</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-[#181818] p-4 rounded-xl border border-white/5 text-center flex flex-col items-center justify-center">
                                <p className="text-[11px] text-neutral-400 font-bold mb-1">Your Device Pair Code</p>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl font-black text-[#ff5500] tracking-widest">{currentUser?.pairCode || 'KV-849201'}</span>
                                    <button
                                        onClick={handleCopyPairCode}
                                        className="p-1.5 rounded-lg bg-white/5 text-[#ff5500] hover:bg-white/10 transition"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <button
                                    onClick={handleGeneratePairCode}
                                    className="text-[11px] font-bold text-[#ff5500] hover:underline"
                                >
                                    Generate New Code
                                </button>
                            </div>

                            <form onSubmit={handleLinkPairCodeSubmit} className="bg-[#181818] p-4 rounded-xl border border-white/5 space-y-2">
                                <label className="block text-[11px] font-bold text-neutral-300">Enter Code To Pair Device</label>
                                <input
                                    type="text"
                                    value={pairInput}
                                    onChange={e => setPairInput(e.target.value)}
                                    placeholder="EX: KV-849201"
                                    className="w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-center text-sm font-bold text-[#ff5500] placeholder-neutral-500 uppercase focus:border-[#ff5500] focus:outline-none"
                                />
                                {pairMsg && <p className="text-[11px] font-bold text-green-400">{pairMsg}</p>}
                                <button
                                    type="submit"
                                    className="w-full py-2 bg-[#ff5500] hover:bg-[#ff7a00] text-white font-bold text-xs rounded-lg transition"
                                >
                                    Sync Now
                                </button>
                            </form>
                        </div>
                    </section>

                    {/* SECTION 3: System & Engine Maintenance */}
                    <section className="bg-[#121212] border border-white/10 rounded-xl p-4 space-y-4">
                        <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-[#ff5500]" />
                            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">System & Storage Cache</h3>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-[#181818] border border-white/5 rounded-xl">
                            <div>
                                <h4 className="text-xs font-bold text-white">Clear Application Cache</h4>
                                <p className="text-[10px] text-neutral-400">Clear temporary browsing cache to force fresh data refresh</p>
                            </div>
                            <button
                                onClick={handleClearCache}
                                disabled={isClearingCache}
                                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500/20 transition disabled:opacity-50"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Clear Cache</span>
                            </button>
                        </div>

                        <div className="p-3 bg-[#181818] border border-white/5 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-bold text-white">Audio Extractor Engine (yt-dlp)</h4>
                                    <p className="text-[10px] text-neutral-400">Update audio stream resolution core</p>
                                </div>
                                <button
                                    onClick={handleUpdateYtdlp}
                                    disabled={isUpdating}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-[#ff5500] hover:bg-[#ff7a00] text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                                >
                                    <RefreshCcw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                                    <span>{isUpdating ? 'Updating...' : 'Check Update'}</span>
                                </button>
                            </div>
                            {updateLog && (
                                <pre className="p-2.5 bg-black/60 rounded-lg text-[10px] text-[#ff7a00] font-mono overflow-x-auto max-h-24 no-scrollbar border border-white/5">
                                    {updateLog}
                                </pre>
                            )}
                        </div>

                        <div className="p-3 bg-[#181818] border border-white/5 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-bold text-white">Session Cookie Rotator</h4>
                                    <p className="text-[10px] text-neutral-400">Rotate session tokens to maintain high-speed playback</p>
                                </div>
                                <button
                                    onClick={handleFetchCookies}
                                    disabled={isFetchingCookies}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-[#ff5500] hover:bg-[#ff7a00] text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                                >
                                    <Cookie className={`w-3.5 h-3.5 ${isFetchingCookies ? 'animate-spin' : ''}`} />
                                    <span>{isFetchingCookies ? 'Fetching...' : 'Fetch Cookies'}</span>
                                </button>
                            </div>
                            {cookieLog && (
                                <pre className="p-2.5 bg-black/60 rounded-lg text-[10px] text-[#ff7a00] font-mono overflow-x-auto max-h-24 no-scrollbar border border-white/5">
                                    {cookieLog}
                                </pre>
                            )}
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-[#121212] text-center">
                    <p className="text-[11px] font-extrabold text-[#ff5500]">kv-music v2.5.0 PRO VIP</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">SoundCloud Engine Edition</p>
                </div>
            </div>
        </div>
    );
}
