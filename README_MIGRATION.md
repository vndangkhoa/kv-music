# Migration Guide

This project has been migrated to **Golang** (Backend) and **Vite/React** (Frontend).

## Prerequisites
- **Go 1.21+**
- **Node.js 18+**
- **yt-dlp** (Must be in your system PATH)

## 1. Running the Backend (Go)
The backend replaces the FastAPI server. It uses `yt-dlp` CLI for searching and streaming.

```bash
cd backend-go
go mod tidy
go run cmd/server/main.go
```
Server will start on `http://localhost:8080`.

## 2. Running the Frontend (Vite)
The frontend replaces Next.js.

```bash
cd frontend-vite
npm install
npm run dev
```
Frontend will start on `http://localhost:5173`.

## Notes
- The Go backend proxies `yt-dlp` commands. Ensure `yt-dlp` is installed and updated.
- The Frontend is configured to proxy `/api` requests to `http://localhost:8080`.
