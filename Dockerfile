FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend-vite/package*.json ./
RUN npm ci
COPY frontend-vite/ .
ENV NODE_ENV=production
RUN npm run build

# Use a builder with musl support for a truly static binary
FROM rust:1.85-slim AS backend-builder
WORKDIR /app/backend

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    musl-tools \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN rustup target add x86_64-unknown-linux-musl

COPY backend-rust/Cargo.toml backend-rust/Cargo.lock ./
# Pre-fetch dependencies
RUN cargo fetch

COPY backend-rust/ ./
# Build as a static binary
RUN cargo build --release --target x86_64-unknown-linux-musl --bin backend-rust

FROM python:3.11-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -U "yt-dlp[default]"

# Copy the static binary
COPY --from=backend-builder /app/backend/target/x86_64-unknown-linux-musl/release/backend-rust /app/server
COPY --from=frontend-builder /app/frontend/dist /app/static

# Create directories and set permissions
RUN mkdir -p /tmp/spotify-clone-cache /tmp/spotify-clone-downloads && chmod 777 /tmp/spotify-clone-cache /tmp/spotify-clone-downloads

# Add a debug entrypoint to catch early failures
RUN echo '#!/bin/sh\n\
echo "Starting container debug info..."\n\
uname -a\n\
ls -la /app/server\n\
ldd /app/server || echo "Binary is static or ldd failed"\n\
echo "Executing server..."\n\
exec /app/server' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

ENV PORT=8080
ENV RUST_LOG=info

EXPOSE 8080

USER 0

ENTRYPOINT ["/app/entrypoint.sh"]
