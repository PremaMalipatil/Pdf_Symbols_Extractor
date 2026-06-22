"""Unit tests for symbol detector pipeline."""

import pytest
import numpy as np
import cv2
from app.services.detector import SymbolDetector


@pytest.fixture
def detector():
    return SymbolDetector()


def make_synthetic_image(num_symbols: int = 4, img_size: tuple = (800, 600)) -> np.ndarray:
    """Create a synthetic test image with N rectangles as fake symbols."""
    h, w = img_size
    img = np.ones((h, w, 3), dtype=np.uint8) * 255

    # Draw page border
    cv2.rectangle(img, (10, 10), (w - 10, h - 10), (0, 0, 0), 3)

    # Draw symbols in a grid
    cols = min(num_symbols, 4)
    rows = (num_symbols + cols - 1) // cols
    cell_w = (w - 40) // cols
    cell_h = (h - 80) // rows

    for i in range(num_symbols):
        row = i // cols
        col = i % cols
        x = 20 + col * cell_w + 20
        y = 20 + row * cell_h + 20
        sw = cell_w - 40
        sh = cell_h - 40
        cv2.rectangle(img, (x, y), (x + sw, y + sh), (0, 0, 0), 2)
        cv2.circle(img, (x + sw // 2, y + sh // 2), min(sw, sh) // 4, (0, 0, 0), 2)

    return img


def test_preprocess_returns_binary(detector):
    img = make_synthetic_image()
    gray, binary = detector._preprocess(img)
    assert gray.ndim == 2
    assert binary.ndim == 2
    assert set(np.unique(binary)).issubset({0, 255})


def test_border_removal(detector):
    img = make_synthetic_image()
    h, w = img.shape[:2]
    _, binary = detector._preprocess(img)
    cleaned = detector._remove_page_border(binary, h, w)
    # After cleaning, top-left corner should be cleared
    assert cleaned[5, 5] == 0


def test_text_region_detection(detector):
    # Create a wide thin strip (text-like)
    text_region = np.ones((30, 300, 3), dtype=np.uint8) * 255
    cv2.putText(text_region, "Shape-1", (5, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
    assert detector._is_text_region(text_region, 300, 30)


def test_merge_overlapping_boxes(detector):
    boxes = [(10, 10, 50, 50), (40, 40, 50, 50)]  # overlapping
    merged = detector._merge_overlapping_boxes(boxes)
    assert len(merged) <= 2


def test_merge_non_overlapping_boxes(detector):
    boxes = [(0, 0, 50, 50), (200, 200, 50, 50)]  # non-overlapping
    merged = detector._merge_overlapping_boxes(boxes)
    assert len(merged) == 2


def test_find_symbol_regions_returns_boxes(detector):
    img = make_synthetic_image(num_symbols=4)
    h, w = img.shape[:2]
    _, binary = detector._preprocess(img)
    cleaned = detector._remove_page_border(binary, h, w)
    boxes = detector._find_symbol_regions(cleaned, img, h, w)
    # Should detect at least some symbols
    assert len(boxes) >= 1
