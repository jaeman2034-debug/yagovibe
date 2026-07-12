#!/usr/bin/env python3
"""Intelligence AI Agent Learning Loop V1 — manual offline orchestrator.

VALIDATE → GENERATE (optional) → HARD GATE → QUALITY GATE → REGISTRY → PM CHECKLIST

Never auto-promotes versions. Never auto-edits prompt/dataset.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

_LOOP_DIR = Path(__file__).resolve().parent
if str(_LOOP_DIR) not in sys.path:
    sys.path.insert(0, str(_LOOP_DIR))

from assert_shadow_gates import assert_all  # noqa: E402
from locked_versions import (  # noqa: E402
    DATASET_DIRS,
    DEFAULT_EVALUATOR,
    DEFAULT_LOCKED_DATASET,
    DEFAULT_LOCKED_PROMPT,
    LOCKED_ARTIFACT_PATHS,
    LOCKED_SHA256,
    LOOP,
    PM_DECISIONS,
    PROMPT_FILES,
    ROOT,
    SHADOW,
)

SCRIPTS = ROOT / "scripts/vision"
SHADOW_SCRIPTS = SCRIPTS / "cie_shadow_v02"


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sha256_combined(paths: list[Path]) -> str:
    h = hashlib.sha256()
    for p in sorted(paths):
        h.update(p.read_bytes())
    return h.hexdigest()


def verify_freeze(dataset_version: str, prompt_version: str, evaluator_version: str) -> dict:
    """Verify locked artifact SHA when registry entry exists."""
    results: dict = {"verified": True, "checks": [], "mismatches": []}

    if prompt_version == "cip-v0.2.2" and PROMPT_FILES.get(prompt_version):
        path = PROMPT_FILES[prompt_version]
        actual = sha256_file(path)
        expected = LOCKED_SHA256.get("cip-v0.2.2")
        ok = actual == expected
        results["checks"].append({"artifact": "cip-v0.2.2", "pass": ok, "sha256": actual[:16]})
        if not ok:
            results["verified"] = False
            results["mismatches"].append(f"cip-v0.2.2 SHA mismatch")

    if dataset_version == "cie-shadowset-v0.2.2":
        samples_dir = DATASET_DIRS.get(dataset_version)
        if samples_dir and samples_dir.exists():
            paths = sorted(samples_dir.glob("CIE-SHADOW-V02-*.json"))
            actual = sha256_combined(paths)
            expected = LOCKED_SHA256.get("samples_v022_combined")
            ok = actual == expected
            results["checks"].append(
                {"artifact": "samples_v022", "pass": ok, "sha256": actual[:16], "count": len(paths)}
            )
            if not ok:
                results["verified"] = False
                results["mismatches"].append("samples_v022 combined SHA mismatch")

    for key in ("rewrite_payload.py", "cie-eval-v0.1.1", "run_quality_eval.py"):
        if evaluator_version == DEFAULT_EVALUATOR or prompt_version == "cip-v0.2.2":
            path = LOCKED_ARTIFACT_PATHS.get(key)
            expected = LOCKED_SHA256.get(key)
            if path and path.exists() and expected:
                actual = sha256_file(path)
                ok = actual == expected
                results["checks"].append({"artifact": key, "pass": ok, "sha256": actual[:16]})
                if not ok:
                    results["verified"] = False
                    results["mismatches"].append(f"{key} SHA mismatch")

    return results


def run_cmd(cmd: list[str], *, label: str) -> None:
    print(f"[loop] {label}: {' '.join(cmd)}")
    proc = subprocess.run(cmd, cwd=str(ROOT))
    if proc.returncode != 0:
        raise SystemExit(f"STOP: {label} failed (exit {proc.returncode})")


def validate_dataset(dataset_version: str) -> dict:
    samples_dir = DATASET_DIRS.get(dataset_version)
    if samples_dir is None:
        raise SystemExit(f"Unknown dataset version: {dataset_version}")

    if dataset_version == "cie-shadowset-v0.2.2":
        script = SHADOW_SCRIPTS / "validate_shadowset_v022.py"
        run_cmd(
            [sys.executable, str(script), "--samples-dir", str(samples_dir)],
            label="dataset_validate",
        )
        report = SHADOW / "dataset_validation/cie-shadowset-v0.2.2_GROUNDING_VALIDATION.json"
        return json.loads(report.read_text(encoding="utf-8"))

    # v0.2.0 / v0.2.1 — existence + version tag check only (locked sets immutable)
    paths = sorted(samples_dir.glob("CIE-SHADOW-V02-*.json"))
    if len(paths) != 20:
        raise SystemExit(f"STOP: expected 20 samples in {samples_dir}, found {len(paths)}")
    for p in paths:
        s = json.loads(p.read_text(encoding="utf-8"))
        if s.get("datasetVersion") != dataset_version:
            raise SystemExit(f"STOP: {p.name} datasetVersion != {dataset_version}")
    return {"datasetVersion": dataset_version, "overallPass": True, "sampleCount": len(paths)}


def count_hitl_pending(run_id: str) -> int:
    fb_dir = LOOP / "hitl_feedback"
    if not fb_dir.exists():
        return 20
    done_samples: set[str] = set()
    for fp in fb_dir.glob("*.jsonl"):
        for line in fp.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            row = json.loads(line)
            if row.get("runId") == run_id and row.get("reviewStatus") == "complete":
                done_samples.add(row.get("sampleId", ""))
    return max(0, 20 - len(done_samples))


def ensure_failure_registry(run_id: str, source_run_id: str, hard_summary: dict) -> Path:
    """Append-only registry artifact per loop run. Never overwrite historical files."""
    loop_run_dir = LOOP / "runs" / run_id
    loop_run_dir.mkdir(parents=True, exist_ok=True)
    dest = loop_run_dir / "failure_registry.jsonl"

    shadow_reg = SHADOW / "failure_registry" / f"{source_run_id}_failures.jsonl"
    if shadow_reg.exists():
        content = shadow_reg.read_text(encoding="utf-8")
    else:
        content = ""

    # Always write explicit artifact (empty file = all PASS)
    dest.write_text(content, encoding="utf-8")

    # Also ensure shadow registry exists (run_shadow_eval creates it; reuse mode may not)
    if not shadow_reg.exists():
        shadow_reg.parent.mkdir(parents=True, exist_ok=True)
        shadow_reg.write_text(content, encoding="utf-8")

    return dest


def write_pm_checklist(
    run_id: str,
    *,
    freeze: dict,
    dataset_version: str,
    prompt_version: str,
    evaluator_version: str,
    hard_summary: dict,
    quality_summary: dict,
    gate_result: dict,
    reuse_run_id: str | None,
    orchestration_only: bool,
    llm_called: bool,
    version_change_detected: bool,
) -> Path:
    loop_run_dir = LOOP / "runs" / run_id
    loop_run_dir.mkdir(parents=True, exist_ok=True)
    path = loop_run_dir / "PM_REVIEW_CHECKLIST.md"

    hard_pass = "PASS" if gate_result.get("hardGatePass") else "FAIL"
    qual_pass = "PASS" if gate_result.get("qualityGatePass") else "FAIL"
    fail_count = hard_summary.get("actualFail", 0)
    low_q = quality_summary.get("lowQualitySampleCount", 0)
    hitl_pending = count_hitl_pending(run_id)

    lines = [
        f"# PM Review Checklist — {run_id}",
        "",
        f"**Generated:** {datetime.now(timezone.utc).isoformat()}",
        f"**Mode:** {'orchestration-only' if orchestration_only else 'full loop'}",
        "",
        "## Inputs",
        "",
        f"- input freeze verified: **{'Y' if freeze.get('verified') else 'N'}**",
        f"- dataset version: `{dataset_version}`",
        f"- prompt version: `{prompt_version}`",
        f"- evaluator version: `{evaluator_version}`",
        f"- reused generations: `{reuse_run_id or 'none'}`",
        f"- version change detected: **{'Y' if version_change_detected else 'N'}**",
        "",
        "## Gates",
        "",
        f"- Hard Gate: **{hard_pass}**",
        f"- Quality Gate: **{qual_pass}**",
        f"- failure count: **{fail_count}**",
        f"- low-quality count: **{low_q}**",
        f"- HITL pending count: **{hitl_pending}**",
        "",
        "## Guards",
        "",
        "- Production writes: **N**",
        "- Live Coach changed: **N**",
        "- Weight training: **N**",
        f"- LLM called: **{'Y' if llm_called else 'N'}**",
        "",
        "## PM Decision",
        "",
        "**PM_DECISION_REQUIRED**",
        "",
        "Allowed values (script does NOT choose):",
        "",
    ]
    for d in sorted(PM_DECISIONS):
        lines.append(f"- `{d}`")
    lines.extend(
        [
            "",
            "## Notes",
            "",
            "- No automatic version promotion.",
            "- No self-declared COMPLETE / LOCK.",
            "- PRODUCTION FACT IS NOT TRAINING DATA.",
            "",
        ]
    )
    if gate_result.get("hardViolations"):
        lines.append(f"- Hard violations: `{gate_result['hardViolations']}`")
    if gate_result.get("qualityViolations"):
        lines.append(f"- Quality violations: `{gate_result['qualityViolations']}`")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def write_loop_manifest(
    run_id: str,
    *,
    dataset_version: str,
    prompt_version: str,
    evaluator_version: str,
    eval_run_id: str,
    freeze: dict,
    validation: dict,
    hard_summary: dict,
    quality_summary: dict,
    gate_result: dict,
    orchestration_only: bool,
    llm_called: bool,
    reuse_run_id: str | None,
    stopped_at: str | None = None,
) -> Path:
    loop_run_dir = LOOP / "runs" / run_id
    loop_run_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "loopVersion": "intelligence-ai-agent-learning-loop-v1",
        "runId": run_id,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "mode": "orchestration-only" if orchestration_only else "full",
        "datasetVersion": dataset_version,
        "promptVersion": prompt_version,
        "evaluatorVersion": evaluator_version,
        "evalRunId": eval_run_id,
        "reuseGenerationsFrom": reuse_run_id,
        "freezeVerification": freeze,
        "datasetValidation": {
            "overallPass": validation.get("overallPass"),
            "datasetVersion": validation.get("datasetVersion", dataset_version),
        },
        "hardGate": {
            "pass": gate_result.get("hardGatePass"),
            "summary": {
                "generationRate": hard_summary.get("generationRate"),
                "executionRate": hard_summary.get("executionRate"),
                "actualFail": hard_summary.get("actualFail"),
            },
        },
        "qualityGate": {
            "pass": gate_result.get("qualityGatePass"),
            "meanScores": quality_summary.get("meanScores"),
            "lowQualitySampleCount": quality_summary.get("lowQualitySampleCount"),
        },
        "gateAssertion": gate_result,
        "llmCalled": llm_called,
        "productionWrites": False,
        "liveCoachChanged": False,
        "modelWeightTraining": False,
        "versionPromotionGuard": "manual_pm_only",
        "stoppedAt": stopped_at,
        "officialFactSeparation": "PRODUCTION_FACT_IS_NOT_TRAINING_DATA",
    }
    path = loop_run_dir / "_loop_manifest.json"
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def load_summaries(eval_run_id: str) -> tuple[dict, dict]:
    hard_path = SHADOW / "results" / f"{eval_run_id}_summary.json"
    qual_path = SHADOW / "quality_results" / f"{eval_run_id}_QUALITY_summary.json"
    if not hard_path.exists():
        raise SystemExit(f"STOP: missing hard summary {hard_path}")
    if not qual_path.exists():
        raise SystemExit(f"STOP: missing quality summary {qual_path}")
    return (
        json.loads(hard_path.read_text(encoding="utf-8")),
        json.loads(qual_path.read_text(encoding="utf-8")),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="CIE Learning Loop V1 manual orchestrator")
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--dataset-version", default=DEFAULT_LOCKED_DATASET)
    parser.add_argument("--prompt-version", default=DEFAULT_LOCKED_PROMPT)
    parser.add_argument("--evaluator-version", default=DEFAULT_EVALUATOR)
    parser.add_argument(
        "--reuse-generations",
        default=None,
        help="Use existing generations dir (orchestration / no new LLM)",
    )
    parser.add_argument(
        "--orchestration-only",
        action="store_true",
        help="Validate + load existing eval artifacts; no LLM, no re-eval",
    )
    parser.add_argument(
        "--generate",
        action="store_true",
        help="Run lab LLM generation (requires --lab-only)",
    )
    parser.add_argument("--lab-only", action="store_true", help="Required with --generate")
    parser.add_argument("--model", default="gpt-4o-mini")
    parser.add_argument(
        "--promote",
        action="store_true",
        help="BLOCKED: version promotion requires PM FINAL LOCK — never auto",
    )
    args = parser.parse_args()

    if args.promote:
        raise SystemExit("STOP: --promote forbidden. Version promotion is PM-only.")

    llm_called = False
    eval_run_id = args.reuse_generations or args.run_id

    # 1. Freeze verify
    freeze = verify_freeze(args.dataset_version, args.prompt_version, args.evaluator_version)
    if not freeze["verified"]:
        print(json.dumps(freeze, ensure_ascii=False, indent=2))
        raise SystemExit("STOP: freeze verification failed")

    # 2. Dataset validate
    validation = validate_dataset(args.dataset_version)

    # 3. Generation
    gen_dir = SHADOW / "generations" / eval_run_id
    if args.generate:
        if not args.lab_only:
            raise SystemExit("STOP: generation requires --lab-only")
        llm_called = True
        run_cmd(
            [
                sys.executable,
                str(SHADOW_SCRIPTS / "run_lab_rewrite.py"),
                "--lab-only",
                "--run-id",
                eval_run_id,
                "--dataset-version",
                args.dataset_version,
                "--prompt-version",
                args.prompt_version,
                "--model",
                args.model,
            ],
            label="lab_generation",
        )
        gen_dir = SHADOW / "generations" / eval_run_id
    elif args.reuse_generations:
        if not gen_dir.exists():
            raise SystemExit(f"STOP: reuse generations missing: {gen_dir}")
        print(f"[loop] reusing generations from {args.reuse_generations}")
    else:
        raise SystemExit(
            "STOP: specify --reuse-generations <RUN-ID> or --generate --lab-only. "
            "Refusing implicit LLM call."
        )

    version_change_detected = (
        args.dataset_version != DEFAULT_LOCKED_DATASET
        or args.prompt_version != DEFAULT_LOCKED_PROMPT
        or args.evaluator_version != DEFAULT_EVALUATOR
    )

    stopped_at = None

    if args.orchestration_only:
        # Load existing eval artifacts — not a new quality gate run
        hard_summary, quality_summary = load_summaries(eval_run_id)
        manifest_path = gen_dir / "_manifest.json"
        if manifest_path.exists():
            m = json.loads(manifest_path.read_text(encoding="utf-8"))
            hard_summary.setdefault("generationRate", m.get("generationRate"))
            hard_summary.setdefault("requested", m.get("requested"))
            hard_summary.setdefault("generated", m.get("generated"))
        print(f"[loop] orchestration-only: loaded summaries from {eval_run_id}")
    else:
        # 4. Hard Gate
        run_cmd(
            [
                sys.executable,
                str(SHADOW_SCRIPTS / "run_shadow_eval.py"),
                "--run-id",
                eval_run_id,
                "--dataset-version",
                args.dataset_version,
            ],
            label="hard_gate",
        )
        hard_summary, _ = load_summaries(eval_run_id)

        if hard_summary.get("actualFail", 0) > 0:
            ensure_failure_registry(args.run_id, eval_run_id, hard_summary)
            gate_result = assert_all(hard_summary, {"meanScores": {}, "diversity": {}, "lowQualitySampleCount": 99})
            write_loop_manifest(
                args.run_id,
                dataset_version=args.dataset_version,
                prompt_version=args.prompt_version,
                evaluator_version=args.evaluator_version,
                eval_run_id=eval_run_id,
                freeze=freeze,
                validation=validation,
                hard_summary=hard_summary,
                quality_summary={},
                gate_result=gate_result,
                orchestration_only=False,
                llm_called=llm_called,
                reuse_run_id=args.reuse_generations,
                stopped_at="HARD_GATE_FAIL",
            )
            write_pm_checklist(
                args.run_id,
                freeze=freeze,
                dataset_version=args.dataset_version,
                prompt_version=args.prompt_version,
                evaluator_version=args.evaluator_version,
                hard_summary=hard_summary,
                quality_summary={},
                gate_result=gate_result,
                reuse_run_id=args.reuse_generations,
                orchestration_only=False,
                llm_called=llm_called,
                version_change_detected=version_change_detected,
            )
            print(json.dumps({"status": "STOP", "reason": "HARD_GATE_FAIL"}, ensure_ascii=False))
            raise SystemExit(1)

        # 5. Quality Gate (may use LLM judge if --lab-only passed through)
        qual_cmd = [
            sys.executable,
            str(SHADOW_SCRIPTS / "run_quality_eval.py"),
            "--run-id",
            eval_run_id,
            "--dataset-version",
            args.dataset_version,
        ]
        if args.lab_only:
            qual_cmd.append("--lab-only")
            llm_called = True
        run_cmd(qual_cmd, label="quality_gate")
        _, quality_summary = load_summaries(eval_run_id)

    # 6. Gate assertion
    gate_result = assert_all(
        hard_summary,
        quality_summary,
        generations_dir=gen_dir,
    )

    # 7. Failure registry (append-only per run)
    reg_path = ensure_failure_registry(args.run_id, eval_run_id, hard_summary)

    # 8. PM checklist + manifest
    checklist = write_pm_checklist(
        args.run_id,
        freeze=freeze,
        dataset_version=args.dataset_version,
        prompt_version=args.prompt_version,
        evaluator_version=args.evaluator_version,
        hard_summary=hard_summary,
        quality_summary=quality_summary,
        gate_result=gate_result,
        reuse_run_id=args.reuse_generations,
        orchestration_only=args.orchestration_only,
        llm_called=llm_called,
        version_change_detected=version_change_detected,
    )
    manifest = write_loop_manifest(
        args.run_id,
        dataset_version=args.dataset_version,
        prompt_version=args.prompt_version,
        evaluator_version=args.evaluator_version,
        eval_run_id=eval_run_id,
        freeze=freeze,
        validation=validation,
        hard_summary=hard_summary,
        quality_summary=quality_summary,
        gate_result=gate_result,
        orchestration_only=args.orchestration_only,
        llm_called=llm_called,
        reuse_run_id=args.reuse_generations,
        stopped_at=stopped_at,
    )

    # Copy checklist reference into loop index
    index_path = LOOP / "runs" / args.run_id / "ARTIFACT_INDEX.json"
    index_path.write_text(
        json.dumps(
            {
                "runId": args.run_id,
                "manifest": str(manifest.relative_to(ROOT)).replace("\\", "/"),
                "pmChecklist": str(checklist.relative_to(ROOT)).replace("\\", "/"),
                "failureRegistry": str(reg_path.relative_to(ROOT)).replace("\\", "/"),
                "reusedEvalRunId": eval_run_id,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    out = {
        "status": "COMPLETE",
        "runId": args.run_id,
        "hardGatePass": gate_result["hardGatePass"],
        "qualityGatePass": gate_result["qualityGatePass"],
        "llmCalled": llm_called,
        "pmDecisionRequired": True,
        "manifest": str(manifest),
        "checklist": str(checklist),
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))

    if not gate_result["hardGatePass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
