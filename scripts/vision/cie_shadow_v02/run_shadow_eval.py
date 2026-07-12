#!/usr/bin/env python3
"""Evaluate shadow generations with LOCKED cie-eval-v0.1.1 (import only — do not modify)."""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SHADOW = ROOT / "data/vision/report/engineering/coach_intelligence_eval/v0.2_shadow"
DEFAULT_SAMPLES = SHADOW / "samples"
SAMPLES_BY_DATASET = {
    "cie-shadowset-v0.2.0": SHADOW / "samples",
    "cie-shadowset-v0.2.1": SHADOW / "samples_v021",
    "cie-shadowset-v0.2.2": SHADOW / "samples_v022",
}
EVAL_SCRIPT = ROOT / "scripts/vision/cie_eval_v0/run_deterministic_eval.py"
EVALUATOR_VERSION = "cie-eval-v0.1.1"


def resolve_samples_dir(dataset_version: str | None = None, samples_dir: str | None = None) -> Path:
    if samples_dir:
        return Path(samples_dir)
    if dataset_version:
        path = SAMPLES_BY_DATASET.get(dataset_version)
        if path is None:
            raise SystemExit(f"Unknown dataset version: {dataset_version}")
        return path
    return DEFAULT_SAMPLES


def load_evaluate_one():
    spec = importlib.util.spec_from_file_location("cie_eval_locked", EVAL_SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    if getattr(mod, "EVALUATOR_VERSION", None) != EVALUATOR_VERSION:
        raise SystemExit(
            f"Locked evaluator version mismatch: {mod.EVALUATOR_VERSION} != {EVALUATOR_VERSION}"
        )
    return mod.evaluate_one


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-id", default="CIE-SHADOW-V02-RUN-001")
    parser.add_argument("--dataset-version", default=None)
    parser.add_argument("--samples-dir", default=None)
    args = parser.parse_args()

    evaluate_one = load_evaluate_one()
    gen_dir = SHADOW / "generations" / args.run_id
    if not gen_dir.exists():
        raise SystemExit(f"Missing generations: {gen_dir}")

    samples_dir = resolve_samples_dir(args.dataset_version, args.samples_dir)
    manifest_path = gen_dir / "_manifest.json"
    dataset_version = args.dataset_version or "cie-shadowset-v0.2.0"
    if manifest_path.exists():
        dataset_version = json.loads(manifest_path.read_text(encoding="utf-8")).get(
            "datasetVersion", dataset_version
        )

    sample_paths = sorted(samples_dir.glob("CIE-SHADOW-V02-*.json"))
    per = []
    registry = []
    evaluated_at = datetime.now(timezone.utc).isoformat()
    fail_codes = Counter()
    multi_fail = 0
    numeric_drift = 0
    medical = 0
    psych = 0
    tactical = 0
    future = 0
    zero_ground = 0

    for sp in sample_paths:
        sample = json.loads(sp.read_text(encoding="utf-8"))
        gp = gen_dir / f"{sample['sampleId']}.json"
        if not gp.exists():
            per.append(
                {
                    "sampleId": sample["sampleId"],
                    "actualVerdict": "FAIL",
                    "failureTypes": ["F12_FORMAT_CONTRACT_FAIL"],
                    "error": "missing_generation",
                }
            )
            continue
        gen = json.loads(gp.read_text(encoding="utf-8"))
        sample["candidateOutput"] = {
            "rewriteText": gen.get("rewriteText") or "",
            "modelId": gen.get("modelId"),
            "generatedAt": gen.get("generatedAt"),
        }
        # satisfy locked evaluate_one expected fields without claiming gold accuracy
        sample["expectedVerdict"] = "PASS"
        sample["expectedFailureTypes"] = []
        result = evaluate_one(sample)
        # strip gold-match fields from shadow reporting meaning
        shadow_result = {
            "sampleId": result["sampleId"],
            "actualVerdict": result["actualVerdict"],
            "failureTypes": result["failureTypes"],
            "checks": result["checks"],
            "modelId": gen.get("modelId"),
            "promptVersion": gen.get("promptVersion"),
            "rewriteText": gen.get("rewriteText") or "",
            "evaluatorVersion": EVALUATOR_VERSION,
            "note": "Shadow failure incidence — not accuracy vs human gold",
        }
        per.append(shadow_result)

        for c in result["failureTypes"]:
            fail_codes[c] += 1
        if len(result["failureTypes"]) >= 2:
            multi_fail += 1
        if "F02_NUMERIC_DRIFT" in result["failureTypes"]:
            numeric_drift += 1
        if "F04_MEDICAL_INFERENCE" in result["failureTypes"]:
            medical += 1
        if "F05_PSYCHOLOGICAL_INFERENCE" in result["failureTypes"]:
            psych += 1
        if "F06_TACTICAL_INTENT_INVENTED" in result["failureTypes"]:
            tactical += 1
        if "F03_CAUSAL_OVERREACH" in result["failureTypes"]:
            future += 1
        if not result["checks"].get("source_coverage", True):
            zero_ground += 1

        if result["actualVerdict"] == "FAIL":
            h = hashlib.sha256((gen.get("rewriteText") or "").encode("utf-8")).hexdigest()[:16]
            registry.append(
                {
                    "runId": args.run_id,
                    "evaluatedAt": evaluated_at,
                    "sampleId": result["sampleId"],
                    "promptVersion": gen.get("promptVersion"),
                    "evaluatorVersion": EVALUATOR_VERSION,
                    "datasetVersion": dataset_version,
                    "actualVerdict": "FAIL",
                    "failureTypes": result["failureTypes"],
                    "candidateOutputHash": h,
                    "modelId": gen.get("modelId"),
                }
            )

    total = len(per)
    actual_pass = sum(1 for r in per if r.get("actualVerdict") == "PASS")
    actual_fail = sum(1 for r in per if r.get("actualVerdict") == "FAIL")
    executed = sum(1 for r in per if "error" not in r or r.get("error") != "missing_generation")
    # count missing as executed attempt fail
    executed = total

    manifest_path = gen_dir / "_manifest.json"
    prompt_version = "unknown"
    if manifest_path.exists():
        prompt_version = json.loads(manifest_path.read_text(encoding="utf-8")).get("promptVersion") or prompt_version
    elif per:
        prompt_version = per[0].get("promptVersion") or prompt_version

    summary = {
        "runId": args.run_id,
        "evaluatedAt": evaluated_at,
        "datasetVersion": dataset_version,
        "promptVersion": prompt_version,
        "evaluatorVersion": EVALUATOR_VERSION,
        "totalSamples": total,
        "executed": executed,
        "executionRate": 1.0 if total else 0.0,
        "actualPass": actual_pass,
        "actualFail": actual_fail,
        "failureIncidenceRate": round(actual_fail / total, 4) if total else 0.0,
        "note": "Shadow failure incidence — NOT accuracy / NOT human-gold agreement",
        "failureCodeDistribution": dict(fail_codes),
        "numericDriftCount": numeric_drift,
        "medicalInferenceCount": medical,
        "psychologicalInferenceCount": psych,
        "tacticalIntentInventionCount": tactical,
        "futureCertaintyOrCausalCount": future,
        "zeroGroundingCount": zero_ground,
        "multiFailureSampleCount": multi_fail,
        "productionWrites": False,
        "liveCoachChanged": False,
        "modelWeightTraining": False,
        "cieV01LockedArtifactsUntouched": True,
    }

    results_dir = SHADOW / "results"
    results_dir.mkdir(parents=True, exist_ok=True)
    reg_dir = SHADOW / "failure_registry"
    reg_dir.mkdir(parents=True, exist_ok=True)

    (results_dir / f"{args.run_id}_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    with (results_dir / f"{args.run_id}_per_sample.jsonl").open("w", encoding="utf-8") as f:
        for r in per:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    with (reg_dir / f"{args.run_id}_failures.jsonl").open("w", encoding="utf-8") as f:
        for r in registry:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    # Failure review artifact
    reviews = []
    for r in per:
        if r.get("actualVerdict") != "FAIL":
            continue
        sample = json.loads((samples_dir / f"{r['sampleId']}.json").read_text(encoding="utf-8"))
        reviews.append(
            {
                "sampleId": r["sampleId"],
                "generatedText": r.get("rewriteText"),
                "groundedEvidencePaths": [
                    a.get("path") for a in (sample.get("allowedFacts") or [])[:12]
                ],
                "detectedFailureCodes": r.get("failureTypes"),
                "compositionTag": sample.get("compositionTag"),
                "likelyPromptWeakness": None,  # filled in aggregate below
                "evaluatorLimitation": None,
                "correctionCandidate": None,
            }
        )

    # heuristic weakness tags
    for rev in reviews:
        codes = set(rev["detectedFailureCodes"] or [])
        weaknesses = []
        if "F02_NUMERIC_DRIFT" in codes or "F01_UNSUPPORTED_FACT" in codes:
            weaknesses.append("numeric_metric_binding")
        if "F04_MEDICAL_INFERENCE" in codes or "F05_PSYCHOLOGICAL_INFERENCE" in codes:
            weaknesses.append("safety_lexicon_overclaim")
        if "F06_TACTICAL_INTENT_INVENTED" in codes or "F03_CAUSAL_OVERREACH" in codes:
            weaknesses.append("intent_or_certainty_overreach")
        if "F12_FORMAT_CONTRACT_FAIL" in codes:
            weaknesses.append("hitl_contract_phrasing")
        if "F11_EMPTY_OR_GENERIC" in codes:
            weaknesses.append("under_specific_grounding")
        if "F07_IDENTITY_ASSUMPTION" in codes or "F08_CONTEXT_LEAK" in codes:
            weaknesses.append("identity_or_context_leak")
        rev["likelyPromptWeakness"] = weaknesses or ["unclassified"]
        # evaluator limitation notes
        lim = []
        if "numeric_ambiguity" in (rev.get("compositionTag") or "") and "F02_NUMERIC_DRIFT" in codes:
            lim.append("repeated_number_disambiguation_hard_for_deterministic_window")
        rev["evaluatorLimitation"] = lim
        rev["correctionCandidate"] = (
            "Strengthen cip grounding: metric-bound numbers; explicit medical/psych/intent bans; require HITL closing."
        )

    weak_counter = Counter()
    for rev in reviews:
        for w in rev["likelyPromptWeakness"]:
            weak_counter[w] += 1
    top3 = [{"weakness": w, "count": c} for w, c in weak_counter.most_common(3)]

    review_doc = {
        "runId": args.run_id,
        "createdAt": evaluated_at,
        "failCount": len(reviews),
        "top3PromptWeaknesses": top3,
        "rootCauseGroups": dict(weak_counter),
        "failures": reviews,
        "note": "PM must approve prompt correction before cip-v0.2.0",
    }
    review_path = SHADOW / "failure_review" / f"{args.run_id}_FAILURE_REVIEW.json"
    review_path.parent.mkdir(parents=True, exist_ok=True)
    review_path.write_text(json.dumps(review_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print("top3", json.dumps(top3, ensure_ascii=False))
    print("review", review_path)


if __name__ == "__main__":
    main()
