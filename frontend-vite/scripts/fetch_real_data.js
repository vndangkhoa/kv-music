import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target Top 20 items for "Real" feel
const TOP_ARTISTS = [
    // V-Rap / Hip Hop
    "Sơn Tùng M-TP", "Đen Vâu", "HIEUTHUHAI", "Hoàng Thùy Linh", "Wren Evans",
    "MCK", "Tlinh", "Mono", "Binz", "JustaTee", "Karik", "Suboi", "Rhymastic",
    "Obito", "Wxrdie", "Andree Right Hand", "B Ray", "BigDaddy", "Emily", "Low G",

    // V-Pop / Ballad / Indie
    "Phan Mạnh Quỳnh", "Mỹ Tâm", "Hà Anh Tuấn", "Vũ.", "Đức Phúc", "Erik", "Min",
    "Chillies", "Ngọt", "Cá Hồi Hoang", "Da LAB", "Tăng Duy Tân", "Trúc Nhân",
    "Noo Phước Thịnh", "Đông Nhi", "Soobin Hoàng Sơn", "Orange", "LyLy", "Amee",
    "Văn Mai Hương", "Phương Mỹ Chi",

    // International / K-Pop
    "Taylor Swift", "The Weeknd", "Ariana Grande", "Justin Bieber",
    "BTS", "BLACKPINK", "Charlie Puth", "Ed Sheeran", "Bruno Mars",
    "Post Malone", "Drake", "Kendrick Lamar", "Billie Eilish", "Olivia Rodrigo"
];

const TOP_ALBUMS = [
    { title: "Sky Tour", artist: "Sơn Tùng M-TP" },
    { title: "LINK", artist: "Hoàng Thùy Linh" },
    { title: "99%", artist: "MCK" },
    { title: "Loi Choi", artist: "Wren Evans" },
    { title: "Ai Cũng Phải Bắt Đầu Từ Đâu Đó", artist: "HIEUTHUHAI" },
    { title: "Cong", artist: "Tóc Tiên" },
    { title: "Citopia", artist: "Phùng Khánh Linh" },
    { title: "Vũ Trụ Cò Bay", artist: "Phương Mỹ Chi" },
    { title: "Yên", artist: "Hoàng Dũng" },
    { title: "Một Vạn Năm", artist: "Vũ." },
    { title: "Stardom", artist: "Vũ Cát Tường" },
    { title: "DreAMEE", artist: "Amee" },
    { title: "Hương", artist: "Văn Mai Hương" },
    { title: "Diệu Kỳ Việt Nam", artist: "Various Artists" },
    { title: "Rap Việt Season 3", artist: "Various Artists" },
    { title: "Hidden Gem", artist: "Various Artists" },
    { title: "WeChoice Awards 2023", artist: "Various Artists" },
    { title: "Human", artist: "Tùng Dương" },
    { title: "Midnights", artist: "Taylor Swift" },
    { title: "After Hours", artist: "The Weeknd" }
];

const TOP_PLAYLISTS = [
    "Vietnam Top Hits 2024", "Nhac Tre Moi Nhat", "V-Pop Rising", "Indie Vietnam",
    "Rap Viet All Stars", "Lofi Chill Vietnam", "Top 50 Vietnam", "Viral Hits Vietnam",
    "Bolero Tru Tinh", "Nhac Trinh Cong Son", "Acoustic Thu Gian", "Piano Focus",
    "Workout Energy", "Beast Mode", "Sleep Sounds", "Party Anthems",
    "K-Pop ON!", "K-Pop Daebak", "Anime Hits", "Gaming Music"
];

// Path to yt-dlp - trying relative to script location (frontend-vite/scripts -> root)
// Or assume in PATH if not found
const ROOT_DIR = path.resolve(__dirname, '../../');
const YT_DLP_PATH = path.join(ROOT_DIR, 'yt-dlp.exe');
const CMD_BASE = fs.existsSync(YT_DLP_PATH) ? `"${YT_DLP_PATH}"` : 'yt-dlp';

console.log(`Using yt-dlp at: ${CMD_BASE}`);

