from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.auth.router import router as auth_router
from backend.organizations.router import router as org_router
from backend.compliance.router import router as compliance_router
from backend.documents.router import router as documents_router
from backend.labels.router import router as labels_router
from backend.audits.router import router as audits_router
from backend.audits.capa_router import router as capa_router
from backend.suppliers.router import router as suppliers_router
from backend.batches.router import router as batches_router
from backend.recall.router import router as recall_router
from backend.dashboard.router import router as dashboard_router
from backend.voice.router import router as voice_router

app = FastAPI(
    title="SafeFood AI (AI-FSR) API",
    version="1.0.0",
    description="Enterprise Food Safety Compliance, Audit, and Recall Risk Management Platform (FSSAI-regulated).",
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API v1 Router Registration (§7)
API_V1_PREFIX = "/api/v1"

app.include_router(auth_router, prefix=API_V1_PREFIX)
app.include_router(org_router, prefix=API_V1_PREFIX)
app.include_router(compliance_router, prefix=API_V1_PREFIX)
app.include_router(documents_router, prefix=API_V1_PREFIX)
app.include_router(labels_router, prefix=API_V1_PREFIX)
app.include_router(audits_router, prefix=API_V1_PREFIX)
app.include_router(capa_router, prefix=API_V1_PREFIX)
app.include_router(suppliers_router, prefix=API_V1_PREFIX)
app.include_router(batches_router, prefix=API_V1_PREFIX)
app.include_router(recall_router, prefix=API_V1_PREFIX)
app.include_router(dashboard_router, prefix=API_V1_PREFIX)
app.include_router(voice_router, prefix=API_V1_PREFIX)


@app.get("/health")
def health_check():
    """Health check endpoint for container orchestrator (ECS Fargate / Kubernetes)."""
    return {
        "status": "healthy",
        "service": "safefood-ai-backend",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }


from pathlib import Path
from fastapi.responses import FileResponse, HTMLResponse

BASE_DIR = Path(__file__).resolve().parent.parent

@app.get("/")
def root(request: Request):
    accept = request.headers.get("accept", "")
    if "text/html" in accept:
        index_file = BASE_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
    return {
        "app": "SafeFood AI (AI-FSR)",
        "ui": "/ui",
        "docs": "/docs",
        "health": "/health",
        "api_v1": "/api/v1"
    }


@app.get("/ui", response_class=HTMLResponse)
def serve_ui():
    index_file = BASE_DIR / "index.html"
    return FileResponse(index_file)


@app.get("/style.css")
def get_css():
    return FileResponse(BASE_DIR / "style.css", media_type="text/css")


@app.get("/app.js")
def get_js():
    return FileResponse(BASE_DIR / "app.js", media_type="application/javascript")
