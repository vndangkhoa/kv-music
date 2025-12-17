# Spotify Clone 🎵

A fully functional clone of the Spotify web player, built with a modern stack featuring **Next.js**, **FastAPI**, and **TailwindCSS**. This application replicates the premium authentic feel of the original web player with added features like synchronized lyrics and custom playlist management.

### ⚡ One-Click Deployment
We have included a script to automate the build and deploy process.
1. Ensure Docker Desktop is running.
2. Double-click `deploy.bat`.

### 📦 Clean Build & Publish (For Developers)

If you are the developer or want to build the image yourself, follow these steps:

### 1. Build the Image
```bash
docker build -t vndangkhoa/spotify-clone:latest .
```

### 2. Push to Docker Hub
```bash
# Login first
docker login

# Push
docker push vndangkhoa/spotify-clone:latest
```

---

## 🚀 Quick Start (Pre-built)

Run the application instantly from Docker Hub:

```bash
docker run -p 3000:3000 -p 8000:8000 vndangkhoa/spotify-clone
```

After the container starts, open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🏠 Synology / Docker Compose (Self-Hosted/Offline)

For permanent deployment on a NAS (Synology) or local server with data persistence, use **Docker Compose**.

### 1. Create `docker-compose.yml`
Create a file named `docker-compose.yml` with the following content:

```yaml
services:
  spotify-clone:
    image: vndangkhoa/spotify-clone:latest
    container_name: spotify-clone
    restart: always
    network_mode: bridge
    ports:
      - "3000:3000" # Web UI (Access this)
      - "8000:8000" # Optional: Direct API access
    volumes:
      # Persist your playlists and data
      - ./data:/app/backend/data
```

### 2. Run the Service
Run the following command in the same directory:

```bash
docker-compose up -d
```

Your data (playlists) will be securely saved in the `./data` folder on your host machine.

---

## 📱 PWA Support (Mobile App)

This web app is **Progressive Web App (PWA)** compatible. You can install it on your mobile device for a native-like experience:

1.  Open the web app in **Safari** (iOS) or **Chrome** (Android).
2.  Tap the **Share** button (iOS) or **Menu** (Android).
3.  Select **"Add to Home Screen"**.
4.  Launch it from your home screen—it looks and feels just like an app! 🎧

---

## ✨ Key Features

- **mic Synced Lyrics**: Real-time scrolling lyrics with precise synchronization.
- **🎧 Seamless Playback**: Full audio controls, background play support.
- **📂 Playlist Management**: Create, edit, and save playlists locally.
- **🔍 Smart Search**: Instantly find tracks.
- **🎨 Premium UI**: Glassmorphism, dynamic gradients, and smooth animations.

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS.
- **Backend**: FastAPI, Python 3.11.
- **Container**: Hybrid Image (Node.js + Python).

## 📦 Ports

- **3000**: Frontend (User Interface) - **Primary Access Point**
- **8000**: Backend (API) - *Internal use, but can be mapped for direct API access.*

For standard usage, accessing via Port 3000 handles everything.
