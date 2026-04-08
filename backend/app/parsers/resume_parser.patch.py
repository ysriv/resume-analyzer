"""Merge this into app/parsers/resume_parser.py.

Changes:
- Add extract_text_with_layout() returning (raw_text, layout_meta)
- Collect page/block geometry from PyMuPDF for PDFs
"""

import io
import fitz
from docx import Document
from app.utils.text_utils import normalize_text


def extract_text(filename: str, file_bytes: bytes) -> str:
    text, _layout = extract_text_with_layout(filename, file_bytes)
    return text


def extract_text_with_layout(filename: str, file_bytes: bytes) -> tuple[str, dict]:
    filename_lower = filename.lower()
    if filename_lower.endswith(".pdf"):
        return extract_pdf_with_layout(file_bytes)
    if filename_lower.endswith(".docx"):
        return extract_docx(file_bytes), {}
    raise ValueError("Unsupported file type. Please upload a PDF or DOCX file.")


def extract_pdf_with_layout(file_bytes: bytes) -> tuple[str, dict]:
    text_parts = []
    pages = 0
    image_blocks = 0
    text_blocks = 0
    narrow_blocks = 0
    left_blocks = 0
    right_blocks = 0
    very_short_lines = 0
    total_lines = 0
    tables_hint = 0
    header_footer_repeats = 0
    top_lines = {}
    bottom_lines = {}

    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        pages = len(doc)
        for page in doc:
            page_text = page.get_text()
            text_parts.append(page_text)
            blocks = page.get_text("dict").get("blocks", [])
            width = page.rect.width or 1
            height = page.rect.height or 1
            for block in blocks:
                btype = block.get("type", 0)
                bbox = block.get("bbox", [0, 0, 0, 0])
                x0, y0, x1, y1 = bbox
                bw = max(1, x1 - x0)
                if btype == 1:
                    image_blocks += 1
                    continue
                text_blocks += 1
                if bw < width * 0.42:
                    narrow_blocks += 1
                mid = (x0 + x1) / 2
                if mid < width * 0.5:
                    left_blocks += 1
                else:
                    right_blocks += 1
                lines = block.get("lines", [])
                if len(lines) >= 4:
                    spans_per_line = [len(line.get("spans", [])) for line in lines]
                    if sum(1 for n in spans_per_line if n <= 2) >= max(3, len(lines) // 2):
                        tables_hint += 1
                if lines:
                    top_txt = " ".join(
                        span.get("text", "")
                        for span in lines[0].get("spans", [])
                    ).strip()
                    bot_txt = " ".join(
                        span.get("text", "")
                        for span in lines[-1].get("spans", [])
                    ).strip()
                    if y0 < height * 0.08 and top_txt:
                        top_lines[top_txt] = top_lines.get(top_txt, 0) + 1
                    if y1 > height * 0.92 and bot_txt:
                        bottom_lines[bot_txt] = bottom_lines.get(bot_txt, 0) + 1
                for line in lines:
                    line_text = " ".join(span.get("text", "") for span in line.get("spans", [])).strip()
                    if not line_text:
                        continue
                    total_lines += 1
                    if len(line_text.split()) <= 3:
                        very_short_lines += 1
    header_footer_repeats = sum(1 for _, c in {**top_lines, **bottom_lines}.items() if c >= 2)
    layout = {
        "pages": pages,
        "image_blocks": image_blocks,
        "text_blocks": text_blocks,
        "narrow_block_ratio": (narrow_blocks / text_blocks) if text_blocks else 0.0,
        "right_left_balance": abs(left_blocks - right_blocks) / text_blocks if text_blocks else 0.0,
        "very_short_lines": very_short_lines,
        "total_lines": total_lines,
        "tables_hint": tables_hint,
        "header_footer_repeats": header_footer_repeats,
    }
    return normalize_text("\n".join(text_parts)), layout


def extract_docx(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return normalize_text("\n".join(paragraphs))
