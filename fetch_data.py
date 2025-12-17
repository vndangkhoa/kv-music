from ytmusicapi import YTMusic
import json
import os
import random
from pathlib import Path

yt = YTMusic()

# Define diverse categories to fetch
CATEGORIES = {
    "Trending Vietnam": {"query": "Top 50 Vietnam", "type": "playlists"},
    "Global Hits": {"query": "Global Top 50", "type": "playlists"},
    "New Albums 2024": {"query": "New Albums 2024 Vietnam", "type": "albums"},
    "Chill Vibes": {"query": "Chill Lofi", "type": "playlists"},
    "Party Time": {"query": "Party EDM Hits", "type": "playlists"},
    "Best of Ballad": {"query": "Vietnamese Ballad", "type": "playlists"},
    "Hip Hop & Rap": {"query": "Vietnamese Rap", "type": "playlists"},
}

browse_data = {}

print("Starting diverse data fetch...")

def get_thumbnail(thumbnails):
    if not thumbnails:
        return "https://placehold.co/300x300"
    return thumbnails[-1]['url']

for category_name, info in CATEGORIES.items():
    query = info["query"]
    search_type = info["type"]
    print(f"\n--- Fetching Category: {category_name} (Query: '{query}', Type: {search_type}) ---")
    
    try:
        results = yt.search(query, filter=search_type, limit=5)
        
        category_items = []
        
        for result in results[:4]: # Limit to 4 items per category
            item_id = result['browseId']
            title = result['title']
            print(f"  > Processing: {title}")
            
            try:
                # Fetch details based on type
                if search_type == "albums":
                    # Use get_album
                    details = yt.get_album(item_id)
                    tracks_source = details.get('tracks', [])
                    is_album = True
                    description = f"Album by {', '.join([a.get('name') for a in details.get('artists', [])])} • {details.get('year')}"
                else:
                    # Use get_playlist
                    details = yt.get_playlist(item_id, limit=50)
                    tracks_source = details.get('tracks', [])
                    is_album = False
                    description = details.get('description', '')

                # Process Tracks
                output_tracks = []
                for track in tracks_source:
                    artists_list = track.get('artists') or []
                    if isinstance(artists_list, list):
                        artists = ", ".join([a.get('name', 'Unknown') for a in artists_list])
                    else:
                        artists = "Unknown Artist"
                    
                    thumbnails = track.get('thumbnails', [])
                    # Fallback for album tracks which might not have thumbnails
                    if not thumbnails and is_album:
                         thumbnails = details.get('thumbnails', [])

                    cover_url = get_thumbnail(thumbnails)
                    
                    album_info = track.get('album')
                    # Use playlist/album title as album name if missing
                    album_name = album_info.get('name', title) if album_info else title
                    
                    # Track ID can be missing in some album views (very rare)
                    track_id = track.get('videoId')
                    if not track_id: continue

                    output_tracks.append({
                        "title": track.get('title', 'Unknown Title'),
                        "artist": artists,
                        "album": album_name,
                        "duration": track.get('duration_seconds', track.get('length_seconds', 0)), 
                        "cover_url": cover_url,
                        "id": track_id,
                        "url": f"https://music.youtube.com/watch?v={track_id}"
                    })

                if not output_tracks:
                    print(f"    Skipping empty item: {title}")
                    continue

                # Final Item Object
                category_items.append({
                    "id": item_id,
                    "title": title,
                    "description": description or f"Best of {category_name}",
                    "cover_url": get_thumbnail(details.get('thumbnails', result.get('thumbnails'))),
                    "tracks": output_tracks,
                    "type": "album" if is_album else "playlist"
                })
                
            except Exception as e:
                print(f"    Error processing {item_id}: {e}")
                continue

        if category_items:
            browse_data[category_name] = category_items
            
    except Exception as e:
        print(f"Error searching category {category_name}: {e}")

# Save to backend/data/browse_playlists.json
output_path = Path("backend/data/browse_playlists.json")
output_path.parent.mkdir(parents=True, exist_ok=True)

with open(output_path, "w", encoding='utf-8') as f:
    json.dump(browse_data, f, indent=2)

# Also save a flat list for Trending (backward compatibility)
if "Trending Vietnam" in browse_data and browse_data["Trending Vietnam"]:
    flat_trending = browse_data["Trending Vietnam"][0]
    with open("backend/data.json", "w", encoding='utf-8') as f:
        json.dump(flat_trending, f, indent=2)

print("\nAll Done! Saved to backend/data/browse_playlists.json")
