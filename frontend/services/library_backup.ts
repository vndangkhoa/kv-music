import { Track } from "./db";

export interface StaticPlaylist {
    id: string;
    title: string;
    description: string;
    cover_url: string;
    tracks: Track[];
}

export const libraryService = {
    async getLibrary(): Promise<StaticPlaylist> {
        const res = await fetch('/library.json');
        if (!res.ok) throw new Error("Failed to load library");
        const data = await res.json();
        // MOCK: Replace URLs with a working sample for testing Audiophile features
        // In a real local-first app, these would be relative paths to local files or S3 presigned URLs.
        data.tracks = data.tracks.map((t: any) => ({
            ...t,
            url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        }));
        return data;
    },

    async getBrowseContent(): Promise<Record<string, StaticPlaylist[]>> {
        const data = await this.getLibrary();
        // Mock categories using the single playlist we have
        return {
            "Top Lists": [data],
            "Just For You": [data],
            "Trending": [data]
        };
    },

    async getPlaylist(id: string): Promise<StaticPlaylist | null> {
        const data = await this.getLibrary();
        if (data.id === id) return data;
        return null;
    },

    async getRecommendations(seedTrackId?: string): Promise<Track[]> {
        const data = await this.getLibrary();
        // Return random 10 tracks
        return [...data.tracks].sort(() => 0.5 - Math.random()).slice(0, 10);
    },

    async getRecommendedAlbums(seedArtist?: string): Promise<StaticPlaylist[]> {
        const data = await this.getLibrary();
        // Return the main playlist as a recommended album for now
        return [data];
    },

    async search(query: string): Promise<Track[]> {
        const data = await this.getLibrary();
        const lowerQuery = query.toLowerCase();
        return data.tracks.filter(t =>
            t.title.toLowerCase().includes(lowerQuery) ||
            t.artist.toLowerCase().includes(lowerQuery)
        );
    }
};
