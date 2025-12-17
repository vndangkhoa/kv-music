import json
import uuid
from pathlib import Path
from typing import List, Dict, Optional

DATA_FILE = Path("backend/data/user_playlists.json")

class PlaylistManager:
    def __init__(self):
        DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        if not DATA_FILE.exists():
            self._save_data([])

    def _load_data(self) -> List[Dict]:
        try:
            with open(DATA_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return []

    def _save_data(self, data: List[Dict]):
        with open(DATA_FILE, "w") as f:
            json.dump(data, f, indent=4)

    def get_all(self) -> List[Dict]:
        return self._load_data()

    def get_by_id(self, playlist_id: str) -> Optional[Dict]:
        playlists = self._load_data()
        for p in playlists:
            if p["id"] == playlist_id:
                return p
        return None

    def create(self, name: str, description: str = "") -> Dict:
        playlists = self._load_data()
        new_playlist = {
            "id": str(uuid.uuid4()),
            "title": name,
            "description": description,
            "tracks": [],
            "cover_url": "https://placehold.co/400?text=Playlist", # Default placeholder
            "is_user_created": True
        }
        playlists.append(new_playlist)
        self._save_data(playlists)
        return new_playlist

    def update(self, playlist_id: str, name: str = None, description: str = None) -> Optional[Dict]:
        playlists = self._load_data()
        for p in playlists:
            if p["id"] == playlist_id:
                if name: p["title"] = name
                if description: p["description"] = description
                self._save_data(playlists)
                return p
        return None

    def delete(self, playlist_id: str) -> bool:
        playlists = self._load_data()
        initial_len = len(playlists)
        playlists = [p for p in playlists if p["id"] != playlist_id]
        if len(playlists) < initial_len:
            self._save_data(playlists)
            return True
        return False

    def add_track(self, playlist_id: str, track: Dict) -> bool:
        playlists = self._load_data()
        for p in playlists:
            if p["id"] == playlist_id:
                # Check for duplicates? For now allow.
                p["tracks"].append(track)
                # Update cover if it's the first track
                if len(p["tracks"]) == 1 and track.get("cover_url"):
                    p["cover_url"] = track["cover_url"]
                self._save_data(playlists)
                return True
        return False

    def remove_track(self, playlist_id: str, track_id: str) -> bool:
        playlists = self._load_data()
        for p in playlists:
            if p["id"] == playlist_id:
                p["tracks"] = [t for t in p["tracks"] if t.get("id") != track_id]
                self._save_data(playlists)
                return True
        return False
