"""
Orchestrates PDF → Detection → Save PNG → Convert SVG → Store DB
"""

import os
import logging
import uuid
import cv2
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.config import settings
from app.models.symbol import Symbol
from app.models.schemas import SymbolCreate
from app.services.detector import SymbolDetector, DetectedSymbol
from app.services.converter import png_to_svg

logger = logging.getLogger(__name__)


class ExtractionService:
    def __init__(self):
        self.detector = SymbolDetector()

    async def process_pdf(self, pdf_path: str, db: AsyncSession, source_filename: str) -> list[Symbol]:
        """Full pipeline: detect → save → convert → store."""
        # Clear existing symbols for this PDF
        await db.execute(delete(Symbol).where(Symbol.source_pdf == source_filename))
        await db.commit()

        detected = self.detector.extract_from_pdf(pdf_path)

        if not detected:
            logger.warning("No symbols detected in PDF")
            return []

        saved_symbols = []
        for sym in detected:
            try:
                db_sym = await self._save_symbol(sym, db, source_filename)
                if db_sym:
                    saved_symbols.append(db_sym)
            except Exception as e:
                logger.error(f"Failed to save symbol {sym.symbol_number}: {e}")
                await db.rollback()  # reset session state so next symbol can proceed

        await db.commit()
        return saved_symbols

    async def _save_symbol(self, sym: DetectedSymbol, db: AsyncSession, source_filename: str) -> Symbol:
        """Save PNG, convert SVG, write to DB."""
        # Build output paths
        page_dir = os.path.join(settings.OUTPUT_DIR, f"page_{sym.page_number}")
        os.makedirs(page_dir, exist_ok=True)

        png_filename = f"symbol_{sym.symbol_number}.png"
        svg_filename = f"symbol_{sym.symbol_number}.svg"

        png_path = os.path.join(page_dir, png_filename)
        svg_path = os.path.join(page_dir, svg_filename)

        # Save PNG (white background)
        success = cv2.imwrite(png_path, sym.cropped_image)
        if not success:
            logger.error(f"Failed to write PNG: {png_path}")
            return None

        # Convert to SVG
        svg_ok = png_to_svg(png_path, svg_path)
        if not svg_ok:
            svg_path = None

        # Relative paths for URL serving
        png_rel = os.path.relpath(png_path, settings.OUTPUT_DIR)
        svg_rel = os.path.relpath(svg_path, settings.OUTPUT_DIR) if svg_path else None

        db_sym = Symbol(
            page_number=int(sym.page_number),
            symbol_number=int(sym.symbol_number),
            png_path=png_rel,
            svg_path=svg_rel,
            bounding_box={"x": int(sym.x), "y": int(sym.y), "w": int(sym.w), "h": int(sym.h)},
            area=float(sym.area),
            source_pdf=source_filename,
        )
        db.add(db_sym)
        await db.flush()
        return db_sym


extraction_service = ExtractionService()
