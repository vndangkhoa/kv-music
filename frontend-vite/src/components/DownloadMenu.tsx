import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Check, AlertTriangle, Music, Video } from 'lucide-react';
import { Track } from '../types';
import { DownloadMode, downloadTracks } from '../services/download';

interface DownloadMenuProps {
    tracks: Track[];
    className?: string;
    iconClassName?: string;
    label?: string;
}

type Status = 'idle' | 'downloading' | 'done' | 'error';

export default function DownloadMenu({
    tracks,
    className = '',
    iconClassName = 'w-5 h-5',
    label,
}: DownloadMenuProps) {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<Status>('idle');
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;
        const onDocClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [open]);

    useEffect(() => {
        if (status !== 'done' && status !== 'error') return;
        const t = setTimeout(() => setStatus('idle'), 2500);
        return () => clearTimeout(t);
    }, [status]);

    const run = async (mode: DownloadMode) => {
        setOpen(false);
        setStatus('downloading');
        setProgress({ done: 0, total: tracks.length });
        try {
            const result = await downloadTracks(tracks, mode, (done, total) => setProgress({ done, total }));
            setStatus(result.failed > 0 && result.ok === 0 ? 'error' : 'done');
        } catch {
            setStatus('error');
        }
    };

    const disabled = status === 'downloading' || tracks.length === 0;

    return (
        <div ref={containerRef} className="relative inline-flex">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(o => !o);
                }}
                disabled={disabled}
                title={tracks.length > 1 ? `Download ${tracks.length} songs` : 'Download'}
                className={`flex items-center gap-2 ${className}`}
            >
                {status === 'downloading' ? (
                    <Loader2 className={`${iconClassName} animate-spin`} />
                ) : status === 'done' ? (
                    <Check className={`${iconClassName} text-green-500`} />
                ) : status === 'error' ? (
                    <AlertTriangle className={`${iconClassName} text-red-500`} />
                ) : (
                    <Download className={iconClassName} />
                )}
                {label && <span>{label}</span>}
                {status === 'downloading' && (
                    <span className="text-xs tabular-nums">{progress.done}/{progress.total}</span>
                )}
            </button>

            {open && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full right-0 mt-2 z-50 min-w-[230px] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-1.5 flex flex-col"
                >
                    <button
                        onClick={() => run('audio')}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition text-left"
                    >
                        <Music className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">Audio</p>
                            <p className="text-[10px] text-neutral-400">.webm (Opus) / .m4a • small file</p>
                        </div>
                    </button>
                    <button
                        onClick={() => run('video')}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition text-left"
                    >
                        <Video className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">Video (HD)</p>
                            <p className="text-[10px] text-neutral-400">.mp4 • best video + audio, up to 1080p</p>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
