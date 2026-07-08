import { Play, Pause, Heart, Clock, Shuffle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePlayerStore } from '../stores/playerStore';
import CoverImage from '../components/CoverImage';

export default function Collection() {
    const likedTracksData = usePlayerStore(s => s.likedTracksData);
    const playTrack = usePlayerStore(s => s.playTrack);
    const currentTrack = usePlayerStore(s => s.currentTrack);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const togglePlay = usePlayerStore(s => s.togglePlay);

    const handlePlayAll = () => {
        if (likedTracksData.length > 0) {
            playTrack(likedTracksData[0], likedTracksData);
        }
    };

    const handleShufflePlay = () => {
        if (likedTracksData.length > 0) {
            const shuffled = [...likedTracksData].sort(() => Math.random() - 0.5);
            playTrack(shuffled[0], shuffled);
        }
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="h-full overflow-y-auto no-scrollbar pb-24">
            {/* Hero Header */}
            <div className="h-72 md:h-80 bg-gradient-to-b from-indigo-800 to-[#121212] p-6 md:p-8 flex flex-col md:flex-row items-center md:items-end relative">
                <Link to="/library" className="absolute top-4 left-4 md:hidden">
                    <ArrowLeft className="w-6 h-6" />
                </Link>

                <div className="w-40 h-40 md:w-56 md:h-56 bg-gradient-to-br from-indigo-700 via-purple-600 to-blue-400 rounded-md shadow-2xl flex items-center justify-center mb-4 md:mb-0 md:mr-8 flex-shrink-0">
                    <Heart className="w-20 h-20 md:w-24 md:h-24 text-white fill-white" />
                </div>

                <div className="text-center md:text-left">
                    <p className="text-xs font-bold uppercase tracking-wider mb-1">Playlist</p>
                    <h1 className="text-4xl md:text-6xl font-black mb-4">Liked Songs</h1>
                    <p className="text-sm text-neutral-300">
                        {likedTracksData.length} {likedTracksData.length === 1 ? 'song' : 'songs'}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 flex items-center gap-4">
                <button
                    onClick={handlePlayAll}
                    disabled={likedTracksData.length === 0}
                    className="w-14 h-14 bg-[#FF0000] text-white rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg disabled:opacity-50"
                >
                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                </button>
                <button
                    onClick={handleShufflePlay}
                    disabled={likedTracksData.length === 0}
                    className="text-neutral-400 hover:text-white transition disabled:opacity-50"
                >
                    <Shuffle className="w-6 h-6" />
                </button>
            </div>

            {/* Track List */}
            <div className="px-6">
                {/* Header */}
                <div className="hidden md:grid grid-cols-[16px_4fr_2fr_1fr] gap-4 px-4 py-2 text-sm text-neutral-400 border-b border-white/10 mb-2">
                    <span>#</span>
                    <span>TITLE</span>
                    <span>ALBUM</span>
                    <span className="flex justify-end"><Clock className="w-4 h-4" /></span>
                </div>

                {likedTracksData.length === 0 ? (
                    <div className="text-center py-20">
                        <Heart className="w-16 h-16 mx-auto text-neutral-600 mb-4" />
                        <h2 className="text-xl font-bold mb-2">Songs you like will appear here</h2>
                        <p className="text-neutral-400 mb-6">Save songs by tapping the heart icon.</p>
                        <Link
                            to="/search"
                            className="inline-block px-6 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition"
                        >
                            Find something to listen to
                        </Link>
                    </div>
                ) : (
                    likedTracksData.map((track, index) => {
                        const isCurrentTrack = currentTrack?.id === track.id;

                        return (
                            <div
                                key={track.id}
                                onClick={() => playTrack(track, likedTracksData)}
                                className={`grid grid-cols-[auto_1fr_auto] md:grid-cols-[16px_4fr_2fr_1fr] gap-4 px-4 py-2 rounded-md hover:bg-white/10 transition group cursor-pointer ${isCurrentTrack ? 'bg-white/10' : ''}`}
                            >
                                {/* Index / Play indicator */}
                                <div className="flex items-center">
                                    <span className={`text-sm ${isCurrentTrack ? 'text-[#FF0000]' : 'text-neutral-400'} group-hover:hidden`}>
                                        {isCurrentTrack && isPlaying ? (
                                            <div className="flex items-end gap-[2px] h-4">
                                                <div className="w-[3px] bg-[#FF0000] rounded-full animate-soundwave-1" />
                                                <div className="w-[3px] bg-[#FF0000] rounded-full animate-soundwave-2" />
                                                <div className="w-[3px] bg-[#FF0000] rounded-full animate-soundwave-3" />
                                            </div>
                                        ) : (
                                            index + 1
                                        )}
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); isCurrentTrack ? togglePlay() : playTrack(track, likedTracksData); }}
                                        className="hidden group-hover:block text-white"
                                    >
                                        {isCurrentTrack && isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                                    </button>
                                </div>

                                {/* Cover + Info */}
                                <div className="flex items-center gap-4 min-w-0">
                                    <CoverImage
                                        src={track.cover_url}
                                        alt={track.title}
                                        className="w-10 h-10 rounded flex-shrink-0"
                                        fallbackText="♪"
                                    />
                                    <div className="min-w-0">
                                        <p className={`font-medium truncate ${isCurrentTrack ? 'text-[#FF0000]' : 'text-white'}`}>{track.title}</p>
                                        <p className="text-sm text-neutral-400 truncate">{track.artist}</p>
                                    </div>
                                </div>

                                {/* Album */}
                                <p className="hidden md:flex items-center text-sm text-neutral-400 truncate">{track.album}</p>

                                {/* Duration */}
                                <div className="flex items-center justify-end">
                                    <Heart className="w-4 h-4 text-[#FF0000] fill-current mr-4 opacity-0 group-hover:opacity-100" />
                                    <span className="text-sm text-neutral-400">{formatDuration(track.duration)}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
