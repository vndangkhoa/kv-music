package models

type Track struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Artist   string `json:"artist"`
	Album    string `json:"album"`
	Duration int    `json:"duration"`
	CoverURL string `json:"cover_url"`
	URL      string `json:"url"`
}

type Playlist struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Author      string  `json:"author"`
	CoverURL    string  `json:"cover_url"`
	Tracks      []Track `json:"tracks"`
	Type        string  `json:"type,omitempty"`
}

type SearchResponse struct {
	Tracks []Track `json:"tracks"`
}
