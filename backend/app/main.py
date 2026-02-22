from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from .database import init_db
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
    # NOTE: The APScheduler reminder service has been removed.
    # Reminders are now driven entirely by the frontend (useReminders.ts),
    # which polls GET /api/tasks/?date=<today> every 60 seconds and fires
    # browser notifications locally. No background thread is needed here.
    init_db()   # create/verify DB tables (non-fatal if DB is unreachable)

# ── Root / Health ─────────────────────────────────────────────────────────────
@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {"message": "Daily Task Scheduler API", "version": "2.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
