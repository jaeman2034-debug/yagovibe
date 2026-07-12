#!/usr/bin/env python3
"""Validate cie-shadowset-v0.2.2 + rewrite payload contract before LLM."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SHADOW = ROOT / "data/vision/report/engineering/coach_intelligence_eval/v0.2_shadow"
DEFAULT_SAMPLES_DIR = SHADOW / "samples_v022"
REPORT_DIR = SHADOW / "dataset_validation"
V021_VALIDATE = Path(__file__).resolve().parent / "validate_shadowset_v021.py"
PAYLOAD_MODULE = Path(__file__).resolve().parent / "rewrite_payload.py"
PROMPT_PATH = ROOT / "scripts/vision/cie_eval_v0/prompts/cip_v0_2_2.md"


def load_v021_validate():
    spec = importlib.util.spec_from_file_location("v021_val", V021_VALIDATE)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod.validate_sample, mod.corpus_checks


def load_payload():
    spec = importlib.util.spec_from_file_location("rewrite_payload", PAYLOAD_MODULE)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(mod)
    return mod


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples-dir", default=str(DEFAULT_SAMPLES_DIR))
    args = parser.parse_args()

    samples_dir = Path(args.samples_dir)
    paths = sorted(samples_dir.glob("CIE-SHADOW-V02-*.json"))
    if not paths:
        raise SystemExit(f"No samples in {samples_dir}")

    validate_sample, corpus_checks = load_v021_validate()
    payload_mod = load_payload()
    prompt_sha_before = __import__("hashlib").sha256(PROMPT_PATH.read_bytes()).hexdigest()

    samples = [json.loads(p.read_text(encoding="utf-8")) for p in paths]
    results = []
    payload_audits = []
    errors = []

    for s in samples:
        r = validate_sample(s)
        results.append(r)
        audit = payload_mod.payload_serialization_audit(s)
        payload_audits.append(audit)
        if s.get("datasetVersion") != "cie-shadowset-v0.2.2":
            errors.append(f"{s['sampleId']}: wrong datasetVersion")
        ms = (s.get("fiiInput") or {}).get("matchSummary") or {}
        if ms.get("headline") is not None:
            errors.append(f"{s['sampleId']}: headline not null in storage")
        if ms.get("summary") is not None:
            errors.append(f"{s['sampleId']}: summary not null in storage")
        if not audit["genericHeadlineAbsent"]:
            errors.append(f"{s['sampleId']}: generic headline still in rewrite payload")
        if not audit.get("keyChangeToday"):
            errors.append(f"{s['sampleId']}: keyChangeToday missing from payload")
        if not audit.get("allowedFactsCount"):
            errors.append(f"{s['sampleId']}: allowedFacts missing from payload")

    corpus = corpus_checks(results, samples)
    failed = [r for r in results if not r["pass"]]
    prompt_sha_after = __import__("hashlib").sha256(PROMPT_PATH.read_bytes()).hexdigest()

    report = {
        "datasetVersion": "cie-shadowset-v0.2.2",
        "validatedAt": datetime.now(timezone.utc).isoformat(),
        "perSamplePass": sum(1 for r in results if r["pass"]),
        "perSampleFail": len(failed),
        "corpusChecks": corpus,
        "payloadContract": payload_mod.PAYLOAD_INCLUSION_RULES,
        "payloadAudits": payload_audits,
        "headlineTreatment": {
            "storageHeadlineNull": all(
                ((s.get("fiiInput") or {}).get("matchSummary") or {}).get("headline") is None for s in samples
            ),
            "payloadGenericHeadlineAbsent": all(a["genericHeadlineAbsent"] for a in payload_audits),
        },
        "promptSha256_cip_v0_2_2": prompt_sha_before,
        "promptShaUnchanged": prompt_sha_before == prompt_sha_after,
        "contractErrors": errors,
        "overallPass": (
            len(failed) == 0
            and corpus["corpusPass"]
            and not errors
            and all(a["genericHeadlineAbsent"] for a in payload_audits)
        ),
        "productionWrites": False,
    }

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    out = REPORT_DIR / "cie-shadowset-v0.2.2_GROUNDING_VALIDATION.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"overallPass": report["overallPass"], "contractErrors": errors, "corpusPass": corpus["corpusPass"]}, ensure_ascii=False, indent=2))
    if not report["overallPass"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
