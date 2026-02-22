from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Fall back to local SQLite for development
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'tasks.db')}"
    print(f"DATABASE_URL not set. Using local SQLite: {DATABASE_URL}")

# Fix old postgres:// URLs (used by older Render/Heroku configs)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite requires a different connect_args and does not support pool_size/max_overflow
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(
        DATABASE_URL,
        # Fail fast if DB is unreachable (don't hang for 30 s at startup)
        connect_args={"connect_timeout": 10},
        # Pool settings tuned for Supabase PgBouncer (session mode)
        pool_pre_ping=True,       # drop stale connections before use
        pool_size=2,              # free tier: keep the pool small
        max_overflow=3,
        pool_recycle=300,         # recycle connections every 5 min
        pool_timeout=20,          # give up waiting for a pool slot after 20 s
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Create any missing tables. Non-fatal — if the DB is unreachable at
    startup (e.g. Supabase cold-start, wrong URL) the worker still boots
    and Render can open the HTTP port. Errors surface per-request instead.
    """
    try:
        Base.metadata.create_all(bind=engine)
        print("[database] Tables verified/created OK.")
    except Exception as exc:
        print(f"[database] WARNING: init_db() failed — {exc}")
        print("[database] The server will still start. Check DATABASE_URL.")
