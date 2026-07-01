#!/usr/bin/env python3
"""
I13 — Pass quality evaluation: strict / time-only / aligned modes (offline).

Emits evaluation_summary.json + per-mode metric files.
No Firestore, Callable, Worker, Tracking, GEV, or UI changes.
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

_SCRIPT_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _SCRIPT_DIR.parent

SCHEMA_SUMMARY = "yago-vision-evaluation-summary-v1"
SCHEMA_MODE = "yago-vision-evaluation-mode-v1"

DEFAULT_GT = _REPO_ROOT / "data/vision/gt/pilot_pass01_clip_002_gev_gt.json"
DEFAULT_PRED = Path(
    r"D:\YAGO_AI\runs\tacticalV2\pass_network\pass01_clip_002\e2e_pilot2\events_canonical.jsonl"
)
DEFAULT_ALIGNMENT = Path(r"D:\YAGO_AI\runs\tacticalV2\alignment\pass01_clip_002\alignment_map.json")
DEFAULT_COVERAGE = Path(
    r"D:\YAGO_AI\runs\tacticalV2\pass_network\pass01_clip_002\e2e_pilot2\coverage_report.json"
)
DEFAULT_OUTPUT = Path(
    r"D:\YAGO_AI\runs\tacticalV2\pass_network\pass01_clip_002\e2e_pilot2"
)

# Quality gates (Evaluation Alignment Spec §6)
GATE_PRECISION = 0.75
GATE_RECALL = 0.80
GATE_F1 = 0.77
GATE_COVERAGE = 0.60
GATE_ALIGNMENT_COVERAGE = 0.80
GATE_EDGE_PRECISION = 0.70

EXIT_SUCCESS = 0
EXIT_VALIDATION = 1


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def load_gt_passes(gt_path: Path) -> tuple[list[dict[str, Any]], float, dict[str, Any]]:
    doc = load_json(gt_path)
    matching = doc.get("matching") if isinstance(doc.get("matching"), dict) else {}
    tau = float(matching.get("timestampToleranceS", 0.75))
    passes = [
        e for e in doc.get("events", []) if str(e.get("eventType", "")).upper() == "PASS"
    ]
    return passes, tau, doc


def load_pred_passes(pred_path: Path) -> list[dict[str, Any]]:
    return [
        e
        for e in load_jsonl(pred_path)
        if str(e.get("eventType", "")).upper() == "PASS"
    ]


def load_worker_to_gt(alignment_path: Path) -> tuple[dict[str, str], float]:
    doc = load_json(alignment_path)
    mapping: dict[str, str] = {}
    for pair in doc.get("pairs", []):
        w = str(pair.get("workerTrackId") or "").strip()
        g = str(pair.get("gtTrackId") or "").strip()
        if w and g:
            mapping[w] = g
    coverage = float(doc.get("alignmentCoverage", 0.0))
    return mapping, coverage


def event_time(ev: dict[str, Any]) -> float:
    return float(ev.get("timestamp", 0))


def has_endpoints(ev: dict[str, Any]) -> bool:
    fr = str(ev.get("fromTrackId") or "").strip()
    to = str(ev.get("toTrackId") or "").strip()
    return fr.startswith("P") and to.startswith("P")


def edge_key(ev: dict[str, Any]) -> tuple[str, str] | None:
    if not has_endpoints(ev):
        return None
    return str(ev["fromTrackId"]), str(ev["toTrackId"])


def aligned_edge_key(ev: dict[str, Any], worker_to_gt: dict[str, str]) -> tuple[str, str] | None:
    fr = str(ev.get("fromTrackId") or "").strip()
    to = str(ev.get("toTrackId") or "").strip()
    if not fr.startswith("P") or not to.startswith("P"):
        return None
    af = worker_to_gt.get(fr)
    at = worker_to_gt.get(to)
    if not af or not at:
        return None
    return af, at


@dataclass
class EvalConfig:
    timestamp_tolerance_s: float = 0.75
    clip_id: str = "pass01_clip_002"


def strict_match(gt: dict[str, Any], pred: dict[str, Any], cfg: EvalConfig) -> bool:
    if abs(event_time(gt) - event_time(pred)) > cfg.timestamp_tolerance_s:
        return False
    if not has_endpoints(gt):
        return False
    return (
        str(gt.get("fromTrackId")) == str(pred.get("fromTrackId"))
        and str(gt.get("toTrackId")) == str(pred.get("toTrackId"))
    )


def time_only_match(gt: dict[str, Any], pred: dict[str, Any], cfg: EvalConfig) -> bool:
    return abs(event_time(gt) - event_time(pred)) <= cfg.timestamp_tolerance_s


def aligned_match(
    gt: dict[str, Any],
    pred: dict[str, Any],
    worker_to_gt: dict[str, str],
    cfg: EvalConfig,
) -> bool:
    if abs(event_time(gt) - event_time(pred)) > cfg.timestamp_tolerance_s:
        return False
    if not has_endpoints(gt):
        return False
    fr_p = str(pred.get("fromTrackId") or "").strip()
    to_p = str(pred.get("toTrackId") or "").strip()
    af = worker_to_gt.get(fr_p)
    at = worker_to_gt.get(to_p)
    if not af or not at:
        return False
    return af == str(gt.get("fromTrackId")) and at == str(gt.get("toTrackId"))


def aligned_sparse_match(
    gt: dict[str, Any],
    pred: dict[str, Any],
    worker_to_gt: dict[str, str],
    cfg: EvalConfig,
) -> bool:
    if has_endpoints(gt):
        return aligned_match(gt, pred, worker_to_gt, cfg)
    return time_only_match(gt, pred, cfg)


def match_score_time(gt: dict[str, Any], pred: dict[str, Any]) -> float:
    return abs(event_time(gt) - event_time(pred))


def greedy_match(
    gt: list[dict[str, Any]],
    pred: list[dict[str, Any]],
    matcher: Callable[[dict[str, Any], dict[str, Any]], bool],
) -> tuple[list[tuple[dict[str, Any], dict[str, Any]]], list[dict[str, Any]], list[dict[str, Any]]]:
    candidates: list[tuple[float, int, int]] = []
    for gi, g in enumerate(gt):
        for pi, p in enumerate(pred):
            if matcher(g, p):
                candidates.append((match_score_time(g, p), gi, pi))
    candidates.sort(key=lambda x: x[0])

    used_g: set[int] = set()
    used_p: set[int] = set()
    pairs: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for _, gi, pi in candidates:
        if gi in used_g or pi in used_p:
            continue
        used_g.add(gi)
        used_p.add(pi)
        pairs.append((gt[gi], pred[pi]))

    fn = [gt[i] for i in range(len(gt)) if i not in used_g]
    fp = [pred[i] for i in range(len(pred)) if i not in used_p]
    return pairs, fn, fp


def prf(tp: int, fp: int, fn: int) -> dict[str, Any]:
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    return {
        "truePositives": tp,
        "falsePositives": fp,
        "falseNegatives": fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
    }


def edge_metrics_strict(
    gt_passes: list[dict[str, Any]],
    confirmed: list[dict[str, Any]],
    matched_pairs: list[tuple[dict[str, Any], dict[str, Any]]],
) -> dict[str, Any]:
    gt_keys = {k for p in gt_passes if (k := edge_key(p))}
    pred_keys = {k for p in confirmed if (k := edge_key(p))}
    matched_keys = {edge_key(g) for g, _ in matched_pairs if edge_key(g)}
    matched_keys = {k for k in matched_keys if k}
    tp = len(matched_keys & gt_keys)
    fp = len(pred_keys - gt_keys)
    fn = len(gt_keys - pred_keys)
    stats = prf(tp, fp, fn)
    return {
        **stats,
        "edgeTp": tp,
        "edgePrecision": stats["precision"],
        "gtAnnotatedEdges": len(gt_keys),
        "confirmedEdges": len(pred_keys),
    }


def edge_metrics_aligned(
    gt_passes: list[dict[str, Any]],
    confirmed: list[dict[str, Any]],
    matched_pairs: list[tuple[dict[str, Any], dict[str, Any]]],
    worker_to_gt: dict[str, str],
) -> dict[str, Any]:
    gt_keys = {k for p in gt_passes if (k := edge_key(p))}
    pred_keys = {
        k
        for p in confirmed
        if (k := aligned_edge_key(p, worker_to_gt))
    }
    matched_keys: set[tuple[str, str]] = set()
    for g, p in matched_pairs:
        if not has_endpoints(g):
            continue
        k = aligned_edge_key(p, worker_to_gt)
        if k and k == edge_key(g):
            matched_keys.add(k)
    tp = len(matched_keys)
    fp = len(pred_keys - gt_keys)
    fn = len(gt_keys - pred_keys)
    stats = prf(tp, fp, fn)
    return {
        **stats,
        "edgeTp": tp,
        "edgePrecision": stats["precision"],
        "gtAnnotatedEdges": len(gt_keys),
        "confirmedEdgesAligned": len(pred_keys),
    }


def evaluate_mode(
    *,
    mode: str,
    gt_all: list[dict[str, Any]],
    pred: list[dict[str, Any]],
    cfg: EvalConfig,
    worker_to_gt: dict[str, str] | None = None,
    gt_subset: list[dict[str, Any]] | None = None,
    sparse: bool = False,
) -> dict[str, Any]:
    if mode == "strict":
        matcher: Callable[[dict, dict], bool] = lambda g, p: strict_match(g, p, cfg)
    elif mode == "time-only":
        matcher = lambda g, p: time_only_match(g, p, cfg)
    elif mode == "aligned":
        if worker_to_gt is None:
            raise ValueError("aligned mode requires alignment map")
        if sparse:
            matcher = lambda g, p: aligned_sparse_match(g, p, worker_to_gt, cfg)
        else:
            matcher = lambda g, p: aligned_match(g, p, worker_to_gt, cfg)
    else:
        raise ValueError(f"unknown mode: {mode}")

    eval_gt = gt_subset if gt_subset is not None else gt_all
    pairs, fn, fp = greedy_match(eval_gt, pred, matcher)
    stats = prf(len(pairs), len(fp), len(fn))

    result: dict[str, Any] = {
        "schemaVersion": SCHEMA_MODE,
        "mode": mode,
        "timestampToleranceS": cfg.timestamp_tolerance_s,
        "gtPassCount": len(eval_gt),
        "predPassCount": len(pred),
        **stats,
    }

    if mode == "strict":
        result["edges"] = edge_metrics_strict(gt_all, pred, pairs)
    elif mode == "aligned" and worker_to_gt is not None:
        result["edges"] = edge_metrics_aligned(gt_all, pred, pairs, worker_to_gt)

    return result


def gate_strict(metrics: dict[str, Any]) -> dict[str, Any]:
    p, r, f1 = metrics["precision"], metrics["recall"], metrics["f1"]
    passed = p >= GATE_PRECISION and r >= GATE_RECALL and f1 >= GATE_F1
    return {
        "pass": passed,
        "tier": "strict",
        "thresholds": {
            "precision": GATE_PRECISION,
            "recall": GATE_RECALL,
            "f1": GATE_F1,
        },
    }


def gate_time_only(metrics: dict[str, Any]) -> dict[str, Any]:
    return {
        "pass": False,
        "tier": "diagnostic",
        "note": "time-only is diagnostic; not used for Firestore/GCS gate",
    }


def gate_aligned(
    metrics: dict[str, Any],
    recall_strict: dict[str, Any],
    alignment_coverage: float,
    pipeline_coverage: float,
) -> dict[str, Any]:
    p = metrics["precision"]
    r_se = recall_strict["recall"]
    f1 = metrics["f1"]
    edges = metrics.get("edges") if isinstance(metrics.get("edges"), dict) else {}
    edge_p = float(edges.get("edgePrecision", edges.get("precision", 0.0)))
    passed = (
        alignment_coverage >= GATE_ALIGNMENT_COVERAGE
        and pipeline_coverage >= GATE_COVERAGE
        and p >= GATE_PRECISION
        and r_se >= GATE_RECALL
        and f1 >= GATE_F1
        and edge_p >= GATE_EDGE_PRECISION
    )
    failures: list[str] = []
    if alignment_coverage < GATE_ALIGNMENT_COVERAGE:
        failures.append("alignmentCoverage")
    if pipeline_coverage < GATE_COVERAGE:
        failures.append("pipelineCoverage")
    if p < GATE_PRECISION:
        failures.append("precision")
    if r_se < GATE_RECALL:
        failures.append("recallStrictEndpoints")
    if f1 < GATE_F1:
        failures.append("f1")
    if edge_p < GATE_EDGE_PRECISION:
        failures.append("edgePrecision")
    return {
        "pass": passed,
        "tier": "aligned_primary",
        "thresholds": {
            "precision": GATE_PRECISION,
            "recallStrictEndpoints": GATE_RECALL,
            "f1": GATE_F1,
            "edgePrecision": GATE_EDGE_PRECISION,
            "alignmentCoverage": GATE_ALIGNMENT_COVERAGE,
            "pipelineCoverage": GATE_COVERAGE,
        },
        "failures": failures,
    }


def load_pipeline_coverage(coverage_path: Path | None, pred_count: int) -> dict[str, Any]:
    if coverage_path and coverage_path.is_file():
        doc = load_json(coverage_path)
        return {
            "coverage": float(doc.get("coverage", 0.0)),
            "confirmedPass": int(doc.get("confirmed", pred_count)),
            "rejected": int(doc.get("rejected", 0)),
            "overallPass": bool(doc.get("exitStatus") == "success" or doc.get("coverage", 0) >= GATE_COVERAGE),
        }
    return {
        "coverage": None,
        "confirmedPass": pred_count,
        "rejected": None,
        "overallPass": None,
    }


def evaluate_pass_quality(
    *,
    gt_path: Path,
    pred_path: Path,
    alignment_path: Path,
    output_dir: Path,
    coverage_path: Path | None = None,
    cfg: EvalConfig | None = None,
) -> dict[str, Any]:
    gt_all, tau, gt_doc = load_gt_passes(gt_path)
    pred = load_pred_passes(pred_path)
    worker_to_gt, alignment_coverage = load_worker_to_gt(alignment_path)
    cfg = cfg or EvalConfig(timestamp_tolerance_s=tau, clip_id=str(gt_doc.get("clipId", "pass01_clip_002")))

    gt_strict_endpoints = [g for g in gt_all if has_endpoints(g)]

    strict = evaluate_mode(mode="strict", gt_all=gt_all, pred=pred, cfg=cfg)
    time_only = evaluate_mode(mode="time-only", gt_all=gt_all, pred=pred, cfg=cfg)
    aligned_all = evaluate_mode(
        mode="aligned",
        gt_all=gt_all,
        pred=pred,
        cfg=cfg,
        worker_to_gt=worker_to_gt,
        sparse=True,
    )
    aligned_strict_ep = evaluate_mode(
        mode="aligned",
        gt_all=gt_all,
        pred=pred,
        cfg=cfg,
        worker_to_gt=worker_to_gt,
        gt_subset=gt_strict_endpoints,
        sparse=False,
    )
    aligned_sparse = evaluate_mode(
        mode="aligned",
        gt_all=gt_all,
        pred=pred,
        cfg=cfg,
        worker_to_gt=worker_to_gt,
        sparse=True,
    )

    pipeline = load_pipeline_coverage(coverage_path, len(pred))
    pipeline_cov = float(pipeline["coverage"] or 0.0)

    strict_gate = gate_strict(strict)
    time_gate = gate_time_only(time_only)
    aligned_gate = gate_aligned(
        aligned_all,
        aligned_strict_ep,
        alignment_coverage,
        pipeline_cov,
    )

    summary = {
        "schemaVersion": SCHEMA_SUMMARY,
        "clipId": cfg.clip_id,
        "evaluatedAt": utc_now_iso(),
        "predSource": str(pred_path.resolve()),
        "gtSource": str(gt_path.resolve()),
        "alignmentMapRef": str(alignment_path.resolve()),
        "timestampToleranceS": cfg.timestamp_tolerance_s,
        "alignmentCoverage": round(alignment_coverage, 4),
        "pipeline": pipeline,
        "modes": {
            "strict": {**strict, "gate": strict_gate},
            "timeOnly": {**time_only, "gate": time_gate},
            "aligned": {
                **aligned_all,
                "recallStrictEndpoints": aligned_strict_ep["recall"],
                "recallStrictTp": aligned_strict_ep["truePositives"],
                "recallStrictFn": aligned_strict_ep["falseNegatives"],
                "recallWithSparse": aligned_sparse["recall"],
                "edges": aligned_all.get("edges"),
                "gate": aligned_gate,
            },
        },
        "qualityGate": {
            "strictPass": strict_gate["pass"],
            "alignedPass": aligned_gate["pass"],
            "pipelinePass": bool(pipeline.get("overallPass")),
            "overallQualityPass": aligned_gate["pass"],
        },
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "evaluation_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    strict_out = {**strict, "gate": strict_gate}
    if "edges" in strict:
        strict_out["edgeTp"] = strict["edges"].get("edgeTp")
        strict_out["edgePrecision"] = strict["edges"].get("edgePrecision")
    (output_dir / "strict_metrics.json").write_text(
        json.dumps(strict_out, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (output_dir / "time_metrics.json").write_text(
        json.dumps({**time_only, "gate": time_gate}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    aligned_out = {
        **aligned_all,
        "recallStrictEndpoints": aligned_strict_ep["recall"],
        "recallStrictEndpointMetrics": aligned_strict_ep,
        "recallWithSparse": aligned_sparse["recall"],
        "gate": aligned_gate,
    }
    if isinstance(aligned_all.get("edges"), dict):
        aligned_out["edgeTp"] = aligned_all["edges"].get("edgeTp")
        aligned_out["edgePrecision"] = aligned_all["edges"].get("edgePrecision")
    (output_dir / "aligned_metrics.json").write_text(
        json.dumps(aligned_out, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    smoke = {
        "strict": {
            "precision": strict["precision"],
            "recall": strict["recall"],
            "f1": strict["f1"],
            "tp": strict["truePositives"],
            "fp": strict["falsePositives"],
            "fn": strict["falseNegatives"],
            "edgeTp": (strict.get("edges") or {}).get("edgeTp"),
            "edgePrecision": (strict.get("edges") or {}).get("edgePrecision"),
            "gatePass": strict_gate["pass"],
        },
        "timeOnly": {
            "precision": time_only["precision"],
            "recall": time_only["recall"],
            "f1": time_only["f1"],
            "gatePass": time_gate["pass"],
        },
        "aligned": {
            "precision": aligned_all["precision"],
            "recall": aligned_all["recall"],
            "recallStrictEndpoints": aligned_strict_ep["recall"],
            "f1": aligned_all["f1"],
            "tp": aligned_all["truePositives"],
            "fp": aligned_all["falsePositives"],
            "fn": aligned_all["falseNegatives"],
            "edgeTp": (aligned_all.get("edges") or {}).get("edgeTp"),
            "edgePrecision": (aligned_all.get("edges") or {}).get("edgePrecision"),
            "gatePass": aligned_gate["pass"],
        },
        "coverage": pipeline_cov,
        "alignmentCoverage": alignment_coverage,
        "overallQualityPass": aligned_gate["pass"],
        "outputDir": str(output_dir.resolve()),
    }
    return smoke


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate pass quality (strict / time-only / aligned)")
    parser.add_argument("--gt", type=Path, default=DEFAULT_GT)
    parser.add_argument("--pred", type=Path, default=DEFAULT_PRED)
    parser.add_argument("--alignment-map", type=Path, default=DEFAULT_ALIGNMENT)
    parser.add_argument("--coverage-report", type=Path, default=DEFAULT_COVERAGE)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    for label, path in (("gt", args.gt), ("pred", args.pred), ("alignment-map", args.alignment_map)):
        if not path.is_file():
            print(f"[evaluate] ERROR missing {label}: {path}", file=sys.stderr)
            return EXIT_VALIDATION

    coverage_path = args.coverage_report if args.coverage_report.is_file() else None
    smoke = evaluate_pass_quality(
        gt_path=args.gt,
        pred_path=args.pred,
        alignment_path=args.alignment_map,
        output_dir=args.output_dir,
        coverage_path=coverage_path,
    )

    print("[evaluate] Smoke summary")
    print(f"  coverage (pipeline)     = {smoke['coverage']}")
    print(f"  alignmentCoverage       = {smoke['alignmentCoverage']}")
    print()
    for mode in ("strict", "timeOnly", "aligned"):
        m = smoke[mode]
        print(f"  [{mode}]")
        print(f"    precision = {m['precision']}")
        print(f"    recall    = {m['recall']}")
        if "recallStrictEndpoints" in m:
            print(f"    recallStrictEndpoints = {m['recallStrictEndpoints']}")
        print(f"    f1        = {m['f1']}")
        if "edgeTp" in m:
            print(f"    edgeTp    = {m['edgeTp']}")
            print(f"    edgePrecision = {m['edgePrecision']}")
        print(f"    gatePass  = {m['gatePass']}")
    print()
    print(f"  overallQualityPass      = {smoke['overallQualityPass']}")
    print(f"  outputDir               = {smoke['outputDir']}")
    return EXIT_SUCCESS


if __name__ == "__main__":
    raise SystemExit(main())
