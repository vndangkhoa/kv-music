
# ---------------------------
# Stage 1: Build Frontend
# ---------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend-vite/package*.json ./
RUN npm ci

COPY frontend-vite/ .
# Ensure production build
ENV NODE_ENV=production
RUN npm run build

# ---------------------------
# Stage 2: Build Backend
# ---------------------------
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app/backend

# Install build deps if needed (e.g. gcc for cgo, though we try to avoid it)
RUN apk add --no-cache git

COPY backend-go/go.mod backend-go/go.sum ./
RUN go mod download

COPY backend-go/ .
# Build static binary for linux/amd64
ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64
RUN go build -o server cmd/server/main.go

# ---------------------------
# Stage 3: Final Runtime
# ---------------------------
# We use python:3.11-slim because yt-dlp requires Python.
# Alpine is smaller but Python/libc compatibility can be tricky for yt-dlp's dependencies.
# Slim-bookworm is a safe bet for a "linux/amd64" target.
FROM python:3.11-slim-bookworm

WORKDIR /app

# Install runtime dependencies for yt-dlp (ffmpeg is crucial)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy backend binary
COPY --from=backend-builder /app/backend/server /app/server

# Copy frontend build to 'static' folder (backend expects ./static)
COPY --from=frontend-builder /app/frontend/dist /app/static

# Create cache directory for spotdl
RUN mkdir -p /tmp/spotify-clone-cache && chmod 777 /tmp/spotify-clone-cache

# Install yt-dlp (and pip)
# We install it systematically via pip to ensure we have a managed version
RUN pip install --no-cache-dir -U "yt-dlp[default]"

# Environment variables
ENV PORT=8080
ENV GIN_MODE=release

EXPOSE 8080

CMD ["/app/server"]
