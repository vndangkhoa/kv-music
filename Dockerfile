# syntax=docker/dockerfile:1
# Layer 1: Frontend
FROM node:22-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend-vite/package*.json ./
RUN npm ci
COPY frontend-vite/ .
RUN npm run build

# Layer 2: Backend (with cargo cache mounts for fast rebuilds)
FROM rust:1.88-slim-bookworm AS backend-builder
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
# curl_cffi (Chrome TLS fingerprint impersonation) + yt-dlp-ejs help bypass
# YouTube bot detection. The nightly standalone yt-dlp binary is downloaded at
# container start (pip-installed yt-dlp cannot self-update across channels).
RUN pip install --no-cache-dir -U "yt-dlp[default]" yt-dlp-ejs "curl_cffi==0.15.0"

# Copy artifacts
COPY --from=backend-builder /app/backend-rust-bin /app/server
COPY --from=frontend-builder /app/frontend/dist /app/static

# Permissions and Directories
RUN mkdir -p /tmp/kv-music-cache /tmp/kv-music-downloads /app/data && chmod 777 /tmp/kv-music-cache /tmp/kv-music-downloads /app/data
RUN chmod +x /app/server

ENV PORT=8080
ENV RUST_LOG=info
ENV PYTHONUNBUFFERED=1
EXPOSE 8080

USER 0

# Update yt-dlp to the latest nightly binary on every container start
# (nightly has the newest YouTube anti-bot workarounds, e.g. PO tokens)
CMD ["sh", "-c", "echo 'Starting KV Music...' && (curl -fsSL https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp -o /opt/venv/bin/yt-dlp && chmod +x /opt/venv/bin/yt-dlp || true) && yt-dlp --version && echo 'yt-dlp ready.' && /app/server 2>&1"]
