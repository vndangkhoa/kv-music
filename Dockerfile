# syntax=docker/dockerfile:1
# Layer 1: Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend-vite/package*.json ./
RUN npm ci
COPY frontend-vite/ .
RUN npm run build

# Layer 2: Backend (with cargo cache mounts for fast rebuilds)
FROM rust:1.85-slim-bookworm AS backend-builder
WORKDIR /app/backend
RUN apt-get update && apt-get install -y pkg-config libssl-dev libc6-dev && rm -rf /var/lib/apt/lists/*
COPY backend-rust/Cargo.toml backend-rust/Cargo.lock ./
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/backend/target \
    cargo fetch
COPY backend-rust/ ./
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/backend/target \
    cargo build --release --bin backend-rust && \
    cp /app/backend/target/release/backend-rust /app/backend-rust-bin

# Layer 3: Final Runtime
FROM debian:bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    ca-certificates \
    curl \
    gnupg \
    libssl3 \
    zlib1g \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Fix for PEP 668 (externally managed environment)
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -U "yt-dlp[default]" yt-dlp-ejs

# Copy artifacts
COPY --from=backend-builder /app/backend-rust-bin /app/server
COPY --from=frontend-builder /app/frontend/dist /app/static

# Permissions and Directories
RUN mkdir -p /tmp/kv-music-cache /tmp/kv-music-downloads && chmod 777 /tmp/kv-music-cache /tmp/kv-music-downloads
RUN chmod +x /app/server

ENV PORT=8080
ENV RUST_LOG=info
ENV PYTHONUNBUFFERED=1
EXPOSE 8080

USER 0

CMD ["sh", "-c", "echo 'Starting KV Music...' && /app/server 2>&1"]
