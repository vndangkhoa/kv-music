import { useToastStore } from '../stores/toastStore';

// SoundCloud-style toast stack (top center, dark pill with orange text).
export default function Toast() {
    const toasts = useToastStore(s => s.toasts);
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-16 md:top-20 left-1/2 -translate-x-1/2 z-[120] flex flex-col items-center gap-2 pointer-events-none px-4 w-full max-w-md">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className="px-4 py-2.5 rounded-full bg-[#333333] border border-white/10 text-sm font-semibold text-orange-500 shadow-2xl animate-in fade-in"
                >
                    {t.message}
                </div>
            ))}
        </div>
    );
}
