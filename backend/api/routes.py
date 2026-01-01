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

def get_high_res_thumbnail(thumbnails: list) -> str:
    """
    Selects the best thumbnail and attempts to upgrade resolution 
    if it's a Google/YouTube URL.
    """
    if not thumbnails:
        return "https://placehold.co/300x300"
    
    # 1. Start with the largest available in the list
    best_url = thumbnails[-1]['url']
    
    # 2. Upgrade resolution for Google User Content (lh3.googleusercontent.com, yt3.ggpht.com)
    # Common patterns: 
    # =w120-h120-l90-rj (Small)
    # =w544-h544-l90-rj (High Res)
    # s120-c-k-c0x00ffffff-no-rj (Profile/Avatar)
    
    if "googleusercontent.com" in best_url or "ggpht.com" in best_url:
        import re
        # Replace width/height params with 544 (standard YTM high res)
        # We look for patterns like =w<num>-h<num>...
        if "w" in best_url and "h" in best_url:
            best_url = re.sub(r'=w\d+-h\d+', '=w544-h544', best_url)
        elif best_url.startswith("https://lh3.googleusercontent.com") and "=" in best_url:
             # Sometimes it's just URL=...
             # We can try to force it
             pass
             
    return best_url

def extract_artist_names(track: dict) -> str:
    """Safely extracts artist names from track data (dict or str items)."""
    artists = track.get('artists') or []
    if isinstance(artists, list):
        names = []
        for a in artists:
            if isinstance(a, dict):
                names.append(a.get('name', 'Unknown'))
            elif isinstance(a, str):
                names.append(a)
        return ", ".join(names) if names else "Unknown Artist"
    return "Unknown Artist"

def extract_album_name(track: dict, default="Single") -> str:
    """Safely extracts album name from track data."""
    album = track.get('album')
    if isinstance(album, dict): 
        return album.get('name', default)
    if isinstance(album, str): 
        return album
    return default

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

CATEGORIES_MAP = {
    "Trending Vietnam": {"query": "Top 50 Vietnam", "type": "playlists"},
    "Just released Songs": {"query": "New Released Songs", "type": "playlists"},
    "Albums": {"query": "New Albums 2024", "type": "albums"},
    "Vietnamese DJs": {"query": "Vinahouse Remix", "type": "playlists"},
    "Global Hits": {"query": "Global Top 50", "type": "playlists"},
    "Chill Vibes": {"query": "Chill Lofi", "type": "playlists"},
    "Party Time": {"query": "Party EDM Hits", "type": "playlists"},
    "Best of Ballad": {"query": "Vietnamese Ballad", "type": "playlists"},
    "Hip Hop & Rap": {"query": "Vietnamese Rap", "type": "playlists"},
}

