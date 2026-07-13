#!/usr/bin/env python3
"""Validate HITL feedback JSONL rows against Learning Loop V1 schema."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCHEMA_PATH = (
    ROOT
    / "data/vision/report/engineering/coach_intelligence_eval/learning_loop_v1/hitl_feedback/SCHEMA.json"
)

REQUIRED = [
    "feedbackId",
    "runId",
    "sampleId",
    "datasetVersion",
    "promptVersion",
    "evaluatorVersion",
    "reviewerAlias",
    "reviewStatus",
    "decision",
    "acceptedClaims",
    "rejectedClaims",
    "failureTypes",
    "usefulnessScore",
    "actionabilityScore",
    "groundingScore",
    "reviewNote",
    "reviewedAt",
]
DECISIONS = frozenset({"ACCEPT", "REJECT", "REVISE", "ABSTAIN"})
REVIEW_STATUS = frozenset({"pending", "unreviewed", "complete"})
SAMPLE_ID = re.compile(r"^CIE-SHADOW-V02-[0-9]{3}$")
FAILURE_CODE = re.compile(r"^F[0-9]{2}_")
PII_BLOCK = re.compile(r"@|전화|휴대|주민|실명|E2-PV-", re.I)
# HITL human scores use 1–5 (PM Learning Loop V1). Unreviewed placeholders may be 0.
SCORE_MIN = 0
SCORE_MAX = 5


def validate_row(row: dict, line_no: int) -> list[str]:
    errors: list[str] = []
    for key in REQUIRED:
        if key not in row:
            errors.append(f"line {line_no}: missing {key}")
    if errors:
        return errors

    if row["decision"] not in DECISIONS:
        errors.append(f"line {line_no}: invalid decision {row['decision']}")
    if row["reviewStatus"] not in REVIEW_STATUS:
        errors.append(f"line {line_no}: invalid reviewStatus {row['reviewStatus']}")
    if not SAMPLE_ID.match(row["sampleId"]):
        errors.append(f"line {line_no}: invalid sampleId {row['sampleId']}")

    for score_key in ("usefulnessScore", "actionabilityScore", "groundingScore"):
        v = row[score_key]
        if not isinstance(v, int) or v < SCORE_MIN or v > SCORE_MAX:
            errors.append(f"line {line_no}: {score_key} must be int {SCORE_MIN}-{SCORE_MAX}")
        if row.get("reviewStatus") == "complete" and (not isinstance(v, int) or v < 1 or v > 5):
            errors.append(f"line {line_no}: complete review requires {score_key} in 1-5")

    for arr_key in ("acceptedClaims", "rejectedClaims", "failureTypes"):
        if not isinstance(row[arr_key], list):
            errors.append(f"line {line_no}: {arr_key} must be array")
        elif arr_key == "failureTypes":
            for code in row[arr_key]:
                if not isinstance(code, str) or not FAILURE_CODE.match(code):
                    errors.append(f"line {line_no}: invalid failureType {code}")

    if row.get("reviewedAt") is not None and not isinstance(row.get("reviewedAt"), str):
        errors.append(f"line {line_no}: reviewedAt must be string or null")

    blob = json.dumps(row, ensure_ascii=False)
    if PII_BLOCK.search(blob):
        errors.append(f"line {line_no}: possible PII / Official Fact leak in feedback")

    return errors


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("jsonl_path", nargs="+")
    args = parser.parse_args()

    all_errors: list[str] = []
    total = 0
    for fp in args.jsonl_path:
        path = Path(fp)
        if not path.exists():
            all_errors.append(f"missing file: {path}")
            continue
        for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            if not line.strip():
                continue
            total += 1
            try:
                row = json.loads(line)
            except json.JSONDecodeError as e:
                all_errors.append(f"{path.name}:{i}: JSON error {e}")
                continue
            if not isinstance(row, dict):
                all_errors.append(f"{path.name}:{i}: row must be object")
                continue
            all_errors.extend(validate_row(row, i))

    result = {"rowsValidated": total, "pass": len(all_errors) == 0, "errors": all_errors}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if all_errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
