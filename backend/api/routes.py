from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
from pathlib import Path
import yt_dlp
import requests
from backend.cache_manager import CacheManager
from backend.playlist_manager import PlaylistManager

import re

router = APIRouter()
cache = CacheManager()
playlist_manager = PlaylistManager()

def clean_text(text: str) -> str:
    if not text:
        return ""
    # Remove emojis
    text = text.encode('ascii', 'ignore').decode('ascii')
    # Remove text inside * * or similar patterns if they look spammy
    # Remove excessive punctuation
    # Example: "THE * VIRAL 50 *" -> "THE VIRAL 50"
    
    # 1. Remove URLs
    text = re.sub(r'http\S+|www\.\S+', '', text)
    
    # 2. Remove "Playlist", "Music Chart", "Full SPOTIFY" spam keywords if desirable, 
    # but that might be too aggressive.
    # Let's focus on cleaning the "Structure".
    
    # 3. Truncate Description if too long (e.g. > 300 chars)?
    # The user example had a MASSIVE description.
    # Let's just take the first paragraph or chunk?
    
    # 4. Remove excessive non-alphanumeric separators
    text = re.sub(r'[*_=]{3,}', '', text) # Remove long separator lines
    
    # Custom cleaning for the specific example style:
    # Remove text between asterisks if it looks like garbage? No, sometimes it's emphasis.
    
    return text.strip()

def clean_title(title: str) -> str:
    if not title: return "Playlist"
    # Remove emojis (simple way)
    title = title.encode('ascii', 'ignore').decode('ascii')
    # Remove "Playlist", "Music Chart", "Full Video" spam
    spam_words = ["Playlist", "Music Chart", "Full SPOTIFY Video", "Updated Weekly", "Official", "Video"]
    for word in spam_words:
        title = re.sub(word, "", title, flags=re.IGNORECASE)
    
    # Remove extra spaces and asterisks
    title = re.sub(r'\s+', ' ', title).strip()
    title = title.strip('*- ')
    return title

def clean_description(desc: str) -> str:
    if not desc: return ""
    # Remove URLs
    desc = re.sub(r'http\S+', '', desc)
    # Remove massive divider lines
    desc = re.sub(r'[*_=]{3,}', '', desc)
    # Be more aggressive with length?
    if len(desc) > 300:
        desc = desc[:300] + "..."
    return desc.strip()

CACHE_DIR = Path("backend/cache")

class SearchRequest(BaseModel):
    url: str

class CreatePlaylistRequest(BaseModel):
    name: str # Renamed from Title to Name to match Sidebar usage more typically, but API expects pydantic model
    description: str = ""

@router.get("/browse")
async def get_browse_content():
    """
    Returns the real fetched playlists from browse_playlists.json
    """
    try:
        data_path = Path("backend/data/browse_playlists.json")
        if data_path.exists():
            with open(data_path, "r") as f:
                return json.load(f)
        else:
            return []
    except Exception as e:
        print(f"Browse Error: {e}")
        return []

@router.get("/playlists")
async def get_user_playlists():
    return playlist_manager.get_all()

@router.post("/playlists")
async def create_user_playlist(playlist: CreatePlaylistRequest):
    return playlist_manager.create(playlist.name, playlist.description)

@router.delete("/playlists/{id}")
async def delete_user_playlist(id: str):
    success = playlist_manager.delete(id)
    if not success:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"status": "ok"}

