package spotdl

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"spotify-clone-backend/internal/models"
)

// ytDlpPath finds the yt-dlp executable
func ytDlpPath() string {
	// Check for local yt-dlp.exe
	exe, err := os.Executable()
	if err == nil {
		localPath := filepath.Join(filepath.Dir(exe), "yt-dlp.exe")
		if _, err := os.Stat(localPath); err == nil {
			return localPath
		}
	}

	// Check in working directory
	if _, err := os.Stat("yt-dlp.exe"); err == nil {
		return "./yt-dlp.exe"
	}

	// Check Python Scripts directory
	homeDir, err := os.UserHomeDir()
	if err == nil {
		pythonScriptsPath := filepath.Join(homeDir, "AppData", "Local", "Programs", "Python", "Python312", "Scripts", "yt-dlp.exe")
		if _, err := os.Stat(pythonScriptsPath); err == nil {
			return pythonScriptsPath
		}
	}

	return "yt-dlp"
}

type CacheItem struct {
	Tracks    []models.Track
	Timestamp time.Time
}

type Service struct {
	downloadDir string
	searchCache map[string]CacheItem
	cacheMutex  sync.RWMutex
}

func NewService() *Service {
	downloadDir := filepath.Join(os.TempDir(), "spotify-clone-cache")
	os.MkdirAll(downloadDir, 0755)
	return &Service{
		downloadDir: downloadDir,
		searchCache: make(map[string]CacheItem),
	}
}

// YTResult represents yt-dlp JSON output
type YTResult struct {
	ID         string  `json:"id"`
	Title      string  `json:"title"`
	Uploader   string  `json:"uploader"`
	Duration   float64 `json:"duration"`
	Webpage    string  `json:"webpage_url"`
	Thumbnails []struct {
		URL    string `json:"url"`
		Height int    `json:"height"`
		Width  int    `json:"width"`
	} `json:"thumbnails"`
}

// SearchTracks uses yt-dlp to search YouTube
func (s *Service) SearchTracks(query string) ([]models.Track, error) {
	// 1. Check Cache
	s.cacheMutex.RLock()
	if item, found := s.searchCache[query]; found {
		if time.Since(item.Timestamp) < 1*time.Hour { // 1 Hour Cache
			s.cacheMutex.RUnlock()
			fmt.Printf("Cache Hit: %s\n", query)
			return item.Tracks, nil
		}
	}
	s.cacheMutex.RUnlock()

	// yt-dlp "ytsearch20:<query>" --dump-json --no-playlist --flat-playlist
	path := ytDlpPath()
	searchQuery := fmt.Sprintf("ytsearch20:%s", query)

	// Using --flat-playlist is fast but sometimes lacks thumbnails/details in some versions.
	// However, the JSON output above showed thumbnails present even with --flat-playlist (or maybe I removed it in previous step? No I added it).
	// Let's stick to the current command which provided results, just parse better.
	cmd := exec.Command(path, searchQuery, "--dump-json", "--no-playlist", "--flat-playlist")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	fmt.Printf("Executing: %s %s --dump-json\n", path, searchQuery)
	err := cmd.Run()
	if err != nil {
		return nil, fmt.Errorf("search failed: %w, stderr: %s", err, stderr.String())
	}

	var tracks []models.Track
	scanner := bufio.NewScanner(&stdout)

	for scanner.Scan() {
		line := scanner.Bytes()
		var res YTResult
		if err := json.Unmarshal(line, &res); err == nil {
			// FILTER: Skip channels and playlists
			// Channels usually start with UC, Playlists with PL (though IDs varies, channels are distinct)
			// A safest check is duration > 0, channels have 0 duration in flat sort usually?
			// Or check ID pattern.
			if strings.HasPrefix(res.ID, "UC") || strings.HasPrefix(res.ID, "PL") || res.Duration == 0 {
				continue
			}

			// Clean artist name (remove " - Topic")
			artist := strings.Replace(res.Uploader, " - Topic", "", -1)

			// Select best thumbnail (Highest resolution)
			coverURL := ""
			// maxArea := 0 // Removed unused variable

			if len(res.Thumbnails) > 0 {
				bestScore := -1.0

				for _, thumb := range res.Thumbnails {
					// Calculate score: Area * AspectRatioPenalty
					// We want square (1.0).
					// Penalty = 1 / (1 + abs(ratio - 1))

					w := float64(thumb.Width)
					h := float64(thumb.Height)
					if w == 0 || h == 0 {
						continue
					}

					ratio := w / h
					diff := ratio - 1.0
					if diff < 0 {
						diff = -diff
					}

					// If strictly square (usually YTM), give huge bonus
					// YouTube Music covers are often 1:1
					score := w * h

					if diff < 0.1 { // Close to square
						score = score * 10 // Boost square images significantly
					}

					if score > bestScore {
						bestScore = score
						coverURL = thumb.URL
					}
				}

				// If specific check failed (e.g. 0 dimensions), fallback to last
				if coverURL == "" {
					coverURL = res.Thumbnails[len(res.Thumbnails)-1].URL
				}
			} else {
				// Fallback construction - favor maxres, but hq is safer.
				// Let's use hqdefault which is effectively standard high quality.
				coverURL = fmt.Sprintf("https://i.ytimg.com/vi/%s/hqdefault.jpg", res.ID)
			}

			tracks = append(tracks, models.Track{
				ID:       res.ID,
				Title:    res.Title,
				Artist:   artist,
				Album:    "YouTube Music",
				Duration: int(res.Duration),
				CoverURL: coverURL,
				URL:      fmt.Sprintf("/api/stream/%s", res.ID), // Use backend stream endpoint
			})
		}
	}

	// 2. Save to Cache
	if len(tracks) > 0 {
		s.cacheMutex.Lock()
		s.searchCache[query] = CacheItem{
			Tracks:    tracks,
			Timestamp: time.Now(),
		}
		s.cacheMutex.Unlock()
	}

	return tracks, nil
}

