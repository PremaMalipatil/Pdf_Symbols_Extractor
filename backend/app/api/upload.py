import os
import uuid
import shutil
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.models.schemas import UploadResponse, ProcessResponse, SymbolResponse
from app.services.extraction import extraction_service

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory job store (use Redis in production)
_jobs: dict[str, dict] = {}


def _build_symbol_url(path: str) -> str:
    return f"/output/{path}"


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF file for processing."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_id = str(uuid.uuid4())
    dest_path = os.path.join(settings.UPLOAD_DIR, f"{file_id}.pdf")

    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_size = os.path.getsize(dest_path)
    logger.info(f"Uploaded {file.filename} → {dest_path} ({file_size} bytes)")

    _jobs[file_id] = {
        "status": "uploaded",
        "filename": file.filename,
        "path": dest_path,
    }

    return UploadResponse(
        file_id=file_id,
        filename=file.filename,
        message="PDF uploaded successfully. Call POST /api/process to extract symbols.",
    )


@router.post("/process/{file_id}", response_model=ProcessResponse)
async def process_pdf(file_id: str, db: AsyncSession = Depends(get_db)):
    """Process an uploaded PDF and extract symbols."""
    if file_id not in _jobs:
        raise HTTPException(status_code=404, detail="File not found. Upload first.")

    job = _jobs[file_id]
    pdf_path = job["path"]
    source_filename = job["filename"]

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file missing from disk")

    _jobs[file_id]["status"] = "processing"

    try:
        symbols = await extraction_service.process_pdf(pdf_path, db, source_filename)
        _jobs[file_id]["status"] = "done"

        pages = set(s.page_number for s in symbols)
        responses = []
        for s in symbols:
            resp = SymbolResponse(
                id=s.id,
                page_number=s.page_number,
                symbol_number=s.symbol_number,
                bounding_box=s.bounding_box,
                area=s.area,
                source_pdf=s.source_pdf,
                png_path=s.png_path,
                svg_path=s.svg_path,
                created_at=s.created_at,
                png_url=_build_symbol_url(s.png_path) if s.png_path else None,
                svg_url=_build_symbol_url(s.svg_path) if s.svg_path else None,
            )
            responses.append(resp)

        return ProcessResponse(
            total_symbols=len(symbols),
            pages_processed=len(pages),
            symbols=responses,
            message=f"Extracted {len(symbols)} symbols from {len(pages)} page(s)",
        )

    except Exception as e:
        _jobs[file_id]["status"] = "error"
        logger.error(f"Processing failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
