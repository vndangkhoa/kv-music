import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { libraryService } from '../services/library';
import { usePlayerStore } from '../stores/playerStore';
import { YtmMediaCard } from '../components/TrackRow';
import Skeleton from '../components/Skeleton';

const REGION_TABS: { id: 'vn' | 'us' | 'kr' | 'cn'; label: string }[] = [
    { id: 'vn', label: 'Vietnam' },
    { id: 'us', label: 'US' },
    { id: 'kr', label: 'South Korea' },
    { id: 'cn', label: 'Global' },
];

export default function ArtistsPage() {
    const playTrack = usePlayerStore(s => s.playTrack);
    const [region, setRegion] = useState<'vn' | 'us' | 'kr' | 'cn'>('vn');
    const [artists, setArtists] = useState<
        Array<{ id: string; name: string; photo?: string; region: string; rank: number; followers: string; topTrack: string }>
    >([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        libraryService
            .getArtists(region)
            .then(res => {
                if (isMounted) {
                    setArtists(res);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [region]);

    const playArtistTrack = async (artistName: string) => {
        try {
            const tracks = await libraryService.search(artistName);
            if (tracks && tracks.length > 0) {
                playTrack(tracks[0], tracks);
            }
        } catch (e) {
            console.error('Failed to play artist track', e);
        }
    };

    return (
        <div className="min-h-full bg-transparent text-white pb-24">
            <div className="max-w-[1478px] mx-auto px-4 md:px-10 py-6 space-y-8">
                {/* Header */}
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            to="/"
                            aria-label="Back to Home"
                            className="w-10 h-10 rounded-full hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition md:hidden"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <p className="text-xs uppercase tracking-wider text-white/70 mb-1">CHARTS</p>
                            <h1
                                className="text-[28px] md:text-[36px] font-bold tracking-tight text-white leading-[1.15]"
                                style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                            >
                                Top artists
                            </h1>
                        </div>
                    </div>

                    {/* Region Filter Chips */}
                    <div
                        role="tablist"
                        aria-label="Artist chart region"
                        className="flex items-center gap-2 overflow-x-auto no-scrollbar"
                    >
                        {REGION_TABS.map(tab => {
                            const isActive = region === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    onClick={() => setRegion(tab.id)}
                                    className={`h-8 px-3 rounded-[8px] text-sm font-medium whitespace-nowrap transition ${
                                        isActive
                                            ? 'bg-white text-[#030303]'
                                            : 'bg-white/10 text-white hover:bg-white/[0.16] border border-white/10'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </header>

                {/* Responsive Artist Grid */}
                {loading && artists.length === 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                            <div key={i} className="flex flex-col items-center space-y-2.5">
                                <Skeleton className="w-full aspect-square rounded-full" />
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-3.5 w-1/3" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {artists.map((artist, idx) => (
                            <YtmMediaCard
                                key={`${artist.id}-${idx}`}
                                variant="artist"
                                title={artist.name}
                                subtitle={`#${artist.rank}${artist.followers ? ` • ${artist.followers}` : ''}`}
                                imageUrl={artist.photo}
                                to={`/artist/${encodeURIComponent(artist.name)}`}
                                onPlay={() => playArtistTrack(artist.name)}
                                fallbackText={artist.name[0]}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
