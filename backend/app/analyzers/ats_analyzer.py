from __future__ import annotations

import re
from typing import Any

from app.analyzers.layout_analyzer import analyze_layout

_SECTION_PATTERNS = {
    "contact": re.compile(r"\b(phone|email|linkedin|github|address|contact)\b", re.IGNORECASE),
    "summary": re.compile(r"\b(summary|objective|profile|about me)\b", re.IGNORECASE),
    "experience": re.compile(r"\b(experience|employment|work history|career)\b", re.IGNORECASE),
    "education": re.compile(r"\b(education|degree|university|college|school|bachelor|master|phd)\b", re.IGNORECASE),
    "skills": re.compile(r"\b(skills|technologies|tools|competencies|expertise)\b", re.IGNORECASE),
}

_ACTION_VERBS = [
    "managed", "led", "developed", "designed", "implemented", "improved",
    "increased", "reduced", "collaborated", "coordinated", "achieved",
    "built", "created", "delivered", "optimized", "launched", "drove",
]


def analyze_ats(
    raw_text: str,
    sections: dict[str, str],
    layout_meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    issues: list[str] = []
    strengths: list[str] = []
    score = 100

    # Section presence checks
    for section_name, pattern in _SECTION_PATTERNS.items():
        if pattern.search(raw_text):
            strengths.append(f"'{section_name.capitalize()}' section detected.")
        else:
            issues.append(
                f"Missing '{section_name}' section — ATS systems expect standard headings."
            )
            score -= 8

    # Word count
    words = raw_text.split()
    word_count = len(words)
    if word_count < 200:
        issues.append("Resume is too short. Aim for at least 300 words.")
        score -= 10
    elif word_count > 1200:
        issues.append("Resume may be too long. Consider trimming to 1–2 pages.")
        score -= 5
    else:
        strengths.append("Resume length is appropriate.")

    # Action verbs
    text_lower = raw_text.lower()
    found_verbs = [v for v in _ACTION_VERBS if v in text_lower]
    if len(found_verbs) >= 3:
        strengths.append("Good use of action verbs.")
    else:
        issues.append("Add more action verbs (e.g. managed, developed, delivered).")
        score -= 5

    # Quantified achievements
    numbers = re.findall(r"\b\d[\d,.]*\s*[%+$k]?\b", raw_text)
    if len(numbers) >= 3:
        strengths.append("Quantified achievements detected — great for ATS and reviewers.")
    else:
        issues.append("Add quantified achievements (percentages, counts, dollar amounts).")
        score -= 5

    # Email presence
    if re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", raw_text):
        strengths.append("Email address detected.")
    else:
        issues.append("No email address found — include contact details.")
        score -= 8

    # Phone presence
    if re.search(r"(\+?\d[\d\s\-().]{7,}\d)", raw_text):
        strengths.append("Phone number detected.")
    else:
        issues.append("No phone number found — include contact details.")
        score -= 5

    # Blend in layout score (25 % weight)
    layout_result = analyze_layout(layout_meta)
    blended = round((max(0, score) * 0.75) + (layout_result["layout_score"] * 0.25))
    issues.extend(layout_result["layout_issues"])
    strengths.extend(layout_result["layout_strengths"])

    return {
        "ats_score": max(0, min(100, blended)),
        "issues": issues,
        "strengths": strengths,
        "layout": layout_result,
        "word_count": word_count,
    }