@router.get("/playlists/{id}")
async def get_playlist(id: str):
    """
    Get a specific playlist by ID.
    1. Check if it's a User Playlist.
    2. If not, fetch from YouTube Music (Browse/External).
    """
    # 1. Try User Playlist
    user_playlists = playlist_manager.get_all()
    user_playlist = next((p for p in user_playlists if p['id'] == id), None)
    if user_playlist:
        return user_playlist

    # 2. Try External (YouTube Music)
    # Check Cache first
    cache_key = f"playlist:{id}"
    cached_playlist = cache.get(cache_key)
    if cached_playlist:
        return cached_playlist

    try:
        from ytmusicapi import YTMusic
        yt = YTMusic()
        
        playlist_data = None
        is_album = False
        
        # Try as Album first if ID looks like an album (MPREb...) or just try block
        if id.startswith("MPREb"):
             try:
                playlist_data = yt.get_album(id)
                is_album = True
             except:
                pass
        
        if not playlist_data:
            try:
                # ytmusicapi returns a dict with 'tracks' list
                playlist_data = yt.get_playlist(id, limit=100)
            except Exception as e:
                # Fallback: Try as album if not tried yet
                if not is_album:
                    try:
                        playlist_data = yt.get_album(id)
                        is_album = True
                    except:
                        raise e # Re-raise if both fail

        # Format to match our app's Protocol
        formatted_tracks = []
        if 'tracks' in playlist_data:
            for track in playlist_data['tracks']:
                # Safely extract artists
                artists_list = track.get('artists') or []
                if isinstance(artists_list, list):
                    artist_names = ", ".join([a.get('name', 'Unknown') for a in artists_list])
                else:
                    artist_names = "Unknown Artist"

                # Safely extract thumbnails
                thumbnails = track.get('thumbnails', [])
                if not thumbnails and is_album:
                     # Albums sometimes have thumbnails at root level, not per track
                     thumbnails = playlist_data.get('thumbnails', [])
                     
                cover_url = thumbnails[-1]['url'] if thumbnails else "https://placehold.co/300x300"
                
                # Safely extract album
                album_info = track.get('album')
                # If it's an album fetch, the album name is the playlist title
                album_name = album_info.get('name', playlist_data.get('title')) if album_info else playlist_data.get('title', 'Single')

                formatted_tracks.append({
                    "title": track.get('title', 'Unknown Title'),
                    "artist": artist_names,
                    "album": album_name,
                    "duration": track.get('duration_seconds', track.get('length_seconds', 0)), 
                    "cover_url": cover_url,
                    "id": track.get('videoId'),
                    "url": f"https://music.youtube.com/watch?v={track.get('videoId')}"
                })

        # Get Playlist Cover (usually highest res)
        thumbnails = playlist_data.get('thumbnails', [])
        p_cover = thumbnails[-1]['url'] if thumbnails else "https://placehold.co/300x300"

        formatted_playlist = {
            "id": playlist_data.get('browseId', playlist_data.get('id')),
            "title": clean_title(playlist_data.get('title', 'Unknown')),
            "description": clean_description(playlist_data.get('description', '')),
            "author": playlist_data.get('author', {}).get('name', 'YouTube Music') if not is_album else ", ".join([a.get('name','') for a in playlist_data.get('artists', [])]),
            "cover_url": p_cover,
            "tracks": formatted_tracks
        }

        # Cache it (1 hr)
        cache.set(cache_key, formatted_playlist, ttl_seconds=3600)
        return formatted_playlist

    except Exception as e:
        print(f"Playlist Fetch Error: {e}")
        raise HTTPException(status_code=404, detail="Playlist not found")

class UpdatePlaylistRequest(BaseModel):
    name: str = None
    description: str = None

@router.put("/playlists/{id}")
async def update_user_playlist(id: str, playlist: UpdatePlaylistRequest):
    updated = playlist_manager.update(id, name=playlist.name, description=playlist.description)
    if not updated:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return updated

class AddTrackRequest(BaseModel):
    id: str
    title: str
    artist: str
    album: str
    cover_url: str
    duration: int = 0
    url: str = ""

@router.post("/playlists/{id}/tracks")
async def add_track_to_playlist(id: str, track: AddTrackRequest):
    track_data = track.dict()
    success = playlist_manager.add_track(id, track_data)
    if not success:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"status": "ok"}


