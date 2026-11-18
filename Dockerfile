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

RUN apt-get update && apt-get install --no-install-recommends -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    ca-certificates \
    curl \
    unzip \
    gnupg \
    libssl3 \
    zlib1g \
    && ARCH="$(uname -m)" \
    && case "$ARCH" in x86_64) USQUE_ARCH="amd64" ;; aarch64|arm64) USQUE_ARCH="arm64" ;; *) USQUE_ARCH="amd64" ;; esac \
    && (curl -fsSL "https://github.com/Diniboy1123/usque/releases/download/v4.2.1/usque_4.2.1_linux_${USQUE_ARCH}.zip" -o /tmp/usque.zip && unzip -o /tmp/usque.zip usque -d /usr/local/bin && chmod 0755 /usr/local/bin/usque && rm -f /tmp/usque.zip || true) \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install --no-install-recommends -y nodejs \
    && rm -rf /usr/lib/node_modules/npm /usr/local/lib/node_modules/npm /root/.npm /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Fix for PEP 668 (externally managed environment)
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
# curl_cffi (Chrome TLS fingerprint impersonation) + yt-dlp-ejs help bypass
# YouTube bot detection. The nightly standalone yt-dlp binary is downloaded at
# container start (pip-installed yt-dlp cannot self-update across channels).
# ytmusicapi powers live search suggestions and the home feed.
RUN pip install --no-cache-dir -U "yt-dlp[default]" yt-dlp-ejs "curl_cffi==0.15.0" ytmusicapi

# Copy artifacts
COPY --from=backend-builder /app/backend-rust-bin /app/server
COPY --from=backend-builder /app/backend/scripts /app/scripts
COPY --from=frontend-builder /app/frontend/dist /app/static

# Permissions and Directories
RUN mkdir -p /tmp/kv-music-cache /tmp/kv-music-downloads /app/data && chmod 777 /tmp/kv-music-cache /tmp/kv-music-downloads /app/data
RUN chmod +x /app/server

ENV PORT=8080

# Baked at build time via --build-arg IMAGE_TAG=... (ship.sh passes the image
# version). Powers GET /api/version and /api/update-check (Settings -> Check
# for updates). Local builds without the arg report "dev".
ARG IMAGE_TAG=dev
ENV KV_IMAGE_TAG=${IMAGE_TAG}
ENV RUST_LOG=info
ENV PYTHONUNBUFFERED=1
EXPOSE 8080

USER 0

# Update yt-dlp to the latest nightly binary on every container start
# and start the built-in Cloudflare WARP MASQUE proxy (unless ENABLE_WARP=0
# or the compose `warp` sidecar is already serving 127.0.0.1:29083).
CMD ["sh", "-c", "echo 'Starting KV Music...' && (if [ \"${ENABLE_WARP:-1}\" != \"0\" ] && [ -x /usr/local/bin/usque ] && ! curl -fsS -m 1 http://127.0.0.1:29083 >/dev/null 2>&1; then [ -s /app/data/warp-config.json ] || /usr/local/bin/usque register --accept-tos -c /app/data/warp-config.json || true; if [ -s /app/data/warp-config.json ]; then chmod 0600 /app/data/warp-config.json; /usr/local/bin/usque -c /app/data/warp-config.json http-proxy --always-reconnect -b 127.0.0.1 -p 29083 -d 1.1.1.1 -d 2606:4700:4700::1111 >/tmp/usque.log 2>&1 & sleep 2; fi; fi) && (curl -fsSL https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp -o /opt/venv/bin/yt-dlp && chmod +x /opt/venv/bin/yt-dlp || true) && yt-dlp --version && echo 'yt-dlp ready.' && /app/server 2>&1"]
