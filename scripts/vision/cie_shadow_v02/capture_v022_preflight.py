#!/usr/bin/env python3
"""Pre-LLM request capture for cie-shadowset-v0.2.2 headline correction verification."""

from __future__ import annotations

import hashlib
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SHADOW = ROOT / "data/vision/report/engineering/coach_intelligence_eval/v0.2_shadow"
SAMPLES_DIR = SHADOW / "samples_v022"
CAPTURE_DIR = SHADOW / "request_capture"
PROMPT_PATH = ROOT / "scripts/vision/cie_eval_v0/prompts/cip_v0_2_2.md"
LAB_REWRITE = Path(__file__).resolve().parent / "run_lab_rewrite.py"
PAYLOAD_MODULE = Path(__file__).resolve().parent / "rewrite_payload.py"

CAPTURE_SAMPLES = [
    "CIE-SHADOW-V02-003",
    "CIE-SHADOW-V02-004",
    "CIE-SHADOW-V02-005",
    "CIE-SHADOW-V02-006",
    "CIE-SHADOW-V02-015",
]


def load_modules():
    spec_l = importlib.util.spec_from_file_location("lab_rewrite", LAB_REWRITE)
    lab = importlib.util.module_from_spec(spec_l)
    assert spec_l.loader
    spec_l.loader.exec_module(lab)
    spec_p = importlib.util.spec_from_file_location("rewrite_payload", PAYLOAD_MODULE)
    pay = importlib.util.module_from_spec(spec_p)
    assert spec_p.loader
    spec_p.loader.exec_module(pay)
    return lab, pay


def main() -> None:
    lab, pay = load_modules()
    system, prompt_path = lab.resolve_prompt("cip-v0.2.2")
    prompt_sha = hashlib.sha256(system.encode()).hexdigest()
    CAPTURE_DIR.mkdir(parents=True, exist_ok=True)

    captures = []
    checks = {
        "genericHeadlineAbsentAll": True,
        "primaryEvidenceTypePresentAll": True,
        "keyChangeTodayPresentAll": True,
        "allowedFactsPresentAll": True,
        "cip_v0_2_2_loaded": prompt_path.name == "cip_v0_2_2.md",
        "promptSha256": prompt_sha,
    }

    for sid in CAPTURE_SAMPLES:
        sample = json.loads((SAMPLES_DIR / f"{sid}.json").read_text(encoding="utf-8"))
        payload = pay.build_rewrite_payload(sample)
        user = pay.build_user_message(sample, use_rewrite_payload_contract=True)
        audit = pay.payload_serialization_audit(sample)
        cap = {
            "sampleId": sid,
            "primaryEvidenceType": sample.get("primaryEvidenceType"),
            "resolvedPromptPath": str(prompt_path.relative_to(ROOT)).replace("\\", "/"),
            "resolvedPromptVersion": "cip-v0.2.2",
            "promptSha256": prompt_sha,
            "serializedContext": payload,
            "userMessage": user,
            "payloadAudit": audit,
            "checks": {
                "genericHeadlineAbsent": audit["genericHeadlineAbsent"],
                "eventHighlightsPreserved": bool(
                    ((payload.get("fiiInput") or {}).get("matchSummary") or {}).get("eventHighlights")
                ),
            },
        }
        captures.append(cap)
        if not audit["genericHeadlineAbsent"]:
            checks["genericHeadlineAbsentAll"] = False
        if not audit.get("primaryEvidenceType"):
            checks["primaryEvidenceTypePresentAll"] = False
        if not audit.get("keyChangeToday"):
            checks["keyChangeTodayPresentAll"] = False
        if not audit.get("allowedFactsCount"):
            checks["allowedFactsPresentAll"] = False

        out = CAPTURE_DIR / f"{sid}_CIE-SHADOW-V022-RUN-001_PRE_REQUEST_CAPTURE.json"
        out.write_text(json.dumps(cap, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("captured", sid, audit["genericHeadlineAbsent"])

    report = {
        "runReference": "CIE-SHADOW-V022-RUN-001",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "datasetVersion": "cie-shadowset-v0.2.2",
        "promptVersion": "cip-v0.2.2",
        "promptSha256": prompt_sha,
        "captureSamples": CAPTURE_SAMPLES,
        "preflightChecks": checks,
        "preflightPass": all(
            checks[k]
            for k in (
                "genericHeadlineAbsentAll",
                "primaryEvidenceTypePresentAll",
                "keyChangeTodayPresentAll",
                "allowedFactsPresentAll",
                "cip_v0_2_2_loaded",
            )
        ),
        "llmCalled": False,
    }
    path = CAPTURE_DIR / "CIE-SHADOW-V022-RUN-001_PRE_GENERATION_PATH_REPORT.json"
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not report["preflightPass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
