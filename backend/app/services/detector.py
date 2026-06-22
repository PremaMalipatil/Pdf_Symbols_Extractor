"""
PDF Symbol Extractor - Computer Vision Pipeline

Detects and extracts symbols from PDF pages using:
- PyMuPDF for PDF rendering
- OpenCV for image processing
- Connected components + contour hierarchy
- Adaptive thresholding + morphology
- Automatic border/frame removal
- Text region filtering
"""

import os
import io
import logging
import numpy as np
import cv2
from PIL import Image
import fitz  # PyMuPDF
from dataclasses import dataclass
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class DetectedSymbol:
    x: int
    y: int
    w: int
    h: int
    area: float
    page_number: int
    symbol_number: int
    cropped_image: np.ndarray


class SymbolDetector:
    """
    Multi-strategy symbol detector that:
    1. Renders PDF pages at high DPI
    2. Preprocesses with adaptive thresholding
    3. Removes page border/frame automatically
    4. Detects connected components
    5. Filters noise, text, and decorative elements
    6. Returns tightly-cropped symbol regions
    """

    def __init__(self):
        self.min_area = settings.MIN_SYMBOL_AREA
        self.max_area_ratio = settings.MAX_SYMBOL_AREA_RATIO
        self.border_margin = settings.BORDER_MARGIN_RATIO
        self.dpi = settings.PDF_DPI
        self.padding = settings.PADDING

    def extract_from_pdf(self, pdf_path: str) -> list[DetectedSymbol]:
        """Main entry: process all pages of a PDF."""
        all_symbols = []
        doc = fitz.open(pdf_path)

        for page_idx in range(len(doc)):
            page = doc[page_idx]
            logger.info(f"Processing page {page_idx + 1}/{len(doc)}")
            page_symbols = self._process_page(page, page_idx + 1)
            all_symbols.extend(page_symbols)

        doc.close()
        logger.info(f"Total symbols detected: {len(all_symbols)}")
        return all_symbols

    def _render_page(self, page: fitz.Page) -> np.ndarray:
        """Render PDF page to high-res numpy image."""
        zoom = self.dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_bytes = pix.tobytes("png")
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        return img

    def _preprocess(self, img: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Convert to grayscale, denoise, threshold."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)

        # Adaptive threshold → binary
        binary = cv2.adaptiveThreshold(
            denoised, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            blockSize=15,
            C=4
        )

        # Morphological cleanup
        kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel_close, iterations=1)
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel_close, iterations=1)

        return gray, binary

    def _remove_page_border(self, binary: np.ndarray, img_h: int, img_w: int) -> np.ndarray:
        """
        Automatically detect and remove decorative page borders/frames.
        Strategy: find the largest rectangular contour that spans most of the page
        and whose stroke is near the page edges — that's the border.
        """
        cleaned = binary.copy()

        # Define edge margin zone (outer 5% of each side)
        margin_x = int(img_w * 0.05)
        margin_y = int(img_h * 0.05)

        contours, hierarchy = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            area = w * h
            page_area = img_w * img_h

            # A border: very large area, starts near page edge, thin stroke
            covers_most_of_page = (w > img_w * 0.80) and (h > img_h * 0.80)
            near_edge = (x < margin_x * 2) and (y < margin_y * 2)
            fill_ratio = cv2.contourArea(cnt) / (area + 1e-6)
            is_hollow = fill_ratio < 0.15  # border is mostly hollow

            if covers_most_of_page and near_edge and is_hollow:
                logger.debug(f"Removing page border: x={x} y={y} w={w} h={h}")
                # Draw over with black on the mask (erasing border pixels)
                cv2.drawContours(cleaned, [cnt], -1, 0, thickness=12)
                break

        # Also blank out hard edge margins (catches hairline borders missed above)
        cleaned[:margin_y, :] = 0
        cleaned[-margin_y:, :] = 0
        cleaned[:, :margin_x] = 0
        cleaned[:, -margin_x:] = 0

        return cleaned

    def _is_text_region(self, region: np.ndarray, w: int, h: int) -> bool:
        """
        Heuristic: text regions have many small, horizontally-aligned components.
        Symbols tend to be more compact and have fewer, larger blobs.
        """
        aspect = w / (h + 1e-6)

        # Very wide and short → likely a text label row
        if aspect > 5.0 and h < 60:
            return True

        # Count horizontal runs (text has many thin horizontal strokes)
        if h < 50 and w > 150:
            return True

        # Check pixel density pattern
        gray_region = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY) if len(region.shape) == 3 else region
        _, bw = cv2.threshold(gray_region, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        num_labels, _, stats, _ = cv2.connectedComponentsWithStats(bw, connectivity=8)
        if num_labels <= 1:
            return False

        component_areas = stats[1:, cv2.CC_STAT_AREA]
        if len(component_areas) == 0:
            return False

        # Many tiny components in a wide bounding box → text
        tiny = np.sum(component_areas < 100)
        if tiny > 3 and (tiny / len(component_areas)) > 0.6 and aspect > 3:
            return True

        return False

    def _find_symbol_regions(
        self, binary: np.ndarray, original: np.ndarray, img_h: int, img_w: int
    ) -> list[tuple[int, int, int, int]]:
        """
        Strategy 1: Connected components to find blobs.
        Strategy 2: Contour hierarchy to group nested shapes.
        Returns list of (x, y, w, h) bounding boxes.
        """
        page_area = img_h * img_w
        max_area = page_area * self.max_area_ratio

        # --- Strategy 1: Connected Components ---
        # Dilate to group nearby strokes into one symbol
        kernel_dilate = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (18, 18))
        dilated = cv2.dilate(binary, kernel_dilate, iterations=2)

        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(dilated, connectivity=8)

        cc_boxes = []
        for i in range(1, num_labels):  # skip background (0)
            x = stats[i, cv2.CC_STAT_LEFT]
            y = stats[i, cv2.CC_STAT_TOP]
            w = stats[i, cv2.CC_STAT_WIDTH]
            h = stats[i, cv2.CC_STAT_HEIGHT]
            area = stats[i, cv2.CC_STAT_AREA]

            if area < self.min_area:
                continue
            if area > max_area:
                continue
            if w < 20 or h < 20:
                continue

            cc_boxes.append((x, y, w, h))

        # --- Strategy 2: Contour Hierarchy for nested shapes ---
        contours, hierarchy = cv2.findContours(binary, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        contour_boxes = []

        if hierarchy is not None:
            hierarchy = hierarchy[0]
            for i, cnt in enumerate(contours):
                x, y, w, h = cv2.boundingRect(cnt)
                area = w * h

                if area < self.min_area or area > max_area:
                    continue
                if w < 20 or h < 20:
                    continue

                # Skip top-level contours that span almost full page (border remnants)
                if w > img_w * 0.85 or h > img_h * 0.85:
                    continue

                # Prefer top-level or second-level contours (actual symbols, not micro-details)
                parent = hierarchy[i][3]
                if parent == -1 or (parent != -1 and hierarchy[parent][3] == -1):
                    contour_boxes.append((x, y, w, h))

        # Merge both strategies
        all_boxes = cc_boxes + contour_boxes
        merged = self._merge_overlapping_boxes(all_boxes)

        # Filter text regions
        valid = []
        for x, y, w, h in merged:
            # Add padding for cropping, then check
            x1 = max(0, x - self.padding)
            y1 = max(0, y - self.padding)
            x2 = min(img_w, x + w + self.padding)
            y2 = min(img_h, y + h + self.padding)
            region = original[y1:y2, x1:x2]

            if region.size == 0:
                continue
            if self._is_text_region(region, w, h):
                logger.debug(f"Skipping text region: {x},{y} {w}x{h}")
                continue

            valid.append((x, y, w, h))

        return valid

    def _merge_overlapping_boxes(
        self, boxes: list[tuple[int, int, int, int]], iou_threshold: float = 0.15
    ) -> list[tuple[int, int, int, int]]:
        """Merge boxes that significantly overlap (NMS-like)."""
        if not boxes:
            return []

        boxes = list(set(boxes))
        boxes.sort(key=lambda b: b[2] * b[3], reverse=True)
        keep = []

        while boxes:
            current = boxes.pop(0)
            cx, cy, cw, ch = current
            to_remove = []

            for other in boxes:
                ox, oy, ow, oh = other
                # Intersection
                ix1 = max(cx, ox)
                iy1 = max(cy, oy)
                ix2 = min(cx + cw, ox + ow)
                iy2 = min(cy + ch, oy + oh)

                if ix2 > ix1 and iy2 > iy1:
                    inter_area = (ix2 - ix1) * (iy2 - iy1)
                    area_current = cw * ch
                    area_other = ow * oh
                    union_area = area_current + area_other - inter_area
                    iou = inter_area / (union_area + 1e-6)
                    overlap_ratio = inter_area / min(area_current, area_other + 1e-6)

                    if iou > iou_threshold or overlap_ratio > 0.5:
                        # Merge: take union bounding box
                        nx = min(cx, ox)
                        ny = min(cy, oy)
                        nx2 = max(cx + cw, ox + ow)
                        ny2 = max(cy + ch, oy + oh)
                        current = (nx, ny, nx2 - nx, ny2 - ny)
                        cx, cy, cw, ch = current
                        to_remove.append(other)

            for r in to_remove:
                if r in boxes:
                    boxes.remove(r)

            keep.append(current)

        return keep

    def _process_page(self, page: fitz.Page, page_number: int) -> list[DetectedSymbol]:
        """Full pipeline for one PDF page."""
        img = self._render_page(page)
        img_h, img_w = img.shape[:2]

        gray, binary = self._preprocess(img)
        binary_clean = self._remove_page_border(binary, img_h, img_w)
        boxes = self._find_symbol_regions(binary_clean, img, img_h, img_w)

        # Sort top-to-bottom, left-to-right
        boxes.sort(key=lambda b: (b[1] // 100, b[0]))

        symbols = []
        for idx, (x, y, w, h) in enumerate(boxes, start=1):
            x1 = max(0, x - self.padding)
            y1 = max(0, y - self.padding)
            x2 = min(img_w, x + w + self.padding)
            y2 = min(img_h, y + h + self.padding)

            cropped = img[y1:y2, x1:x2]
            if cropped.size == 0:
                continue

            # Add white background
            final = np.full_like(cropped, 255)
            final[:cropped.shape[0], :cropped.shape[1]] = cropped

            sym = DetectedSymbol(
                x=int(x1), y=int(y1), w=int(x2 - x1), h=int(y2 - y1),
                area=float(w * h),
                page_number=int(page_number),
                symbol_number=int(idx),
                cropped_image=final,
            )
            symbols.append(sym)
            logger.info(f"Page {page_number} Symbol {idx}: bbox=({x1},{y1},{x2-x1},{y2-y1}) area={w*h}")

        return symbols
