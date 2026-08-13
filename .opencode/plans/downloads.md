# Download Feature Plan (Desktop) - with quality choice

## Goal
On desktop: download (a) a single song, (b) all songs of an album, (c) all songs
of a playlist - each with a quality choice in the UI:
- **Audio** (`.webm` Opus on Chrome/Edge, `.m4a` AAC on Safari) - small (~2-4MB),
  instant from server cache, best audio YouTube offers (~160 kbps Opus, some
  videos 384 kbps; no lossless exists on YouTube).
- **Video** (`.mp4` H.264+AAC via ffmpeg merge, up to 1080p for most music
  videos) - "highest resolution" file, ~10-100MB, first fetch slower.

## Backend (`backend-rust`)

### 1. New `spotdl.rs` method `get_video_url(video_id) -> Result<String,String>`
- Same cache pattern as `get_stream_url`: look for `{video_id}.mp4` in
  `download_dir`, else run yt-dlp:
  - `-f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"`
  - `--merge-output-format mp4` (ffmpeg already installed - Dockerfile:32)
  - Reuse `yt_dlp_args_with_flags_vec` (cookies, IPv6 fallback, retry logic
    mirrors `get_stream_url`: 429 backoff, cookie rejection recovery).
- Note: h264 caps at 1080p on YouTube; 4K+ needs VP9/AV1 (webm) - not chosen,
  mp4 compatibility wins for downloads.

### 2. New `api.rs` handler `download_handler` + route in `main.rs`
- `GET /api/download/{id}?fmt=audio|video` (default `audio`).
- `fmt=audio` -> existing `get_stream_url` file (reuses cache).
- `fmt=video` -> `get_video_url` file.
- Serve file with `Content-Disposition: attachment; filename="..."`
  (filename derived from video id + extension).

## Frontend (`frontend-vite`)

### 3. New `src/services/download.ts`
- `audioExt()`: `.webm` / `.m4a` via existing `supportsWebmOpus()`.
- `sanitizeFilename(s)`.
- `downloadTrack(track, mode)`: 
  - audio: `fetch('/api/download/ID?fmt=audio')` -> blob -> anchor
    `"Artist - Title.webm"` -> revoke (progressable).
  - video: hidden anchor `href="/api/download/ID?fmt=video" download="Artist -
    Title.mp4"` (browser download manager handles the big file; no blob in RAM).
- `downloadTracks(tracks, mode, onProgress(done,total))`: sequential loop.

### 4. Album page (`Album.tsx`)
- Toolbar Download button (currently dead, line 170) -> small dropdown menu:
  "Download Audio" / "Download Video (HD)".
- State machine `idle -> downloading x/y -> done -> error` (spinner + count,
  then checkmark).
- Per-track download icon in rows (hover-reveal next to Heart,
  `e.stopPropagation()`) -> same 2-option mini-menu.

### 5. Playlist page (`Playlist.tsx`)
- Add Download button to Actions row (next to Play/Shuffle) with the same
  dropdown + progress state machine, downloads `playlist.tracks`.
- Per-track download icon in rows (hover-reveal) -> 2-option mini-menu.

### 6. `MobileFullPlayer.tsx`
- Refactor existing `handleDownload` (lines 197-216) to call
  `downloadTrack(track, 'audio')`.

## Notes
- No store/type changes. Same-origin requests, no CORS issues.
- Video files accumulate on server (`download_dir`); same lifecycle as audio
  cache today. Optionally note a future cleanup task.
- Manual verify: audio + video single/album/playlist downloads land in
  Downloads with correct names/extensions; play them back on phone.

## Verify
- Backend: `cargo build` in `backend-rust/`.
- Frontend: `npm run lint` + `npm run build` in `frontend-vite/`.
