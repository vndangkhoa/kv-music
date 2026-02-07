package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

type LyricsResponse struct {
	ID           int     `json:"id"`
	TrackName    string  `json:"trackName"`
	ArtistName   string  `json:"artistName"`
	PlainLyrics  string  `json:"plainLyrics"`
	SyncedLyrics string  `json:"syncedLyrics"` // Time-synced lyrics [mm:ss.xx] text
	Duration     float64 `json:"duration"`
}

type OvhResponse struct {
	Lyrics string `json:"lyrics"`
}

var httpClient = &http.Client{Timeout: 5 * time.Second}

// cleanVideoTitle attempts to extract the actual song title from a YouTube video title
func cleanVideoTitle(videoTitle, artistName string) string {
	// 1. If strict "Artist - Title" format matches, take the title part
	// Case-insensitive check
	lowerTitle := strings.ToLower(videoTitle)
	lowerArtist := strings.ToLower(artistName)

	if strings.Contains(lowerTitle, " - ") {
		parts := strings.Split(videoTitle, " - ")
		if len(parts) >= 2 {
			// Check if first part is artist
			if strings.Contains(strings.ToLower(parts[0]), lowerArtist) {
				return cleanMetadata(parts[1])
			}
			// Check if second part is artist
			if strings.Contains(strings.ToLower(parts[1]), lowerArtist) {
				return cleanMetadata(parts[0])
			}
		}
	}

	// 2. Separator Strategy ( |, //, -, :, feat. )
	// Normalize separators to |
	simplified := videoTitle
	for _, sep := range []string{"//", " - ", ":", "feat.", "ft.", "|"} {
		simplified = strings.ReplaceAll(simplified, sep, "|")
	}

	if strings.Contains(simplified, "|") {
		parts := strings.Split(simplified, "|")
		// Filter parts
		var candidates []string
		for _, p := range parts {
			p = strings.TrimSpace(p)
			pLower := strings.ToLower(p)
			if p == "" {
				continue
			}

			// Skip "Official Video", "MV", "Artist Name"
			if strings.Contains(pLower, "official") || strings.Contains(pLower, "mv") || strings.Contains(pLower, "music video") {
				continue
			}
			// Skip if it is contained in artist name (e.g. "Min" in "Min Official")
			if pLower == lowerArtist || strings.Contains(lowerArtist, pLower) || strings.Contains(pLower, lowerArtist) {
				continue
			}
			candidates = append(candidates, p)
		}

		// Heuristic: The Title is usually the FIRST valid part remaining.
		// However, if we have multiple, and one is very short (< 4 chars) and one is long, pick the long one?
		// Actually, let's look for the one that looks most like a title.
		// For now, if we have multiple candidates, let's pick the longest one if the first one is tiny.
		if len(candidates) > 0 {
			best := candidates[0]
			// If first candidate is super short (e.g. "HD"), look for a better one
			if len(best) < 4 && len(candidates) > 1 {
				for _, c := range candidates[1:] {
					if len(c) > len(best) {
						best = c
					}
				}
			}
			return cleanMetadata(best)
		}
	}

	return cleanMetadata(videoTitle)
}

func cleanMetadata(title string) string {
	// Remove parenthetical noise like (feat. X), (Official)
	// Also remove unparenthesized "feat. X" or "ft. X" at the end of the string
	re := regexp.MustCompile(`(?i)(\(feat\..*?\)|\[feat\..*?\]|\(remaster.*?\)|- remaster.*| - live.*|\(official.*?\)|\[official.*?\]| - official.*|\sfeat\..*|\sft\..*)`)
	clean := re.ReplaceAllString(title, "")
	return strings.TrimSpace(clean)
}

func cleanArtist(artist string) string {
	// Remove " - Topic", " Official", "VEVO"
	re := regexp.MustCompile(`(?i)( - topic| official| channel| vevo)`)
	return strings.TrimSpace(re.ReplaceAllString(artist, ""))
}

func fetchFromLRCLIB(artist, track string) (*LyricsResponse, error) {
	// 1. Try Specific Get
	targetURL := fmt.Sprintf("https://lrclib.net/api/get?artist_name=%s&track_name=%s", url.QueryEscape(artist), url.QueryEscape(track))
	resp, err := httpClient.Get(targetURL)
	if err == nil && resp.StatusCode == 200 {
		var lyrics LyricsResponse
		if err := json.NewDecoder(resp.Body).Decode(&lyrics); err == nil && (lyrics.PlainLyrics != "" || lyrics.SyncedLyrics != "") {
			resp.Body.Close()
			return &lyrics, nil
		}
		resp.Body.Close()
	}

	// 2. Try Search (Best Match)
	searchURL := fmt.Sprintf("https://lrclib.net/api/search?q=%s %s", url.QueryEscape(artist), url.QueryEscape(track))
	resp2, err := httpClient.Get(searchURL)
	if err == nil && resp2.StatusCode == 200 {
		var results []LyricsResponse
		if err := json.NewDecoder(resp2.Body).Decode(&results); err == nil && len(results) > 0 {
			resp2.Body.Close()
			return &results[0], nil
		}
		resp2.Body.Close()
	}

	return nil, fmt.Errorf("not found in lrclib")
}

