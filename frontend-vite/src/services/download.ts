import { Track } from '../types';
import { supportsWebmOpus } from './library';

export type DownloadMode = 'audio' | 'video';

export function audioExt(): string {
    return supportsWebmOpus() ? '.webm' : '.m4a';
}

export function downloadUrl(track: Track, mode: DownloadMode): string {
    if (mode === 'video') {
        return `/api/download/${track.id}?fmt=video`;
    }
    return supportsWebmOpus()
        ? `/api/download/${track.id}?fmt=audio`
        : `/api/download/${track.id}?fmt=m4a`;
}

export function sanitizeFilename(name: string): string {
    return name
        .replace(/[\\/:*?"<>|]/g, ' ')
        .replace(/[\x00-\x1f\x7f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 150);
}

export function trackFilename(track: Track, mode: DownloadMode): string {
    const name = sanitizeFilename(`${track.artist} - ${track.title}`);
    return `${name}${mode === 'video' ? '.mp4' : audioExt()}`;
}

function triggerDownload(url: string, filename: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

export async function downloadTrack(track: Track, mode: DownloadMode): Promise<void> {
    // Blob-based download for both modes: the `download` attribute on a plain
    // URL is ignored by iOS Safari (and some other clients), which then just
    // navigates to the file instead of saving it. Blob URLs work everywhere.
    const response = await fetch(downloadUrl(track, mode));
    if (!response.ok) {
        throw new Error(`Download failed (${response.status})`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    try {
        triggerDownload(url, trackFilename(track, mode));
    } finally {
        // Keep the URL alive long enough for large files to finish saving.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
}

export interface DownloadResult {
    ok: number;
    failed: number;
    failedTitles: string[];
}

export async function downloadTracks(
    tracks: Track[],
    mode: DownloadMode,
    onProgress?: (done: number, total: number) => void,
): Promise<DownloadResult> {
    const result: DownloadResult = { ok: 0, failed: 0, failedTitles: [] };
    for (let i = 0; i < tracks.length; i++) {
        try {
            await downloadTrack(tracks[i], mode);
            result.ok += 1;
        } catch {
            result.failed += 1;
            result.failedTitles.push(tracks[i].title);
        }
        onProgress?.(i + 1, tracks.length);
    }
    return result;
}
