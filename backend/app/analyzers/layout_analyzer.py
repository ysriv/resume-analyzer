from __future__ import annotations

import re
from typing import Any


def analyze_layout(layout_meta: dict[str, Any] | None) -> dict[str, Any]:
    if not layout_meta:
        return {
            "layout_score": 100,
            "layout_issues": [],
            "layout_strengths": [],
            "layout_flags": {},
        }

    issues: list[str] = []
    strengths: list[str] = []
    score = 100

    pages = layout_meta.get("pages", 0)
    image_blocks = layout_meta.get("image_blocks", 0)
    text_blocks = max(1, layout_meta.get("text_blocks", 1))
    narrow_block_ratio = layout_meta.get("narrow_block_ratio", 0.0)
    right_left_balance = layout_meta.get("right_left_balance", 0.0)
    very_short_lines = layout_meta.get("very_short_lines", 0)
    total_lines = max(1, layout_meta.get("total_lines", 1))
    tables_hint = layout_meta.get("tables_hint", 0)
    header_footer_repeats = layout_meta.get("header_footer_repeats", 0)

    if pages > 2:
        issues.append("Resume appears longer than two pages; consider trimming less relevant content.")
        score -= 6
    else:
        strengths.append("Resume length appears reasonable.")

    if image_blocks > 0:
        issues.append("Images or graphic blocks detected; ATS systems may ignore image-based content.")
        score -= min(12, image_blocks * 3)

    if narrow_block_ratio > 0.35 and right_left_balance > 0.18:
        issues.append("Document layout appears multi-column, which can reduce ATS parsing reliability.")
        score -= 14
    else:
        strengths.append("Layout appears mostly single-column and ATS-friendly.")

    if tables_hint > 0:
        issues.append("Table-like layout detected; some ATS parsers struggle with tables.")
        score -= min(10, tables_hint * 2)

    if (very_short_lines / total_lines) > 0.30:
        issues.append("Many short fragmented lines detected, which can indicate a complex or broken layout.")
        score -= 8

    if header_footer_repeats > 0:
        issues.append("Repeated header/footer text detected; ensure important details are not only in headers or footers.")
        score -= 5

    return {
        "layout_score": max(0, min(100, score)),
        "layout_issues": issues,
        "layout_strengths": strengths,
        "layout_flags": {
            "pages": pages,
            "image_blocks": image_blocks,
            "narrow_block_ratio": round(narrow_block_ratio, 3),
            "right_left_balance": round(right_left_balance, 3),
            "tables_hint": tables_hint,
            "header_footer_repeats": header_footer_repeats,
        },
    }
