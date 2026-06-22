from datetime import datetime
from sqlalchemy import Integer, String, DateTime, JSON, Float
from sqlalchemy.orm import mapped_column, Mapped
from app.core.database import Base


class Symbol(Base):
    __tablename__ = "symbols"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    page_number: Mapped[int] = mapped_column(Integer)
    symbol_number: Mapped[int] = mapped_column(Integer)
    png_path: Mapped[str] = mapped_column(String)
    svg_path: Mapped[str] = mapped_column(String, nullable=True)
    bounding_box: Mapped[dict] = mapped_column(JSON)  # {x, y, w, h}
    area: Mapped[float] = mapped_column(Float, default=0.0)
    source_pdf: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
