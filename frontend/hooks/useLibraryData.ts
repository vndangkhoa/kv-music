
import { useState, useEffect } from 'react';
import { dbService, Playlist } from '@/services/db';
import { libraryService } from '@/services/library';

export function useLibraryData() {
    const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
    const [libraryItems, setLibraryItems] = useState<any[]>([]);

    const fetchAllData = async () => {
        try {
            // 1. User Playlists
            const playlists = await dbService.getPlaylists();
            setUserPlaylists(playlists);

            // 2. Local/Backend Content
            const browse = await libraryService.getBrowseContent();
            const browsePlaylists = Object.values(browse).flat();

            const artistsMap = new Map();
            const albumsMap = new Map();
            const allTracks: any[] = [];

            // 3. Extract metadata and flattening tracks
            browsePlaylists.forEach((p: any) => {
                if (p.tracks) {
                    p.tracks.forEach((t: any) => {
                        allTracks.push(t);
                        // Fake Artist
                        if (artistsMap.size < 40 && t.artist && t.artist !== 'Unknown Artist' && t.artist !== 'Unknown') {
                            if (!artistsMap.has(t.artist)) {
                                artistsMap.set(t.artist, {
                                    id: `artist-${t.artist}`,
                                    title: t.artist,
                                    type: 'Artist',
                                    cover_url: t.cover_url
                                });
                            }
                        }
                        // Fake Album
                        if (albumsMap.size < 40 && t.album && t.album !== 'Single' && t.album !== 'Unknown Album') {
                            if (!albumsMap.has(t.album)) {
                                albumsMap.set(t.album, {
                                    id: `album-${t.album}`,
                                    title: t.album,
                                    type: 'Album',
                                    creator: t.artist,
                                    cover_url: t.cover_url
                                });
                            }
                        }
                    });
                }
            });

            const creativeNames = [
                "Chill Vibes", "Late Night Focus", "Workout Energy", "Road Trip Classics",
                "Indie Mix", "Pop Hits", "Throwback Thursday", "Weekend Flow",
                "Deep Focus", "Party Anthems", "Jazz & Blues", "Acoustic Sessions",
                "Morning Coffee", "Rainy Day", "Sleep Sounds", "Gaming Beats",
                "Coding Mode", "Summer Hits", "Winter Lo-Fi", "Discover Weekly",
                "Release Radar", "On Repeat", "Time Capsule", "Viral 50",
                "Global Top 50", "Trending Now", "Fresh Finds", "Audiobook Mode",
                "Podcast Favorites", "Rock Classics", "Metal Essentials", "Hip Hop Gold",
                "Electronic Dreams", "Ambient Spaces", "Classical Masterpieces", "Country Roads"
            ];

            // 4. Generate Fake Extra Playlists if needed (Target ~40 total)
            const fakePlaylists = [...browsePlaylists];
            const targetCount = 40;
            const needed = targetCount - fakePlaylists.length;

            if (needed > 0 && allTracks.length > 0) {
                // Shuffle utility
                const shuffle = (array: any[]) => array.sort(() => 0.5 - Math.random());

                for (let i = 0; i < needed; i++) {
                    const shuffled = shuffle([...allTracks]);
                    const selected = shuffled.slice(0, 8 + Math.floor(Math.random() * 12)); // 8-20 tracks
                    const cover = selected[0]?.cover_url;

                    const name = creativeNames[i] || `Daily Mix ${i + 1}`;

                    fakePlaylists.push({
                        id: `mix-${i}`,
                        title: name,
                        description: `Curated just for you • ${selected.length} songs`,
                        cover_url: cover,
                        tracks: selected,
                        type: 'Playlist'
                    });
                }
            }

            // Dedupe Playlists (just in case)
            // const uniquePlaylists = Array.from(new Map(fakePlaylists.map(p => [p.id, p])).values());

            const uniqueItems = [
                ...fakePlaylists.map(p => ({ ...p, type: 'Playlist' })),
                ...Array.from(artistsMap.values()),
                ...Array.from(albumsMap.values())
            ];

            setLibraryItems(uniqueItems);

        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    return { userPlaylists, libraryItems, refresh: fetchAllData };
}
