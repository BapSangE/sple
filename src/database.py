from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base, Mapped, mapped_column
from sqlalchemy import DateTime, Integer, String, Float, Text, text, Index
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

if not DATABASE_URL:
    DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sple.db")
    DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(
    DATABASE_URL, 
    echo=False,
    connect_args={"statement_cache_size": 0} if "postgresql" in DATABASE_URL else {}
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

class Place(Base):
    __tablename__ = "places"
    __table_args__ = (Index("uq_places_user_request", "user_id", "request_id", unique=True),)

    request_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String, index=True) # Google Auth user ID
    name: Mapped[str] = mapped_column(String)
    address: Mapped[str] = mapped_column(String, default="")
    category: Mapped[str] = mapped_column(String, default="All")
    rating: Mapped[float] = mapped_column(Float, nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=True)
    geocoding_status: Mapped[str] = mapped_column(String, default="pending")
    naver_place_title: Mapped[str] = mapped_column(Text, nullable=True)
    naver_place_url: Mapped[str] = mapped_column(Text, nullable=True)
    naver_category: Mapped[str] = mapped_column(Text, nullable=True)
    naver_description: Mapped[str] = mapped_column(Text, nullable=True)
    naver_telephone: Mapped[str] = mapped_column(Text, nullable=True)
    naver_address: Mapped[str] = mapped_column(Text, nullable=True)
    naver_road_address: Mapped[str] = mapped_column(Text, nullable=True)
    naver_mapx: Mapped[str] = mapped_column(Text, nullable=True)
    naver_mapy: Mapped[str] = mapped_column(Text, nullable=True)
    naver_match_status: Mapped[str] = mapped_column(String, nullable=True)
    naver_enriched_at = mapped_column(DateTime(timezone=True), nullable=True)


class InstagramShare(Base):
    __tablename__ = "instagram_shares"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    claim_token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    sender_id: Mapped[str] = mapped_column(String(255), index=True)
    source_url: Mapped[str] = mapped_column(Text, default="")
    title: Mapped[str] = mapped_column(Text, default="")
    places_json: Mapped[str] = mapped_column(Text, default="[]")
    claimed_by_user_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if "sqlite" in DATABASE_URL:
            result = await conn.execute(text("PRAGMA table_info(places)"))
            existing_columns = {row[1] for row in result.fetchall()}
            columns = {
                "request_id": "VARCHAR(36)",
                "naver_place_title": "TEXT",
                "naver_place_url": "TEXT",
                "naver_category": "TEXT",
                "naver_description": "TEXT",
                "naver_telephone": "TEXT",
                "naver_address": "TEXT",
                "naver_road_address": "TEXT",
                "naver_mapx": "TEXT",
                "naver_mapy": "TEXT",
                "naver_match_status": "VARCHAR",
                "naver_enriched_at": "DATETIME",
            }
            for column_name, column_type in columns.items():
                if column_name not in existing_columns:
                    await conn.execute(
                        text(f"ALTER TABLE places ADD COLUMN {column_name} {column_type}")
                    )

            await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_places_user_request ON places (user_id, request_id)"))

async def get_db():
    async with async_session() as session:
        yield session
