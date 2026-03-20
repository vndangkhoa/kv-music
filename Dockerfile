FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend-vite/package*.json ./
RUN npm ci

COPY frontend-vite/ .
ENV NODE_ENV=production
RUN npm run build

FROM rust:1.85-alpine AS backend-builder
WORKDIR /app/backend

RUN apk add --no-cache musl-dev openssl-dev perl

COPY backend-rust/Cargo.toml backend-rust/Cargo.lock ./
RUN cargo fetch

COPY backend-rust/ ./
RUN cargo build --release --bin backend-rust

FROM python:3.11-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -U "yt-dlp[default]"

COPY --from=backend-builder /app/backend/target/release/backend-rust /app/server
COPY --from=frontend-builder /app/frontend/dist /app/static

RUN mkdir -p /tmp/spotify-clone-cache /tmp/spotify-clone-downloads && chmod 777 /tmp/spotify-clone-cache /tmp/spotify-clone-downloads

ENV PORT=8080
ENV RUST_LOG=info

EXPOSE 8080

USER 1000

CMD ["/app/server"]
