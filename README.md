# Spotify Clone 🎵

A fully functional clone of the Spotify web player, built with a modern stack featuring **Next.js**, **FastAPI**, and **TailwindCSS**. This application replicates the premium authentic feel of the original web player with added features like synchronized lyrics, custom playlist management, and "Audiophile" technical specs.

![Preview](https://opengraph.githubassets.com/1/vndangkhoa/spotify-clone)

---

## 🚀 Quick Start (Docker)

The easiest way to run the application is using Docker.

### Option 1: Run from Docker Hub (Pre-built)
```bash
docker run -p 3000:3000 -p 8000:8000 vndangkhoa/spotify-clone:latest
```
Open **[http://localhost:3000](http://localhost:3000)**.

### Option 2: Build Locally
```bash
docker build -t spotify-clone .
docker run -p 3000:3000 -p 8000:8000 spotify-clone
```

---

## 🛠️ Local Development

If you want to contribute or modify the code:

### Prerequisites
- Node.js 18+
- Python 3.11+
- ffmpeg (optional, for some audio features)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
Backend runs on `http://localhost:8000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`.

---

## 📦 Deployment Guide

### 1. Deploy to GitHub
Initialize the repository (if not done) and push:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/spotify-clone.git
git push -u origin main
```

### 2. Deploy to Docker Hub
To share your image with the world (or your NAS):
```bash
# 1. Login to Docker Hub
docker login

# 2. Build the image (replace 'vndangkhoa' with your Docker Hub username)
docker build -t vndangkhoa/spotify-clone:latest .

# 3. Push the image
docker push vndangkhoa/spotify-clone:latest
```

### 3. Deploy to Synology NAS (Container Manager)
This app runs perfectly on Synology NAS using **Container Manager** (formerly Docker).

#### Method A: Using Container Manager UI (Easy)
1.  Open **Container Manager**.
2.  Go to **Registry** -> Search for `vndangkhoa/spotify-clone` (or your image).
3.  Download the image.
4.  Go to **Image** -> Select image -> **Run**.
    -   **Network**: Bridge (default).
    -   **Port Settings**: Map Local Port `3110` (or any) to Container Port `3000`.
    -   **Volume Settings** (Optional): Map a folder `/docker/spotify/data` to `/app/backend/data` to save playlists.
5.  Done! Access at `http://YOUR_NAS_IP:3110`.

#### Method B: Using Docker Compose (Recommended)
1.  Create a folder on your NAS (e.g., `/volume1/docker/spotify`).
2.  Create a file named `docker-compose.yml` inside it:
    ```yaml
    services:
      spotify-clone:
        image: vndangkhoa/spotify-clone:latest
        container_name: spotify-clone
        restart: always
        network_mode: bridge
        ports:
          - "3110:3000" # Web UI Access Port
        volumes:
          - ./data:/app/backend/data
    ```
3.  In Container Manager, go to **Project** -> **Create**.
4.  Select the folder path, give it a name, and it will detect the compose file.
5.  Click **Build** / **Run**.

---

## ✨ Features

- **Real-Time Lyrics**: Fetch and sync lyrics from multiple sources (YouTube, LRCLIB).
- **Audiophile Engine**: "Tech Specs" view showing live bitrate, LUFS, and Dynamic Range.
- **Local-First**: Works offline (PWA) and syncs local playlists.
- **Smart Search**: Unified search across YouTube Music.
- **Responsive**: Full mobile support with a dedicated full-screen player.

## 📝 License
MIT License
