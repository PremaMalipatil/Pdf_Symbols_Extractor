from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class BoundingBox(BaseModel):
    x: int
    y: int
    w: int
    h: int


class SymbolBase(BaseModel):
    page_number: int
    symbol_number: int
    bounding_box: BoundingBox
    area: float = 0.0
    source_pdf: Optional[str] = None


class SymbolCreate(SymbolBase):
    png_path: str
    svg_path: Optional[str] = None


class SymbolResponse(SymbolBase):
    id: int
    png_path: str
    svg_path: Optional[str] = None
    created_at: datetime
    png_url: Optional[str] = None
    svg_url: Optional[str] = None

    class Config:
        from_attributes = True


class ProcessResponse(BaseModel):
    total_symbols: int
    pages_processed: int
    symbols: list[SymbolResponse]
    message: str


class UploadResponse(BaseModel):
    file_id: str
    filename: str
    message: str
