import React, { createContext, useContext, useState, useEffect } from "react";
import { dbService, Playlist } from "../services/db";
import { libraryService } from "../services/library";
import { Track } from "../types";

type FilterType = 'all' | 'playlists' | 'artists' | 'albums';

interface LibraryContextType {
    userPlaylists: Playlist[];
    libraryItems: LibraryItem[];
    activeFilter: FilterType;
    setActiveFilter: (filter: FilterType) => void;
    refreshLibrary: () => Promise<void>;
}

interface LibraryItem {
    id: string;
    title: string;
    type: 'Playlist' | 'Artist' | 'Album';
    cover_url?: string;
    creator?: string;
    tracks?: Track[];
    description?: string;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
    const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
    const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

    const fetchAllData = async () => {
        try {
            // 1. User Playlists from IndexedDB
            const playlists = await dbService.getPlaylists() || [];
            setUserPlaylists(playlists);

            // 2. Browse Content from Backend
            const browse = await libraryService.getBrowseContent();

            // Explicitly handle categories
            const seedPlaylists = browse['Top Playlists'] || [];
            const seedAlbums = browse['Top Albums'] || [];
            const seedArtists = browse['Popular Artists'] || [];

            // 3. Extract metadata from tracks (Only if we have tracks to parse)
            // But mostly we typically rely on Seed Data now.
            // We can still try to discover more from whatever tracks we have.

            const allItems: LibraryItem[] = [];

            // Add Seed Artists
            seedArtists.forEach(a => {
                allItems.push({
                    id: a.id,
                    title: a.title,
                    type: 'Artist',
                    cover_url: a.cover_url,
                    description: 'Artist'
                });
            });

            // Add Seed Albums
            seedAlbums.forEach(a => {
                allItems.push({
                    id: a.id,
                    title: a.title,
                    type: 'Album',
                    cover_url: a.cover_url,
                    creator: a.creator,
                    description: a.description
                });
            });

            // Add Seed Playlists
            seedPlaylists.forEach(p => {
                allItems.push({
                    id: p.id,
                    title: p.title,
                    type: 'Playlist',
                    cover_url: p.cover_url,
                    description: p.description,
                    tracks: p.tracks
                });
            });

            // Deduplicate
            const seenIds = new Set();
            const uniqueItems = allItems.filter(item => {
                if (seenIds.has(item.id)) return false;
                seenIds.add(item.id);
                return true;
            });

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
