from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import PROJECT_NAME, TAGLINE, DEMO_CLIENT
from backend.app.db.init_db import init_db

# Import all routers
from backend.app.api.inventory import router as inventory_router
from backend.app.api.production import router as production_router
from backend.app.api.quality import router as quality_router
from backend.app.api.orders import router as orders_router
from backend.app.api.dispatch import router as dispatch_router
from backend.app.api.workforce import router as workforce_router
from backend.app.api.costing import router as costing_router
from backend.app.api.insights import router as insights_router
from backend.app.api.floormap import router as floormap_router
from backend.app.api.settings import router as settings_router
from backend.app.api.dashboard import router as dashboard_router
from backend.app.api.simulation import router as simulation_router

app = FastAPI(
    title=f"{PROJECT_NAME} — {TAGLINE}",
    description=f"Unified Textile Manufacturing Platform for {DEMO_CLIENT}. Built for Odoo x NMIT Hackathon 2026. 100% Offline & Rule-Based.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for local Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(dashboard_router, prefix="/api")
app.include_router(inventory_router, prefix="/api")
app.include_router(production_router, prefix="/api")
app.include_router(quality_router, prefix="/api")
app.include_router(orders_router, prefix="/api")
app.include_router(dispatch_router, prefix="/api")
app.include_router(workforce_router, prefix="/api")
app.include_router(costing_router, prefix="/api")
app.include_router(insights_router, prefix="/api")
app.include_router(floormap_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(simulation_router, prefix="/api")

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
def root():
    return {
        "product": PROJECT_NAME,
        "tagline": TAGLINE,
        "demo_client": DEMO_CLIENT,
        "status": "online",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
