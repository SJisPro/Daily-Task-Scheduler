from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from .routes import tasks
from .routes import reminders
from .push_service import start_push_service, stop_push_service

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
app.include_router(reminders.router)

# ── Lifecycle ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    # init_db() is intentionally NOT called here — it blocks the event loop
    # and causes Render's port scanner to time out. Tables already exist in
    # production. Run `python -c "from app.database import init_db; init_db()"`
    # once locally when setting up a fresh database.
    start_push_service()   # OneSignal push notifications (no-op if unconfigured)


@app.on_event("shutdown")
async def shutdown_event():
    stop_push_service()


# ── Root / Health ─────────────────────────────────────────────────────────────
@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {"message": "Daily Task Scheduler API", "version": "2.0.0"}


@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    return {"status": "healthy"}
