import os
import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.database import get_db
from app.core.config import settings
from app.models.symbol import Symbol
from app.models.schemas import SymbolResponse

logger = logging.getLogger(__name__)
router = APIRouter()


def _to_response(s: Symbol) -> SymbolResponse:
    return SymbolResponse(
        id=s.id,
        page_number=s.page_number,
        symbol_number=s.symbol_number,
        bounding_box=s.bounding_box,
        area=s.area,
        source_pdf=s.source_pdf,
        png_path=s.png_path,
        svg_path=s.svg_path,
        created_at=s.created_at,
        png_url=f"/output/{s.png_path}" if s.png_path else None,
        svg_url=f"/output/{s.svg_path}" if s.svg_path else None,
    )


@router.get("/symbols", response_model=list[SymbolResponse])
async def list_symbols(
    page: int = Query(None, description="Filter by page number"),
    source_pdf: str = Query(None, description="Filter by source PDF filename"),
    db: AsyncSession = Depends(get_db),
):
    """Get all extracted symbols with optional filters."""
    stmt = select(Symbol).order_by(Symbol.page_number, Symbol.symbol_number)
    if page is not None:
        stmt = stmt.where(Symbol.page_number == page)
    if source_pdf:
        stmt = stmt.where(Symbol.source_pdf == source_pdf)
    result = await db.execute(stmt)
    symbols = result.scalars().all()
    return [_to_response(s) for s in symbols]


@router.get("/symbols/{symbol_id}", response_model=SymbolResponse)
async def get_symbol(symbol_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific symbol by ID."""
    result = await db.execute(select(Symbol).where(Symbol.id == symbol_id))
    sym = result.scalar_one_or_none()
    if not sym:
        raise HTTPException(status_code=404, detail="Symbol not found")
    return _to_response(sym)


@router.get("/download/png/{symbol_id}")
async def download_png(symbol_id: int, db: AsyncSession = Depends(get_db)):
    """Download symbol as PNG."""
    result = await db.execute(select(Symbol).where(Symbol.id == symbol_id))
    sym = result.scalar_one_or_none()
    if not sym:
        raise HTTPException(status_code=404, detail="Symbol not found")

    full_path = os.path.join(settings.OUTPUT_DIR, sym.png_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="PNG file not found on disk")

    return FileResponse(
        full_path,
        media_type="image/png",
        filename=f"symbol_p{sym.page_number}_{sym.symbol_number}.png"
    )


@router.get("/download/svg/{symbol_id}")
async def download_svg(symbol_id: int, db: AsyncSession = Depends(get_db)):
    """Download symbol as SVG."""
    result = await db.execute(select(Symbol).where(Symbol.id == symbol_id))
    sym = result.scalar_one_or_none()
    if not sym:
        raise HTTPException(status_code=404, detail="Symbol not found")
    if not sym.svg_path:
        raise HTTPException(status_code=404, detail="SVG not available for this symbol")

    full_path = os.path.join(settings.OUTPUT_DIR, sym.svg_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="SVG file not found on disk")

    return FileResponse(
        full_path,
        media_type="image/svg+xml",
        filename=f"symbol_p{sym.page_number}_{sym.symbol_number}.svg"
    )


@router.delete("/symbols/{symbol_id}")
async def delete_symbol(symbol_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a symbol record and its files."""
    result = await db.execute(select(Symbol).where(Symbol.id == symbol_id))
    sym = result.scalar_one_or_none()
    if not sym:
        raise HTTPException(status_code=404, detail="Symbol not found")

    # Delete files
    for path_attr in [sym.png_path, sym.svg_path]:
        if path_attr:
            full = os.path.join(settings.OUTPUT_DIR, path_attr)
            if os.path.exists(full):
                os.remove(full)

    await db.execute(delete(Symbol).where(Symbol.id == symbol_id))
    await db.commit()
    return {"message": f"Symbol {symbol_id} deleted successfully"}
