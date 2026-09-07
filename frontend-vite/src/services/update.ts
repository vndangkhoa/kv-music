import { newerEntries } from '../data/appChangelog';

export interface UpdateCheckResult {
    current: string | null;
    latest: string | null;
    /** true = newer build exists, false = up to date, null = unknown (dev server / offline / old server). */
    updateAvailable: boolean | null;
    detailsUrl: string;
    error?: string;
    /** Bundled changelog highlights for builds newer than `current`. */
    whatsNew: { version: string; date: string; highlights: string[] }[];
    /** True when the server predates the update-check endpoints. */
    legacyServer: boolean;
}

const DETAILS_URL = 'https://pkg.khoavo.myds.me/package/kvmusic';

/**
 * Ask the server which image build it runs and whether Docker Hub has a
 * newer one. The registry comparison happens server-side (no CORS issues);
 * the what's-new notes come from the bundled changelog.
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
    const fail = (error: string, current: string | null = null): UpdateCheckResult => ({
        current,
        latest: null,
        updateAvailable: null,
        detailsUrl: DETAILS_URL,
        error,
        whatsNew: newerEntries(current),
        legacyServer: false,
    });

    let current: string | null = null;
    try {
        const vres = await fetch('/api/version');
        if (vres.ok) {
            const v = await vres.json();
            current = typeof v?.imageTag === 'string' ? v.imageTag : null;
        } else if (vres.status === 404) {
            // Server predates /api/version: still show bundled highlights.
            return {
                current: null,
                latest: null,
                updateAvailable: null,
                detailsUrl: DETAILS_URL,
                whatsNew: newerEntries(null),
                legacyServer: true,
            };
        }
    } catch {
        return fail('Server connection error.');
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const res = await fetch('/api/update-check', { signal: controller.signal });
        clearTimeout(timeout);
        if (res.status === 404) {
            return {
                current,
                latest: null,
                updateAvailable: null,
                detailsUrl: DETAILS_URL,
                whatsNew: newerEntries(current),
                legacyServer: true,
            };
        }
        const data = await res.json();
        const latest = typeof data?.latest === 'string' ? data.latest : null;
        const updateAvailable =
            typeof data?.updateAvailable === 'boolean' ? data.updateAvailable : null;
        const result: UpdateCheckResult = {
            current: typeof data?.current === 'string' ? data.current : current,
            latest,
            updateAvailable,
            detailsUrl: typeof data?.detailsUrl === 'string' ? data.detailsUrl : DETAILS_URL,
            whatsNew: newerEntries(latest ?? current),
            legacyServer: false,
        };
        if (typeof data?.error === 'string' && data.error) result.error = data.error;
        // If an update exists, show notes for every build newer than current.
        if (updateAvailable) result.whatsNew = newerEntries(result.current);
        return result;
    } catch {
        return fail('Update check timed out. The server may be offline.', current);
    }
}
