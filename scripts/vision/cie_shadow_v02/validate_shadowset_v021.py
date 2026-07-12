#!/usr/bin/env python3
"""Validate cie-shadowset-v0.2.1 grounding before any LLM generation."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SHADOW = ROOT / "data/vision/report/engineering/coach_intelligence_eval/v0.2_shadow"
DEFAULT_SAMPLES_DIR = SHADOW / "samples_v021"
REPORT_DIR = SHADOW / "dataset_validation"

PASS_OPEN_FAMILY = re.compile(r"패스\s*연결\s*\d+\s*건이\s*확인")
PII_RE = re.compile(r"E2-PV-|Official\s*Fact|실명|카카오톡", re.I)
PROD_FACT_RE = re.compile(r"BETA-DAY-|E2-PV-", re.I)

ALLOWED_PET = {"NUMERIC", "AXIS", "PLAYER", "SEQUENCE", "TIME_WINDOW", "COACH_INSIGHT"}


def extract_numbers(text: str) -> set[str]:
    return set(re.findall(r"\d+(?:\.\d+)?", text))


def allowed_number_set(sample: dict) -> set[str]:
    nums: set[str] = set()
    for f in sample.get("allowedFacts") or []:
        v = f.get("value")
        if isinstance(v, (int, float)):
            nums.add(str(int(v)) if float(v).is_integer() else str(v))
        elif isinstance(v, str):
            nums.update(extract_numbers(v))
    return nums


def allowed_text_blob(sample: dict) -> str:
    parts = []
    for f in sample.get("allowedFacts") or []:
        parts.append(str(f.get("value", "")))
        parts.append(str(f.get("path", "")))
    return " ".join(parts).lower()


def validate_sample(sample: dict) -> dict:
    sid = sample["sampleId"]
    ins = sample.get("coachInsightsInput") or {}
    brief = ins.get("coachDecisionBrief") or {}
    hooks = ins.get("reviewHooks") or []
    fii = sample.get("fiiInput") or {}
    errors: list[str] = []
    warnings: list[str] = []

    pet = sample.get("primaryEvidenceType") or ins.get("primaryEvidenceType")
    if pet not in ALLOWED_PET:
        errors.append(f"invalid primaryEvidenceType: {pet}")

    kct = brief.get("keyChangeToday") or ""
    ntf = brief.get("nextTrainingFocus") or ""
    sa = hooks[0].get("suggestedAction") if hooks else ""

    if not kct:
        errors.append("missing keyChangeToday")
    if PASS_OPEN_FAMILY.search(kct):
        errors.append("keyChangeToday uses prohibited pass-open family")
    if ntf == "압박 하 짧은 지원 패스":
        errors.append("universal nextTrainingFocus injected")
    if sa == "위험 지역 안전 옵션 리허설":
        errors.append("universal suggestedAction injected")

    blob = allowed_text_blob(sample)
    for field_name, text in (("keyChangeToday", kct), ("nextTrainingFocus", ntf), ("suggestedAction", sa)):
        if not text:
            errors.append(f"missing {field_name}")
            continue
        # path/fact grounding: key phrases or numbers from allowed facts
        nums_in = extract_numbers(text)
        allowed_nums = allowed_number_set(sample)
        extra_nums = nums_in - allowed_nums
        if extra_nums:
            errors.append(f"{field_name} contains numbers not in allowedFacts: {sorted(extra_nums)}")
        # loose text grounding: at least one token from allowed blob
        tokens = [t for t in re.findall(r"[A-Za-z가-힣]+", text) if len(t) >= 2]
        if tokens and not any(t.lower() in blob for t in tokens[:3]):
            warnings.append(f"{field_name} weak token overlap with allowedFacts")

    # player aliases
    aliases = {p.get("name") for p in fii.get("playerFii") or []}
    for p in brief.get("playersToCoach") or []:
        if p.get("name") and p["name"] not in aliases:
            errors.append(f"playersToCoach alias not in fiiInput: {p['name']}")
    for alias in re.findall(r"P\d", kct + ntf + sa):
        if alias not in aliases:
            errors.append(f"referenced alias not in sample: {alias}")

    # PII / prod fact
    raw = json.dumps(sample, ensure_ascii=False)
    if PII_RE.search(raw):
        errors.append("possible PII marker in sample")
    if PROD_FACT_RE.search(raw):
        errors.append("official production fact marker detected")

    # primaryEvidenceType support heuristic
    pet_support = {
        "NUMERIC": bool(fii.get("gevInput")),
        "AXIS": bool((fii.get("teamFii") or {}).get("axes")),
        "PLAYER": bool(fii.get("playerFii")),
        "SEQUENCE": bool((fii.get("gevInput") or {}).get("eventCounts")),
        "TIME_WINDOW": bool(fii.get("timeWindow")),
        "COACH_INSIGHT": bool(brief.get("playersToCoach") or ins.get("improvementPoints")),
    }
    if pet and not pet_support.get(pet, False):
        errors.append(f"primaryEvidenceType {pet} not supported by structured input")

    return {
        "sampleId": sid,
        "primaryEvidenceType": pet,
        "pass": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "keyChangeToday": kct,
        "nextTrainingFocus": ntf,
        "suggestedAction": sa,
    }


def corpus_checks(results: list[dict], samples: list[dict]) -> dict:
    kct = [r["keyChangeToday"] for r in results]
    ntf = [r["nextTrainingFocus"] for r in results]
    sa = [r["suggestedAction"] for r in results]
    pet = Counter(s.get("primaryEvidenceType") for s in samples)

    def top_pct(items: list[str]) -> tuple[str, int, float]:
        c = Counter(items)
        phrase, count = c.most_common(1)[0]
        return phrase, count, count / len(items)

    ntf_top = top_pct(ntf)
    sa_top = top_pct(sa)
    pass_open = sum(1 for k in kct if PASS_OPEN_FAMILY.search(k))

    checks = {
        "passOpenFamilyCount": pass_open,
        "passOpenFamilyMax": 5,
        "nextTrainingFocusTopPhrase": ntf_top[0],
        "nextTrainingFocusTopCount": ntf_top[1],
        "nextTrainingFocusTopPct": round(ntf_top[2], 3),
        "suggestedActionTopPhrase": sa_top[0],
        "suggestedActionTopCount": sa_top[1],
        "suggestedActionTopPct": round(sa_top[2], 3),
        "primaryEvidenceTypeDistribution": dict(pet),
        "maxPrimaryEvidenceTypePct": round(max(pet.values()) / len(samples), 3),
        "keyChangeTodayUnique": len(set(kct)),
    }
    failures = []
    if pass_open > 5:
        failures.append("keyChangeToday pass-open family > 5/20")
    if ntf_top[2] > 0.30:
        failures.append("nextTrainingFocus phrase > 30%")
    if sa_top[2] > 0.30:
        failures.append("suggestedAction phrase > 30%")
    if max(pet.values()) / len(samples) > 0.40:
        failures.append("primaryEvidenceType > 40%")
    checks["corpusPass"] = len(failures) == 0
    checks["corpusFailures"] = failures
    return checks


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples-dir", default=str(DEFAULT_SAMPLES_DIR))
    args = parser.parse_args()

    samples_dir = Path(args.samples_dir)
    paths = sorted(samples_dir.glob("CIE-SHADOW-V02-*.json"))
    if not paths:
        raise SystemExit(f"No samples in {samples_dir}")

    samples = [json.loads(p.read_text(encoding="utf-8")) for p in paths]
    results = [validate_sample(s) for s in samples]
    corpus = corpus_checks(results, samples)
    failed = [r for r in results if not r["pass"]]

    report = {
        "datasetVersion": "cie-shadowset-v0.2.1",
        "validatedAt": datetime.now(timezone.utc).isoformat(),
        "sampleCount": len(samples),
        "perSamplePass": sum(1 for r in results if r["pass"]),
        "perSampleFail": len(failed),
        "corpusChecks": corpus,
        "overallPass": len(failed) == 0 and corpus["corpusPass"],
        "failures": failed,
        "warnings": [r for r in results if r["warnings"]],
        "productionWrites": False,
    }

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    out = REPORT_DIR / "cie-shadowset-v0.2.1_GROUNDING_VALIDATION.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("overallPass", "perSampleFail", "corpusChecks")}, ensure_ascii=False, indent=2))
    if not report["overallPass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
