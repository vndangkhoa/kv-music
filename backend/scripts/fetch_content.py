from ytmusicapi import YTMusic
import json
from pathlib import Path

def fetch_content():
    yt = YTMusic()
    
    # Categorized Queries
    CATEGORIES = {
        "Vietnam Top": ["Vietnam Top 50", "V-Pop Hot", "Rap Viet", "Indie Vietnam"],
        "Global Top": ["Global Top 50", "US-UK Top Hits", "Pop Rising", "Viral 50 Global"],
        "K-Pop": ["K-Pop Hits", "Best of K-Pop", "K-Pop Rising", "BLACKPINK Essentials"],
        "Chill": ["Lofi Girl", "Coffee Shop Vibes", "Piano Relax", "Sleep Sounds"],
        "Party": ["Party Hits", "EDM Best", "Workout Motivation", "Vinahouse Beat"]
    }

    segmented_content = {}
    seen_ids = set()

    print("Fetching Browse Content...")

    for category, queries in CATEGORIES.items():
        print(f"--- Processing Category: {category} ---")
        category_playlists = []
        
        for q in queries:
            try:
                print(f"Searching for: {q}")
                # Fetch more results to ensure we get good matches
                results = yt.search(q, filter="playlists", limit=4)
                
                for res in results:
                    pid = res.get("browseId")
                    if pid and pid not in seen_ids:
                        seen_ids.add(pid)
                        
                        # Store minimal info for the card
                        category_playlists.append({
                            "id": pid,
                            "title": res.get("title"),
                            "description": f"Based on '{q}'",
                            "cover_url": res.get("thumbnails")[-1]["url"] if res.get("thumbnails") else "",
                            "author": res.get("author") or "YouTube Music"
                        })
            except Exception as e:
                print(f"Error serving {q}: {e}")
        
        segmented_content[category] = category_playlists

    output_path = Path("backend/data/browse_playlists.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, "w") as f:
        json.dump(segmented_content, f, indent=4)
    
    total_playlists = sum(len(p) for p in segmented_content.values())
    print(f"Successfully saved {total_playlists} playlists across {len(segmented_content)} categories to {output_path}")

if __name__ == "__main__":
    fetch_content()
