# PWA + Media Session (lock screen / notification player) Plan

## Goal
Make the app a fully installable PWA (already configured) and add Media Session
integration so the phone notification / lock screen shows the track cover
thumbnail with full playback controls (play/pause/next/prev/seek).

## Current State
- PWA: `vite-plugin-pwa` configured in `frontend-vite/vite.config.ts` with
  manifest + icons; service worker registration verified in built
  `dist/index.html` (`registerSW.js`). Nothing to change.
- Media Session: partial in `frontend-vite/src/components/player/MiniPlayer.tsx`
  (lines 49/52 playbackState, lines 75-83 setPositionState), but MISSING:
  - `navigator.mediaSession.metadata` -> notification shows no title/artist/cover
  - action handlers -> notification buttons are dead

## Implementation Steps

### 1. New file `frontend-vite/src/hooks/useMediaSession.ts`
Hook called once from MiniPlayer:
- Metadata: on `currentTrack` change, set `navigator.mediaSession.metadata`
  with title/artist/album + `artwork`. Artwork: fetch `cover_url` -> blob ->
  object URL (CORS-safe, fallback to raw URL on failure); revoke old blob URLs.
- Action handlers (registered once, read state via `usePlayerStore.getState()`
  to avoid stale closures):
  - `play` / `pause` -> `togglePlay()`
  - `previoustrack` / `nexttrack` -> `prevTrack()` / `nextTrack()`
  - `stop` -> pause
  - `seekto` -> `seekTo(details.seekTime)`
  - `seekbackward` / `seekforward` -> `seekTo(progress -/+ 10)`
- Sync via `usePlayerStore.subscribe`:
  - track change -> refresh metadata
  - `isPlaying` / `isVideoMode` change -> `playbackState`
  - `progress` change -> `setPositionState` (reads from `document.querySelector('audio')`)
- Note: `setPositionState` throws without metadata set, so this also fixes the
  current silent failure.
- Cleanup on unmount: unsubscribe, null handlers, revoke blob URLs.

### 2. Edit `frontend-vite/src/components/player/MiniPlayer.tsx`
- Call `useMediaSession()` at top of component.
- Remove duplicated playbackState sets (lines 49, 52) and the
  setPositionState block (lines 75-83) - now handled by the hook.

### 3. Verify
- `npm run lint` and `npm run build` (tsc + vite) in `frontend-vite/`.

## Notes
- Video mode uses the YouTube iframe, which manages its own notification
  session - standard behavior, no change needed.
- Requires HTTPS (or localhost) for SW + Media Session on phones - production
  served via TLS already.
