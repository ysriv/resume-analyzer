from __future__ import annotations

import re

from app.analyzers.ats_analyzer import analyze_ats
from app.parsers.resume_parser import extract_text_with_layout

_SECTION_HEADERS = [
    "summary", "objective", "profile", "experience", "employment",
    "education", "skills", "projects", "certifications", "awards",
    "publications", "languages", "interests", "references", "contact",
]

_HEADER_RE = re.compile(
    r"^(?:[A-Z][A-Z\s&/,\-]{2,}|" + "|".join(_SECTION_HEADERS) + r")[\s:]*$",
    re.IGNORECASE,
)

_KNOWN_SECTIONS = {
    "contact", "summary", "objective", "profile", "skills",
    "experience", "employment", "education", "projects",
    "certifications", "awards", "other",
}


def _parse_sections(raw_text: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    current = "other"
    buffer: list[str] = []

    for line in raw_text.split("\n"):
        stripped = line.strip()
        if not stripped:
            buffer.append("")
            continue
        if _HEADER_RE.match(stripped) and len(stripped) < 60:
            sections[current] = "\n".join(buffer).strip()
            key = stripped.lower().split()[0]
            current = key if key in _KNOWN_SECTIONS else "other"
            buffer = []
        else:
            buffer.append(stripped)

    sections[current] = "\n".join(buffer).strip()
    return sections


def _jd_match(raw_text: str, job_description: str) -> dict:
    jd_words = set(re.findall(r"\b[a-zA-Z]{3,}\b", job_description.lower()))
    resume_words = set(re.findall(r"\b[a-zA-Z]{3,}\b", raw_text.lower()))

    stopwords = {
        "the", "and", "for", "with", "that", "this", "are", "you", "will",
        "have", "from", "our", "all", "can", "not", "but", "was", "they",
        "also", "your", "its", "has", "been", "their", "more", "who", "into",
    }
    jd_keywords = jd_words - stopwords
    matched = sorted(jd_keywords & resume_words)
    missing = sorted(jd_keywords - resume_words)

    if jd_keywords:
        match_score = round(len(matched) / len(jd_keywords) * 100)
        semantic_similarity = round(match_score / 100, 2)
    else:
        match_score = 0
        semantic_similarity = 0.0

    return {
        "match_score": match_score,
        "matched_keywords": matched[:25],
        "missing_keywords": missing[:25],
        "semantic_similarity": semantic_similarity,
    }


def _build_suggestions(ats_result: dict, sections: dict[str, str]) -> list[str]:
    suggestions: list[str] = []
    for issue in ats_result.get("issues", []):
        suggestions.append(f"Fix: {issue}")
    if not sections.get("summary"):
        suggestions.append("Add a professional summary section at the top of your resume.")
    if not sections.get("skills"):
        suggestions.append("Add a dedicated skills section listing your technical competencies.")
    return suggestions[:10]


def _estimate_content_score(raw_text: str) -> int:
    score = 60
    if re.search(r"\b(python|java|sql|javascript|typescript|react|node|aws|docker|kubernetes)\b", raw_text, re.IGNORECASE):
        score += 15
    if re.search(r"\b(project|built|developed|deployed|designed|implemented)\b", raw_text, re.IGNORECASE):
        score += 10
    if len(raw_text.split()) > 300:
        score += 10
    return min(100, score)


def _estimate_impact_score(raw_text: str) -> int:
    numbers = re.findall(r"\b\d[\d,.]*\s*[%+$k]?\b", raw_text)
    score = min(100, 60 + len(numbers) * 5)
    return score


def _estimate_grammar_score(raw_text: str) -> int:
    issues = 0
    if re.search(r"\b(i am|i have|i worked)\b", raw_text, re.IGNORECASE):
        issues += 2
    if re.search(r"[.!?]{2,}", raw_text):
        issues += 1
    return max(60, 100 - issues * 8)


def analyze_resume(filename: str, file_bytes: bytes, job_description: str = "") -> dict:
    raw_text, layout_meta = extract_text_with_layout(filename, file_bytes)
    sections = _parse_sections(raw_text)
    ats_result = analyze_ats(raw_text, sections, layout_meta)

    content_score = _estimate_content_score(raw_text)
    impact_score = _estimate_impact_score(raw_text)
    grammar_score = _estimate_grammar_score(raw_text)
    ats_score = ats_result["ats_score"]

    jd_match = _jd_match(raw_text, job_description) if job_description.strip() else None

    jd_bonus = jd_match["match_score"] if jd_match else ats_score
    overall_score = round(
        ats_score * 0.25
        + content_score * 0.20
        + impact_score * 0.15
        + jd_bonus * 0.20
        + grammar_score * 0.10
        + min(100, ats_score) * 0.10
    )

    suggestions = _build_suggestions(ats_result, sections)

    parsed_sections = {
        "contact": sections.get("contact", ""),
        "summary": sections.get("summary", sections.get("objective", sections.get("profile", ""))),
        "skills": sections.get("skills", ""),
        "experience": sections.get("experience", sections.get("employment", "")),
        "education": sections.get("education", ""),
        "projects": sections.get("projects", ""),
        "certifications": sections.get("certifications", ""),
        "other": sections.get("other", ""),
    }

    return {
        "filename": filename,
        "overall_score": min(100, overall_score),
        "ats_analysis": {
            "ats_score": ats_score,
            "content_score": content_score,
            "impact_score": impact_score,
            "grammar_score": grammar_score,
            "issues": ats_result.get("issues", []),
            "strengths": ats_result.get("strengths", []),
        },
        "jd_match": jd_match,
        "parsed_sections": parsed_sections,
        "suggestions": suggestions,
        "rewritten_summary": None,
    }