func fetchFromOVH(artist, track string) (*LyricsResponse, error) {
	// OVH API: https://api.lyrics.ovh/v1/artist/title
	targetURL := fmt.Sprintf("https://api.lyrics.ovh/v1/%s/%s", url.QueryEscape(artist), url.QueryEscape(track))
	resp, err := httpClient.Get(targetURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		var ovh OvhResponse
		if err := json.NewDecoder(resp.Body).Decode(&ovh); err == nil && ovh.Lyrics != "" {
			return &LyricsResponse{
				TrackName:   track,
				ArtistName:  artist,
				PlainLyrics: ovh.Lyrics,
			}, nil
		}
	}
	return nil, fmt.Errorf("not found in ovh")
}

func fetchFromLyrist(track string) (*LyricsResponse, error) {
	// API: https://lyrist.vercel.app/api/:query
	// Simple free API wrapper
	targetURL := fmt.Sprintf("https://lyrist.vercel.app/api/%s", url.QueryEscape(track))
	resp, err := httpClient.Get(targetURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		var res struct {
			Lyrics string `json:"lyrics"`
			Title  string `json:"title"`
			Artist string `json:"artist"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&res); err == nil && res.Lyrics != "" {
			return &LyricsResponse{
				TrackName:   res.Title,
				ArtistName:  res.Artist,
				PlainLyrics: res.Lyrics,
			}, nil
		}
	}
	return nil, fmt.Errorf("not found in lyrist")
}

func GetLyrics(w http.ResponseWriter, r *http.Request) {
	// Allow CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")

	rawArtist := r.URL.Query().Get("artist")
	rawTrack := r.URL.Query().Get("track")

	if rawTrack == "" {
		http.Error(w, "track required", http.StatusBadRequest)
		return
	}

	// 1. Clean Inputs
	artist := cleanArtist(rawArtist)
	smartTitle := cleanVideoTitle(rawTrack, artist) // Heuristic extraction
	dumbTitle := cleanMetadata(rawTrack)            // Simple regex cleaning

	fmt.Printf("[Lyrics] Request: %s | %s\n", rawArtist, rawTrack)
	fmt.Printf("[Lyrics] Cleaned: %s | %s\n", artist, smartTitle)

	// Strategy 1: LRCLIB (Exact Smart)
	if lyrics, err := fetchFromLRCLIB(artist, smartTitle); err == nil {
		fmt.Println("[Lyrics] Strategy 1 (Exact Smart) Hit")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(lyrics)
		return
	}

	// Strategy 2: LRCLIB (Exact Dumb) - Fallback if our smart extraction failed
	if smartTitle != dumbTitle {
		if lyrics, err := fetchFromLRCLIB(artist, dumbTitle); err == nil {
			fmt.Println("[Lyrics] Strategy 2 (Exact Dumb) Hit")
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(lyrics)
			return
		}
	}

	// Strategy 3: Lyrist (Smart Search)
	if lyrics, err := fetchFromLyrist(fmt.Sprintf("%s %s", artist, smartTitle)); err == nil {
		fmt.Println("[Lyrics] Strategy 3 (Lyrist) Hit")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(lyrics)
		return
	}

	// Strategy 4: OVH (Last Resort)
	if lyrics, err := fetchFromOVH(artist, smartTitle); err == nil {
		fmt.Println("[Lyrics] Strategy 4 (OVH) Hit")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(lyrics)
		return
	}

	// Strategy 5: Hail Mary Search (Raw-ish)
	if lyrics, err := fetchFromLRCLIB("", fmt.Sprintf("%s %s", artist, smartTitle)); err == nil {
		fmt.Println("[Lyrics] Strategy 5 (Hail Mary) Hit")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(lyrics)
		return
	}

	// Strategy 6: Title Only (Ignore Artist)
	// Sometimes artist name is completely different in DB
	if lyrics, err := fetchFromLRCLIB("", smartTitle); err == nil {
		fmt.Println("[Lyrics] Strategy 6 (Title Only) Hit")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(lyrics)
		return
	}

	fmt.Println("[Lyrics] Failed to find lyrics")
	http.Error(w, "lyrics not found", http.StatusNotFound)
}
