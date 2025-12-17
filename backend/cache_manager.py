import json
import time
import hashlib
from pathlib import Path
from typing import Any, Optional

class CacheManager:
    def __init__(self, cache_dir: str = "backend/cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _get_path(self, key: str) -> Path:
        # Create a safe filename from the key
        hashed_key = hashlib.md5(key.encode()).hexdigest()
        return self.cache_dir / f"{hashed_key}.json"

    def get(self, key: str) -> Optional[Any]:
        """
        Retrieve data from cache if it exists and hasn't expired.
        """
        path = self._get_path(key)
        if not path.exists():
            return None

        try:
            with open(path, "r") as f:
                data = json.load(f)
            
            # Check TTL
            if data["expires_at"] < time.time():
                # Expired, delete it
                path.unlink()
                return None
            
            return data["value"]
        except (json.JSONDecodeError, KeyError, OSError):
            return None

    def set(self, key: str, value: Any, ttl_seconds: int = 3600):
        """
        Save data to cache with a TTL (default 1 hour).
        """
        path = self._get_path(key)
        data = {
            "value": value,
            "expires_at": time.time() + ttl_seconds,
            "key_debug": key # Store original key for debugging
        }
        try:
            with open(path, "w") as f:
                json.dump(data, f)
        except OSError as e:
            print(f"Cache Write Error: {e}")
