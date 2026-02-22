from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from .routes import tasks
from .routes import reminders

app = FastAPI(title="Daily Task Scheduler API", version="2.0.0")

# ── CORS ──────────────────────────────────────────────────────────────────────
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]

prod_origins = os.getenv("ALLOWED_ORIGINS")
if prod_origins:
    origins.extend(prod_origins.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(tasks.router)
app.include_router(reminders.router)  # kept for backward-compat; not called by new frontend

# ── Lifecycle ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    # DB tables are created once at initial setup (run init_db() manually or
    # via a one-off command). We do NOT call it here because:
    #   1. create_all() opens a DB connection synchronously, blocking the
    #      event loop and preventing Gunicorn from serving HTTP until it
    #      completes (or times out). Render's port scanner then reports
    #      "no open HTTP ports" and kills the deployment.
    #   2. Tables already exist in production — idempotent but unnecessary.
    #
    # If you need to create tables on a fresh DB, run once locally:
    #   python -c "from app.database import init_db; init_db()"
    pass

# ── Root / Health ─────────────────────────────────────────────────────────────
@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {"message": "Daily Task Scheduler API", "version": "2.0.0"}

@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    return {"status": "healthy"}
