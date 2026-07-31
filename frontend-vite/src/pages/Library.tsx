import { Link, useNavigate } from 'react-router-dom';
import { Play, Plus, Music, Disc3, Users, Clock, Sparkles, Flame, Search, Trash2, Heart, ShieldCheck, Laptop } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLibraryStore } from '../stores/libraryStore';
import { usePlayerStore } from '../stores/playerStore';
import { useAuthStore } from '../stores/authStore';
import CoverImage from '../components/CoverImage';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import { dbService } from '../services/db';
import LoginModal from '../components/LoginModal';
import { libraryService, getArtistCoverUrl } from '../services/library';
import { StaticPlaylist } from '../types';

interface GradientColor {
    from: string;
    to: string;
}

function getAvatarGradient(avatarColor: string): string {
    try {
        const parsed: GradientColor = JSON.parse(avatarColor);
        return `linear-gradient(135deg, ${parsed.from}, ${parsed.to})`;
    } catch {
        return 'linear-gradient(135deg, #00a8ff, #2e86de)';
    }
}

export default function Library() {
    const navigate = useNavigate();
    const userPlaylists = useLibraryStore(s => s.userPlaylists);
    const followedArtists = useLibraryStore(s => s.followedArtists);
    const savedAlbums = useLibraryStore(s => s.savedAlbums);
    const refreshLibrary = useLibraryStore(s => s.refreshLibrary);
    const hydrateSeedTracks = useLibraryStore(s => s.hydrateSeedTracks);
    const activeFilter = useLibraryStore(s => s.activeFilter);
    const setActiveFilter = useLibraryStore(s => s.setActiveFilter);
    const deriveSavedAlbums = useLibraryStore(s => s.deriveSavedAlbums);
    
    const likedTracks = usePlayerStore(s => s.likedTracks);
    const likedTracksData = usePlayerStore(s => s.likedTracksData);
    const playHistory = usePlayerStore(s => s.playHistory);
    const playTrack = usePlayerStore(s => s.playTrack);
    
    const user = useAuthStore(s => s.user);
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const pairCode = user?.pairCode || 'KV-MAIN';

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [browseData, setBrowseData] = useState<Record<string, StaticPlaylist[]>>({});

    const handleCreatePlaylist = async (name: string) => {
        await dbService.createPlaylist(name);
        refreshLibrary();
    };

    const handleDeletePlaylist = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Bạn có chắc chắn muốn xóa playlist này khỏi thưu viện?")) {
            await dbService.deletePlaylist(id);
            refreshLibrary();
        }
    };

    const playAllLikedTracks = () => {
        if (likedTracksData.length > 0) {
            playTrack(likedTracksData[0], likedTracksData);
        }
    };

    useEffect(() => {
        refreshLibrary();
        hydrateSeedTracks();
        deriveSavedAlbums(playHistory);
    }, []);

    useEffect(() => {
        if (Object.keys(browseData).length === 0) {
            libraryService.getBrowseContent()
                .then(data => setBrowseData(data))
                .catch(() => {});
        }
    }, []);

    const filters = [
        { key: 'all', label: 'Tất Cả' },
        { key: 'liked', label: 'Bài Hát Yêu Thích' },
        { key: 'playlists', label: 'Playlist Của Tôi' },
        { key: 'artists', label: 'Nghệ Sĩ' },
        { key: 'albums', label: 'Albums' },
    ] as const;

    const showAll = activeFilter === 'all';
    const showLiked = showAll || activeFilter === 'liked';
    const showPlaylists = showAll || activeFilter === 'playlists';
    const showArtists = showAll || activeFilter === 'artists';
    const showAlbums = showAll || activeFilter === 'albums';

    return (
        <div className="min-h-full overflow-y-auto p-4 md:p-6 no-scrollbar pb-28 text-white bg-[#0b132d] w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-cyan-500/15 pb-5">
                <div>
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
                        <Disc3 className="w-4 h-4 animate-spin-slow" />
                        <span>Bộ Sưu Tập Cá Nhân</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-white">THƯ VIỆN ÂM NHẠC</h1>
                    <p className="text-xs text-neutral-400 mt-1">Quản lý bài hát yêu thích, playlist sáng tạo và nghệ sĩ bạn theo dõi</p>
                </div>

                {/* Create Playlist Button & Search */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#00a8ff] to-[#2e86de] hover:from-[#0094e0] hover:to-[#2575c4] text-white rounded-2xl transition font-bold text-xs shadow-lg shadow-cyan-500/20 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Tạo Playlist Mới</span>
                    </button>
                    <button
                        onClick={() => navigate('/search')}
                        className="w-9 h-9 bg-[#142044] hover:bg-[#1a2957] border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400 hover:text-white transition"
                        title="Tìm kiếm"
                    >
                        <Search className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Profile & Sync Banner */}
            {isLoggedIn && user ? (
                <div className="mb-6 p-4 md:p-5 bg-[#142044] border border-cyan-500/20 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-4 min-w-0 w-full md:w-auto">
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg flex-shrink-0 border-2 border-cyan-400/40"
                            style={{ background: getAvatarGradient(user.avatarColor) }}
                        >
                            {user.name.trim()[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-white truncate">{user.name}</h2>
                                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] font-extrabold rounded-full border border-cyan-500/30 flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> VIP MEMBER
                                </span>
                            </div>
                            <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                                <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Mã Đồng Bộ Device: <strong className="text-cyan-300 font-mono">{pairCode}</strong></span>
                            </p>
                        </div>
                    </div>

                    {/* User Library Quick Stats */}
                    <div className="grid grid-cols-4 gap-2 text-center w-full md:w-auto bg-[#0b132d]/80 p-2.5 rounded-2xl border border-cyan-500/10">
                        <div className="px-3">
                            <p className="text-sm font-black text-cyan-400">{likedTracks.size}</p>
                            <p className="text-[10px] text-neutral-400 uppercase font-bold">Yêu thích</p>
                        </div>
                        <div className="px-3 border-l border-cyan-500/10">
                            <p className="text-sm font-black text-cyan-400">{userPlaylists.length}</p>
                            <p className="text-[10px] text-neutral-400 uppercase font-bold">Playlist</p>
                        </div>
                        <div className="px-3 border-l border-cyan-500/10">
                            <p className="text-sm font-black text-cyan-400">{followedArtists.length}</p>
                            <p className="text-[10px] text-neutral-400 uppercase font-bold">Nghệ sĩ</p>
                        </div>
                        <div className="px-3 border-l border-cyan-500/10">
                            <p className="text-sm font-black text-cyan-400">{playHistory.length}</p>
                            <p className="text-[10px] text-neutral-400 uppercase font-bold">Đã nghe</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mb-6 p-4 md:p-5 bg-gradient-to-r from-[#142044] via-[#1a2957] to-[#142044] border border-cyan-500/25 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                    <div>
                        <h3 className="font-bold text-white text-base">Đăng Nhập Hoặc Đồng Bộ Thiết Bị</h3>
                        <p className="text-xs text-neutral-400 mt-0.5">Lưu danh sách bài hát yêu thích, playlist và đồng bộ tức thì với mã Pair Code</p>
                    </div>
                    <button
                        onClick={() => setIsLoginOpen(true)}
                        className="px-5 py-2 bg-gradient-to-r from-[#00a8ff] to-[#2e86de] hover:from-[#0094e0] hover:to-[#2575c4] text-white font-bold rounded-2xl transition text-xs shadow-lg shadow-cyan-500/20 shrink-0"
                    >
                        Đăng Nhập / Mã Pair
                    </button>
                </div>
            )}

            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
                {filters.map((filter) => (
                    <button
                        key={filter.key}
                        onClick={() => setActiveFilter(filter.key)}
                        className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition shrink-0 ${
                            activeFilter === filter.key
                                ? 'bg-gradient-to-r from-[#00a8ff] to-[#2e86de] text-white shadow-lg shadow-cyan-500/20'
                                : 'bg-[#142044] text-neutral-400 hover:text-white border border-cyan-500/10'
                        }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Liked Songs Hero Card */}
            {showLiked && (
                <div className="mb-8">
                    <div className="bg-gradient-to-r from-cyan-900/40 via-blue-900/30 to-[#142044] border border-cyan-500/20 rounded-3xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl relative overflow-hidden group">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-[#00a8ff] to-[#2e86de] flex items-center justify-center shadow-xl shadow-cyan-500/30 shrink-0 group-hover:scale-105 transition">
                                <Heart className="w-8 h-8 md:w-10 md:h-10 text-white fill-white" />
                            </div>
                            <div>
                                <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-wider">Danh Sách Đặc Biệt</span>
                                <h2 className="text-xl md:text-2xl font-black text-white">Bài Hát Đã Thích</h2>
                                <p className="text-xs text-neutral-300 mt-1 flex items-center gap-2">
                                    <span>{likedTracks.size} bài hát đã lưu</span>
                                    <span>•</span>
                                    <span className="text-cyan-400 font-medium">Cập nhật tự động</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                            <Link to="/collection/tracks">
                                <button className="px-4 py-2 bg-[#142044] hover:bg-[#1a2957] border border-cyan-500/30 text-white rounded-2xl text-xs font-bold transition">
                                    Xem Tất Cả
                                </button>
                            </Link>
                            <button
                                onClick={playAllLikedTracks}
                                disabled={likedTracks.size === 0}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#00a8ff] to-[#2e86de] hover:from-[#0094e0] hover:to-[#2575c4] disabled:opacity-50 text-white rounded-2xl font-black text-xs shadow-lg shadow-cyan-500/30 hover:scale-105 transition active:scale-95"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                <span>Phát Tất Cả</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Your Playlists Section */}
            {showPlaylists && (
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Music className="w-4 h-4 text-cyan-400" />
                            <span>Playlist Của Tôi ({userPlaylists.length})</span>
                        </h2>
                    </div>

                    {userPlaylists.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                            {userPlaylists.map((playlist) => (
                                <Link to={`/playlist/${playlist.id}`} key={playlist.id}>
                                    <div className="bg-[#142044] hover:bg-[#1a2957] border border-cyan-500/15 hover:border-cyan-400/40 p-3.5 rounded-2xl transition duration-300 group cursor-pointer relative flex flex-col justify-between h-full shadow-md">
                                        <div className="relative mb-3">
                                            <CoverImage
                                                src={playlist.cover_url}
                                                alt={playlist.title}
                                                className="w-full aspect-square rounded-xl shadow-lg object-cover"
                                                fallbackText={playlist.title?.substring(0, 2).toUpperCase()}
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 rounded-xl flex items-center justify-center">
                                                <div className="w-10 h-10 bg-gradient-to-r from-[#00a8ff] to-[#2e86de] text-white rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                                                    <Play className="w-4 h-4 fill-current ml-0.5" />
                                                </div>
                                            </div>

                                            {/* Delete Custom Playlist Option */}
                                            {!playlist.id.startsWith('discovery-') && (
                                                <button
                                                    onClick={(e) => handleDeletePlaylist(e, playlist.id)}
                                                    className="absolute top-2 right-2 w-7 h-7 bg-red-600/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md"
                                                    title="Xóa Playlist"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white truncate text-xs md:text-sm group-hover:text-cyan-300 transition">
                                                {playlist.title}
                                            </h3>
                                            <p className="text-[11px] text-neutral-400 mt-0.5">
                                                {playlist.tracks.length} bài hát
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-[#142044]/50 border border-cyan-500/10 rounded-2xl p-8 text-center">
                            <Music className="w-10 h-10 text-cyan-400/40 mx-auto mb-2" />
                            <p className="text-sm font-bold text-neutral-300">Chưa có playlist cá nhân nào</p>
                            <p className="text-xs text-neutral-400 mt-1 mb-4">Tạo playlist đầu tiên của bạn để nhóm những bài hát yêu thích</p>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-4 py-2 bg-gradient-to-r from-[#00a8ff] to-[#2e86de] text-white font-bold rounded-2xl text-xs shadow-lg shadow-cyan-500/20"
                            >
                                + Tạo Playlist Mới
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Followed Artists Section */}
            {showArtists && (
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Users className="w-4 h-4 text-cyan-400" />
                            <span>Nghệ Sĩ Theo Dõi ({followedArtists.length})</span>
                        </h2>
                    </div>

                    {followedArtists.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                            {followedArtists.map((artistName) => (
                                <Link to={`/artist/${encodeURIComponent(artistName)}`} key={artistName}>
                                    <div className="bg-[#142044] hover:bg-[#1a2957] border border-cyan-500/15 hover:border-cyan-400/40 p-3.5 rounded-2xl transition duration-300 group cursor-pointer relative flex flex-col justify-between h-full shadow-md text-center">
                                        <div className="relative mb-3 mx-auto w-full max-w-[120px]">
                                            <CoverImage
                                                src={getArtistCoverUrl(artistName)}
                                                alt={artistName}
                                                className="w-full aspect-square rounded-full shadow-lg object-cover border-2 border-cyan-400/30"
                                                fallbackText={artistName?.substring(0, 2).toUpperCase()}
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 rounded-full flex items-center justify-center">
                                                <div className="w-9 h-9 bg-gradient-to-r from-[#00a8ff] to-[#2e86de] text-white rounded-full flex items-center justify-center shadow-lg">
                                                    <Play className="w-4 h-4 fill-current ml-0.5" />
                                                </div>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-white truncate text-xs md:text-sm group-hover:text-cyan-300 transition">
                                            {artistName}
                                        </h3>
                                        <p className="text-[10px] text-cyan-400 font-semibold mt-0.5">Nghệ Sĩ</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-[#142044]/50 border border-cyan-500/10 rounded-2xl p-8 text-center">
                            <Users className="w-10 h-10 text-cyan-400/40 mx-auto mb-2" />
                            <p className="text-sm font-bold text-neutral-300">Chưa theo dõi nghệ sĩ nào</p>
                            <p className="text-xs text-neutral-400 mt-1 mb-4">Khám phá bảng xếp hạng nghệ sĩ để theo dõi ca sĩ bạn yêu thích</p>
                            <Link to="/artists">
                                <button className="px-4 py-2 bg-[#142044] hover:bg-[#1a2957] border border-cyan-500/30 text-cyan-300 font-bold rounded-2xl text-xs">
                                    Bảng Xếp Hạng Nghệ Sĩ
                                </button>
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* Saved Albums Section */}
            {showAlbums && savedAlbums.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Disc3 className="w-4 h-4 text-cyan-400" />
                        <span>Album Đã Lưu ({savedAlbums.length})</span>
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                        {savedAlbums.map((album) => (
                            <Link to={`/album/${album.id}`} key={album.id}>
                                <div className="bg-[#142044] hover:bg-[#1a2957] border border-cyan-500/15 hover:border-cyan-400/40 p-3.5 rounded-2xl transition duration-300 group cursor-pointer relative flex flex-col justify-between h-full shadow-md">
                                    <div className="relative mb-3">
                                        <CoverImage
                                            src={album.cover_url}
                                            alt={album.title}
                                            className="w-full aspect-square rounded-xl shadow-lg object-cover"
                                            fallbackText={album.title?.substring(0, 2).toUpperCase()}
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 rounded-xl flex items-center justify-center">
                                            <div className="w-10 h-10 bg-gradient-to-r from-[#00a8ff] to-[#2e86de] text-white rounded-full flex items-center justify-center shadow-lg">
                                                <Play className="w-4 h-4 fill-current ml-0.5" />
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-white truncate text-xs md:text-sm group-hover:text-cyan-300 transition">
                                        {album.title}
                                    </h3>
                                    <p className="text-[11px] text-neutral-400 mt-0.5 truncate">{album.artist}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Create Playlist Modal & Login Modal */}
            <CreatePlaylistModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreatePlaylist}
            />
            <LoginModal
                isOpen={isLoginOpen}
                onClose={() => setIsLoginOpen(false)}
            />
        </div>
    );
}
