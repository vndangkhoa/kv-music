
import { useState } from 'react';
import { X, RefreshCcw, Check, CheckCircle2, Trash2, Database, Volume2, Activity, PlayCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { usePlayer } from '../context/PlayerContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { theme, toggleTheme } = useTheme();
    const { qualityPreference, setQualityPreference } = usePlayer();
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [updateLog, setUpdateLog] = useState<string>('');
    const [isClearingCache, setIsClearingCache] = useState(false);

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
                setUpdateLog(data.output || 'Update successful.');
            } else {
                setUpdateStatus('error');
                setUpdateLog(data.error || 'Update failed.');
            }
        } catch (e) {
            setUpdateStatus('error');
            setUpdateLog('Network error occurred.');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleClearCache = () => {
        setIsClearingCache(true);
        // Wipe common caches
localStorage.removeItem('ytm_browse_cache_v8');
        localStorage.removeItem('ytm_browse_cache_v7');
        localStorage.removeItem('artist_photos_cache_v5');
        localStorage.removeItem('artist_photos_cache_v6');

        // Short delay for feedback
        setTimeout(() => {
            setIsClearingCache(false);
            alert("Cache cleared successfully! The app will reload fresh data.");
        }, 800);
    };

    const isApple = theme === 'apple';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div
                className={`bg-black/90 backdrop-blur-2xl w-full h-full md:h-auto md:max-w-2xl md:rounded-3xl overflow-hidden border-t md:border border-white/10 flex flex-col shadow-2xl transition-all duration-500 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className={`flex items-center justify-between p-5 border-b ${isApple ? 'border-white/10' : 'border-[#282828]'}`}>
                    <div className="flex items-center">
                        <div className={`p-2 rounded-xl ${isApple ? 'bg-[#fa2d48]/20 text-[#fa2d48]' : 'bg-green-500/20 text-green-500'}`}>
                            <Activity className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight">Settings</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-8 no-scrollbar pb-10">

                    {/* Appearance Section */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 opacity-50">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Design System</span>
                        </div>

                        <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                            {/* Spotify Theme */}
                            <button
                                onClick={() => toggleTheme('spotify')}
                                className={`relative group p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col gap-3 text-left ${theme === 'spotify' ? 'border-green-500 bg-[#1db954]/5' : 'border-transparent bg-white/5 hover:bg-white/10'}`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${theme === 'spotify' ? 'bg-green-500 text-black' : 'bg-[#121212]'}`}>
                                        <PlayCircle className="w-7 h-7" />
                                    </div>
                                    {theme === 'spotify' && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                                </div>
                                <div>
                                    <div className="font-bold text-lg">Spotify</div>
                                    <div className="text-xs text-neutral-400">Classic immersive dark mode</div>
                                </div>
                            </button>

                            {/* Apple Music Theme */}
                            <button
                                onClick={() => toggleTheme('apple')}
                                className={`relative group p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col gap-3 text-left ${theme === 'apple' ? 'border-[#fa2d48] bg-[#fa2d48]/5' : 'border-transparent bg-white/5 hover:bg-white/10'}`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${theme === 'apple' ? 'bg-gradient-to-br from-[#fa2d48] to-[#5856d6] text-white' : 'bg-[#121212]'}`}>
                                        <span className="text-xl font-bold"></span>
                                    </div>
                                    {theme === 'apple' && <CheckCircle2 className="w-6 h-6 text-[#fa2d48]" />}
                                </div>
                                <div>
                                    <div className="font-bold text-lg">Apple Music</div>
                                    <div className="text-xs text-neutral-400">Liquid glass & vibrant blurs</div>
                                </div>
                            </button>
                        </div>
                    </section>

                    {/* Audio Section */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 opacity-50">
                            <Volume2 className="w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Audio Experience</span>
                        </div>

                        <div className={`p-5 rounded-2xl border ${isApple ? 'bg-[#2c2c2e]/50 border-white/5' : 'bg-[#181818] border-[#282828]'}`}>
                            <label className="block text-sm font-semibold mb-3">Audio Quality</label>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                {(['auto', 'high', 'normal', 'low'] as const).map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => setQualityPreference(q)}
                                        className={`py-2.5 px-3 rounded-xl text-[10px] md:text-xs font-black capitalize transition-all ${qualityPreference === q
                                            ? (isApple ? 'bg-[#fa2d48] text-white shadow-lg shadow-[#fa2d48]/20' : 'bg-green-500 text-black')
                                            : 'bg-white/5 hover:bg-white/10 text-neutral-400'}`}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] text-neutral-500 mt-4 leading-relaxed italic text-center px-2">
                                High quality requires a stable internet connection for seamless playback.
                            </p>
                        </div>
                    </section>

                    {/* System Section */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 opacity-50">
                            <Database className="w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">System & Storage</span>
                        </div>

                        <div className="space-y-3">
                            {/* Core Update */}
                            <div className={`p-4 md:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isApple ? 'bg-[#2c2c2e]/50 border-white/5' : 'bg-[#181818] border-[#282828]'}`}>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm flex items-center gap-2 mb-1">
                                        Core Update
                                        <span className="text-[8px] md:text-[9px] bg-white/10 px-1.5 py-0.5 rounded-full text-neutral-400 font-mono flex-shrink-0">yt-dlp nightly</span>
                                    </div>
                                    <p className="text-[10px] md:text-[11px] text-neutral-400">Keep the extraction engine fresh for new content.</p>
                                </div>
                                <button
                                    onClick={handleUpdateYtdlp}
                                    disabled={isUpdating}
                                    className={`w-full sm:w-auto px-6 py-2.5 rounded-full font-black text-[10px] md:text-xs flex items-center justify-center gap-2 transition-all flex-shrink-0 ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'} ${isApple ? 'bg-[#fa2d48] text-white hover:bg-[#ff3b5c]' : 'bg-green-500 text-black hover:bg-[#1ed760]'}`}
                                >
                                    <RefreshCcw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                                    {isUpdating ? 'Executing...' : 'Update Engine'}
                                </button>
                            </div>

                            {/* Clear Cache */}
                            <div className={`p-4 md:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isApple ? 'bg-[#2c2c2e]/50 border-white/5' : 'bg-[#181818] border-[#282828]'}`}>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm mb-1">Clear Local Cache</div>
                                    <p className="text-[10px] md:text-[11px] text-neutral-400">Wipe browse and image caches if data feels stale.</p>
                                </div>
                                <button
                                    onClick={handleClearCache}
                                    disabled={isClearingCache}
                                    className={`w-full sm:w-auto px-6 py-2.5 rounded-full font-black text-[10px] md:text-xs flex items-center justify-center gap-2 transition-all hover:bg-neutral-800 border border-white/10 flex-shrink-0 ${isClearingCache ? 'animate-pulse' : 'active:scale-95'}`}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {isClearingCache ? 'Clearing...' : 'Wipe Cache'}
                                </button>
                            </div>
                        </div>

                        {/* Logs Reveal */}
                        {(updateStatus !== 'idle' || updateLog) && (
                            <div className="mt-4 p-4 bg-black/80 rounded-2xl font-mono text-[10px] text-green-500/80 border border-green-500/10 max-h-32 overflow-y-auto no-scrollbar">
                                <div className="mb-2 opacity-50 uppercase tracking-widest text-[8px]">Operation Log</div>
                                {updateLog || 'Initializing...'}
                                {updateStatus === 'loading' && <span className="animate-pulse ml-1 text-white">_</span>}
                            </div>
                        )}
                    </section>

                    <div className="pt-6 flex flex-col items-center gap-2 opacity-30 group cursor-default">
                        <div className="h-px w-24 bg-white/20 group-hover:w-full transition-all duration-700" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">KV Spotify Clone v1.0.0</span>
                    </div>

                </div>
            </div>
        </div>
    );
}
