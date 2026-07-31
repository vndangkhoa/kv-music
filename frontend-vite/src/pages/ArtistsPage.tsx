import { useEffect, useState } from 'react';
import { Play, Users, Sparkles, Music } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { libraryService } from '../services/library';
import { usePlayerStore } from '../stores/playerStore';
import CoverImage from '../components/CoverImage';

export default function ArtistsPage() {
    const navigate = useNavigate();
    const playTrack = usePlayerStore(s => s.playTrack);
    const [region, setRegion] = useState<'vn' | 'us' | 'kr' | 'cn'>('vn');
    const [artists, setArtists] = useState<Array<{ id: string; name: string; photo?: string; region: string; rank: number; followers: string; topTrack: string }>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        // Synchronous initial load with instant avatars so zero empty gray boxes ever appear
        libraryService.getArtists(region).then((res) => {
            if (isMounted) {
                setArtists(res);
                setLoading(false);
            }
        });

        return () => { isMounted = false; };
    }, [region]);

    const playArtistTrack = async (artistName: string, trackName: string) => {
        try {
            const tracks = await libraryService.search(`${artistName} ${trackName}`);
            if (tracks && tracks.length > 0) {
                playTrack(tracks[0], tracks);
            }
        } catch (e) {
            console.error("Failed to play artist track", e);
        }
    };

    return (
        <div className="min-h-full overflow-y-auto p-4 md:p-6 no-scrollbar pb-28 text-white bg-[#0b132d] w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-cyan-500/15 pb-5 w-full">
                <div>
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
                        <Users className="w-4 h-4" />
                        <span>Bảng Xếp Hạng Nghệ Sĩ Realtime</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-white">TOP NGHỆ SĨ NỔI BẬT</h1>
                    <p className="text-xs text-neutral-400 mt-1">Nghệ sĩ có lượt nghe và theo dõi hàng đầu theo từng quốc gia</p>
                </div>

                {/* Regional Filter Tabs */}
                <div className="grid grid-cols-4 gap-1 bg-[#142044] p-1 rounded-2xl border border-cyan-500/20 text-xs font-extrabold text-center max-w-md w-full">
                    {[
                        { id: 'vn', label: 'VIỆT NAM' },
                        { id: 'us', label: 'ÂU MỸ' },
                        { id: 'kr', label: 'HÀN QUỐC' },
                        { id: 'cn', label: 'TRUNG QUỐC' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setRegion(tab.id as any)}
                            className={`py-2 rounded-xl transition ${region === tab.id ? 'bg-gradient-to-r from-[#00a8ff] to-[#2e86de] text-white shadow-lg shadow-cyan-500/20' : 'text-neutral-400 hover:text-white'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid List - Full Page Width */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
                {artists.map((artist) => (
                    <div
                        key={artist.id}
                        className="bg-[#142044] hover:bg-[#1a2957] border border-cyan-500/15 hover:border-cyan-400/40 rounded-2xl p-4 transition-all duration-300 flex items-center justify-between group shadow-md w-full"
                    >
                        <div className="flex items-center gap-3.5 min-w-0">
                            {/* Rank badge */}
                            <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center flex-shrink-0 ${
                                artist.rank === 1 ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30' :
                                artist.rank === 2 ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/30' :
                                artist.rank === 3 ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' :
                                'bg-[#0b132d] text-neutral-400 border border-cyan-500/20'
                            }`}>
                                #{artist.rank}
                            </div>

                            {/* Artist Avatar */}
                            <div
                                onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}`)}
                                className="cursor-pointer flex-shrink-0 relative group-hover:scale-105 transition"
                            >
                                <CoverImage
                                    src={artist.photo}
                                    alt={artist.name}
                                    className="w-14 h-14 rounded-full object-cover border-2 border-cyan-400/30 shadow-md"
                                    fallbackText={artist.name[0]}
                                />
                            </div>

                            {/* Artist Info */}
                            <div className="min-w-0">
                                <h3
                                    onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}`)}
                                    className="font-bold text-white text-sm hover:text-cyan-400 cursor-pointer truncate transition"
                                >
                                    {artist.name}
                                </h3>
                                <p className="text-[11px] text-cyan-400 font-medium flex items-center gap-1 mt-0.5">
                                    <Users className="w-3 h-3" />
                                    <span>{artist.followers} người nghe</span>
                                </p>
                                <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                                    HOT: {artist.topTrack}
                                </p>
                            </div>
                        </div>

                        {/* Play button */}
                        <button
                            onClick={() => playArtistTrack(artist.name, artist.topTrack)}
                            className="w-9 h-9 rounded-full bg-gradient-to-r from-[#00a8ff] to-[#2e86de] text-white flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:scale-110 active:scale-95 transition flex-shrink-0 ml-2"
                            title={`Phát nhạc ${artist.name}`}
                        >
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
