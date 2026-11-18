import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { libraryService } from '../services/library';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { Shuffle, Radio } from 'lucide-react';
import { Track } from '../types';
import TrackRow, { YtmCarousel, YtmMediaCard } from '../components/TrackRow';
import { toast } from '../stores/toastStore';

interface ArtistData {
    name: string;
    photo?: string;
    isPlaceholder?: boolean;
    topSongs: Track[];
}

interface RelatedArtist {
    id: string;
    name: string;
    photo_url: string;
}

export default function Artist() {
    const { id } = useParams();
    const playTrack = usePlayerStore(s => s.playTrack);
    const shuffle = usePlayerStore(s => s.shuffle);
    const toggleShuffle = usePlayerStore(s => s.toggleShuffle);

    const followedArtists = useLibraryStore(s => s.followedArtists);
    const toggleFollowArtist = useLibraryStore(s => s.toggleFollowArtist);

    const [artist, setArtist] = useState<ArtistData | null>(null);
    const [relatedArtists, setRelatedArtists] = useState<RelatedArtist[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAllSongs, setShowAllSongs] = useState(false);

    const artistName = decodeURIComponent(id || '');
    const isSubscribed = followedArtists.includes(artistName);

    const handleToggleSubscribe = async () => {
        await toggleFollowArtist(artistName, artist?.photo);
        if (isSubscribed) {
            toast(`Unsubscribed from ${artistName}`);
        } else {
            toast(`Subscribed to ${artistName}`);
        }
    };

    useEffect(() => {
        if (!artistName) return;
        setLoading(true);
        setShowAllSongs(false);

        const fetchData = async () => {
            try {
                const [info, songs, related] = await Promise.allSettled([
                    libraryService.getArtistInfo(artistName),
                    libraryService.search(artistName),
                    libraryService.getRelatedContent(artistName, 'artist', 10),
                ]);

                const topSongs = songs.status === 'fulfilled' ? songs.value.slice(0, 20) : [];
                const infoVal = info.status === 'fulfilled' ? info.value : undefined;
                const photo =
                    infoVal?.photo && !infoVal.isPlaceholder
                        ? infoVal.photo
                        : topSongs[0]?.cover_url ||
                          infoVal?.photo ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=212121&color=fff&size=256&bold=true`;

                setArtist({
                    name: artistName,
                    photo,
                    isPlaceholder: infoVal?.isPlaceholder && !topSongs[0]?.cover_url,
                    topSongs,
                });

                if (related.status === 'fulfilled' && related.value.artists) {
                    setRelatedArtists(related.value.artists);
                }
            } catch (e) {
                console.error('artist fetch error', e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [artistName]);

    const derivedAlbums = useMemo(() => {
        if (!artist) return [];
        const seen = new Set<string>();
        const list: { id: string; title: string; subtitle: string; cover: string }[] = [
            {
                id: `${artist.name} Essentials`,
                title: `${artist.name} Essentials`,
                subtitle: 'Album • Featured collection',
                cover: artist.topSongs[0]?.cover_url || artist.photo || '',
            },
        ];
        seen.add(list[0].title.toLowerCase());

        for (const t of artist.topSongs) {
            if (t.album && !seen.has(t.album.toLowerCase())) {
                seen.add(t.album.toLowerCase());
                list.push({
                    id: t.album,
                    title: t.album,
                    subtitle: `Album • ${artist.name}`,
                    cover: t.cover_url,
                });
            }
        }
        return list.slice(0, 10);
    }, [artist]);

    const playRelatedArtist = async (name: string) => {
        try {
            const tracks = await libraryService.search(name);
            if (tracks.length > 0) playTrack(tracks[0], tracks);
        } catch {
            /* ignore */
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
            </div>
        );
    }

    if (!artist) {
        return <div className="p-8 text-white">Artist not found</div>;
    }

    const visibleSongs = showAllSongs ? artist.topSongs : artist.topSongs.slice(0, 5);

    return (
        <div className="min-h-full bg-transparent text-white pb-20">
            {/* Full-Bleed Immersive Gradient Hero (ytmusic-immersive-header-renderer) */}
            <header className="relative w-full overflow-hidden">
                {artist.photo && (
                    <img
                        src={artist.photo}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover object-top"
                    />
                )}
                <div className="absolute inset-0 bg-black/45" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/65 to-transparent" />

                <div className="relative z-10 max-w-[1478px] mx-auto px-4 md:px-10 pt-24 sm:pt-36 md:pt-52 pb-8 space-y-4">
                    <h1
                        className="text-[36px] sm:text-[42px] md:text-[45px] font-bold tracking-tight text-white leading-[1.1]"
                        style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                    >
                        {artist.name}
                    </h1>

                    <p className="text-sm text-white/70">
                        Monthly listeners • {artist.topSongs.length} top songs
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                            type="button"
                            onClick={() => {
                                if (artist.topSongs.length > 0) {
                                    if (!shuffle) toggleShuffle();
                                    const rand = Math.floor(Math.random() * artist.topSongs.length);
                                    playTrack(artist.topSongs[rand], artist.topSongs);
                                }
                            }}
                            disabled={artist.topSongs.length === 0}
                            className="h-9 px-6 rounded-full bg-[#F1F1F1] hover:bg-white text-[#030303] text-sm font-medium inline-flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
                        >
                            <Shuffle className="w-4 h-4" />
                            <span>Shuffle</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (artist.topSongs.length > 0) {
                                    playTrack(artist.topSongs[0], artist.topSongs);
                                }
                            }}
                            disabled={artist.topSongs.length === 0}
                            className="h-9 px-6 rounded-full bg-[#F1F1F1] hover:bg-white text-[#030303] text-sm font-medium inline-flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
                        >
                            <Radio className="w-4 h-4" />
                            <span>Mix</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleToggleSubscribe}
                            className={`h-9 px-5 rounded-full text-sm font-medium border transition ${
                                isSubscribed
                                    ? 'border-white/25 text-white/80 bg-white/10 hover:bg-white/15'
                                    : 'border-[#FF5577] text-[#FF5577] hover:bg-[#FF5577]/10'
                            }`}
                        >
                            {isSubscribed ? 'Subscribed' : 'Subscribe'}
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-[1478px] mx-auto px-4 md:px-10 py-6 space-y-12">
                {/* Top Songs Table */}
                <section className="space-y-4">
                    <h2
                        className="text-[22px] md:text-[26px] font-bold tracking-tight text-white"
                        style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                    >
                        Songs
                    </h2>

                    {artist.topSongs.length > 0 ? (
                        <>
                            <div className="space-y-0.5">
                                {visibleSongs.map((track, idx) => (
                                    <TrackRow
                                        key={`${track.id}-${idx}`}
                                        track={track}
                                        queue={artist.topSongs}
                                    />
                                ))}
                            </div>

                            {artist.topSongs.length > 5 && (
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAllSongs(v => !v)}
                                        className="h-9 px-4 rounded-full border border-white/20 text-sm font-medium text-white hover:bg-white/10 transition"
                                    >
                                        {showAllSongs ? 'Show less' : 'Show all'}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-white/60">No songs found for this artist.</p>
                    )}
                </section>

                {/* Albums Carousel */}
                {derivedAlbums.length > 0 && (
                    <YtmCarousel
                        title="Albums"
                        itemCount={derivedAlbums.length}
                        trackClassName="gap-4 md:gap-6"
                    >
                        {derivedAlbums.map((alb, idx) => (
                            <div
                                key={`${alb.id}-${idx}`}
                                role="group"
                                aria-roledescription="slide"
                                aria-label={`${idx + 1} of ${derivedAlbums.length}`}
                                className="w-[164px] sm:w-[176px] md:w-[192px] flex-shrink-0 snap-start"
                            >
                                <YtmMediaCard
                                    title={alb.title}
                                    subtitle={alb.subtitle}
                                    imageUrl={alb.cover}
                                    to={`/album/${encodeURIComponent(alb.id)}`}
                                    onPlay={() => {
                                        if (artist.topSongs.length > 0) {
                                            playTrack(artist.topSongs[0], artist.topSongs);
                                        }
                                    }}
                                    fallbackText="AL"
                                />
                            </div>
                        ))}
                    </YtmCarousel>
                )}

                {/* Fans Might Also Like */}
                {relatedArtists.length > 0 && (
                    <YtmCarousel
                        title="Fans might also like"
                        itemCount={relatedArtists.length}
                        trackClassName="gap-4 md:gap-6"
                    >
                        {relatedArtists.map((rel, idx) => (
                            <div
                                key={`${rel.id}-${idx}`}
                                role="group"
                                aria-roledescription="slide"
                                aria-label={`${idx + 1} of ${relatedArtists.length}`}
                                className="w-[160px] sm:w-[176px] md:w-[184px] flex-shrink-0 snap-start"
                            >
                                <YtmMediaCard
                                    variant="artist"
                                    title={rel.name}
                                    subtitle="Artist"
                                    imageUrl={rel.photo_url}
                                    to={`/artist/${encodeURIComponent(rel.name)}`}
                                    onPlay={() => playRelatedArtist(rel.name)}
                                    fallbackText={rel.name.substring(0, 2).toUpperCase()}
                                />
                            </div>
                        ))}
                    </YtmCarousel>
                )}
            </div>
        </div>
    );
}
