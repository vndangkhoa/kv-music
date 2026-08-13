import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Pause, Clock, Heart, PlusCircle, Shuffle, Trash2, ArrowLeft } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { dbService, Playlist as PlaylistType } from '../services/db';
import { libraryService, streamUrl } from '../services/library';
import { Track, StaticPlaylist } from '../types';
import CoverImage from '../components/CoverImage';
import SoundCloudTrackCard from '../components/SoundCloudTrackCard';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import DownloadMenu from '../components/DownloadMenu';
import Skeleton from '../components/Skeleton';
import Recommendations from '../components/Recommendations';
import SoundCloudSidebar from '../components/SoundCloudSidebar';
import { GENERATED_CONTENT } from '../data/seed_data';

type PlaylistData = PlaylistType | StaticPlaylist;

export default function Playlist() {
    const { id: playlistId } = useParams<{ id: string }>();
    const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingTracks, setLoadingTracks] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
    const [isUserPlaylist, setIsUserPlaylist] = useState(false);
    const [moreLikeThis, setMoreLikeThis] = useState<Track[]>([]);

    const playTrack = usePlayerStore(s => s.playTrack);
    const currentTrack = usePlayerStore(s => s.currentTrack);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const togglePlay = usePlayerStore(s => s.togglePlay);
    const likedTracks = usePlayerStore(s => s.likedTracks);
    const toggleLike = usePlayerStore(s => s.toggleLike);
    const shuffle = usePlayerStore(s => s.shuffle);
    const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
    const userPlaylists = useLibraryStore(s => s.userPlaylists);
    const refreshLibrary = useLibraryStore(s => s.refreshLibrary);

    useEffect(() => {
        if (!playlistId) return;

        const loadPlaylist = async () => {
            const userPlaylist = userPlaylists.find(p => p.id === playlistId);
            if (userPlaylist) {
                setPlaylist(userPlaylist);
                setIsUserPlaylist(true);
                setLoading(false);
                return;
            }

            const seedItem = Object.values(GENERATED_CONTENT).find(p => p.id === playlistId);
            if (seedItem) {
                setPlaylist({
                    id: seedItem.id,
                    title: seedItem.title,
                    description: seedItem.description,
                    cover_url: seedItem.cover_url,
                    tracks: seedItem.tracks || [],
                    type: 'Playlist'
                } as StaticPlaylist);
                setLoading(false);

                if (seedItem.tracks && seedItem.tracks.length > 0) return;
                setLoadingTracks(true);
            } else {
                setLoading(true);
            }

            await hydrateTracks(playlistId);
        };

        const hydrateTracks = async (id: string, attempt = 0) => {
            try {
                const dbPlaylist = await dbService.getPlaylist(id);
                if (dbPlaylist) {
                    setPlaylist(dbPlaylist);
                    setIsUserPlaylist(true);
                    setLoading(false);
                    setLoadingTracks(false);
                    return;
                }

                const apiPlaylist = await libraryService.getPlaylist(id);
                if (apiPlaylist && apiPlaylist.tracks.length > 0) {
                    const normalizedTracks = apiPlaylist.tracks.map((track: Track) => {
                        let videoId = track.id;
                        if (track.id.includes('discovery-') || track.id.includes('artist-')) {
                            const parts = track.id.split('-');
                            for (const part of parts) {
                                if (part.length === 11 && /^[a-zA-Z0-9_-]+$/.test(part)) {
                                    videoId = part;
                                    break;
                                }
                            }
                        }
                        return { ...track, id: videoId, url: `${streamUrl(videoId)}` };
                    });
                    setPlaylist({ ...apiPlaylist, tracks: normalizedTracks });
                    setIsUserPlaylist(false);
                    setLoading(false);
                } else if (attempt < 2) {
                    await new Promise(r => setTimeout(r, 1000));
                    await hydrateTracks(id, attempt + 1);
                } else {
                    setLoading(false);
                }
                setLoadingTracks(false);
            } catch (e) {
                setLoading(false);
                setLoadingTracks(false);
            }
        };

        loadPlaylist();
    }, [playlistId, userPlaylists]);

    const handlePlayAll = () => {
        if (playlist && playlist.tracks.length > 0) {
            playTrack(playlist.tracks[0], playlist.tracks);
        }
    };

    if (loading) {
        return (
            <div className="min-h-full bg-[#121212] p-8 space-y-4 animate-pulse">
                <Skeleton className="h-48 w-full rounded-xl" />
            </div>
        );
    }

    if (!playlist) {
        return (
            <div className="min-h-full flex items-center justify-center bg-[#121212] p-8">
                <div className="text-center">
                    <h2 className="text-lg font-bold text-white mb-2">Playlist not found</h2>
                    <Link to="/" className="text-[#ff5500] hover:underline font-bold text-xs">Back to Home</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full text-white bg-[#121212]">
            <div className="max-w-[1240px] mx-auto px-3 md:px-6 py-4 md:py-6 space-y-6">
                {/* Hero Header Banner */}
                <div className="relative w-full rounded-xl overflow-hidden bg-gradient-to-r from-neutral-900 via-zinc-900 to-[#121212] border border-white/10 p-4 md:p-8 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 shadow-2xl">
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-5 text-center md:text-left">
                        <div className="w-40 h-40 md:w-52 md:h-52 rounded-lg overflow-hidden shadow-2xl flex-shrink-0 bg-neutral-800 border border-white/10">
                            <CoverImage src={playlist.cover_url} alt={playlist.title} className="w-full h-full object-cover" fallbackText="SC" />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ff5500] bg-[#ff5500]/10 px-2 py-0.5 rounded">
                                Playlist
                            </span>
                            <h1 className="text-2xl md:text-5xl font-extrabold text-white leading-tight">
                                {playlist.title}
                            </h1>
                            <p className="text-xs text-neutral-400 font-medium">
                                {'description' in playlist && playlist.description ? playlist.description : `${playlist.tracks.length} tracks`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                        <button
                            onClick={handlePlayAll}
                            disabled={playlist.tracks.length === 0}
                            className="flex items-center gap-2 px-6 py-2.5 bg-[#ff5500] hover:bg-[#ff7a00] text-white text-xs font-extrabold rounded-full transition shadow active:scale-95 disabled:opacity-50"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            Play All
                        </button>
                        <button
                            onClick={() => {
                                if (playlist.tracks.length > 0) {
                                    if (!shuffle) toggleShuffle();
                                    const rand = Math.floor(Math.random() * playlist.tracks.length);
                                    playTrack(playlist.tracks[rand], playlist.tracks);
                                }
                            }}
                            className="p-2.5 rounded-full bg-white/10 border border-white/10 text-white hover:bg-white/20 transition"
                            aria-label="Shuffle"
                        >
                            <Shuffle className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Main 2-Column Content */}
                <div className="flex gap-8">
                    <div className="flex-1 min-w-0 space-y-3">
                        {playlist.tracks.length === 0 ? (
                            <div className="p-8 text-center bg-[#181818] border border-white/10 rounded-lg">
                                <p className="text-xs text-neutral-400 mb-2">This playlist has no tracks yet.</p>
                                <Link to="/search" className="text-xs font-bold text-[#ff5500] hover:underline">Find tracks to add</Link>
                            </div>
                        ) : (
                            playlist.tracks.map((track, idx) => (
                                <SoundCloudTrackCard key={`${track.id}-${idx}`} track={track} queue={playlist.tracks} />
                            ))
                        )}
                    </div>

                    <div className="hidden lg:flex flex-shrink-0 flex-col items-stretch">
                        <SoundCloudSidebar />
                    </div>
                </div>
            </div>
        </div>
    );
}
