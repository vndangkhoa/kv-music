#!/usr/bin/env bash
# ============================================================
# kv-music — Build & Push Docker Image to All Registries
# Run this after: sudo usermod -aG docker $USER && newgrp docker
# ============================================================
set -e

IMAGE_NAME="kv-music"
DOCKER_USER="vndangkhoa"
FORGEJO="git.khoavo.myds.me"

DOCKERHUB_IMAGE="docker.io/${DOCKER_USER}/${IMAGE_NAME}"
GHCR_IMAGE="ghcr.io/${DOCKER_USER}/${IMAGE_NAME}"
FORGEJO_IMAGE="${FORGEJO}/${DOCKER_USER}/${IMAGE_NAME}"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   kv-music — Docker Build & Multi-Push       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Build ─────────────────────────────────────────────────────────────────────
echo "🔨 Building Docker image..."
docker build \
  --tag "${DOCKERHUB_IMAGE}:latest" \
  --tag "${GHCR_IMAGE}:latest" \
  --tag "${FORGEJO_IMAGE}:latest" \
  --platform linux/amd64 \
  .

echo ""
echo "✅ Build complete!"
echo ""

# ── Push to Docker Hub ────────────────────────────────────────────────────────
echo "📦 Pushing to Docker Hub (docker.io)..."
docker push "${DOCKERHUB_IMAGE}:latest"
echo "   ✅ https://hub.docker.com/r/${DOCKER_USER}/${IMAGE_NAME}"

# ── Push to GitHub Container Registry ─────────────────────────────────────────
echo "📦 Pushing to GitHub Container Registry (ghcr.io)..."
docker push "${GHCR_IMAGE}:latest"
echo "   ✅ https://github.com/${DOCKER_USER}/${IMAGE_NAME}/pkgs/container/${IMAGE_NAME}"

# ── Push to Forgejo ────────────────────────────────────────────────────────────
echo "📦 Pushing to Forgejo Registry..."
docker push "${FORGEJO_IMAGE}:latest"
echo "   ✅ https://${FORGEJO}/${DOCKER_USER}/${IMAGE_NAME}"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   🎉 All registries updated successfully!    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Pull commands:"
echo "  docker pull ${DOCKERHUB_IMAGE}:latest"
echo "  docker pull ${GHCR_IMAGE}:latest"
echo "  docker pull ${FORGEJO_IMAGE}:latest"
echo ""
