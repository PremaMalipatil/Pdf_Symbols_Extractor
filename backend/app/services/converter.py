"""
PNG to SVG conversion using bitmap tracing.
Uses OpenCV contour tracing to generate clean SVG paths.
"""

import os
import logging
import numpy as np
import cv2

logger = logging.getLogger(__name__)


def png_to_svg(png_path: str, svg_path: str) -> bool:
    """
    Convert a PNG symbol image to SVG using contour-based vectorization.
    Returns True on success, False on failure.
    """
    try:
        img = cv2.imread(png_path)
        if img is None:
            logger.error(f"Could not read PNG: {png_path}")
            return False

        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Threshold
        _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

        # Morphological cleanup
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

        # Find contours
        contours, hierarchy = cv2.findContours(binary, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_L1)

        if not contours:
            logger.warning(f"No contours found for {png_path}, creating fallback SVG")
            _write_fallback_svg(png_path, svg_path, w, h)
            return True

        # Build SVG
        svg_paths = _contours_to_svg_paths(contours, hierarchy)
        svg_content = _build_svg(svg_paths, w, h)

        os.makedirs(os.path.dirname(svg_path), exist_ok=True)
        with open(svg_path, "w") as f:
            f.write(svg_content)

        logger.info(f"SVG saved: {svg_path}")
        return True

    except Exception as e:
        logger.error(f"SVG conversion failed for {png_path}: {e}")
        _write_fallback_svg(png_path, svg_path, 100, 100)
        return False


def _contours_to_svg_paths(contours, hierarchy) -> list[str]:
    """Convert OpenCV contours to SVG path data strings."""
    paths = []

    if hierarchy is None:
        return paths

    hierarchy = hierarchy[0]

    for i, cnt in enumerate(contours):
        if len(cnt) < 3:
            continue

        # Approximate to reduce path complexity
        epsilon = 0.5
        approx = cv2.approxPolyDP(cnt, epsilon, True)

        if len(approx) < 2:
            continue

        # Build path string
        pts = approx.reshape(-1, 2)
        path_data = f"M {pts[0][0]} {pts[0][1]}"

        for pt in pts[1:]:
            path_data += f" L {pt[0]} {pt[1]}"

        path_data += " Z"

        # Determine fill rule based on hierarchy (holes = evenodd)
        parent = hierarchy[i][3]
        fill = "none" if parent != -1 else "none"
        stroke_color = "#1a1a1a"

        paths.append(f'<path d="{path_data}" fill="{fill}" stroke="{stroke_color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>')

    return paths


def _build_svg(paths: list[str], w: int, h: int) -> str:
    paths_str = "\n  ".join(paths)
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">
  <rect width="{w}" height="{h}" fill="white"/>
  {paths_str}
</svg>'''


def _write_fallback_svg(png_path: str, svg_path: str, w: int, h: int):
    """Fallback: embed the PNG as a base64 image in SVG."""
    import base64
    try:
        with open(png_path, "rb") as f:
            data = base64.b64encode(f.read()).decode()
        svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {w} {h}" width="{w}" height="{h}">
  <image xlink:href="data:image/png;base64,{data}" x="0" y="0" width="{w}" height="{h}"/>
</svg>'''
        os.makedirs(os.path.dirname(svg_path), exist_ok=True)
        with open(svg_path, "w") as f:
            f.write(svg)
    except Exception as e:
        logger.error(f"Fallback SVG failed: {e}")
