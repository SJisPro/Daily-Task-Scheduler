from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from .database import init_db
from .routes import tasks
from .reminder_service import start_reminder_service, stop_reminder_service

# Create FastAPI app
app = FastAPI(title="Daily Task Scheduler API", version="1.0.0")

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]

# Add production origins from environment variable
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

# Include routers
app.include_router(tasks.router)

@app.on_event("startup")
async def startup_event():
    start_reminder_service()

@app.on_event("shutdown")
async def shutdown_event():
    """Stop reminder service when app shuts down"""
    stop_reminder_service()

@app.get("/")
def root():
    return {"message": "Daily Task Scheduler API", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
