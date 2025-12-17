import yt_dlp
import json

# Test video ID from our data (e.g., Khóa Ly Biệt)
video_id = "s0OMNH-N5D8" 
url = f"https://www.youtube.com/watch?v={video_id}"

ydl_opts = {
    'format': 'bestaudio/best',
    'quiet': True,
    'noplaylist': True,
}

try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        print(f"Title: {info.get('title')}")
        print(f"URL: {info.get('url')}") # The direct stream URL
        print("Success: Extracted audio URL")
except Exception as e:
    print(f"Error: {e}")
