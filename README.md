# PDF Symbol Extractor

A production-ready full-stack application that automatically detects and extracts symbols, icons, and graphical elements from any PDF using computer vision.

## Features

- **Auto-detect any number of symbols** — works with 5, 16, 50, or 100+ symbols per page
- **Smart border removal** — automatically ignores decorative page frames
- **Text filtering** — skips labels, titles, and text-only regions
- **Dual format export** — PNG (raster) + SVG (vector) for every symbol
- **Modern dashboard** — search, filter by page, preview, download, delete
- **REST API** — fully documented FastAPI backend
- **Persistent storage** — SQLite with SQLAlchemy ORM

## Architecture

```
pdf-symbol-extractor/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers
│   │   ├── core/         # Config, database
│   │   ├── models/       # SQLAlchemy + Pydantic
│   │   ├── services/     # CV pipeline, extraction, SVG conversion
│   │   └── tests/        # Unit tests
│   ├── output/           # Extracted PNGs and SVGs
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API client
│   │   └── types/        # TypeScript types
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

## CV Pipeline

The symbol detection pipeline runs these steps for each PDF page:

1. **Render** — PyMuPDF renders at 200 DPI for high fidelity
2. **Preprocess** — Grayscale → Denoise (NlMeans) → Adaptive threshold → Morphological cleanup
3. **Border removal** — Finds large hollow rectangular contours near page edges and erases them; also clears a hard 3% margin
4. **Connected components** — Groups nearby ink pixels by dilating then labeling
5. **Contour hierarchy** — CCOMP hierarchy finds top-level and second-level contours (actual symbols, not micro-details)
6. **Merge overlapping boxes** — NMS-like merge using IoU + overlap ratio
7. **Text filtering** — Rejects wide+short regions with many tiny components (text rows)
8. **Size filtering** — Rejects tiny noise (< 800px area) and giant regions (> 30% of page)
9. **Crop + pad** — 10px padding, white background
10. **SVG conversion** — Contour tracing with `approxPolyDP` → SVG path elements

## Quick Start

### Docker (recommended)

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Local Development

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/upload` | Upload a PDF file |
| POST | `/api/process/{file_id}` | Run symbol extraction |
| GET | `/api/symbols` | List all symbols |
| GET | `/api/symbols/{id}` | Get symbol by ID |
| GET | `/api/download/png/{id}` | Download PNG |
| GET | `/api/download/svg/{id}` | Download SVG |
| DELETE | `/api/symbols/{id}` | Delete symbol |

### Example Workflow

```bash
# 1. Upload PDF
curl -X POST http://localhost:8000/api/upload \
  -F "file=@your_diagram.pdf"
# → { "file_id": "abc-123", ... }

# 2. Process
curl -X POST http://localhost:8000/api/process/abc-123

# 3. List results
curl http://localhost:8000/api/symbols
```

## Running Tests

```bash
cd backend
pytest app/tests/ -v
```

## Configuration

Set via environment variables or `.env` file:

| Variable | Default | Description |
|----------|---------|-------------|
| `PDF_DPI` | 200 | Render resolution |
| `MIN_SYMBOL_AREA` | 800 | Minimum pixel area for a symbol |
| `MAX_SYMBOL_AREA_RATIO` | 0.30 | Max fraction of page area |
| `BORDER_MARGIN_RATIO` | 0.03 | Edge margin to blank out |
| `PADDING` | 10 | Crop padding in pixels |

## Output Structure

```
output/
├── page_1/
│   ├── symbol_1.png
│   ├── symbol_1.svg
│   ├── symbol_2.png
│   ├── symbol_2.svg
│   └── ...
└── page_2/
    └── ...
```

## Tech Stack

**Backend:** Python · FastAPI · OpenCV · PyMuPDF · SQLAlchemy · SQLite · Pydantic  
**Frontend:** React · Vite · TypeScript · TailwindCSS · Axios · react-dropzone
