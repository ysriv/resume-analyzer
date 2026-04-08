"""Merge this into app/analyzers/ats_analyzer.py.

Changes:
- accept optional layout_result
- blend layout findings into ATS score
"""

from app.analyzers.layout_analyzer import analyze_layout

# inside analyze_ats(...), after existing checks:
# layout_result = analyze_layout(layout_meta)
# ats_score = round((ats_score * 0.75) + (layout_result["layout_score"] * 0.25))
# issues.extend(layout_result["layout_issues"])
# strengths.extend(layout_result["layout_strengths"])
