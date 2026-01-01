from ytmusicapi import YTMusic
import json

yt = YTMusic()
seed_id = "hDrFd1W8fvU"
print(f"Fetching watch playlist for {seed_id}...")
results = yt.get_watch_playlist(videoId=seed_id, limit=5)

if 'tracks' in results:
    print(f"Found {len(results['tracks'])} tracks.")
    if len(results['tracks']) > 0:
        first_track = results['tracks'][0]
        print(json.dumps(first_track, indent=2))
        print("Keys:", first_track.keys())
else:
    print("No 'tracks' key in results")
    print(results.keys())
