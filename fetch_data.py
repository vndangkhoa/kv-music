from ytmusicapi import YTMusic
import json
import os
from pathlib import Path

yt = YTMusic()

CATEGORIES = {
    "Trending Vietnam": "Top 50 Vietnam",
    "Vietnamese Artists": "Vietnamese Pop Hits",
    "Ballad Singers": "Vietnamese Ballad",
    "DJ & Remix": "Vinahouse Remix Vietnam",
    "YouTube Stars": "Vietnamese Cover Songs"
}

browse_data = {}

print("Starting data fetch...")

for category, query in CATEGORIES.items():
    print(f"\n--- Fetching Category: {category} (Query: '{query}') ---")
    try:
        results = yt.search(query, filter="playlists", limit=5)
        
        category_playlists = []
        
        for p_result in results[:4]: # Limit to 4 playlists per category
            playlist_id = p_result['browseId']
            print(f"  > Processing: {p_result['title']}")
            
            try:
                # Fetch full playlist details
                playlist_data = yt.get_playlist(playlist_id, limit=50)
                
                # Process Tracks
                output_tracks = []
                for track in playlist_data.get('tracks', []):
                    artists_list = track.get('artists') or []
                    if isinstance(artists_list, list):
                        artists = ", ".join([a.get('name', 'Unknown') for a in artists_list])
                    else:
                        artists = "Unknown Artist"
                    
                    thumbnails = track.get('thumbnails', [])
                    cover_url = thumbnails[-1]['url'] if thumbnails else "https://placehold.co/300x300"
                    
                    album_info = track.get('album')
                    album_name = album_info.get('name', 'Single') if album_info else "Single"
                    
                    output_tracks.append({
                        "title": track.get('title', 'Unknown Title'),
                        "artist": artists,
                        "album": album_name,
                        "duration": track.get('duration_seconds', 0), 
                        "cover_url": cover_url,
                        "id": track.get('videoId', 'unknown'),
                        "url": f"https://music.youtube.com/watch?v={track.get('videoId', '')}"
                    })

                # Process Playlist Info
                p_thumbnails = playlist_data.get('thumbnails', [])
                p_cover = p_thumbnails[-1]['url'] if p_thumbnails else "https://placehold.co/300x300"

                category_playlists.append({
                    "id": playlist_data.get('id'),
                    "title": playlist_data.get('title'),
                    "description": playlist_data.get('description', '') or f"Best of {category}",
                    "cover_url": p_cover,
                    "tracks": output_tracks
                })
                
            except Exception as e:
                print(f"    Error processing playlist {playlist_id}: {e}")
                continue

        if category_playlists:
            browse_data[category] = category_playlists
            
    except Exception as e:
        print(f"Error searching category {category}: {e}")

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
