#!/usr/bin/env python3
"""Thin bridge between the Rust backend and ytmusicapi.

Usage:
    ytm_bridge.py suggestions <query>
    ytm_bridge.py home
    ytm_bridge.py moods

Outputs JSON on stdout. Failures print a JSON error object (never crash).
"""
import json
import sys

def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    try:
        from ytmusicapi import YTMusic
    except Exception as e:
        print(json.dumps({"error": f"ytmusicapi unavailable: {e}"}))
        return

    try:
        yt = YTMusic()
        if cmd == "suggestions" and len(sys.argv) > 2:
            out = yt.get_search_suggestions(sys.argv[2])
            print(json.dumps(out, ensure_ascii=False))
        elif cmd == "home":
            sections = yt.get_home(limit=10)
            result = []
            for section in sections:
                title = section.get("title", "")
                items = []
                for content in section.get("contents", [])[:12]:
                    item = {"title": content.get("title", "")}
                    if content.get("videoId"):
                        item["videoId"] = content["videoId"]
                    if content.get("playlistId"):
                        item["playlistId"] = content["playlistId"]
                    artists = content.get("artists") or []
                    if artists:
                        item["artist"] = artists[0].get("name", "")
                    thumbs = content.get("thumbnails") or []
                    if thumbs:
                        item["thumb"] = thumbs[-1].get("url", "")
                    if item.get("title"):
                        items.append(item)
                if title and items:
                    result.append({"title": title, "items": items})
            print(json.dumps(result, ensure_ascii=False))
        elif cmd == "moods":
            out = yt.get_mood_categories()
            print(json.dumps(out, ensure_ascii=False))
        else:
            print(json.dumps({"error": "unknown command"}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
