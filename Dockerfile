
# ---------------------------
# Stage 1: Build Frontend
# ---------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend-vite/package*.json ./
RUN npm ci

COPY frontend-vite/ .
ENV NODE_ENV=production
RUN npm run build

# ---------------------------
# Stage 2: Build Backend (Rust)
# ---------------------------
FROM rust:1.85-bookworm AS backend-builder
WORKDIR /app/backend

COPY backend-rust/Cargo.toml ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release && rm -rf src

COPY backend-rust/src ./src
RUN cargo build --release

# ---------------------------
# Stage 3: Final Runtime
# ---------------------------
FROM python:3.11-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=backend-builder /app/backend/target/release/backend-rust /app/server

COPY --from=frontend-builder /app/frontend/dist /app/static

RUN mkdir -p /tmp/spotify-clone-cache && chmod 777 /tmp/spotify-clone-cache

RUN pip install --no-cache-dir -U "yt-dlp[default]"

ENV PORT=8080
ENV RUST_ENV=production

EXPOSE 8080

CMD ["/app/server"]