@router.get("/search")
async def search_tracks(query: str):
    """
    Search for tracks using ytmusicapi.
    """
    if not query:
        return []

    # Check Cache
    cache_key = f"search:{query.lower().strip()}"
    cached_result = cache.get(cache_key)
    if cached_result:
        print(f"DEBUG: Returning cached search results for '{query}'")
        return cached_result

    try:
        from ytmusicapi import YTMusic
        yt = YTMusic()
        results = yt.search(query, filter="songs", limit=20)
        
        tracks = []
        for track in results:
            # Safely extract artists
            artists_list = track.get('artists') or []
            if isinstance(artists_list, list):
                artist_names = ", ".join([a.get('name', 'Unknown') for a in artists_list])
            else:
                artist_names = "Unknown Artist"

            # Safely extract thumbnails
            thumbnails = track.get('thumbnails', [])
            cover_url = thumbnails[-1]['url'] if thumbnails else "https://placehold.co/300x300"
            
            # Safely extract album
            album_info = track.get('album')
            album_name = album_info.get('name', 'Single') if album_info else "Single"

            tracks.append({
                "title": track.get('title', 'Unknown Title'),
                "artist": artist_names,
                "album": album_name,
                "duration": track.get('duration_seconds', 0), 
                "cover_url": cover_url,
                "id": track.get('videoId'),
                "url": f"https://music.youtube.com/watch?v={track.get('videoId')}"
            })
            
        response_data = {"tracks": tracks}
        # Cache for 24 hours (86400 seconds)
        cache.set(cache_key, response_data, ttl_seconds=86400)
        return response_data

    except Exception as e:
        print(f"Search Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recommendations")
async def get_recommendations(seed_id: str = None):
    """
    Get recommended tracks (Play History based or Trending).
    If seed_id is provided, fetches 'Up Next' / 'Radio' tracks for that video.
    """
    try:
        from ytmusicapi import YTMusic
        yt = YTMusic()
        
        if not seed_id:
            # Fallback to Trending if no history
            return await get_trending()

        cache_key = f"rec:{seed_id}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        # Use get_watch_playlist to find similar tracks (Radio)
        watch_playlist = yt.get_watch_playlist(videoId=seed_id, limit=20)
        
        tracks = []
        if 'tracks' in watch_playlist:
            for track in watch_playlist['tracks']:
                # Skip the seed track itself if play history already has it
                if track.get('videoId') == seed_id:
                    continue
                    
                artists_list = track.get('artists') or []
                if isinstance(artists_list, list):
                    artist_names = ", ".join([a.get('name', 'Unknown') for a in artists_list])
                else:
                    artist_names = "Unknown Artist"

                thumbnails = track.get('thumbnails', [])
                cover_url = thumbnails[-1]['url'] if thumbnails else "https://placehold.co/300x300"
                
                # album is often missing in watch playlist, fallback
                album_info = track.get('album')
                album_name = album_info.get('name', 'Single') if album_info else "Single"

                tracks.append({
                    "title": track.get('title', 'Unknown Title'),
                    "artist": artist_names,
                    "album": album_name,
                    "duration": track.get('length_seconds', track.get('duration_seconds', 0)), 
                    "cover_url": cover_url,
                    "id": track.get('videoId'),
                    "url": f"https://music.youtube.com/watch?v={track.get('videoId')}"
                })

        response_data = {"tracks": tracks}
        cache.set(cache_key, response_data, ttl_seconds=3600) # 1 hour cache
        return response_data

    except Exception as e:
        print(f"Recommendation Error: {e}")
        # Fallback to trending on error
        return await get_trending()

@router.get("/recommendations/albums")
async def get_recommended_albums(seed_artist: str = None):
    """
    Get recommended albums based on an artist query.
    """
    if not seed_artist:
        return []

    cache_key = f"rec_albums:{seed_artist.lower().strip()}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    try:
        from ytmusicapi import YTMusic
        yt = YTMusic()
        
        # Search for albums by this artist
        results = yt.search(seed_artist, filter="albums", limit=10)
        
        albums = []
        for album in results:
            thumbnails = album.get('thumbnails', [])
            cover_url = thumbnails[-1]['url'] if thumbnails else "https://placehold.co/300x300"
            
            albums.append({
                "title": album.get('title', 'Unknown Album'),
                "description": album.get('year', '') + " • " + album.get('artist', seed_artist),
                "cover_url": cover_url,
                "id": album.get('browseId'),
                "type": "Album"
            })
            
        cache.set(cache_key, albums, ttl_seconds=86400)
        return albums

    except Exception as e:
        print(f"Album Rec Error: {e}")
        return []

