import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { libraryService } from '../services/library';
import { usePlayer } from '../context/PlayerContext';
import { Play } from 'lucide-react';
import { Track } from '../types';
import CoverImage from './CoverImage';

interface RecommendationData {
    tracks: Track[];
    albums: Array<{ id: string; title: string; artist: string; cover_url: string }>;
    playlists: Array<{ id: string; title: string; cover_url: string; track_count: number }>;
    artists: Array<{ id: string; name: string; photo_url: string; cover_url?: string }>;
}

interface RecommendationsProps {
    seed: string;
    seedType?: string;
    limit?: number;
    title?: string;
    showTracks?: boolean;
    showAlbums?: boolean;
    showPlaylists?: boolean;
    showArtists?: boolean;
}

export default function Recommendations({
    seed,
    seedType = 'track',
    limit = 10,
    title = 'You might also like',
    showTracks = true,
    showAlbums = true,
    showPlaylists = true,
    showArtists = true
}: RecommendationsProps) {
    const navigate = useNavigate();
    const { playTrack } = usePlayer();
    const [data, setData] = useState<RecommendationData>({
        tracks: [],
        albums: [],
        playlists: [],
        artists: []
    });
    const [loading, setLoading] = useState(false);

    const playCollection = async (collectionId: string, isAlbum: boolean) => {
        try {
            const result = isAlbum 
                ? await libraryService.getAlbum(collectionId)
                : await libraryService.getPlaylist(collectionId);
            if (result && result.tracks.length > 0) {
                playTrack(result.tracks[0], result.tracks);
            }
        } catch (e) {
            console.error("Failed to play collection in recommendations", e);
        }
    };

    const playArtist = async (artistName: string) => {
        try {
            const tracks = await libraryService.search(artistName);
            if (tracks && tracks.length > 0) {
                playTrack(tracks[0], tracks);
            }
        } catch (e) {
            console.error("Failed to play artist in recommendations", e);
        }
    };

    useEffect(() => {
        if (!seed) return;
        
        const fetchRecommendations = async () => {
            setLoading(true);
            try {
                const result = await libraryService.getRelatedContent(seed, seedType, limit);
                
                const artistsWithPhotos = await Promise.all(
                    result.artists.map(async (artist) => {
                        try {
                            const tracks = await libraryService.search(artist.name);
                            if (tracks.length > 0) {
                                return { ...artist, cover_url: tracks[0].cover_url };
                            }
                        } catch (e) {}
                        try {
                            const info = await libraryService.getArtistInfo(artist.name);
                            if (info.photo) {
                                return { ...artist, cover_url: info.photo };
                            }
                        } catch (e) {}
                        return artist;
                    })
                );
                
                setData({ ...result, artists: artistsWithPhotos });
            } catch (error) {
                console.error('Failed to fetch recommendations:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [seed, seedType, limit]);

    const hasContent = (showTracks && data.tracks.length > 0) || 
                       (showAlbums && data.albums.length > 0) || 
                       (showPlaylists && data.playlists.length > 0) ||
                       (showArtists && data.artists.length > 0);

    const hasAnyContent = hasContent || loading;

    if (!hasAnyContent) return null;

    const isLoading = !hasContent;

    return (
        <div className="p-4 md:p-8 mt-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold hover:underline cursor-pointer">{title}</h2>
            </div>

            {isLoading && (
                <div className="grid grid-cols-2 fold:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-2">
                     {[1, 2, 3, 4, 5].map(i => (
                          <div key={`skel-${i}`} className="bg-[#1f1f1f]/30 p-3 rounded-2xl border border-white/5 space-y-3">
                              <div className="w-full aspect-square bg-neutral-800 rounded-xl animate-pulse" />
                              <div className="h-4 bg-neutral-800 rounded w-3/4 animate-pulse" />
                              <div className="h-3 bg-neutral-800 rounded w-1/2 animate-pulse" />
                          </div>
                     ))}
                 </div>
            )}
            
            <div className="grid grid-cols-2 fold:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-2">
                {/* Tracks */}
                {showTracks && data.tracks.slice(0, 8).map((track) => (
                    <div
                        key={track.id}
                        className="bg-[#1f1f1f]/30 p-3 rounded-2xl hover:bg-[#1f1f1f]/85 transition duration-300 group cursor-pointer relative flex flex-col border border-white/5"
                        onClick={() => playTrack(track, data.tracks)}
                    >
                        <div className="relative mb-3">
                            <CoverImage
                                src={track.cover_url}
                                alt={track.title}
                                className="w-full aspect-square rounded-xl shadow-lg"
                                fallbackText={track.title?.substring(0, 3).toUpperCase() || '♪'}
                            />
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

                {/* Albums */}
                {showAlbums && data.albums.slice(0, 8).map((album) => (
                    <Link to={`/album/${encodeURIComponent(album.id)}`} key={album.id}>
                        <div className="bg-[#1f1f1f]/30 p-3 rounded-2xl hover:bg-[#1f1f1f]/85 transition duration-300 group cursor-pointer relative flex flex-col h-full border border-white/5">
                            <div className="relative mb-3">
                                <CoverImage
                                    src={album.cover_url}
                                    alt={album.title}
                                    className="w-full aspect-square rounded-xl shadow-lg"
                                    fallbackText={album.title?.substring(0, 3).toUpperCase() || '♪'}
                                />
                                <div
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        playCollection(album.id, true);
                                    }}
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl flex items-center justify-center"
                                >
                                    <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                                        <Play className="fill-current text-black ml-0.5 w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                            <h3 className="font-bold text-white text-sm mb-1 truncate">{album.title}</h3>
                            <p className="text-xs text-neutral-400 truncate">{album.artist}</p>
                        </div>
                    </Link>
                ))}

                {/* Playlists */}
                {showPlaylists && data.playlists.slice(0, 8).map((playlist) => (
                    <Link to={`/playlist/${encodeURIComponent(playlist.id)}`} key={playlist.id}>
                        <div className="bg-[#1f1f1f]/30 p-3 rounded-2xl hover:bg-[#1f1f1f]/85 transition duration-300 group cursor-pointer relative flex flex-col h-full border border-white/5">
                            <div className="relative mb-3">
                                <CoverImage
                                    src={playlist.cover_url}
                                    alt={playlist.title}
                                    className="w-full aspect-square rounded-xl shadow-lg"
                                    fallbackText={playlist.title?.substring(0, 3).toUpperCase() || '♪'}
                                />
                                <div
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        playCollection(playlist.id, false);
                                    }}
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl flex items-center justify-center"
                                >
                                    <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                                        <Play className="fill-current text-black ml-0.5 w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                            <h3 className="font-bold text-white text-sm mb-1 truncate">{playlist.title}</h3>
                            <p className="text-xs text-neutral-400 truncate">{playlist.track_count} songs</p>
                        </div>
                    </Link>
                ))}

                {/* Artists */}
                {showArtists && data.artists.slice(0, 8).map((artist) => (
                    <Link to={`/artist/${encodeURIComponent(artist.name)}`} key={artist.id}>
                        <div className="bg-[#1f1f1f]/30 p-3 rounded-2xl hover:bg-[#1f1f1f]/85 transition duration-300 group cursor-pointer relative flex flex-col h-full border border-white/5 text-center">
                            <div className="relative mb-3">
                                <CoverImage
                                    src={artist.cover_url || artist.photo_url}
                                    alt={artist.name}
                                    className="w-full aspect-square rounded-full shadow-lg object-cover"
                                    fallbackText={artist.name?.substring(0, 3).toUpperCase() || '♪'}
                                />
                                <div
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        playArtist(artist.name);
                                    }}
                                    className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition rounded-full flex items-center justify-center"
                                >
                                    <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                                        <Play className="fill-current text-black ml-0.5 w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                            <h3 className="font-bold text-white text-sm mb-1 truncate px-2">{artist.name}</h3>
                            <p className="text-xs text-neutral-400">Artist</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
