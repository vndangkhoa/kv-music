from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.api.routes import router as api_router
from backend.scheduler import start_scheduler
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start scheduler
    scheduler = start_scheduler()
    yield
    # Shutdown: Scheduler shuts down automatically with process, or we can explicit shutdown if needed
    scheduler.shutdown()

app = FastAPI(title="Spotify Clone Backend", lifespan=lifespan)

# CORS setup
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Serve Static Frontend (Production Mode)
STATIC_DIR = "static"
if os.path.exists(STATIC_DIR):
    app.mount("/_next", StaticFiles(directory=os.path.join(STATIC_DIR, "_next")), name="next_assets")
    
    # Serve other static files (favicons etc) if they exist in root of static
    # Or just fallback everything else to index.html for SPA
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Check if file exists in static folder
        file_path = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Otherwise return index.html
        index_path = os.path.join(STATIC_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        
        return {"error": "Frontend not found"}
else:
    @app.get("/")
    def read_root():
        return {"message": "Spotify Clone Backend Running (Frontend not built/mounted)"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
