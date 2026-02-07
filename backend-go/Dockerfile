# Build Stage
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
# Go mod tidy created go.sum? If not, we run it here.
# Copy source
COPY . .
# Build
RUN go mod tidy
RUN go build -o server cmd/server/main.go

# Runtime Stage
FROM python:3.11-alpine
# We need python for yt-dlp
WORKDIR /app

# Install dependencies (ffmpeg, yt-dlp)
RUN apk add --no-cache ffmpeg curl
# Install yt-dlp via pip (often fresher) or use the binary
RUN pip install yt-dlp

COPY --from=builder /app/server .

EXPOSE 8080
CMD ["./server"]
