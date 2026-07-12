#!/usr/bin/env python3
"""Build cie-shadowset-v0.2.2 — headline salience correction (no LLM).

Derived from v0.2.1 samples; does not mutate v0.2.1 files.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "data/vision/report/engineering/coach_intelligence_eval/v0.2_shadow/samples_v021"
OUT = ROOT / "data/vision/report/engineering/coach_intelligence_eval/v0.2_shadow/samples_v022"
DATASET_VERSION = "cie-shadowset-v0.2.2"

HEADLINE_TREATMENT = {
    "storage": "matchSummary.headline set to null (schema slot preserved)",
    "storageSummary": "matchSummary.summary set to null (generic metadata removed)",
    "rewritePayload": "headline and generic summary OMIT via rewrite_payload.py",
    "preserved": "matchSummary.eventHighlights, teamFii, playerFii, gevInput, timeWindow",
}


def transform_sample(sample: dict) -> dict:
    row = json.loads(json.dumps(sample, ensure_ascii=False))
    row["datasetVersion"] = DATASET_VERSION
    row["promptVersion"] = "cip-v0.2.2"
    row["rewritePayloadContract"] = "cie-shadow-rewrite-payload-v1"
    ms = (row.get("fiiInput") or {}).get("matchSummary")
    if isinstance(ms, dict):
        ms["headline"] = None
        ms["summary"] = None
    return row


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source dataset: {SRC}")
    OUT.mkdir(parents=True, exist_ok=True)
    paths = sorted(SRC.glob("CIE-SHADOW-V02-*.json"))
    rows = []
    for path in paths:
        sample = transform_sample(json.loads(path.read_text(encoding="utf-8")))
        rows.append(sample)
        (OUT / path.name).write_text(json.dumps(sample, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("wrote", path.name)

    pets = {}
    for r in rows:
        pets[r.get("primaryEvidenceType")] = pets.get(r.get("primaryEvidenceType"), 0) + 1

    meta = {
        "datasetVersion": DATASET_VERSION,
        "derivedFrom": "cie-shadowset-v0.2.1",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "sampleCount": len(rows),
        "headlineArchitectureCorrection": HEADLINE_TREATMENT,
        "primaryEvidenceTypeDistribution": pets,
        "note": "Generic matchSummary headline/summary nulled; rewrite payload omits non-evidence fields.",
    }
    (OUT / "_dataset_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(meta, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
