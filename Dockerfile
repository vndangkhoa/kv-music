# --- Stage 1: Frontend Builder ---
FROM node:18-alpine AS builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
# Install dependencies including devDependencies for build
RUN npm install --legacy-peer-deps
COPY frontend/ ./
# Build with standalone output
ENV NEXT_PUBLIC_API_URL="http://localhost:8000"
RUN npm run build

# --- Stage 2: Final Runtime Image ---
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ffmpeg \
    ca-certificates \
    nodejs \
    npm \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Backend Setup
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Frontend Setup (Copy from Builder)
# Copy the standalone server
COPY --from=builder /app/frontend/.next/standalone /app/frontend
# Copy static files (required for standalone)
COPY --from=builder /app/frontend/.next/static /app/frontend/.next/static
COPY --from=builder /app/frontend/public /app/frontend/public

# Copy Backend Code
COPY backend/ ./backend/

# Create start script
RUN mkdir -p backend/data_seed && cp -r backend/data/* backend/data_seed/ || true

# Set Environment Variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Note: Standalone mode runs with 'node server.js'
RUN echo '#!/bin/bash\n\
    if [ ! -f backend/data/data.json ]; then\n\
    echo "Data volume appears empty. Seeding with bundled data..."\n\
    cp -r backend/data_seed/* backend/data/\n\
    fi\n\
    uvicorn backend.main:app --host 0.0.0.0 --port 8000 &\n\
    cd frontend && node server.js\n\
    ' > start.sh && chmod +x start.sh

EXPOSE 3000 8000

CMD ["./start.sh"]
