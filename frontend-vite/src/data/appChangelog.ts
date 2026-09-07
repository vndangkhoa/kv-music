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
