from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./symbols.db"
    OUTPUT_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "output")
    UPLOAD_DIR: str = "/tmp/pdf_uploads"
    MIN_SYMBOL_AREA: int = 800
    MAX_SYMBOL_AREA_RATIO: float = 0.30  # max 30% of page area
    BORDER_MARGIN_RATIO: float = 0.03   # ignore 3% margin from edges
    PDF_DPI: int = 200
    PADDING: int = 10  # pixels of padding around cropped symbol

    class Config:
        env_file = ".env"


settings = Settings()
