import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { dbService, Playlist } from "../services/db";
import { Track } from "../types";

type FilterType = 'all' | 'playlists' | 'artists' | 'albums';

interface SavedAlbum {
    id: string;
    title: string;
    artist: string;
    cover_url: string;
}

interface LibraryContextType {
    userPlaylists: Playlist[];
    followedArtists: string[];
    savedAlbums: SavedAlbum[];
    activeFilter: FilterType;
    setActiveFilter: (filter: FilterType) => void;
    refreshLibrary: () => Promise<void>;
    deriveSavedAlbums: (playHistory: Track[]) => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
    const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
    const [followedArtists, setFollowedArtists] = useState<string[]>([]);
    const [savedAlbums, setSavedAlbums] = useState<SavedAlbum[]>([]);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

    const fetchAllData = useCallback(async () => {
        try {
            // 1. User Playlists from IndexedDB
            const playlists = await dbService.getPlaylists() || [];
            setUserPlaylists(playlists);

            // 2. Followed Artists from localStorage (same source as Artist page heart button)
            const likedArtists = JSON.parse(localStorage.getItem('likedArtists') || '[]') as string[];
            setFollowedArtists(likedArtists);

        } catch (err) {
            console.error(err);
        }
    }, []);

    // Derive saved albums from play history (called from component using PlayerContext)
    const deriveSavedAlbums = useCallback((playHistory: Track[]) => {
        const seen = new Map<string, SavedAlbum>();
        for (const track of playHistory) {
            if (track.album && !seen.has(track.album)) {
                seen.set(track.album, {
                    id: track.album.replace(/\s+/g, '-').toLowerCase(),
                    title: track.album,
                    artist: track.artist,
                    cover_url: track.cover_url,
                });
            }
        }
        setSavedAlbums(Array.from(seen.values()));
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    return (
        <LibraryContext.Provider value={{
            userPlaylists,
            followedArtists,
            savedAlbums,
            activeFilter,
            setActiveFilter,
            refreshLibrary: fetchAllData,
            deriveSavedAlbums,
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