// SearchArtist searches for a channel/artist to get their thumbnail
func (s *Service) SearchArtist(query string) (string, error) {
	// Search for the artist channel specifically
	path := ytDlpPath()
	// Increase to 3 results to increase chance of finding the actual channel if a video comes first
	searchQuery := fmt.Sprintf("ytsearch3:%s official channel", query)

	// Remove --no-playlist to allow channel results
	cmd := exec.Command(path, searchQuery, "--dump-json", "--flat-playlist")

	var stdout bytes.Buffer
	cmd.Stdout = &stdout

	if err := cmd.Run(); err != nil {
		return "", err
	}

	var bestThumbnail string

	scanner := bufio.NewScanner(&stdout)
	for scanner.Scan() {
		line := scanner.Bytes()
		var res struct {
			ID         string `json:"id"`
			Thumbnails []struct {
				URL string `json:"url"`
			} `json:"thumbnails"`
			ChannelThumbnail string `json:"channel_thumbnail"`
		}
		if err := json.Unmarshal(line, &res); err == nil {
			// Check if this is a channel (ID starts with UC)
			if strings.HasPrefix(res.ID, "UC") {
				if len(res.Thumbnails) > 0 {
					// Return immediately if we found a channel
					// OPTIMIZATION: User requested faster loading/lower quality.
					// Instead of taking the last (largest), find one that is "good enough" (>= 150px)
					// Channels usually have s88, s176, s240, s800 etc. s176 is perfect for local 144px display.

					selected := res.Thumbnails[len(res.Thumbnails)-1].URL // Default to largest

					// Simple logic: If we have multiple, pick the second to last? Or just hardcode a preference?
					// Let's assume the list is sorted size ascending.
					if len(res.Thumbnails) >= 2 {
						// Usually [small, medium, large, max].
						// If > 3 items, pick the one at index 1 or 2.
						// Let's aim for index 1 (usually ~176px or 300px)
						idx := 1
						if idx >= len(res.Thumbnails) {
							idx = len(res.Thumbnails) - 1
						}
						selected = res.Thumbnails[idx].URL
					}

					return selected, nil
				}
			}

			// Keep track of the first valid thumbnail as fallback
			if bestThumbnail == "" && len(res.Thumbnails) > 0 {
				// Same logic for fallback
				idx := 1
				if len(res.Thumbnails) < 2 {
					idx = 0
				}
				bestThumbnail = res.Thumbnails[idx].URL
			}
		}
	}

	if bestThumbnail != "" {
		return bestThumbnail, nil
	}

	return "", fmt.Errorf("artist not found")
}

