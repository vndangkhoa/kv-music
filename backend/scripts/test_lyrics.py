from ytmusicapi import YTMusic
import json

yt = YTMusic()

# Example ID (Son Tung M-TP - Chung Ta Cua Hien Tai)
video_id = "lTdoH5uL6Ew" 

print(f"Fetching lyrics for {video_id}...")
try:
    watch_playlist = yt.get_watch_playlist(videoId=video_id)
    if 'lyrics' in watch_playlist:
        lyrics_id = watch_playlist['lyrics']
        print(f"Found Lyrics ID: {lyrics_id}")
        lyrics = yt.get_lyrics(lyrics_id)
        print(json.dumps(lyrics, indent=2))
    else:
        print("No lyrics found in watch playlist.")

except Exception as e:
    print(f"Error: {e}")
