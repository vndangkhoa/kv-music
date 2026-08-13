import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { libraryService, streamUrl } from '../services/library';
import { usePlayerStore } from '../stores/playerStore';
import { Play, Shuffle, Heart, Clock, ListPlus } from 'lucide-react';
import { Track } from '../types';
import Recommendations from '../components/Recommendations';
import DownloadMenu from '../components/DownloadMenu';

export default function Album() {
    const { id } = useParams();
    const playTrack = usePlayerStore(s => s.playTrack);
    const toggleLike = usePlayerStore(s => s.toggleLike);
    const likedTracks = usePlayerStore(s => s.likedTracks);
    const setIsFullScreenOpen = usePlayerStore(s => s.setIsFullScreenOpen);
    const shuffle = usePlayerStore(s => s.shuffle);
    const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
    const addToQueue = usePlayerStore(s => s.addToQueue);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [albumInfo, setAlbumInfo] = useState<{ title: string, artist: string, cover?: string, year?: string } | null>(null);
    const [moreByArtist, setMoreByArtist] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        setLoading(true);

        const fetchAlbum = async () => {
            const queryId = decodeURIComponent(id);
            try {
                const album = await libraryService.getAlbum(queryId);

                if (album) {
                    // Normalize track IDs - extract YouTube video ID from discovery-* IDs
                    const normalizedTracks = album.tracks.map((track) => {
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
                    setTracks(normalizedTracks);
                    setAlbumInfo({
                        title: album.title,
                        artist: album.creator || "Unknown Artist",
                        cover: album.cover_url,
                        year: '2024'
                    });

                    // Fetch suggestions
                    try {
                        const artistQuery = album.creator || "Unknown Artist";
                        const suggestions = await libraryService.search(artistQuery);
                        const currentIds = new Set(normalizedTracks.map(t => t.id));
                        setMoreByArtist(suggestions.filter(t => !currentIds.has(t.id)).slice(0, 10));
                    } catch (e) { }
                } else {
                    // Fallback to searching the query if ID not found anywhere
                    const cleanTitle = queryId.replace(/^search-|^album-/, '');
                    const results = await libraryService.search(queryId);
                    setTracks(results);
                    setAlbumInfo({
                        title: cleanTitle,
                        artist: results.length > 0 ? results[0].artist : "Unknown Artist",
                        cover: results.length > 0 ? results[0].cover_url : undefined,
                        year: '2024'
                    });
                }
            } catch (e) {
                console.error(e);
            }
            setLoading(false);
        };
        fetchAlbum();
    }, [id]);

    if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white"></div></div>;
    if (!albumInfo) return <div>Album not found</div>;

    const totalDuration = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
    const formattedDuration = `${Math.floor(totalDuration / 60)} minutes`;

    return (
        <div className="flex-1 overflow-y-auto bg-[#111111] no-scrollbar pb-32 relative">
            {/* Banner Background */}
            {albumInfo.cover && (
                <div
                    className="absolute top-0 left-0 w-full h-[50vh] min-h-[400px] opacity-30 pointer-events-none"
                    style={{
                        backgroundImage: `url(${albumInfo.cover})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)'
                    }}
                />
            )}

            <div className="relative z-10 flex flex-col md:flex-row p-4 md:p-12 items-center md:items-end pt-16 md:pt-16 gap-6 md:gap-8">
                {/* Cover */}
                <div
                    className="w-48 h-48 md:w-64 md:h-64 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden shrink-0 cursor-pointer group/cover relative"
                    onClick={() => {
                        if (tracks.length > 0) {
                            playTrack(tracks[0], tracks);
                            setIsFullScreenOpen(true);
                        }
                    }}
                >
                    <img src={albumInfo.cover} alt={albumInfo.title} className="w-full h-full object-cover transition-transform duration-700 group-hover/cover:scale-110" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/cover:opacity-100 transition flex items-center justify-center">
                        <Play fill="white" size={48} className="text-white drop-shadow-2xl" />
                    </div>
                </div>

                {/* Info */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2 md:gap-3 flex-1">
                    <span className="text-xs md:text-sm font-bold tracking-widest uppercase text-white/70">Album</span>
                    <h1 className="text-2xl md:text-6xl font-black text-white leading-tight line-clamp-3 text-ellipsis overflow-hidden">{albumInfo.title}</h1>
                    <div className="flex items-center gap-2 text-white/80 font-medium text-sm md:text-base mt-1 md:mt-2">
                        <img src={albumInfo.cover} className="w-6 h-6 rounded-full" />
                        <span className="hover:underline cursor-pointer">{albumInfo.artist}</span>
                        <span className="text-white/40">•</span>
                        <span className="text-white/60">{albumInfo.year}</span>
                        <span className="text-white/40">•</span>
                        <span className="text-white/60">{tracks.length} songs, {formattedDuration}</span>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="px-4 py-3 flex items-center justify-center gap-6 bg-black/20 backdrop-blur-sm sticky top-0 z-10 md:px-8">
                <button
                    onClick={() => tracks.length > 0 && playTrack(tracks[0], tracks)} // Should play all
                    className="bg-white text-black px-8 py-2 rounded-full font-bold text-sm hover:scale-105 transition flex items-center gap-2 shadow-lg hover:shadow-xl hover:bg-neutral-200"
                >
                    <Play fill="currentColor" size={18} />
                    Play
                </button>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            if (tracks.length > 0) {
                                if (!shuffle) toggleShuffle();
                                const randomIndex = Math.floor(Math.random() * tracks.length);
                                playTrack(tracks[randomIndex], tracks);
                            }
                        }}
                        className={`p-2 transition border rounded-full hover:bg-white/10 hover:border-white ${shuffle ? 'text-[#FF0000] border-[#FF0000]' : 'text-neutral-400 border-white/10'}`}
                        title="Shuffle"
                    >
                        <Shuffle size={20} />
                    </button>
                    <button
                        onClick={() => {
                            if (tracks.length > 0) {
                                addToQueue(tracks);
                            }
                        }}
                        className="p-2 text-neutral-400 hover:text-white transition border border-white/10 rounded-full hover:bg-white/10 hover:border-white"
                        title="Add to queue"
                    >
                        <ListPlus size={20} />
                    </button>
                    <DownloadMenu
                        tracks={tracks}
                        className="p-2 text-neutral-400 hover:text-white transition border border-white/10 rounded-full hover:bg-white/10 hover:border-white"
                        iconClassName="w-5 h-5"
                    />
                </div>
            </div>

            {/* Tracklist */}
            <div className="p-4 md:p-8">
                {/* Header Row */}
                <div className="flex items-center text-sm text-neutral-400 border-b border-white/10 pb-2 mb-4 px-4 sticky top-20 bg-[#111111] z-10">
                    <span className="w-10 text-center">#</span>
                    <span className="flex-1">Title</span>
                    <span className="hidden md:block w-12 text-right"><Clock size={16} /></span>
                </div>

                <div className="flex flex-col">
                    {tracks.map((track, i) => (
                        <div
                            key={track.id}
                            className="group flex items-center p-3 rounded-md hover:bg-white/10 transition cursor-pointer"
                            onClick={() => playTrack(track, tracks)}
                        >
                            <span className="w-10 text-center text-neutral-500 font-medium group-hover:hidden">{i + 1}</span>
                            <Play size={16} className="w-10 hidden group-hover:block fill-white pl-2" />

                            <div className="flex-1 min-w-0 pr-4">
                                <div className="font-medium text-white truncate text-base">{track.title}</div>
                                <div className="text-sm text-neutral-400 truncate group-hover:text-white/70">{track.artist}</div>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                                className={`mr-6 ${likedTracks.has(track.id) ? 'text-green-500 opacity-100' : 'text-neutral-400 opacity-0 group-hover:opacity-100'} hover:scale-110 transition`}
                            >
                                <Heart size={18} fill={likedTracks.has(track.id) ? "currentColor" : "none"} />
                            </button>

                            <DownloadMenu
                                tracks={[track]}
                                className="mr-6 text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-white hover:scale-110 transition"
                                iconClassName="w-[18px] h-[18px]"
                            />

                            <span className="text-neutral-500 text-sm hidden md:block w-12 text-right font-mono">
                                {Math.floor((track.duration || 0) / 60)}:{((track.duration || 0) % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Suggestions / More By Artist */}
            {moreByArtist.length > 0 && (
                <div className="p-4 md:p-8 mt-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold hover:underline cursor-pointer">More by {albumInfo.artist}</h2>
                        <Link to={`/artist/${encodeURIComponent(albumInfo.artist)}`}>
                            <span className="text-xs font-bold text-[#b3b3b3] uppercase tracking-wider hover:text-white cursor-pointer">Show discography</span>
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 fold:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-2">
                        {moreByArtist.map((track) => (
                            <div
                                className="bg-[#2a2a2a]/30 p-3 rounded-2xl hover:bg-[#2a2a2a]/85 transition duration-300 group cursor-pointer relative flex flex-col border border-white/5"
                                key={track.id}
                                onClick={() => {
                                    playTrack(track, moreByArtist);
                                }}
                            >
                                <div className="relative mb-3">
                                    <img src={track.cover_url} className="w-full aspect-square rounded-xl shadow-lg object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl flex items-center justify-center">
                                        <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                                            <Play className="fill-current text-black ml-0.5 w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                                <h3 className="font-bold text-white text-sm mb-1 truncate">{track.title}</h3>
                                <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Related Content Recommendations */}
            {albumInfo && (
                <Recommendations
                    seed={albumInfo.artist}
                    seedType="album"
                    limit={10}
                    title="You might also like"
                    showTracks={true}
                    showAlbums={true}
                    showPlaylists={true}
                />
            )}
        </div>
    );
}
