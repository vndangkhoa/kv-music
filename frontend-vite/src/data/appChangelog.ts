// Bundled server-release changelog, newest first.
//
// Mirrors CHANGELOG.md highlights per server image tag (1.0.0-N). The
// Settings → Check for updates dialog shows entries NEWER than the running
// server's image tag, so users see exactly what an update brings.
// Keep this in sync with CHANGELOG.md when cutting a release.

export interface AppChangelogEntry {
    version: string;      // server image tag, e.g. "1.0.0-22"
    date: string;         // YYYY-MM-DD
    highlights: string[];
}

export const APP_CHANGELOG: AppChangelogEntry[] = [
    {
        version: '1.0.0-25',
        date: '2026-11-18',
        highlights: [
            'Redesigned Web & Android UI with YouTube Music visual layout (#030303 dark canvas, 240px/72px guide rail, 72px player bar, expandable split Watch Page) while preserving KV Music brand identity',
            'Built-in Cloudflare WARP MASQUE (usque v4.2.1) auto-failover & proxy routing across backend and Android to bypass YouTube IP blocks',
            'Instant Home Quick Picks & Trending chart hydration with accessible horizontal scroll-snap carousels',
        ],
    },
    {
        version: '1.0.0-24',
        date: '2026-11-17',
        highlights: [
            'Unified KV Music flame-orange studio disc & 7-bar waveform icon across Web, PWA, Synology DSM SPK, Android & iOS',
            'Synced PWA manifest (#121212 theme, separate standard & maskable icons, shortcuts, Open Graph banner)',
            'Upgraded OS MediaSession lock-screen controls & MobileMiniBar/PlayerBar control cards with live timestamps and prev/next buttons',
        ],
    },
    {
        version: '1.0.0-23',
        date: '2026-11-13',
        highlights: [
            'Smooth search typing (Web, Android, iOS): fixed keyboard dismissal, input overwrite, IME composition, and mobile bar closing mid-typing',
            'Instant live search suggestions via direct innerTube API + cached universal search',
            'Non-blocking backend subprocess execution so searches never stall while streaming',
        ],
    },
    {
        version: '1.0.0-22',
        date: '2026-09-07',
        highlights: [
            'Song-by-song lists: Feed and Library paint the first songs instantly and stream in the rest on scroll',
            'Faster waveforms: list rows no longer download full audio to draw bars',
            'Hold-to-seek: touch-hold the sound wave and slide to scrub (plain taps no longer jump playback)',
            'Check for updates in Settings, with what\'s-new notes',
        ],
    },
    {
        version: '1.0.0-21',
        date: '2026-08-20',
        highlights: [
            'PWA update banner: prompt-mode service worker so new builds actually reach installed apps',
            'Installable release APKs signed and published',
        ],
    },
];

/** Numeric build suffix of "1.0.0-N"; -1 when unparseable (dev builds). */
export function imageBuildNumber(tag: string | null | undefined): number {
    if (!tag) return -1;
    const m = tag.trim().match(/(\d+)\s*$/);
    if (!m) return -1;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? n : -1;
}

/** Changelog entries newer than `currentTag` (unknown/dev → show latest only). */
export function newerEntries(currentTag: string | null | undefined): AppChangelogEntry[] {
    const cur = imageBuildNumber(currentTag);
    if (cur < 0) return APP_CHANGELOG.slice(0, 1);
    return APP_CHANGELOG.filter(e => imageBuildNumber(e.version) > cur);
}
