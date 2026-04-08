"""Merge this into app/services/analysis_service.py.

Changes:
- call extract_text_with_layout()
- pass layout_meta into analyze_ats()
"""

from app.parsers.resume_parser import extract_text_with_layout

# replace:
# raw_text = extract_text(filename, file_bytes)
# with:
# raw_text, layout_meta = extract_text_with_layout(filename, file_bytes)
# sections = parse_sections(raw_text)
# ats_result = analyze_ats(raw_text, sections, layout_meta)
