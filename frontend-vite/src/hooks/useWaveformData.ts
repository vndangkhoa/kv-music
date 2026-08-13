import { useEffect, useState } from 'react';

export type WaveformStatus = 'loading' | 'ready' | 'fallback';

// Deterministic pseudo-waveform from a track id (used while real peaks load,
// or when decoding fails). Looks plausible enough to never show a flat bar.
function seededWaveform(id: string, bars = 160): number[] {
    let seed = 0;
    for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
    const rand = () => {
        seed = (seed * 1103515245 + 12345) >>> 0;
        return seed / 4294967296;
    };
    const out: number[] = [];
    for (let i = 0; i < bars; i++) {
        const envelope = Math.sin((i / bars) * Math.PI) * 0.5 + 0.5;
        const n = Math.sin(i * 1.7) * 0.3 + Math.sin(i * 0.43) * 0.3 + rand() * 0.4;
        out.push(Math.max(0.08, Math.min(1, (n * 0.5 + 0.5) * (0.35 + envelope * 0.65))));
    }
    return out;
}

const cache = new Map<string, { peaks: number[]; real: boolean }>();
const inflight = new Map<string, Promise<number[]>>();

async function computePeaks(trackId: string): Promise<number[]> {
    const res = await fetch(`/api/stream/${trackId}`);
    if (!res.ok) throw new Error('stream fetch failed');
    const buffer = await res.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    try {
        const audio = await ctx.decodeAudioData(buffer);
        const channel = audio.getChannelData(0);
        const bars = 160;
        const block = Math.floor(channel.length / bars);
        const peaks = new Array<number>(bars);
        for (let i = 0; i < bars; i++) {
            let max = 0;
            const start = i * block;
            const end = i === bars - 1 ? channel.length : start + block;
            for (let j = start; j < end; j += 4) {
                const v = Math.abs(channel[j]);
                if (v > max) max = v;
            }
            peaks[i] = Math.max(0.05, Math.min(1, max * 3));
        }
        return peaks;
    } finally {
        try { ctx.close(); } catch { /* ignore */ }
    }
}

// Real audio peaks for a track, cached per session. Falls back to a seeded
// pseudo-waveform so rows/player never show an empty bar.
export function useWaveformData(trackId: string | undefined, bars = 160) {
    const [peaks, setPeaks] = useState<number[] | null>(null);
    const [status, setStatus] = useState<WaveformStatus>('loading');

    useEffect(() => {
        if (!trackId) {
            setPeaks(null);
            setStatus('loading');
            return;
        }
        const cached = cache.get(trackId);
        if (cached) {
            setPeaks(cached.peaks.slice(0, bars));
            setStatus(cached.real ? 'ready' : 'fallback');
            return;
        }
        // Show the pseudo waveform immediately, then upgrade to real peaks.
        const pseudo = seededWaveform(trackId, bars);
        setPeaks(pseudo);
        setStatus('fallback');

        let cancelled = false;
        if (!inflight.has(trackId)) {
            inflight.set(
                trackId,
                computePeaks(trackId)
                    .catch(() => seededWaveform(trackId, 160))
            );
        }
        inflight.get(trackId)!.then((real) => {
            if (cancelled) return;
            cache.set(trackId, { peaks: real, real: true });
            setPeaks(real.slice(0, bars));
            setStatus('ready');
        });
        return () => { cancelled = true; };
    }, [trackId, bars]);

    return { peaks, status };
}