@router.get("/browse/category")
async def get_browse_category(name: str):
    """
    Fetch live data for a specific category (infinite scroll support).
    Fetches up to 50-100 items.
    """
    if name not in CATEGORIES_MAP:
        raise HTTPException(status_code=404, detail="Category not found")
        
    info = CATEGORIES_MAP[name]
    query = info["query"]
    search_type = info["type"]
    
    # Check Cache
    cache_key = f"browse_category:{name}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    try:
        from ytmusicapi import YTMusic
        yt = YTMusic()
        
        # Search for more items (e.g. 50)
        results = yt.search(query, filter=search_type, limit=50)
        
        category_items = []
        
        for result in results: 
            item_id = result.get('browseId')
            if not item_id: continue
            
            title = result.get('title', 'Unknown')
            
            # Simple item structure for list view (we don't need full track list for every item immediately)
            # But frontend expects some structure.
            
            # Extract basic thumbnails
            thumbnails = result.get('thumbnails', [])
            cover_url = get_high_res_thumbnail(thumbnails)
            
            # description logic
            description = ""
            if search_type == "albums":
                artists_text = ", ".join([a.get('name') for a in result.get('artists', [])])
                year = result.get('year', '')
                description = f"Album by {artists_text} • {year}"
                is_album = True
            else:
                is_album = False
                # For playlists result, description might be missing in search result
                description = f"Playlist • {result.get('itemCount', '')} tracks"

            category_items.append({
                "id": item_id,
                "title": title,
                "description": description,
                "cover_url": cover_url,
                "type": "album" if is_album else "playlist",
                # Note: We are NOT fetching full tracks for each item here to save speed/quota.
                # The frontend only needs cover, title, description, id.
                # Tracks are fetched when user clicks the item (via get_playlist).
                "tracks": [] 
            })
            
        cache.set(cache_key, category_items, ttl_seconds=3600) # Cache for 1 hour
        return category_items
        
    except Exception as e:
        print(f"Category Fetch Error: {e}")
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
        
        if id.startswith("MPREb"):
             try:
                playlist_data = yt.get_album(id)
                is_album = True
             except Exception as e:
                print(f"DEBUG: get_album(1) failed: {e}")
                pass
        
        if not playlist_data:
            try:
                # ytmusicapi returns a dict with 'tracks' list
                playlist_data = yt.get_playlist(id, limit=100)
            except Exception as e:
                print(f"DEBUG: get_playlist failed: {e}")
                import traceback, sys
                traceback.print_exc(file=sys.stdout)
                # Fallback: Try as album if not tried yet
                if not is_album:
                    try:
                        playlist_data = yt.get_album(id)
                        is_album = True
                    except Exception as e2:
                        print(f"DEBUG: get_album(2) failed: {e2}")
                        traceback.print_exc(file=sys.stdout)
                        raise e # Re-raise if both fail

        if not isinstance(playlist_data, dict):
             print(f"DEBUG: Validation Failed! playlist_data type: {type(playlist_data)}", flush=True)
             raise ValueError(f"Invalid playlist_data: {playlist_data}")

        # Format to match our app's Protocol
        formatted_tracks = []
        if 'tracks' in playlist_data:
            for track in playlist_data['tracks']:
                artist_names = extract_artist_names(track)

                # Safely extract thumbnails
                thumbnails = track.get('thumbnails', [])
                if not thumbnails and is_album:
                     # Albums sometimes have thumbnails at root level, not per track
                     thumbnails = playlist_data.get('thumbnails', [])
                     
                cover_url = get_high_res_thumbnail(thumbnails)
                
                # Safely extract album
                album_name = extract_album_name(track, playlist_data.get('title', 'Single'))

                video_id = track.get('videoId')
                if not video_id:
                     continue

                formatted_tracks.append({
                    "title": track.get('title', 'Unknown Title'),
                    "artist": artist_names,
                    "album": album_name,
                    "duration": track.get('duration_seconds', track.get('length_seconds', 0)), 
                    "cover_url": cover_url,
                    "id": video_id,
                    "url": f"https://music.youtube.com/watch?v={video_id}"
                })

        # Get Playlist Cover (usually highest res)
        thumbnails = playlist_data.get('thumbnails', [])
        p_cover = get_high_res_thumbnail(thumbnails)

        # Safely extract author/artists
        author = "YouTube Music"
        if is_album:
            artists = playlist_data.get('artists', [])
            names = []
            for a in artists:
                if isinstance(a, dict): names.append(a.get('name', 'Unknown'))
                elif isinstance(a, str): names.append(a)
            author = ", ".join(names)
        else:
            author_data = playlist_data.get('author', {})
            if isinstance(author_data, dict):
                author = author_data.get('name', 'YouTube Music')
            else:
                author = str(author_data)

        formatted_playlist = {
            "id": playlist_data.get('browseId', playlist_data.get('id')),
            "title": clean_title(playlist_data.get('title', 'Unknown')),
            "description": clean_description(playlist_data.get('description', '')),
            "author": author,
            "cover_url": p_cover,
            "tracks": formatted_tracks
        }

        # Cache it (1 hr)
        cache.set(cache_key, formatted_playlist, ttl_seconds=3600)
        return formatted_playlist

    except Exception as e:
        import traceback
        print(f"Playlist Fetch Error (NEW CODE): {e}", flush=True)
        print(traceback.format_exc(), flush=True)
        try:
             print(f"Playlist Data Type: {type(playlist_data)}")
             if 'tracks' in playlist_data and playlist_data['tracks']:
                 print(f"First Track Type: {type(playlist_data['tracks'][0])}")
        except:
             pass
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
            artist_names = extract_artist_names(track)
            
            # Safely extract thumbnails
            thumbnails = track.get('thumbnails', [])
            cover_url = get_high_res_thumbnail(thumbnails)
            
            album_name = extract_album_name(track, "Single")

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
            seen_ids = set()
            seen_ids.add(seed_id)
            for track in watch_playlist['tracks']:
                # Skip if seen or seed
                t_id = track.get('videoId')
                if not t_id or t_id in seen_ids:
                    continue
                seen_ids.add(t_id)
                    
                artist_names = extract_artist_names(track)

                thumbnails = track.get('thumbnails') or track.get('thumbnail') or []
                cover_url = get_high_res_thumbnail(thumbnails)
                
                album_name = extract_album_name(track, "Single")

                tracks.append({
                    "title": track.get('title', 'Unknown Title'),
                    "artist": artist_names,
                    "album": album_name,
                    "duration": track.get('length_seconds', track.get('duration_seconds', 0)), 
                    "cover_url": cover_url,
                    "id": t_id,
                    "url": f"https://music.youtube.com/watch?v={t_id}"
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
            cover_url = get_high_res_thumbnail(thumbnails)
            
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

@router.get("/artist/info")
async def get_artist_info(name: str):
    """
    Get artist metadata (photo) by name.
    """
    if not name:
        return {"photo": None}

    cache_key = f"artist_info:{name.lower().strip()}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    try:
        from ytmusicapi import YTMusic
        yt = YTMusic()
        
        results = yt.search(name, filter="artists", limit=1)
        if results:
            artist = results[0]
            thumbnails = artist.get('thumbnails', [])
            photo_url = get_high_res_thumbnail(thumbnails)
            result = {"photo": photo_url}
            
            cache.set(cache_key, result, ttl_seconds=86400 * 7) # Cache for 1 week
            return result
            
        return {"photo": None}
    except Exception as e:
        print(f"Artist Info Error: {e}")
        return {"photo": None}

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
        cache_key = f"v2:stream:{id}" # v2 cache key for new format
        cached_data = cache.get(cache_key)
        
        stream_url = None
        mime_type = "audio/mp4"

        if cached_data:
            print(f"DEBUG: Using cached stream data for '{id}'")
            if isinstance(cached_data, dict):
                stream_url = cached_data.get('url')
                mime_type = cached_data.get('mime', 'audio/mp4')
            else:
                stream_url = cached_data # Legacy fallback

        if not stream_url:
            print(f"DEBUG: Fetching new stream URL for '{id}'")
            url = f"https://www.youtube.com/watch?v={id}" 
            ydl_opts = {
                'format': 'bestaudio[ext=m4a]/bestaudio/best',
                'quiet': True,
                'noplaylist': True,
                'nocheckcertificate': True,
                'geo_bypass': True,
                'socket_timeout': 30,
                'retries': 3,
                'force_ipv4': True,
                'extractor_args': {'youtube': {'player_client': ['ios', 'android']}},
            }
            
        if not stream_url:
            print(f"DEBUG: Fetching new stream URL for '{id}'")
            url = f"https://www.youtube.com/watch?v={id}" 
            ydl_opts = {
                'format': 'bestaudio[ext=m4a][protocol^=http]/bestaudio[protocol^=http]/best[protocol^=http]', # Strictly exclude m3u8/HLS
                'quiet': True,
                'noplaylist': True,
                'nocheckcertificate': True,
                'geo_bypass': True,
                'socket_timeout': 30,
                'retries': 3,
                'force_ipv4': True,
                'extractor_args': {'youtube': {'player_client': ['android', 'web', 'ios']}}, # Android often gives good progressive streams
            }
            
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    stream_url = info.get('url')
                    ext = info.get('ext')
                    http_headers = info.get('http_headers', {}) # Get headers required for the URL
                    
                    # Determine MIME type
                    if ext == 'm4a':
                        mime_type = "audio/mp4"
                    elif ext == 'webm':
                        mime_type = "audio/webm"
                    else:
                        mime_type = "audio/mpeg"
                        
                    print(f"DEBUG: Got stream URL format: {info.get('format')}, ext: {ext}, mime: {mime_type}")
            except Exception as ydl_error:
                print(f"DEBUG: yt-dlp extraction error: {type(ydl_error).__name__}: {str(ydl_error)}")
                raise ydl_error
            
            if stream_url:
                cache_data = {"url": stream_url, "mime": mime_type, "headers": http_headers}
                cache.set(cache_key, cache_data, ttl_seconds=3600)

        if not stream_url:
            raise HTTPException(status_code=404, detail="Audio stream not found")
            
        print(f"Streaming {id} with Content-Type: {mime_type}")

        # Pre-open the connection to verify it works and get headers
        try:
            # Sanitize headers: prevent Host/Cookie conflicts, but keep User-Agent
            base_headers = cached_data.get('headers', {}) if 'cached_data' in locals() else http_headers
            req_headers = {
                'User-Agent': base_headers.get('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'),
                'Referer': 'https://www.youtube.com/',
                'Accept': '*/*',
            }
            
            # Disable SSL verify to match yt-dlp 'nocheckcertificate' (fixes NAS CA issues)
            external_req = requests.get(stream_url, stream=True, timeout=30, headers=req_headers, verify=False)
            external_req.raise_for_status() 
        except requests.exceptions.HTTPError as http_err:
            print(f"DEBUG: Stream Pre-flight HTTP Error: {http_err}")
            # If 403/404/410, invalidate cache
            if http_err.response.status_code in [403, 404, 410]:
                cache.delete(cache_key)
            raise HTTPException(status_code=500, detail=f"Upstream stream error: {http_err.response.status_code}")
        except Exception as e:
            print(f"DEBUG: Stream Connection Error: {e}")
            raise HTTPException(status_code=500, detail=f"Stream connection failed: {str(e)}")

        # Forward Content-Length if available
        headers = {}
        if "Content-Length" in external_req.headers:
            headers["Content-Length"] = external_req.headers["Content-Length"]

        def iterfile():
            try:
                # Use the already open request
                for chunk in external_req.iter_content(chunk_size=64*1024): 
                    yield chunk
                external_req.close()
            except Exception as e:
                print(f"DEBUG: Stream Iterator Error: {e}")
                pass

        return StreamingResponse(iterfile(), media_type=mime_type, headers=headers)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Stream Error for ID '{id}': {type(e).__name__}: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Stream error: {type(e).__name__}: {str(e)}")

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
