
import { useState } from 'react';
import { X, RefreshCcw, Check, CheckCircle2, Circle, Smartphone, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { theme, toggleTheme } = useTheme();
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [updateLog, setUpdateLog] = useState<string>('');

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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className={`relative w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl border transition-colors duration-300 ${theme === 'apple' ? 'bg-[#1c1c1e]/80 border-white/10 text-white' : 'bg-[#121212] border-[#282828] text-white'}`}>

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold">Settings</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">

                    {/* Appearance Section */}
                    <section>
                        <h3 className="text-sm font-semibold mb-3 text-neutral-400 uppercase tracking-wider text-xs">Appearance</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Spotify Theme Option */}
                            <button
                                onClick={() => toggleTheme('spotify')}
                                className={`relative group p-3 rounded-xl border-2 transition-all duration-300 flex items-center gap-3 text-left ${theme === 'spotify' ? 'border-green-500 bg-[#181818]' : 'border-transparent bg-[#181818] hover:bg-[#282828]'}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-[#121212] flex items-center justify-center border border-[#282828]">
                                    <div className="w-5 h-5 rounded-full bg-green-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-base">Spotify</div>
                                    <div className="text-xs text-neutral-400">Classic Dark Mode</div>
                                </div>
                                {theme === 'spotify' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                            </button>

                            {/* Apple Music Theme Option */}
                            <button
                                onClick={() => toggleTheme('apple')}
                                className={`relative group p-3 rounded-xl border-2 transition-all duration-300 flex items-center gap-3 text-left ${theme === 'apple' ? 'border-[#fa2d48] bg-[#2c2c2e]' : 'border-transparent bg-[#181818] hover:bg-[#282828]'}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fa2d48] to-[#5856d6] flex items-center justify-center">
                                    <div className="w-5 h-5 text-white"></div>
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-base">Apple Music</div>
                                    <div className="text-xs text-neutral-400">Liquid Glass & Blur</div>
                                </div>
                                {theme === 'apple' && <CheckCircle2 className="w-5 h-5 text-[#fa2d48]" />}
                            </button>
                        </div>
                    </section>

                    {/* System Section */}
                    <section>
                        <h3 className="text-sm font-semibold mb-3 text-neutral-400 uppercase tracking-wider text-xs">System</h3>

                        <div className={`p-4 rounded-xl border ${theme === 'apple' ? 'bg-[#2c2c2e] border-white/5' : 'bg-[#181818] border-[#282828]'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className="font-semibold text-base flex items-center gap-2">
                                        Core Update
                                        <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-neutral-400">yt-dlp nightly</span>
                                    </div>
                                    <p className="text-xs text-neutral-400 mt-1">Updates the underlying download engine.</p>
                                </div>
                                <button
                                    onClick={handleUpdateYtdlp}
                                    disabled={isUpdating}
                                    className={`px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2 transition ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'} ${theme === 'apple' ? 'bg-[#fa2d48] text-white' : 'bg-green-500 text-black'}`}
                                >
                                    <RefreshCcw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                                    {isUpdating ? 'Updating...' : 'Update'}
                                </button>
                            </div>

                            {/* Logs */}
                            {(updateStatus !== 'idle' || updateLog) && (
                                <div className="mt-3 p-3 bg-black/50 rounded-lg font-mono text-[10px] text-neutral-300 max-h-24 overflow-y-auto whitespace-pre-wrap">
                                    {updateStatus === 'loading' && <span className="text-blue-400">Executing update command...{'\n'}</span>}
                                    {updateLog}
                                    {updateStatus === 'success' && <span className="text-green-400">{'\n'}Done!</span>}
                                    {updateStatus === 'error' && <span className="text-red-400">{'\n'}Error Occurred.</span>}
                                </div>
                            )}
                        </div>
                    </section>

                    <div className="text-center text-[10px] text-neutral-500 pt-4">
                        KV Spotify Clone v1.0.0
                    </div>

                </div>
            </div>
        </div>
    );
}
