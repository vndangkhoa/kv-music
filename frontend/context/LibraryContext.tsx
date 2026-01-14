
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { dbService, Playlist } from "@/services/db";
import { libraryService } from "@/services/library";

type FilterType = 'all' | 'playlists' | 'artists' | 'albums';

interface LibraryContextType {
    userPlaylists: Playlist[];
    libraryItems: any[];
    activeFilter: FilterType;
    setActiveFilter: (filter: FilterType) => void;
    refreshLibrary: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
    const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
    const [libraryItems, setLibraryItems] = useState<any[]>([]);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

    const fetchAllData = async () => {
        try {
            // 1. User Playlists
            const playlists = await dbService.getPlaylists();
            setUserPlaylists(playlists);

            // 2. Local/Backend Content
            const browse = await libraryService.getBrowseContent();
            // Deduplicate by ID to avoid React duplicate key warnings
            const browsePlaylistsRaw = Object.values(browse).flat();
            const seenIds = new Map();
            const browsePlaylists = browsePlaylistsRaw.filter((p: any) => {
                if (seenIds.has(p.id)) return false;
                seenIds.set(p.id, true);
                return true;
            });

            const artistsMap = new Map();
            const albumsMap = new Map();
            const allTracks: any[] = [];

            // 3. Extract metadata
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

            // 4. Generate Fake Extra Playlists (Creative Names)
            const fakePlaylists = [...browsePlaylists];
            const targetCount = 40;
            const needed = targetCount - fakePlaylists.length;

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

            if (needed > 0 && allTracks.length > 0) {
                const shuffle = (array: any[]) => array.sort(() => 0.5 - Math.random());

                for (let i = 0; i < needed; i++) {
                    const shuffled = shuffle([...allTracks]);
                    const selected = shuffled.slice(0, 8 + Math.floor(Math.random() * 12));
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

    return (
        <LibraryContext.Provider value={{
            userPlaylists,
            libraryItems,
            activeFilter,
            setActiveFilter,
            refreshLibrary: fetchAllData
        }}>
            {children}
        </LibraryContext.Provider>
    );
}

export function useLibrary() {
    const context = useContext(LibraryContext);
    if (context === undefined) {
        throw new Error("useLibrary must be used within a LibraryProvider");
    }
    return context;
}
