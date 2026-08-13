import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { libraryService } from '../services/library';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { Play, Shuffle, CheckCircle2, Disc } from 'lucide-react';
import { Track } from '../types';
import CoverImage from '../components/CoverImage';
import SoundCloudTrackCard from '../components/SoundCloudTrackCard';
import SoundCloudSidebar from '../components/SoundCloudSidebar';
import { toast } from '../stores/toastStore';

interface ArtistData {
    name: string;
    photo?: string;
    topSongs: Track[];
}

export default function Artist() {
    const { id } = useParams();
    const playTrack = usePlayerStore(s => s.playTrack);
    const shuffle = usePlayerStore(s => s.shuffle);
    const toggleShuffle = usePlayerStore(s => s.toggleShuffle);

    const followedArtists = useLibraryStore(s => s.followedArtists);
    const toggleFollowArtist = useLibraryStore(s => s.toggleFollowArtist);

    const [artist, setArtist] = useState<ArtistData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'popular' | 'tracks' | 'albums'>('all');

    const artistName = decodeURIComponent(id || '');
    const isFollowing = followedArtists.includes(artistName);

    const handleToggleFollow = async () => {
        await toggleFollowArtist(artistName, artist?.photo);
        if (isFollowing) {
            toast(`Unfollowed ${artistName}`);
        } else {
            toast(`Following ${artistName}. Added songs, albums & playlists to your Library!`);
        }
    };

    useEffect(() => {
        if (!artistName) return;
        setLoading(true);

        const fetchData = async () => {
            try {
                const [info, songs] = await Promise.allSettled([
                    libraryService.getArtistInfo(artistName),
                    libraryService.search(artistName)
                ]);

                const photo = (info.status === 'fulfilled' && info.value?.photo)
                    ? info.value.photo
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=ff5500&color=fff&size=200&bold=true`;

                const topSongs = (songs.status === 'fulfilled') ? songs.value.slice(0, 20) : [];

                setArtist({
                    name: artistName,
                    photo,
                    topSongs
                });
            } catch (e) {
                console.error('artist fetch error', e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [artistName]);

    const displayedSongs = useMemo(() => {
        if (!artist?.topSongs) return [];
        if (activeTab === 'popular') {
            return [...artist.topSongs].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
        }
        if (activeTab === 'tracks') {
            return artist.topSongs.slice(0, 10);
        }
        return artist.topSongs;
    }, [artist?.topSongs, activeTab]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#121212]">
                <div className="w-12 h-12 rounded-full border-2 border-[#ff5500] border-t-transparent animate-spin mb-4" />
                <p className="text-neutral-400 text-xs font-medium">Loading creator profile...</p>
            </div>
        );
    }

    if (!artist) return <div className="p-8 text-white bg-[#121212]">Artist not found</div>;

    return (
        <div className="min-h-full text-white bg-[#121212]">
            <div className="max-w-[1240px] mx-auto px-3 md:px-6 py-4 md:py-6 space-y-6">
                {/* SoundCloud Artist Profile Hero Banner */}
                <div className="relative w-full rounded-xl overflow-hidden bg-gradient-to-r from-neutral-900 via-stone-900 to-[#121212] border border-white/10 p-4 md:p-8 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 min-h-[260px] shadow-2xl">
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-5 text-center md:text-left">
                        {/* Circular Avatar */}
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-[#121212] shadow-2xl flex-shrink-0 bg-neutral-800">
                            <CoverImage src={artist.photo} alt={artist.name} className="w-full h-full object-cover" />
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs text-[#ff5500] font-extrabold uppercase tracking-widest">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Verified Creator</span>
                            </div>
                            <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
                                {artist.name}
                            </h1>
                            <p className="text-xs text-neutral-400 font-medium">124.8K Followers • {artist.topSongs.length} Tracks</p>
                        </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <button
                            onClick={handleToggleFollow}
                            className={`px-6 py-2 rounded-full text-xs font-bold transition shadow ${
                                isFollowing
                                    ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                                    : 'bg-[#ff5500] text-white hover:bg-[#ff7a00]'
                            }`}
                        >
                            {isFollowing ? 'Following' : 'Follow'}
                        </button>

                        <button
                            onClick={() => {
                                if (artist.topSongs.length > 0) {
                                    playTrack(artist.topSongs[0], artist.topSongs);
                                }
                            }}
                            className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-white text-black text-xs font-extrabold hover:scale-105 transition shadow"
                        >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Play All
                        </button>

                        <button
                            onClick={() => {
                                if (artist.topSongs.length > 0) {
                                    if (!shuffle) toggleShuffle();
                                    const rand = Math.floor(Math.random() * artist.topSongs.length);
                                    playTrack(artist.topSongs[rand], artist.topSongs);
                                }
                            }}
                            className="p-2 rounded-full bg-white/10 border border-white/10 text-white hover:bg-white/20 transition"
                            aria-label="Shuffle"
                        >
                            <Shuffle className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Sub-header Navigation Tabs & 2-Column Content */}
                <div className="flex gap-8">
                    {/* Main Tracks Column */}
                    <div className="flex-1 min-w-0 space-y-4">
                        <div className="flex items-center gap-6 border-b border-white/10 pb-2">
                            {[
                                { id: 'all', label: 'All Uploads' },
                                { id: 'popular', label: 'Popular' },
                                { id: 'tracks', label: 'Tracks' },
                                { id: 'albums', label: 'Albums' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`text-xs font-bold uppercase tracking-wider transition relative pb-2 ${
                                        activeTab === tab.id
                                            ? 'text-[#ff5500] border-b-2 border-[#ff5500]'
                                            : 'text-neutral-400 hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'albums' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <Link to={`/album/${encodeURIComponent(artist.name + ' Essentials')}`} className="bg-[#181818] p-3 rounded-xl border border-white/5 hover:border-white/20 transition group">
                                    <div className="relative mb-2 overflow-hidden rounded-lg aspect-square">
                                        <CoverImage src={artist.photo} alt={artist.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                            <Disc className="w-8 h-8 text-[#ff5500]" />
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-xs text-white truncate group-hover:text-[#ff5500] transition">{artist.name} Essentials</h3>
                                    <p className="text-[10px] text-neutral-400 mt-0.5">Album • 2026</p>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {displayedSongs.map((track, idx) => (
                                    <SoundCloudTrackCard
                                        key={`${track.id}-${idx}`}
                                        track={track}
                                        queue={displayedSongs}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar */}
                    <div className="hidden lg:flex flex-shrink-0 flex-col items-stretch">
                        <SoundCloudSidebar />
                    </div>
                </div>
            </div>
        </div>
    );
}
