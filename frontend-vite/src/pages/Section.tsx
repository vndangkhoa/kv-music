import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { libraryService } from '../services/library';
import { YtmMediaCard } from '../components/TrackRow';
import Skeleton from '../components/Skeleton';
import type { StaticPlaylist } from '../types';
import { safeStorage } from '../utils/safeStorage';

export default function Section() {
    const [searchParams] = useSearchParams();
    const category = searchParams.get('category');
    const [playlists, setPlaylists] = useState<StaticPlaylist[]>([]);
    const [loading, setLoading] = useState(true);
    const playTrack = usePlayerStore(s => s.playTrack);

    useEffect(() => {
        if (!category) {
            setLoading(false);
            return;
        }
        setLoading(true);

        for (const key of ['nct_browse_cache_v1', 'ytm_browse_cache_v8']) {
            const cached = safeStorage.getItem(key);
            if (cached) {
                try {
                    const data = JSON.parse(cached);
                    const items = data[category] || [];
                    if (items.length > 0) {
                        setPlaylists(items);
                        setLoading(false);
                        return;
                    }
                } catch {
                    /* ignore */
                }
            }
        }

        libraryService
            .getBrowseContent()
            .then(data => {
                const items = data[category] || [];
                setPlaylists(items);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [category]);

    const playCollection = async (item: StaticPlaylist) => {
        const isAlbum = item.type === 'Album';
        const res = isAlbum
            ? await libraryService.getAlbum(item.id)
            : await libraryService.getPlaylist(item.id);
        if (res && res.tracks.length > 0) {
            playTrack(res.tracks[0], res.tracks);
        }
    };

    if (!category) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-8 text-white/60 text-sm">
                No category specified
            </div>
        );
    }

    return (
        <div className="min-h-full bg-transparent text-white">
            <div className="max-w-[1478px] mx-auto px-4 md:px-10 py-6 space-y-6 pb-24">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link
                        to="/"
                        aria-label="Back to Home"
                        className="w-10 h-10 rounded-full hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1
                        className="text-[28px] md:text-[34px] font-bold tracking-tight text-white capitalize"
                        style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                    >
                        {category}
                    </h1>
                </div>

                {/* Responsive YTM Grid */}
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                            <div key={i} className="space-y-2.5">
                                <Skeleton className="w-full aspect-square rounded-[6px]" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3.5 w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : playlists.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {playlists.map((playlist, idx) => {
                            const isAlbum = playlist.type === 'Album';
                            const isArtist = playlist.type === 'Artist';
                            const target = isArtist
                                ? `/artist/${encodeURIComponent(playlist.title)}`
                                : isAlbum
                                ? `/album/${encodeURIComponent(playlist.id)}`
                                : `/playlist/${encodeURIComponent(playlist.id)}`;

                            return (
                                <YtmMediaCard
                                    key={`${playlist.id}-${idx}`}
                                    variant={isArtist ? 'artist' : 'square'}
                                    title={playlist.title}
                                    subtitle={playlist.description || playlist.creator || playlist.type}
                                    imageUrl={playlist.cover_url}
                                    to={target}
                                    onPlay={() => playCollection(playlist)}
                                    fallbackText={playlist.title?.substring(0, 2).toUpperCase()}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 space-y-2">
                        <h2 className="text-lg font-bold text-white">No playlists found</h2>
                        <p className="text-sm text-white/60">This category is currently empty.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
