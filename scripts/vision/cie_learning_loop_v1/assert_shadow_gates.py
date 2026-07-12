#!/usr/bin/env python3
"""Assert locked Hard + Quality gate thresholds for CIE Shadow learning loop.

Threshold changes forbidden without PM GO.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SHADOW = ROOT / "data/vision/report/engineering/coach_intelligence_eval/v0.2_shadow"

HEADLINE_FAMILY = re.compile(r"섀도\s*세션\s*요약", re.I)
HITL_TAIL = re.compile(
    r"(제안입니다\.?\s*)?최종\s*적용은\s*코치님이\s*결정해\s*주세요\.?\s*$"
)

# LOCKED — do not change without PM GO
HARD_RULES = {
    "generationRate": 1.0,
    "executionRate": 1.0,
    "hardFailCount": 0,
}

QUALITY_RULES = {
    "meanQ01Min": 1.50,
    "meanQ02Min": 1.50,
    "meanQ03Min": 1.50,
    "meanQ04Min": 1.50,
    "uniqueOpeningRatioMin": 0.50,
    "uniqueClosingRatioMin": 0.50,
    "repeatedSentenceRatioMax": 0.20,
    "lowQualitySampleCountMax": 5,
    "genericHeadlineOpeningCountMax": 0,
    "dominantOpeningFamilyRatioMax": 0.50,
}


def _normalize_opening(text: str, n: int = 28) -> str:
    t = text.strip().lower()
    t = re.sub(r"\d+(?:\.\d+)?", "<NUM>", t)
    t = re.sub(r"\s+", " ", t)
    t = HITL_TAIL.sub("<HITL>", t)
    return t[:n]


def first_sentence(text: str) -> str:
    parts = re.split(r"[.!?]\s+", text.strip())
    return parts[0] if parts else text.strip()


def compute_opening_metrics(generations_dir: Path) -> dict:
    opens = []
    headline_count = 0
    for gp in sorted(generations_dir.glob("CIE-SHADOW-V02-*.json")):
        gen = json.loads(gp.read_text(encoding="utf-8"))
        text = (gen.get("rewriteText") or "").strip()
        opens.append(_normalize_opening(text))
        if HEADLINE_FAMILY.search(first_sentence(text)):
            headline_count += 1
    total = len(opens) or 1
    counts = Counter(opens)
    top_pat, top_cnt = counts.most_common(1)[0] if counts else ("", 0)
    return {
        "genericHeadlineOpeningCount": headline_count,
        "dominantOpeningFamily": top_pat,
        "dominantOpeningFamilyCount": top_cnt,
        "dominantOpeningFamilyRatio": round(top_cnt / total, 4),
        "sampleCount": len(opens),
    }


def assert_hard_gate(hard_summary: dict) -> tuple[bool, list[str]]:
    violations: list[str] = []
    gen_rate = hard_summary.get("generationRate")
    if gen_rate is None:
        requested = hard_summary.get("requested") or hard_summary.get("totalSamples")
        generated = hard_summary.get("generated") or hard_summary.get("executed")
        if requested and generated is not None:
            gen_rate = generated / requested
    exec_rate = hard_summary.get("executionRate")
    hard_fail = hard_summary.get("actualFail")
    if hard_fail is None:
        hard_fail = hard_summary.get("hardFailCount")
    if hard_fail is None:
        hard_fail = hard_summary.get("failureIncidenceRate", 0) * (hard_summary.get("totalSamples") or 20)

    if gen_rate != HARD_RULES["generationRate"]:
        violations.append(f"generationRate {gen_rate} != {HARD_RULES['generationRate']}")
    if exec_rate != HARD_RULES["executionRate"]:
        violations.append(f"executionRate {exec_rate} != {HARD_RULES['executionRate']}")
    if int(hard_fail or 0) != HARD_RULES["hardFailCount"]:
        violations.append(f"hardFailCount {hard_fail} != {HARD_RULES['hardFailCount']}")
    return len(violations) == 0, violations


def assert_quality_gate(quality_summary: dict, opening_metrics: dict | None = None) -> tuple[bool, list[str]]:
    violations: list[str] = []
    means = quality_summary.get("meanScores") or {}
    div = quality_summary.get("diversity") or {}
    low_q = quality_summary.get("lowQualitySampleCount")
    if low_q is None:
        low_q = len(quality_summary.get("lowTotalQ01Q04_le4") or [])

    checks = [
        ("meanQ01", means.get("Q01"), QUALITY_RULES["meanQ01Min"], "min"),
        ("meanQ02", means.get("Q02"), QUALITY_RULES["meanQ02Min"], "min"),
        ("meanQ03", means.get("Q03"), QUALITY_RULES["meanQ03Min"], "min"),
        ("meanQ04", means.get("Q04"), QUALITY_RULES["meanQ04Min"], "min"),
        ("uniqueOpeningRatio", div.get("uniqueOpeningRatio"), QUALITY_RULES["uniqueOpeningRatioMin"], "min"),
        ("uniqueClosingRatio", div.get("uniqueClosingRatio"), QUALITY_RULES["uniqueClosingRatioMin"], "min"),
        ("repeatedSentenceRatio", div.get("repeatedSentenceRatio"), QUALITY_RULES["repeatedSentenceRatioMax"], "max"),
        ("lowQualitySampleCount", low_q, QUALITY_RULES["lowQualitySampleCountMax"], "max"),
    ]
    for name, val, bound, kind in checks:
        if val is None:
            violations.append(f"{name} missing")
            continue
        if kind == "min" and val < bound:
            violations.append(f"{name} {val} < {bound}")
        if kind == "max" and val > bound:
            violations.append(f"{name} {val} > {bound}")

    if opening_metrics:
        gh = opening_metrics.get("genericHeadlineOpeningCount", 0)
        if gh > QUALITY_RULES["genericHeadlineOpeningCountMax"]:
            violations.append(
                f"genericHeadlineOpeningCount {gh} > {QUALITY_RULES['genericHeadlineOpeningCountMax']}"
            )
        dom = opening_metrics.get("dominantOpeningFamilyRatio", 1.0)
        if dom > QUALITY_RULES["dominantOpeningFamilyRatioMax"]:
            violations.append(
                f"dominantOpeningFamilyRatio {dom} > {QUALITY_RULES['dominantOpeningFamilyRatioMax']}"
            )
    return len(violations) == 0, violations


def assert_all(
    hard_summary: dict,
    quality_summary: dict,
    *,
    generations_dir: Path | None = None,
) -> dict:
    opening_metrics = compute_opening_metrics(generations_dir) if generations_dir and generations_dir.exists() else None
    hard_ok, hard_v = assert_hard_gate(hard_summary)
    qual_ok, qual_v = assert_quality_gate(quality_summary, opening_metrics)
    return {
        "hardGatePass": hard_ok,
        "qualityGatePass": qual_ok,
        "hardViolations": hard_v,
        "qualityViolations": qual_v,
        "openingMetrics": opening_metrics,
        "thresholdsLocked": True,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--hard-summary", required=True)
    parser.add_argument("--quality-summary", required=True)
    parser.add_argument("--generations-dir", default=None)
    args = parser.parse_args()

    hard = json.loads(Path(args.hard_summary).read_text(encoding="utf-8"))
    qual = json.loads(Path(args.quality_summary).read_text(encoding="utf-8"))
    gen_dir = Path(args.generations_dir) if args.generations_dir else None
    result = assert_all(hard, qual, generations_dir=gen_dir)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if not result["hardGatePass"] or not result["qualityGatePass"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
