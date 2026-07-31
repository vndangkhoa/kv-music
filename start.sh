#!/bin/bash
# ==============================================================================
# KV Music Startup Script
# Fully starts the Rust API backend and Vite frontend
# ==============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend-rust"
FRONTEND_DIR="$ROOT_DIR/frontend-vite"

echo "=========================================="
echo "  🎵 KV MUSIC - STARTUP LAUNCHER"
echo "=========================================="

# 1. Stop old processes on ports 8080 (backend API) & 5173 (frontend)
echo "🔍 Checking and stopping existing server processes on ports 8080 & 5173..."
if command -v lsof >/dev/null 2>&1; then
  lsof -ti:8080 | xargs kill -9 2>/dev/null || true
  lsof -ti:5173 | xargs kill -9 2>/dev/null || true
elif command -v fuser >/dev/null 2>&1; then
  fuser -k 8080/tcp 2>/dev/null || true
  fuser -k 5173/tcp 2>/dev/null || true
fi
sleep 1

# 2. Check & Configure Node / NPM
echo "📦 Setting up Frontend (Vite)..."
if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  NODE_CMD="node"
  NPM_CMD="npm"
elif [ -f "/tmp/node-v20.18.0-linux-x64/bin/node" ]; then
  export PATH="/tmp/node-v20.18.0-linux-x64/bin:$PATH"
  NODE_CMD="node"
  NPM_CMD="npm"
else
  echo "❌ Error: Node.js and npm are required. Please install Node.js."
  exit 1
fi

# Install frontend dependencies if needed
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "⚡ Installing frontend npm dependencies..."
  (cd "$FRONTEND_DIR" && "$NPM_CMD" install)
fi

# 3. Check & Configure Backend API Server
echo "🦀 Setting up Backend API Server (Rust)..."

if [ -d "$HOME/.cargo/bin" ]; then
  export PATH="$HOME/.cargo/bin:$PATH"
fi

BACKEND_STARTED=false

if command -v cargo >/dev/null 2>&1; then
  echo "✅ Cargo detected. Building backend binary..."
  (cd "$BACKEND_DIR" && cargo build)
  
  if [ -f "$BACKEND_DIR/target/debug/backend-rust" ]; then
    echo "🚀 Starting Rust backend executable..."
    nohup "$BACKEND_DIR/target/debug/backend-rust" > "$ROOT_DIR/backend.log" 2>&1 &
    BACKEND_STARTED=true
  else
    echo "🚀 Starting Rust backend via 'cargo run'..."
    (cd "$BACKEND_DIR" && nohup cargo run > "$ROOT_DIR/backend.log" 2>&1 &)
    BACKEND_STARTED=true
  fi

elif [ -f "$BACKEND_DIR/target/release/backend-rust" ]; then
  echo "🚀 Found pre-built backend release binary!"
  nohup "$BACKEND_DIR/target/release/backend-rust" > "$ROOT_DIR/backend.log" 2>&1 &
  BACKEND_STARTED=true

elif [ -f "$BACKEND_DIR/target/debug/backend-rust" ]; then
  echo "🚀 Found pre-built backend debug binary!"
  nohup "$BACKEND_DIR/target/debug/backend-rust" > "$ROOT_DIR/backend.log" 2>&1 &
  BACKEND_STARTED=true

elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "🐳 Cargo not found locally. Starting backend via Docker Compose..."
  docker compose up -d
  BACKEND_STARTED=true
fi

if [ "$BACKEND_STARTED" = false ]; then
  echo "⚠️ Warning: Cargo / Rust is not installed, and no prebuilt binary was found."
  echo "   To install Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
fi

# 4. Start Frontend Dev Server
echo "🌐 Starting Frontend dev server..."
(cd "$FRONTEND_DIR" && nohup "$NPM_CMD" run dev > "$ROOT_DIR/frontend.log" 2>&1 &)

sleep 2

echo "=========================================="
echo "  ✅ KV MUSIC IS NOW RUNNING!"
echo "=========================================="
echo "  Frontend Web UI:  http://localhost:5173/"
echo "  Backend API:      http://localhost:8080/"
echo "------------------------------------------"
echo "  Logs:"
echo "    Backend API: tail -f $ROOT_DIR/backend.log"
echo "    Frontend:    tail -f $ROOT_DIR/frontend.log"
echo "=========================================="
