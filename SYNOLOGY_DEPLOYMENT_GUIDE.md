# Synology DS920+ Deployment & Stability Guide
*Priority Technical Instructions for AI Agents*

This application has been specifically optimized for deployment on a **Synology DS920+ (x86_64)**. To ensure future updates don't break the deployment, follow these mandatory rules:

## 1. Unified OS Environment
- **Requirement**: Use `debian:bookworm-slim` for both the build stages and the final runtime stage in the `Dockerfile`.
- **Reason**: Synology's kernel and library system (glibc) are highly compatible with Debian Bookworm. Mismatches between builder images (e.g., node-alpine) and runtime images (e.g., python-slim) will cause silent execution failures on the NAS.

## 2. Axum 0.8 Routing (Critical)
- **Warning**: Axum 0.8 removed support for "nesting" at the root path (`/`).
- **Fix**: Never use `.nest_service("/", ...)` for static files. Instead, use `.fallback_service(ServeDir::new("static"))`.
- **Symptoms**: Incorrect nesting causes an immediate panic on startup, often with no logs in the Docker container manager.

## 3. Immediate Log Flushing
- **Implementation**: In `main.rs`, always force-flush `stdout` and `stderr` after critical startup messages.
```rust
println!("SERVER STARTING UP...");
std::io::stdout().flush().unwrap();
```
- **Reason**: Synology Container Manager's log buffer can "swallow" early panic messages if the process dies instantly. Explicit flushing ensures the error appears in the GUI.

## 4. Docker Compatibility
- **Compose Version**: Use `version: "3.8"` or lower in `docker-compose.yml`.
- **API Version**: If running via CLI/SSH, export `DOCKER_API_VERSION=1.43` to match the NAS daemon.
- **Image Strategy**: If registry pull/push fails with "No logs," always fallback to building directly on the NAS via SSH using:
  `sudo docker build -t spotify-local:latest .`

## 5. Runtime Dependencies
- **libssl3 / zlib1g**: Must be explicitly installed in the final Docker stage.
- **Node.js**: Required in the final stage for `yt-dlp` JS-runtime features.
- **Python venv**: Use a virtual environment (`/opt/venv`) to avoid "externally managed environment" errors in Debian Bookworm.
