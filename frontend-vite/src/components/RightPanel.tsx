import { useEffect, useState } from 'react';
import { X, Play, Pause, Sparkles, Disc, User } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { libraryService } from '../services/library';
import { Track } from '../types';
import CoverImage from './CoverImage';
import { Link } from 'react-router-dom';

export default function RightPanel() {
    const {
        currentTrack,
        isPlaying,
        togglePlay,
        playTrack,
        queue,
        isRightPanelOpen,
        rightPanelTab,
        setRightPanelTab,
        closeRightPanel
    } = usePlayer();

    // Related State
    const [related, setRelated] = useState<{
        tracks: Track[];
        albums: any[];
        artists: any[];
    }>({ tracks: [], albums: [], artists: [] });
    const [loadingRelated, setLoadingRelated] = useState(false);

    useEffect(() => {
        if (!currentTrack || !isRightPanelOpen || rightPanelTab !== 'related') return;

        const fetchRelated = async () => {
            setLoadingRelated(true);
            try {
                const data = await libraryService.getRelatedContent(
                    currentTrack.artist || currentTrack.title,
                    'track',
                    10
                );
                setRelated({
                    tracks: data.tracks || [],
                    albums: data.albums || [],
                    artists: data.artists || []
                });
            } catch (e) {
                console.error("Failed to load related content", e);
            } finally {
                setLoadingRelated(false);
            }
        };

        fetchRelated();
    }, [currentTrack, isRightPanelOpen, rightPanelTab]);

    if (!isRightPanelOpen || !currentTrack) return null;

    return (
        <aside className="fixed lg:relative inset-0 lg:inset-auto z-50 lg:z-10 w-full lg:w-[340px] xl:w-[380px] h-full bg-[#121212]/95 backdrop-blur-xl border-t lg:border-t-0 border-l border-white/[0.06] flex flex-col flex-shrink-0 select-none animate-in slide-in-from-right duration-200">

            {/* Tabs */}
            <div className="flex items-center border-b border-white/[0.06] px-1">
                <div className="flex flex-1">
                    {([
                        { key: 'queue' as const, label: 'Queue' },
                        { key: 'related' as const, label: 'Related' },
                    ]).map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setRightPanelTab(key)}
                            className={`flex-1 py-3.5 text-[13px] font-semibold transition border-b-2 ${
                                rightPanelTab === key
                                    ? 'border-white text-white'
                                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={closeRightPanel}
                    className="p-1.5 mr-2 text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">

                {/* QUEUE TAB */}
                {rightPanelTab === 'queue' && (
                    <div className="space-y-4">
                        {/* Now Playing */}
                        <div>
                            <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-1">Now Playing</div>
                            <div className="flex items-center gap-3 p-2.5 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                                <CoverImage src={currentTrack.cover_url} alt={currentTrack.title} className="w-11 h-11 rounded-lg object-cover" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-semibold text-white truncate">{currentTrack.title}</div>
                                    <div className="text-[11px] text-neutral-500 truncate">{currentTrack.artist}</div>
                                </div>
                                <button
                                    onClick={togglePlay}
                                    className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition"
                                >
                                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                                </button>
                            </div>
                        </div>

                        {/* Queue */}
                        <div>
                            <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-1">Next Up</div>
                            {queue.length === 0 ? (
                                <div className="text-neutral-600 text-[13px] px-1 py-6 text-center">Queue is empty</div>
                            ) : (
                                <div className="space-y-0.5">
                                    {queue.map((track, idx) => {
                                        const isCurrent = track.id === currentTrack.id;
                                        return (
                                            <div
                                                key={`${track.id}-${idx}`}
                                                onClick={() => playTrack(track, queue)}
                                                className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:bg-white/5 transition ${
                                                    isCurrent ? 'bg-white/[0.06]' : ''
                                                }`}
                                            >
                                                <CoverImage src={track.cover_url} alt={track.title} className="w-9 h-9 rounded-md object-cover" />
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-[13px] font-medium truncate ${isCurrent ? 'text-white' : 'text-neutral-300'}`}>
                                                        {track.title}
                                                    </div>
                                                    <div className="text-[11px] text-neutral-500 truncate">{track.artist}</div>
                                                </div>
                                                <div className="text-[11px] text-neutral-600 w-10 text-right">
                                                    {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : ''}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* RELATED TAB */}
                {rightPanelTab === 'related' && (
                    <div className="space-y-5">
                        {loadingRelated ? (
                            <div className="space-y-3 py-6 animate-pulse">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 px-2 py-2">
                                        <div className="w-9 h-9 bg-white/[0.06] rounded-md" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3.5 bg-white/[0.06] rounded w-3/4" />
                                            <div className="h-3 bg-white/[0.06] rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <>
                                {/* Similar Songs */}
                                {related.tracks.length > 0 && (
                                    <div>
                                        <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                                            <Sparkles className="w-3 h-3 text-purple-400" /> Similar Songs
                                        </div>
                                        <div className="space-y-0.5">
                                            {related.tracks.slice(0, 6).map((track) => (
                                                <div
                                                    key={track.id}
                                                    onClick={() => playTrack(track, related.tracks)}
                                                    className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:bg-white/5 transition group"
                                                >
                                                    <CoverImage src={track.cover_url} alt={track.title} className="w-9 h-9 rounded-md object-cover" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[13px] font-medium text-neutral-300 truncate group-hover:text-white transition">{track.title}</div>
                                                        <div className="text-[11px] text-neutral-500 truncate">{track.artist}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Albums */}
                                {related.albums.length > 0 && (
                                    <div>
                                        <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                                            <Disc className="w-3 h-3 text-blue-400" /> Albums
                                        </div>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            {related.albums.slice(0, 4).map((album) => (
                                                <Link
                                                    to={`/album/${album.id}`}
                                                    key={album.id}
                                                    onClick={closeRightPanel}
                                                    className="group"
                                                >
                                                    <CoverImage src={album.cover_url} alt={album.title} className="w-full aspect-square rounded-lg object-cover group-hover:scale-[1.02] transition" />
                                                    <div className="text-[12px] font-medium text-neutral-300 truncate mt-1.5 group-hover:text-white transition">{album.title}</div>
                                                    <div className="text-[10px] text-neutral-500 truncate">{album.artist}</div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Artists */}
                                {related.artists.length > 0 && (
                                    <div>
                                        <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                                            <User className="w-3 h-3 text-green-400" /> Artists
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {related.artists.slice(0, 6).map((artist) => (
                                                <Link
                                                    to={`/artist/${encodeURIComponent(artist.name)}`}
                                                    key={artist.id}
                                                    onClick={closeRightPanel}
                                                    className="flex flex-col items-center text-center group"
                                                >
                                                    <CoverImage
                                                        src={artist.photo_url}
                                                        alt={artist.name}
                                                        className="w-16 h-16 rounded-full object-cover group-hover:scale-105 transition shadow-lg"
                                                    />
                                                    <div className="text-[11px] font-medium text-neutral-300 truncate mt-2 w-full group-hover:text-white transition">{artist.name}</div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Empty state */}
                                {!loadingRelated && related.tracks.length === 0 && related.albums.length === 0 && related.artists.length === 0 && (
                                    <div className="text-center py-12">
                                        <p className="text-[13px] text-neutral-600">No related content available</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}
