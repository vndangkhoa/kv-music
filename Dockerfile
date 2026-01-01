FROM python:3.11-slim

# Install Node.js and dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ffmpeg \
    ca-certificates \
    && update-ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Backend Setup ---
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# --- Frontend Setup ---
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
# Install dependencies (ignoring peer deps conflicts)
RUN npm install --legacy-peer-deps

COPY frontend/ .
# Build Next.js (with ignore-lint already set in next.config.mjs)
# We set API URL to http://localhost:8000 because in this container strategy, 
# the browser will access the backend directly.
# Wait, for client-side fetches, "localhost" refers to the user's machine.
# If we run this container on port 3000 and 8000, localhost:8000 works internally via Rewrites.
# ENV NEXT_PUBLIC_API_URL="http://localhost:8000" Removed to use relative path proxying
# Build Next.js
ENV NEXTAUTH_URL=http://localhost:3000
# Secret should be provided at runtime via docker run -e or docker-compose
ARG NEXTAUTH_SECRET_ARG=default_dev_secret_change_in_production
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET_ARG}
RUN npm run build

# --- Final Setup ---
WORKDIR /app
COPY backend/ ./backend/

# Create a start script
# We also implement a "seed data" check.
# If the volume mount is empty (missing data.json), we copy from our backup.
RUN mkdir -p backend/data_seed && cp -r backend/data/* backend/data_seed/ || true

RUN echo '#!/bin/bash\n\
    if [ ! -f backend/data/data.json ]; then\n\
    echo "Data volume appears empty. Seeding with bundled data..."\n\
    cp -r backend/data_seed/* backend/data/\n\
    fi\n\
    uvicorn backend.main:app --host 0.0.0.0 --port 8000 &\n\
    cd frontend && npm start -- -p 3000\n\
    ' > start.sh && chmod +x start.sh

EXPOSE 3000 8000

CMD ["./start.sh"]
