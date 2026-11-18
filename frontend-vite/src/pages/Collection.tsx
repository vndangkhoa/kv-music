import { Play, Pause, ThumbsUp, Shuffle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePlayerStore } from '../stores/playerStore';
import TrackRow from '../components/TrackRow';
import DownloadMenu from '../components/DownloadMenu';

export default function Collection() {
    const likedTracksData = usePlayerStore(s => s.likedTracksData);
    const playTrack = usePlayerStore(s => s.playTrack);
    const currentTrack = usePlayerStore(s => s.currentTrack);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const togglePlay = usePlayerStore(s => s.togglePlay);

    const isCollectionPlaying =
        isPlaying && currentTrack && likedTracksData.some(t => t.id === currentTrack.id);

    const handlePlayAll = () => {
        if (likedTracksData.length === 0) return;
        if (currentTrack && likedTracksData.some(t => t.id === currentTrack.id)) {
            togglePlay();
        } else {
            playTrack(likedTracksData[0], likedTracksData);
        }
    };

    const handleShufflePlay = () => {
        if (likedTracksData.length > 0) {
            const shuffled = [...likedTracksData].sort(() => Math.random() - 0.5);
            playTrack(shuffled[0], shuffled);
        }
    };

    const totalSeconds = likedTracksData.reduce((acc, t) => acc + (t.duration || 0), 0);
    const totalMinutes = Math.floor(totalSeconds / 60);

    return (
        <div className="min-h-full bg-transparent text-white relative">
            {/* Ambient Gradient Backdrop */}
            <div className="absolute inset-x-0 top-0 h-[49vh] min-h-[320px] bg-gradient-to-b from-purple-900/35 via-[#030303]/75 to-[#030303] pointer-events-none select-none" />

            <div className="relative z-10 max-w-[1478px] mx-auto px-4 md:px-10 pt-8 md:pt-14 pb-28">
                <Link
                    to="/library"
                    className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white mb-6 md:hidden"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Library</span>
                </Link>

                <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">
                    {/* Left Sticky Column */}
                    <aside className="w-full lg:w-[340px] xl:w-[380px] lg:sticky lg:top-20 flex flex-col items-center text-center flex-shrink-0">
                        <div className="w-[216px] h-[216px] sm:w-[264px] sm:h-[264px] rounded-[8px] bg-gradient-to-br from-purple-600 via-fuchsia-600 to-red-500 shadow-2xl flex items-center justify-center">
                            <ThumbsUp className="w-24 h-24 text-white fill-current drop-shadow-lg" />
                        </div>

                        <h1
                            className="text-[24px] sm:text-[28px] font-bold text-white leading-[1.2] mt-5"
                            style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                        >
                            Liked music
                        </h1>

                        <p className="text-sm text-white/70 mt-2">
                            Auto playlist • {likedTracksData.length} {likedTracksData.length === 1 ? 'song' : 'songs'}
                            {totalMinutes > 0 ? ` • ${totalMinutes} minutes` : ''}
                        </p>

                        {/* Action Button Triad */}
                        <div className="flex items-center justify-center gap-5 mt-6">
                            <button
                                type="button"
                                onClick={handleShufflePlay}
                                disabled={likedTracksData.length === 0}
                                aria-label="Shuffle liked music"
                                title="Shuffle"
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition disabled:opacity-40"
                            >
                                <Shuffle className="w-5 h-5" />
                            </button>

                            <button
                                type="button"
                                onClick={handlePlayAll}
                                disabled={likedTracksData.length === 0}
                                aria-label={isCollectionPlaying ? 'Pause liked music' : 'Play liked music'}
                                className="w-16 h-16 rounded-full bg-[#F1F1F1] hover:bg-white text-[#030303] flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition disabled:opacity-40"
                            >
                                {isCollectionPlaying ? (
                                    <Pause className="w-7 h-7 fill-current" />
                                ) : (
                                    <Play className="w-7 h-7 fill-current ml-0.5" />
                                )}
                            </button>

                            <DownloadMenu
                                tracks={likedTracksData}
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white justify-center transition"
                                iconClassName="w-5 h-5"
                            />
                        </div>
                    </aside>

                    {/* Right Scrollable Tracklist */}
                    <div className="flex-1 min-w-0 w-full">
                        {likedTracksData.length === 0 ? (
                            <div className="bg-[#181818] border border-white/10 rounded-[8px] p-12 text-center space-y-4">
                                <ThumbsUp className="w-12 h-12 mx-auto text-white/30" />
                                <h2 className="text-lg font-bold text-white">Songs you like will appear here</h2>
                                <p className="text-sm text-white/60">
                                    Tap the thumbs-up icon on any song to save it to Liked music.
                                </p>
                                <Link
                                    to="/feed"
                                    className="inline-flex items-center justify-center h-9 px-6 rounded-full bg-white text-[#030303] text-sm font-medium hover:bg-white/90 transition"
                                >
                                    Explore music
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                {likedTracksData.map((track, index) => (
                                    <TrackRow
                                        key={`${track.id}-${index}`}
                                        track={track}
                                        index={index}
                                        queue={likedTracksData}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