@router.get("/trending")
async def get_trending():
    """
    Returns the pre-fetched Trending Vietnam playlist.
    """
    try:
        data_path = Path("backend/data.json")
        if data_path.exists():
            with open(data_path, "r") as f:
                return json.load(f)
        else:
            return {"error": "Trending data not found. Run fetch_data.py first."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stream")
async def stream_audio(id: str):
    """
    Stream audio for a given YouTube video ID.
    Extracts direct URL via yt-dlp and streams it.
    """
    try:
        # Check Cache for stream URL
        cache_key = f"stream:{id}"
        cached_url = cache.get(cache_key)
        
        stream_url = None
        if cached_url:
            print(f"DEBUG: Using cached stream URL for '{id}'")
            stream_url = cached_url
        else:
            print(f"DEBUG: Fetching new stream URL for '{id}'")
            url = f"https://www.youtube.com/watch?v={id}" 
            ydl_opts = {
                'format': 'bestaudio[ext=m4a]/best[ext=mp4]/best', # Prefer m4a/aac for iOS
                'quiet': True,
                'noplaylist': True,
            }
            
            # Extract direct URL
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                stream_url = info.get('url')
            
            if stream_url:
                # Cache for 1 hour (3600 seconds) - URLs expire
                cache.set(cache_key, stream_url, ttl_seconds=3600)

        if not stream_url:
            raise HTTPException(status_code=404, detail="Audio stream not found")
            
        # Stream the content
        def iterfile():
            # Verify if URL is still valid by making a HEAD request or handling stream error
            # For simplicity, we just try to stream. If 403, we might need to invalidate, 
            # but that logic is complex for this method.
            with requests.get(stream_url, stream=True) as r:
                r.raise_for_status() # Check for 403
                # Use smaller chunks (64KB) for better TTFB (Time To First Byte)
                for chunk in r.iter_content(chunk_size=64*1024): 
                    yield chunk

        # Note: We return audio/mpeg, but it might be opus/webm.
        # Browsers are usually smart enough to sniff.
        return StreamingResponse(iterfile(), media_type="audio/mpeg")
        
    except Exception as e:
        print(f"Stream Error: {e}")
        # If cached URL failed (likely 403), we could try to invalidate here, 
        # but for now we just return error.
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download")
async def download_audio(id: str, title: str = "audio"):
    """
    Download audio for a given YouTube video ID.
    Proxies the stream content as a file attachment.
    """
    try:
        # Check Cache for stream URL
        cache_key = f"stream:{id}"
        cached_url = cache.get(cache_key)
        
        stream_url = None
        if cached_url:
            stream_url = cached_url
        else:
            url = f"https://www.youtube.com/watch?v={id}" 
            ydl_opts = {
                'format': 'bestaudio/best',
                'quiet': True,
                'noplaylist': True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                stream_url = info.get('url')
            
            if stream_url:
                cache.set(cache_key, stream_url, ttl_seconds=3600)

        if not stream_url:
            raise HTTPException(status_code=404, detail="Audio stream not found")
            
        # Stream the content with attachment header
        def iterfile():
            with requests.get(stream_url, stream=True) as r:
                r.raise_for_status()
                for chunk in r.iter_content(chunk_size=1024*1024): 
                    yield chunk

        # Sanitize filename
        safe_filename = "".join([c for c in title if c.isalnum() or c in (' ', '-', '_')]).strip()
        headers = {
            "Content-Disposition": f'attachment; filename="{safe_filename}.mp3"'
        }

        return StreamingResponse(iterfile(), media_type="audio/mpeg", headers=headers)
        
    except Exception as e:
        print(f"Download Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/lyrics")
async def get_lyrics(id: str, title: str = None, artist: str = None):
    """
    Fetch synchronized lyrics using multiple providers hierarchy:
    1. Cache (fastest)
    2. yt-dlp (Original Video Captions - best sync for exact video)
    3. LRCLIB (Open Source Database - good fuzzy match)
    4. syncedlyrics (Musixmatch/NetEase Aggregator - widest coverage)
    """
    if not id:
        return []

    cache_key = f"lyrics:{id}"
    cached_lyrics = cache.get(cache_key)
    if cached_lyrics:
        return cached_lyrics

    parsed_lines = []
    
    # Run heavy IO in threadpool
    from starlette.concurrency import run_in_threadpool
    import syncedlyrics

    try:
        # --- Strategy 1: yt-dlp (Official Captions) ---
        def fetch_ytdlp_subs():
            parsed = []
            try:
                lyrics_dir = CACHE_DIR / "lyrics"
                lyrics_dir.mkdir(parents=True, exist_ok=True)
                out_tmpl = str(lyrics_dir / f"{id}")
                ydl_opts = {
                    'skip_download': True, 'writesubtitles': True, 'writeautomaticsub': True,
                    'subtitleslangs': ['en', 'vi'], 'subtitlesformat': 'json3',
                    'outtmpl': out_tmpl, 'quiet': True
                }
                url = f"https://www.youtube.com/watch?v={id}"
                import glob
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([url])
                
                pattern = str(lyrics_dir / f"{id}.*.json3")
                found_files = glob.glob(pattern)
                if found_files:
                    best_file = next((f for f in found_files if f.endswith(f"{id}.en.json3")), found_files[0])
                    with open(best_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        for event in data.get('events', []):
                            if 'segs' in event and 'tStartMs' in event:
                                text = "".join([s.get('utf8', '') for s in event['segs']]).strip()
                                if text and not text.startswith('[') and text != '\n':
                                    parsed.append({"time": float(event['tStartMs']) / 1000.0, "text": text})
            except Exception as e:
                print(f"yt-dlp sub error: {e}")
            return parsed

        parsed_lines = await run_in_threadpool(fetch_ytdlp_subs)

        # --- Strategy 2: LRCLIB (Search API) ---
        if not parsed_lines and title and artist:
            print(f"Trying LRCLIB Search for: {title} {artist}")
            def fetch_lrclib():
                try:
                    # Fuzzy match using search, not get
                    cleaned_title = re.sub(r'\(.*?\)', '', title)
                    clean_query = f"{artist} {cleaned_title}".strip()
                    resp = requests.get("https://lrclib.net/api/search", params={"q": clean_query}, timeout=5)
                    if resp.status_code == 200:
                        results = resp.json()
                        # Find first result with synced lyrics
                        for item in results:
                            if item.get("syncedLyrics"):
                                return parse_lrc_string(item["syncedLyrics"])
                except Exception as e:
                    print(f"LRCLIB error: {e}")
                return []
            
            parsed_lines = await run_in_threadpool(fetch_lrclib)

        # --- Strategy 3: syncedlyrics (Aggregator) ---
        if not parsed_lines and title and artist:
            print(f"Trying SyncedLyrics Aggregator for: {title} {artist}")
            def fetch_syncedlyrics():
                try:
                    # syncedlyrics.search returns the LRC string or None
                    clean_query = f"{title} {artist}".strip()
                    lrc_str = syncedlyrics.search(clean_query) 
                    if lrc_str:
                        return parse_lrc_string(lrc_str)
                except Exception as e:
                    print(f"SyncedLyrics error: {e}")
                return []
            
            parsed_lines = await run_in_threadpool(fetch_syncedlyrics)

        # Cache Result
        if parsed_lines:
            cache.set(cache_key, parsed_lines, ttl_seconds=86400 * 30)
            return parsed_lines
            
        return []

    except Exception as e:
        print(f"Global Lyrics Error: {e}")
        return []

def parse_lrc_string(lrc_content: str):
    """Parses LRC format string into [{time, text}]"""
    lines = []
    if not lrc_content: return lines
    for line in lrc_content.split('\n'):
        # Format: [mm:ss.xx] Text
        match = re.search(r'\[(\d+):(\d+\.?\d*)\](.*)', line)
        if match:
            minutes = float(match.group(1))
            seconds = float(match.group(2))
            text = match.group(3).strip()
            total_time = minutes * 60 + seconds
            if text:
                lines.append({"time": total_time, "text": text})
    return lines