async function fetchMetadata(query, type) {
    return new Promise((resolve) => {
        let searchQ = query;
        let isChannelSearch = false;

        // Adding "Topic" often finds the auto-generated art track which has the square album cover
        // For Artists -> We want FACES, so we search for the Channel.
        if (type === 'Artist') {
            searchQ = `${query} official channel`;
            isChannelSearch = true;
        }
        if (type === 'Album') searchQ = `${query} full album topic`;
        if (type === 'Playlist') searchQ = `${query} playlist`;

        // --flat-playlist to just get list, but we want the FIRST result metadata
        // ytsearch1: returns a playlist of 1 result. dump-json gives us that result.
        const cmd = `${CMD_BASE} "ytsearch2:${searchQ}" --dump-json --flat-playlist --no-playlist --skip-download`;

        exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
            if (err) {
                console.error(`Failed to fetch: ${query}`);
                resolve(null);
                return;
            }

            // yt-dlp might output multiple lines. We only want the first valid JSON.
            const lines = stdout.trim().split('\n');
            let data = null;

            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    // Check if it's a valid result object or contains entries
                    if (parsed.id || parsed.entries) {
                        data = parsed;
                        break;
                    }
                } catch (e) { continue; }
            }

            if (!data) {
                resolve(null);
                return;
            }

            try {
                // For a search result, it might be an object or entries
                let entry = data;
                if (data.entries && data.entries.length > 0) {
                    entry = data.entries[0];
                }

                let cover = null;

                // PRIORITY: Channel Thumbnail (Face)
                if (isChannelSearch && entry.channel_thumbnail) {
                    cover = entry.channel_thumbnail;
                }
                // Fallback / Standard
                else if (entry.thumbnails && entry.thumbnails.length > 0) {
                    // Get last (usually highest res)
                    cover = entry.thumbnails[entry.thumbnails.length - 1].url;
                } else if (entry.thumbnail) {
                    cover = entry.thumbnail;
                }

                resolve({
                    title: entry.title || query,
                    cover_url: cover,
                    original_query: query
                });
            } catch (e) {
                console.error(`Processing error for ${query}:`, e.message);
                resolve(null);
            }
        });
    });
}

async function run() {
    console.log("Fetching Real Data... this will take a moment.");

    const results = {};

    // Parallelize with chunks to speed up?
    // Let's do huge parallelism (all at once) since it's just network requests for metadata
    // But limit it slightly to avoid IP ban. Let's do batches of 5.

    const processBatch = async (items, type, formatFn) => {
        const promises = items.map(async (item) => {
            const label = type === 'Album' ? item.title : item;
            const meta = await fetchMetadata(type === 'Album' ? `${item.artist} - ${item.title}` : item, type);

            if (meta && meta.cover_url) {
                if (type === 'Artist') {
                    results[label] = {
                        id: `artist-${label.replace(/\s+/g, '-')}`,
                        title: label,
                        description: 'Artist',
                        cover_url: meta.cover_url,
                        type: 'Artist',
                        creator: label,
                        tracks: []
                    };
                } else if (type === 'Album') {
                    results[`${item.title} Album`] = {
                        id: `album-${item.title.replace(/\s+/g, '-')}`,
                        title: item.title,
                        description: `Album • ${item.artist}`,
                        cover_url: meta.cover_url,
                        type: 'Album',
                        creator: item.artist,
                        tracks: []
                    };
                } else {
                    results[label] = {
                        id: `playlist-${label.replace(/\s+/g, '-')}`,
                        title: label,
                        description: `Playlist • Trending`,
                        cover_url: meta.cover_url,
                        type: 'Playlist',
                        tracks: []
                    };
                }
                process.stdout.write('.'); // Progress dot
            } else {
                process.stdout.write('x');
            }
        });
        await Promise.all(promises);
    };

    console.log("\nFetching Artists...");
    await processBatch(TOP_ARTISTS, 'Artist');

    console.log("\nFetching Albums...");
    await processBatch(TOP_ALBUMS, 'Album');

    console.log("\nFetching Playlists...");
    await processBatch(TOP_PLAYLISTS, 'Playlist');

    console.log("\nWriting file...");

    const tsCode = `import { StaticPlaylist } from "../types";

export const GENERATED_CONTENT: Record<string, StaticPlaylist> = ${JSON.stringify(results, null, 4)};`;

    fs.writeFileSync(path.join(__dirname, '../src/data/seed_data_real.ts'), tsCode);
    console.log("\nDone! Written to seed_data_real.ts");
}

run();
