#!/bin/bash
# KV Music startup script
# Stops old processes, starts backend + frontend with setsid

echo "=== KV Music Startup ==="

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend-rust"
FRONTEND_DIR="$ROOT_DIR/frontend-vite"
BACKEND_BIN="$BACKEND_DIR/target/debug/backend-rust"
NODE_DIR="/tmp/node-v20.18.0-linux-x64/bin"
NODE_BIN="$NODE_DIR/node"
NPM_BIN="$NODE_DIR/npm"

# Kill existing processes on ports 8080 and 5173
echo "Stopping existing servers..."
lsof -ti:8080 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti:5173 2>/dev/null | xargs kill -9 2>/dev/null
sleep 1

# Start backend
echo "Starting backend (port 8080)..."
setsid "$BACKEND_BIN" > "$ROOT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Start frontend
echo "Starting frontend (port 5173)..."
export PATH="$NODE_DIR:$PATH"
setsid "$NPM_BIN" --prefix "$FRONTEND_DIR" run dev > "$ROOT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

sleep 2
echo ""
echo "=== URLs ==="
echo "Local:      http://localhost:5173/"
echo "Network:    http://0.0.0.0:5173/"
echo "Backend:    http://0.0.0.0:8080/"
echo ""
echo "Check logs:"
echo "  tail -f $ROOT_DIR/backend.log"
echo "  tail -f $ROOT_DIR/frontend.log"
