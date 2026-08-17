import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

// Shows a "new version available" banner whenever the service worker detects
// an updated build. Without this, the PWA's cache-first service worker keeps
// serving the OLD bundle to returning users — which made the app look like it
// was "stuck on an old version" after every release.
export default function SWUpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
    });
    // Keep the reference so future calls can trigger the update programmatically.
    (window as any).__kvMusicUpdateSW = () => updateSW(true);
    return () => {
      delete (window as any).__kvMusicUpdateSW;
    };
  }, []);

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-[130] w-[calc(100%-32px)] max-w-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#1c1c1c] border border-[#ff5500]/40 shadow-2xl">
        <div className="min-w-0">
          {needRefresh ? (
            <>
              <p className="text-xs font-bold text-white">Cập nhật mới có sẵn</p>
              <p className="text-[11px] text-neutral-400 truncate">Nhấn Tải lại để dùng phiên bản mới nhất.</p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold text-white">Sẵn sàng dùng ngoại tuyến</p>
              <p className="text-[11px] text-neutral-400 truncate">Ứng dụng đã sẵn sàng khi mất mạng.</p>
            </>
          )}
        </div>
        {needRefresh ? (
          <button
            onClick={() => {
              // Activate the waiting service worker (skipWaiting) so the
              // reload serves the NEW bundle, not the cached old one.
              (window as any).__kvMusicUpdateSW?.();
              setTimeout(() => window.location.reload(), 350);
            }}
            className="flex-shrink-0 px-3.5 py-2 rounded-full bg-[#ff5500] text-white text-xs font-bold hover:bg-[#ff7a00] transition"
          >
            Tải lại
          </button>
        ) : (
          <button
            onClick={() => setOfflineReady(false)}
            className="flex-shrink-0 px-3.5 py-2 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition"
          >
            OK
          </button>
        )}
      </div>
    </div>
  );
}
