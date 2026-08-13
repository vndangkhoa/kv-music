import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePlayerStore } from '../stores/playerStore';
import type { Track } from '../types';

// Landing page for shared track links (/track/:id). Resolves the track by its
// YouTube id and immediately starts playback so clicking a shared link plays the song.
export default function Track() {
  const { id } = useParams();
  const playTrack = usePlayerStore(s => s.playTrack);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/track/${encodeURIComponent(id)}`)
      .then(r => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((track: Track) => {
        if (cancelled) return;
        playTrack(track, undefined, true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, [id, playTrack]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-white/70 text-lg">Không tìm thấy bài hát này.</p>
        <Link to="/" className="mt-4 text-cyan-400 underline font-medium">Về trang chủ</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-16 h-16 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mb-4" />
      <p className="text-white/70 font-medium">Đang mở bài hát...</p>
    </div>
  );
}

// Small helper export for places that want a consistent share URL builder.
export function shareTrackUrl(id: string): string {
  return `${window.location.origin}/share/track/${encodeURIComponent(id)}`;
}
