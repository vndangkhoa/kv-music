package api

import (
	"bufio"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"spotify-clone-backend/internal/spotdl"

	"github.com/go-chi/chi/v5"
)

var spotdlService = spotdl.NewService()

func SearchTracks(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "query parameter required", http.StatusBadRequest)
		return
	}

	tracks, err := spotdlService.SearchTracks(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"tracks": tracks})
}

func StreamAudio(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "id required", http.StatusBadRequest)
		return
	}

	path, err := spotdlService.GetStreamURL(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Set headers for streaming based on extension
	ext := filepath.Ext(path)
	contentType := "audio/mpeg" // default
	if ext == ".m4a" {
		contentType = "audio/mp4"
	} else if ext == ".webm" {
		contentType = "audio/webm"
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Transfer-Encoding", "chunked")

	// Flush headers immediately
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}

	// Now stream it
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	io.Copy(w, bufio.NewReader(f))
}

func DownloadTrack(w http.ResponseWriter, r *http.Request) {
	var body struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if body.URL == "" {
		http.Error(w, "url required", http.StatusBadRequest)
		return
	}

	path, err := spotdlService.DownloadTrack(body.URL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"path": path, "status": "downloaded"})
}

func GetArtistImage(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "query required", http.StatusBadRequest)
		return
	}

	imageURL, err := spotdlService.SearchArtist(query)
	if err != nil {
		http.Error(w, "artist not found", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"url": imageURL})
}

func UpdateSimBinary(w http.ResponseWriter, r *http.Request) {
	output, err := spotdlService.UpdateBinary()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "updated", "output": output})
}
