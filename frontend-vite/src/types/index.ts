// Shared type definitions for KV Music

export interface Track {
    id: string;
    title: string;
    artist: string;
    album: string;
    cover_url: string;
    url?: string;
    duration?: number;
    view_count?: number;
    like_count?: number;
    comment_count?: number;
    bitrate?: number;
    codec?: string;
}

export interface Playlist {
    id: string;
    title: string;
    description?: string;
    tracks: Track[];
    createdAt: number;
    cover_url?: string;
    type?: 'Playlist' | 'Album' | 'Artist';
}

export interface AudioQuality {
    format: string;
    sampleRate: number;
    bitDepth?: number;
    bitrate: number;
    channels: number;
    codec?: string;
}

export interface LyricLine {
    time: number;
    text: string;
}

export interface SearchResult {
    id: string;
    title: string;
    artist: string;
    album: string;
    cover_url: string;
    duration?: number;
}

export interface StaticPlaylist {
    id: string;
    title: string;
    description: string;
    cover_url: string;
    tracks: Track[];
    type: 'Album' | 'Artist' | 'Playlist';
    creator?: string;
}