// GetStreamURL downloads the track and returns the local file path
func (s *Service) GetStreamURL(videoURL string) (string, error) {
	// If it's a Spotify URL, we can't handle it directly with yt-dlp in this mode easily
	// without search. But the frontend now sends YouTube URLs (from SearchTracks).
	// If ID is passed, construct YouTube URL.

	var targetURL string
	if strings.HasPrefix(videoURL, "http") {
		targetURL = videoURL
	} else {
		// Assume ID
		targetURL = "https://www.youtube.com/watch?v=" + videoURL
	}

	videoID := extractVideoID(targetURL)
	// Check if already downloaded (check for any audio format)
	// We prefer m4a or webm since we don't have ffmpeg for mp3 conversion
	pattern := filepath.Join(s.downloadDir, videoID+".*")
	matches, _ := filepath.Glob(pattern)
	if len(matches) > 0 {
		return matches[0], nil
	}

	// Download: yt-dlp -f "bestaudio[ext=m4a]/bestaudio" -o <id>.%(ext)s <url>
	// This avoids needing ffmpeg for conversion
	cmd := exec.Command(ytDlpPath(), "-f", "bestaudio[ext=m4a]/bestaudio", "--output", videoID+".%(ext)s", targetURL)
	cmd.Dir = s.downloadDir

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("download failed: %w, stderr: %s", err, stderr.String())
	}

	// Find the downloaded file again
	matches, _ = filepath.Glob(pattern)
	if len(matches) > 0 {
		return matches[0], nil
	}

	return "", fmt.Errorf("downloaded file not found")
}

// StreamAudioToWriter streams audio to http writer
func (s *Service) StreamAudioToWriter(id string, w io.Writer) error {
	filePath, err := s.GetStreamURL(id)
	if err != nil {
		return err
	}

	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = io.Copy(w, file)
	return err
}

func (s *Service) DownloadTrack(url string) (string, error) {
	return s.GetStreamURL(url)
}

func extractVideoID(url string) string {
	// Basic extraction for https://www.youtube.com/watch?v=ID
	if strings.Contains(url, "v=") {
		parts := strings.Split(url, "v=")
		if len(parts) > 1 {
			return strings.Split(parts[1], "&")[0]
		}
	}
	return url // fallback to assume it's an ID or full URL if unique enough
}

// UpdateBinary updates yt-dlp to the latest nightly version
func (s *Service) UpdateBinary() (string, error) {
	path := ytDlpPath()
	// Command: yt-dlp --update-to nightly
	cmd := exec.Command(path, "--update-to", "nightly")

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err == nil {
		return stdout.String(), nil
	}

	errStr := stderr.String()
	// 2. Handle Pip Install Error
	// "ERROR: You installed yt-dlp with pip or using the wheel from PyPi; Use that to update"
	if strings.Contains(errStr, "pip") || strings.Contains(errStr, "wheel") {
		// Try to find pip in the same directory as yt-dlp
		dir := filepath.Dir(path)
		pipPath := filepath.Join(dir, "pip.exe")

		// If not found, try "pip" from PATH? But earlier checkout failed.
		// Let's rely on relative path first.
		if _, statErr := os.Stat(pipPath); statErr != nil {
			// Try "python -m pip" if python is there?
			// Or maybe "pip3.exe"
			pipPath = filepath.Join(dir, "pip3.exe")
		}

		if _, statErr := os.Stat(pipPath); statErr == nil {
			// Found pip, try updating via pip
			// pip install -U --pre "yt-dlp[default]"
			// We use --pre to get nightly/pre-release builds which user requested
			pipCmd := exec.Command(pipPath, "install", "--upgrade", "--pre", "yt-dlp[default]")
			
			// Capture new output
			pipStdout := &bytes.Buffer{}
			pipStderr := &bytes.Buffer{}
			pipCmd.Stdout = pipStdout
			pipCmd.Stderr = pipStderr

			if pipErr := pipCmd.Run(); pipErr == nil {
				return fmt.Sprintf("Updated via pip (%s):\n%s", pipPath, pipStdout.String()), nil
			} else {
				// Pip failed too
				return "", fmt.Errorf("pip update failed: %w, stderr: %s", pipErr, pipStderr.String())
			}
		}
	}

	return "", fmt.Errorf("update failed: %w, stderr: %s", err, errStr)
}
