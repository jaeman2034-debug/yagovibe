#!/usr/bin/env python3
"""
I13 — Evaluation Alignment: build GT ↔ Worker track mapping (offline).

Emits alignment_map.json (+ optional alignment_report.json).
No Firestore, Callable, Worker, Tracking engine, or GEV engine changes.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

_SCRIPT_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _SCRIPT_DIR.parent

SCHEMA_MAP = "yago-vision-alignment-map-v1"
SCHEMA_REPORT = "yago-vision-alignment-report-v1"
METHOD = "hybrid_spatial_temporal_v2"

# Oracle pairs for pass01_clip_002 smoke pairPrecision (Track Alignment Analysis)
ORACLE_PAIRS: dict[str, str] = {
    "P0093": "P0095",
    "P0109": "P0113",
    "P0120": "P0187",
    "P0193": "P0204",
    "P0201": "P0212",
    "P0090": "P0089",
    "P0138": "P0147",
    "P0341": "P0352",
    "P0367": "P0377",
}

DEFAULT_GT_GEV = _REPO_ROOT / "data/vision/gt/pilot_pass01_clip_002_gev_gt.json"
DEFAULT_GT_REGISTRY = _REPO_ROOT / "data/vision/tracking/runs/pass01_clip_002/tracks_registry.json"
DEFAULT_GT_TRACKS = _REPO_ROOT / "data/vision/tracking/runs/pass01_clip_002/tracks.jsonl"
DEFAULT_WORKER_RUN = _REPO_ROOT / "data/vision/pipeline/runs/rc4_m1_pass01_clip_002"
DEFAULT_WORKER_GEV = DEFAULT_WORKER_RUN / "gev_rc3_1_phase_c/gev_events.jsonl"
DEFAULT_WORKER_REGISTRY = DEFAULT_WORKER_RUN / "tracks_registry.json"
DEFAULT_WORKER_TRACKS = DEFAULT_WORKER_RUN / "tracks.jsonl"
DEFAULT_OUTPUT = Path(r"D:\YAGO_AI\runs\tacticalV2\alignment\pass01_clip_002")

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


def track_id_of(row: dict[str, Any]) -> str:
    return str(row.get("track_id") or row.get("trackId") or "").strip()


def person_tracks(registry: dict[str, Any]) -> list[dict[str, Any]]:
    tracks = registry.get("tracks") if isinstance(registry.get("tracks"), list) else []
    return [t for t in tracks if str(t.get("class", "")) == "person"]


def person_track_ids(registry: dict[str, Any]) -> set[str]:
    return {track_id_of(t) for t in person_tracks(registry) if track_id_of(t)}


def pass_events_from_gt(doc: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        e
        for e in doc.get("events", [])
        if str(e.get("eventType", "")).upper() == "PASS"
    ]


def pass_events_from_jsonl(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [e for e in rows if str(e.get("eventType", "")).upper() == "PASS"]


def gt_endpoint_ids(gt_passes: list[dict[str, Any]]) -> set[str]:
    ids: set[str] = set()
    for ev in gt_passes:
        for key in ("fromTrackId", "toTrackId"):
            val = str(ev.get(key) or "").strip()
            if val.startswith("P"):
                ids.add(val)
    return ids


def anchor_timestamps(gt_passes: list[dict[str, Any]]) -> list[float]:
    anchors: list[float] = []
    for ev in gt_passes:
        if ev.get("fromTrackId") and ev.get("toTrackId"):
            anchors.append(float(ev.get("timestamp", 0)))
    return sorted(set(round(t, 3) for t in anchors))


def bbox_iou(a: list[float], b: list[float]) -> float:
    ax1, ay1, aw, ah = a[:4]
    bx1, by1, bw, bh = b[:4]
    ax2, ay2 = ax1 + aw, ay1 + ah
    bx2, by2 = bx1 + bw, by1 + bh
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    union = aw * ah + bw * bh - inter
    return inter / union if union > 0 else 0.0


def bbox_centroid(bbox: list[float]) -> tuple[float, float]:
    x, y, w, h = bbox[:4]
    return (x + w / 2.0, y + h / 2.0)


def index_person_track_samples(path: Path) -> dict[str, list[tuple[float, list[float]]]]:
    """track_id -> sorted list of (timestamp, bbox)."""
    out: dict[str, list[tuple[float, list[float]]]] = defaultdict(list)
    if not path.is_file():
        return out
    for row in load_jsonl(path):
        if str(row.get("class", "")) != "person":
            continue
        tid = track_id_of(row)
        bbox = row.get("bbox")
        if not tid or not isinstance(bbox, list) or len(bbox) < 4:
            continue
        out[tid].append((float(row.get("timestamp", 0)), list(bbox[:4])))
    for tid in out:
        out[tid].sort(key=lambda x: x[0])
    return out


def sample_at(
    samples: list[tuple[float, list[float]]],
    t: float,
    tol_s: float,
) -> list[float] | None:
    if not samples:
        return None
    best: tuple[float, list[float]] | None = None
    for ts, bbox in samples:
        dt = abs(ts - t)
        if dt <= tol_s and (best is None or dt < best[0]):
            best = (dt, bbox)
    return best[1] if best else None


def pixel_dist_centroids(a: list[float], b: list[float]) -> float:
    ca, cb = bbox_centroid(a), bbox_centroid(b)
    return math.hypot(ca[0] - cb[0], ca[1] - cb[1])


def spatial_match_score(dist_px: float, iou: float) -> float:
    dist_part = max(0.0, 1.0 - dist_px / 200.0) * 0.5
    iou_part = iou * 0.5
    return dist_part + iou_part


@dataclass
class BuildConfig:
    timestamp_tolerance_s: float = 0.75
    map_confidence_min: float = 0.6
    spatial_threshold_px: float = 120.0
    spatial_time_tol_s: float = 0.33
    spatial_bridge_window_s: float = 0.5
    spatial_floor_dist_px: float = 15.0
    spatial_floor_confidence: float = 0.62
    sender_weight: float = 1.25
    receiver_weight: float = 1.0
    gev_saturation: float = 2.0
    clip_id: str = "pass01_clip_002"
    gt_run_id: str = "pass01_clip_002"
    worker_run_id: str = "rc4_m1_pass01_clip_002"


@dataclass
class PairVote:
    worker_track_id: str
    gt_track_id: str
    sender_votes: float = 0.0
    receiver_votes: float = 0.0
    spatial_hits: int = 0
    spatial_only_hits: int = 0
    min_dist_px: float = field(default=float("inf"))
    max_iou: float = 0.0
    evidence: list[str] = field(default_factory=list)

    @property
    def gev_effective(self) -> float:
        return self.sender_votes + self.receiver_votes

    @property
    def confidence(self) -> float:
        cfg_w = 0.50
        gev_part = min(1.0, self.gev_effective / BuildConfig.gev_saturation) * cfg_w

        spatial_part = 0.0
        if self.min_dist_px != float("inf"):
            dist_part = max(0.0, 1.0 - self.min_dist_px / 200.0) * 0.25
            iou_part = self.max_iou * 0.25
            spatial_part = dist_part + iou_part

        raw = min(1.0, gev_part + spatial_part)

        # C. Spatial floor — tight dist + GEV ≥ 1
        if (
            self.min_dist_px <= BuildConfig.spatial_floor_dist_px
            and self.gev_effective >= 1.0
        ):
            raw = max(raw, BuildConfig.spatial_floor_confidence)

        # D. Spatial-only bridge floor — no GEV, strong IoU + tight dist
        if (
            self.gev_effective == 0
            and self.spatial_only_hits >= 1
            and self.min_dist_px <= BuildConfig.spatial_floor_dist_px
            and self.max_iou >= 0.35
        ):
            raw = max(raw, BuildConfig.spatial_floor_confidence)

        return round(raw, 4)


def get_or_create_vote(
    votes: dict[tuple[str, str], PairVote],
    worker_id: str,
    gt_id: str,
) -> PairVote:
    key = (worker_id, gt_id)
    if key not in votes:
        votes[key] = PairVote(worker_track_id=worker_id, gt_track_id=gt_id)
    return votes[key]


def record_spatial_hit(
    vote: PairVote,
    dist_px: float,
    iou: float,
    evidence: str,
    *,
    spatial_only: bool = False,
) -> None:
    if spatial_only:
        vote.spatial_only_hits += 1
    else:
        vote.spatial_hits += 1
    vote.min_dist_px = min(vote.min_dist_px, dist_px)
    vote.max_iou = max(vote.max_iou, iou)
    vote.evidence.append(evidence)


def greedy_time_match_passes(
    gt: list[dict[str, Any]],
    worker: list[dict[str, Any]],
    tau: float,
) -> list[tuple[dict[str, Any], dict[str, Any]]]:
    candidates: list[tuple[float, int, int]] = []
    for gi, g in enumerate(gt):
        gt_t = float(g.get("timestamp", 0))
        for pi, p in enumerate(worker):
            if abs(gt_t - float(p.get("timestamp", 0))) <= tau:
                candidates.append((abs(gt_t - float(p.get("timestamp", 0))), gi, pi))
    candidates.sort(key=lambda x: x[0])

    used_g: set[int] = set()
    used_p: set[int] = set()
    pairs: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for _, gi, pi in candidates:
        if gi in used_g or pi in used_p:
            continue
        used_g.add(gi)
        used_p.add(pi)
        pairs.append((gt[gi], worker[pi]))
    return pairs


def accumulate_gev_votes(
    pairs: list[tuple[dict[str, Any], dict[str, Any]]],
    votes: dict[tuple[str, str], PairVote],
    cfg: BuildConfig,
) -> None:
    for gt_ev, w_ev in pairs:
        t = float(gt_ev.get("timestamp", 0))
        for role, weight, g_key, w_key in (
            ("sender", cfg.sender_weight, "fromTrackId", "fromTrackId"),
            ("receiver", cfg.receiver_weight, "toTrackId", "toTrackId"),
        ):
            g_id = str(gt_ev.get(g_key) or "").strip()
            w_id = str(w_ev.get(w_key) or "").strip()
            if not g_id.startswith("P") or not w_id.startswith("P"):
                continue
            vote = get_or_create_vote(votes, w_id, g_id)
            if role == "sender":
                vote.sender_votes += weight
            else:
                vote.receiver_votes += weight
            vote.evidence.append(f"gev_pass@{t:.3f}s:{role}")


def best_worker_for_gt_at_time(
    gid: str,
    worker_ids: set[str],
    gt_samples: dict[str, list[tuple[float, list[float]]]],
    worker_samples: dict[str, list[tuple[float, list[float]]]],
    t: float,
    tol_s: float,
    threshold_px: float,
) -> tuple[str, float, float, float] | None:
    g_bbox = sample_at(gt_samples.get(gid, []), t, tol_s)
    if g_bbox is None:
        return None

    ranked: list[tuple[float, str, float, float]] = []
    for wid in worker_ids:
        w_bbox = sample_at(worker_samples.get(wid, []), t, tol_s)
        if w_bbox is None:
            continue
        dist = pixel_dist_centroids(g_bbox, w_bbox)
        iou = bbox_iou(g_bbox, w_bbox)
        if dist <= threshold_px or iou >= 0.25:
            score = spatial_match_score(dist, iou)
            ranked.append((score, wid, dist, iou))
    if not ranked:
        return None
    ranked.sort(key=lambda x: x[0], reverse=True)
    _, best_wid, best_dist, best_iou = ranked[0]
    return best_wid, best_dist, best_iou, ranked[0][0]


def accumulate_spatial_votes(
    anchors: list[float],
    gt_ids: set[str],
    worker_ids: set[str],
    gt_samples: dict[str, list[tuple[float, list[float]]]],
    worker_samples: dict[str, list[tuple[float, list[float]]]],
    votes: dict[tuple[str, str], PairVote],
    cfg: BuildConfig,
) -> None:
    for t in anchors:
        for gid in gt_ids:
            match = best_worker_for_gt_at_time(
                gid,
                worker_ids,
                gt_samples,
                worker_samples,
                t,
                cfg.spatial_time_tol_s,
                cfg.spatial_threshold_px,
            )
            if match is None:
                continue
            best_wid, best_dist, best_iou, _ = match
            vote = get_or_create_vote(votes, best_wid, gid)
            record_spatial_hit(
                vote,
                best_dist,
                best_iou,
                f"spatial@{t:.3f}s:dist={best_dist:.1f}px:iou={best_iou:.3f}",
            )


def endpoint_ids_at_pass(ev: dict[str, Any]) -> set[str]:
    ids: set[str] = set()
    for key in ("fromTrackId", "toTrackId"):
        val = str(ev.get(key) or "").strip()
        if val.startswith("P"):
            ids.add(val)
    return ids


def accumulate_gev_spatial_fallback(
    pairs: list[tuple[dict[str, Any], dict[str, Any]]],
    gt_samples: dict[str, list[tuple[float, list[float]]]],
    worker_samples: dict[str, list[tuple[float, list[float]]]],
    votes: dict[tuple[str, str], PairVote],
    cfg: BuildConfig,
) -> None:
    """Scan ±bridge window for known GEV endpoint pairs when bbox missing at exact anchor."""
    for gt_ev, w_ev in pairs:
        t0 = float(gt_ev.get("timestamp", 0))
        for g_key, w_key in (("fromTrackId", "fromTrackId"), ("toTrackId", "toTrackId")):
            g_id = str(gt_ev.get(g_key) or "").strip()
            w_id = str(w_ev.get(w_key) or "").strip()
            if not g_id.startswith("P") or not w_id.startswith("P"):
                continue
            vote = get_or_create_vote(votes, w_id, g_id)
            if vote.spatial_hits > 0 and vote.min_dist_px <= cfg.spatial_floor_dist_px:
                continue

            best_dist = float("inf")
            best_iou = 0.0
            for offset in frange(-cfg.spatial_bridge_window_s, cfg.spatial_bridge_window_s, 0.1):
                scan_t = t0 + offset
                g_bbox = sample_at(gt_samples.get(g_id, []), scan_t, cfg.spatial_time_tol_s)
                w_bbox = sample_at(worker_samples.get(w_id, []), scan_t, cfg.spatial_time_tol_s)
                if g_bbox is None or w_bbox is None:
                    continue
                dist = pixel_dist_centroids(g_bbox, w_bbox)
                iou = bbox_iou(g_bbox, w_bbox)
                if dist < best_dist:
                    best_dist, best_iou = dist, iou

            if best_dist == float("inf"):
                continue
            record_spatial_hit(
                vote,
                best_dist,
                best_iou,
                f"gev_spatial_fallback@{t0:.3f}s:dist={best_dist:.1f}px:iou={best_iou:.3f}",
            )


def accumulate_spatial_only_bridge(
    gt_passes: list[dict[str, Any]],
    time_pairs: list[tuple[dict[str, Any], dict[str, Any]]],
    gt_ids: set[str],
    worker_ids: set[str],
    gt_samples: dict[str, list[tuple[float, list[float]]]],
    worker_samples: dict[str, list[tuple[float, list[float]]]],
    votes: dict[tuple[str, str], PairVote],
    cfg: BuildConfig,
) -> None:
    """D. Spatial-only bridge when no Worker GEV PASS time-match at GT anchor."""
    matched_gt_times = {round(float(g.get("timestamp", 0)), 3) for g, _ in time_pairs}

    for ev in gt_passes:
        if not ev.get("fromTrackId") or not ev.get("toTrackId"):
            continue
        t = round(float(ev.get("timestamp", 0)), 3)
        if t in matched_gt_times:
            continue

        ids_at_pass = endpoint_ids_at_pass(ev)
        for gid in ids_at_pass:
            if gid not in gt_ids:
                continue
            best: tuple[float, str, float, float] | None = None
            step = 0.1
            t0 = float(ev.get("timestamp", 0))
            scan_ts = [t0 + offset for offset in frange(-cfg.spatial_bridge_window_s, cfg.spatial_bridge_window_s, step)]
            for scan_t in scan_ts:
                match = best_worker_for_gt_at_time(
                    gid,
                    worker_ids,
                    gt_samples,
                    worker_samples,
                    scan_t,
                    cfg.spatial_time_tol_s,
                    cfg.spatial_threshold_px,
                )
                if match is None:
                    continue
                wid, dist, iou, score = match
                if best is None or score > best[0]:
                    best = (score, wid, dist, iou)

            if best is None:
                continue
            _, best_wid, best_dist, best_iou = best
            vote = get_or_create_vote(votes, best_wid, gid)
            record_spatial_hit(
                vote,
                best_dist,
                best_iou,
                f"spatial_bridge@{t0:.3f}s:dist={best_dist:.1f}px:iou={best_iou:.3f}",
                spatial_only=True,
            )


def frange(start: float, stop: float, step: float) -> list[float]:
    out: list[float] = []
    x = start
    while x <= stop + 1e-9:
        out.append(round(x, 3))
        x += step
    return out


def compute_pair_precision(pairs: list[dict[str, Any]], oracle: dict[str, str]) -> float:
    if not pairs:
        return 0.0
    tp = sum(
        1
        for p in pairs
        if oracle.get(p["gtTrackId"]) == p["workerTrackId"]
    )
    return round(tp / len(pairs), 4)


def resolve_pairs(
    votes: dict[tuple[str, str], PairVote],
    cfg: BuildConfig,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], int, int]:
    """Greedy 1:1 assignment + split/merge diagnostics."""
    eligible = [v for v in votes.values() if v.confidence >= cfg.map_confidence_min]
    eligible.sort(key=lambda v: v.confidence, reverse=True)

    worker_to_gt: dict[str, str] = {}
    gt_to_worker: dict[str, str] = {}
    pairs_out: list[dict[str, Any]] = []

    for vote in eligible:
        w, g = vote.worker_track_id, vote.gt_track_id
        if w in worker_to_gt or g in gt_to_worker:
            continue
        worker_to_gt[w] = g
        gt_to_worker[g] = w
        pairs_out.append(
            {
                "workerTrackId": w,
                "gtTrackId": g,
                "confidence": vote.confidence,
                "evidence": sorted(set(vote.evidence)),
                "reviewStatus": "auto",
                "gevEffective": round(vote.gev_effective, 3),
                "spatialHits": vote.spatial_hits,
                "spatialOnlyHits": vote.spatial_only_hits,
                "minDistPx": None if vote.min_dist_px == float("inf") else round(vote.min_dist_px, 2),
                "maxIou": round(vote.max_iou, 4),
            }
        )

    gt_candidates: dict[str, list[str]] = defaultdict(list)
    worker_candidates: dict[str, list[str]] = defaultdict(list)
    for vote in eligible:
        gt_candidates[vote.gt_track_id].append(vote.worker_track_id)
        worker_candidates[vote.worker_track_id].append(vote.gt_track_id)

    split_records = [
        {
            "gtTrackId": gt_id,
            "workerTrackIds": sorted(set(wids)),
            "selectedWorkerTrackId": gt_to_worker.get(gt_id),
        }
        for gt_id, wids in gt_candidates.items()
        if len(set(wids)) > 1
    ]
    merge_records = [
        {
            "workerTrackId": w_id,
            "gtTrackIds": sorted(set(gids)),
            "selectedGtTrackId": worker_to_gt.get(w_id),
        }
        for w_id, gids in worker_candidates.items()
        if len(set(gids)) > 1
    ]

    return pairs_out, split_records, merge_records, len(split_records), len(merge_records)


def build_alignment_map(
    *,
    gt_gev_path: Path,
    gt_registry_path: Path,
    worker_registry_path: Path,
    worker_gev_path: Path,
    gt_tracks_path: Path | None,
    worker_tracks_path: Path | None,
    output_dir: Path,
    cfg: BuildConfig,
    write_report: bool = True,
    oracle: dict[str, str] | None = None,
) -> dict[str, Any]:
    gt_doc = load_json(gt_gev_path)
    gt_passes = pass_events_from_gt(gt_doc)
    worker_passes = pass_events_from_jsonl(load_jsonl(worker_gev_path))

    gt_registry = load_json(gt_registry_path)
    worker_registry = load_json(worker_registry_path)
    endpoint_ids = gt_endpoint_ids(gt_passes)
    anchors = anchor_timestamps(gt_passes)

    gt_samples = index_person_track_samples(gt_tracks_path) if gt_tracks_path else {}
    worker_samples = index_person_track_samples(worker_tracks_path) if worker_tracks_path else {}
    worker_ids = person_track_ids(worker_registry)

    votes: dict[tuple[str, str], PairVote] = {}
    time_pairs = greedy_time_match_passes(gt_passes, worker_passes, cfg.timestamp_tolerance_s)
    accumulate_gev_votes(time_pairs, votes, cfg)
    accumulate_gev_spatial_fallback(
        time_pairs,
        gt_samples,
        worker_samples,
        votes,
        cfg,
    )
    accumulate_spatial_votes(
        anchors,
        endpoint_ids,
        worker_ids,
        gt_samples,
        worker_samples,
        votes,
        cfg,
    )
    accumulate_spatial_only_bridge(
        gt_passes,
        time_pairs,
        endpoint_ids,
        worker_ids,
        gt_samples,
        worker_samples,
        votes,
        cfg,
    )

    pairs, split_records, merge_records, split_count, merge_count = resolve_pairs(votes, cfg)

    mapped_gt = {p["gtTrackId"] for p in pairs}
    unmapped_gt = sorted(endpoint_ids - mapped_gt)
    mapped_workers = {p["workerTrackId"] for p in pairs}
    all_workers = person_track_ids(worker_registry)
    unmapped_worker = sorted(all_workers - mapped_workers)

    coverage = len(mapped_gt) / len(endpoint_ids) if endpoint_ids else 0.0
    oracle_map = oracle if oracle is not None else ORACLE_PAIRS
    pair_precision = compute_pair_precision(pairs, oracle_map)

    output_dir.mkdir(parents=True, exist_ok=True)
    map_path = output_dir / "alignment_map.json"
    map_doc = {
        "schemaVersion": SCHEMA_MAP,
        "clipId": cfg.clip_id,
        "gtRunId": cfg.gt_run_id,
        "workerRunId": cfg.worker_run_id,
        "createdAt": utc_now_iso(),
        "method": METHOD,
        "mapConfidenceMin": cfg.map_confidence_min,
        "pairs": pairs,
        "unmappedWorker": unmapped_worker,
        "unmappedGt": unmapped_gt,
        "alignmentCoverage": round(coverage, 4),
        "pairPrecisionOracle9": pair_precision,
        "splitRecords": split_records,
        "mergeRecords": merge_records,
        "stats": {
            "pairCount": len(pairs),
            "gtEndpointIdCount": len(endpoint_ids),
            "mappedGtIdCount": len(mapped_gt),
            "splitCount": split_count,
            "mergeCount": merge_count,
            "gevTimeMatchedPasses": len(time_pairs),
            "pairPrecisionOracle9": pair_precision,
        },
    }
    map_path.write_text(json.dumps(map_doc, ensure_ascii=False, indent=2), encoding="utf-8")

    report_path: Path | None = None
    if write_report:
        report_path = output_dir / "alignment_report.json"
        intersection = person_track_ids(gt_registry) & person_track_ids(worker_registry)
        report_doc = {
            "schemaVersion": SCHEMA_REPORT,
            "clipId": cfg.clip_id,
            "status": "pass" if coverage >= 0.8 and pair_precision >= 0.95 else "hold",
            "gtRunId": cfg.gt_run_id,
            "workerRunId": cfg.worker_run_id,
            "alignmentCoverage": round(coverage, 4),
            "pairPrecisionOracle9": pair_precision,
            "coverageGate": {"min": 0.8, "pass": coverage >= 0.8},
            "precisionGate": {"min": 0.95, "pass": pair_precision >= 0.95},
            "ambiguousPairs": [],
            "reviewQueue": [],
            "driftSummary": {
                "gtWorkerIdIntersection": len(intersection),
                "medianSenderIdDelta": None,
                "systemicDrift": len(intersection) == 0,
                "notes": "ByteTrack re-ID across runs; v2 hybrid bridge",
            },
            "pairDiagnostics": [
                {
                    "gtTrackId": p["gtTrackId"],
                    "workerTrackId": p["workerTrackId"],
                    "confidence": p["confidence"],
                    "gevEffective": p["gevEffective"],
                    "spatialHits": p["spatialHits"],
                    "spatialOnlyHits": p["spatialOnlyHits"],
                }
                for p in pairs
            ],
            "inputs": {
                "gtRegistry": str(gt_registry_path.resolve()),
                "workerRegistry": str(worker_registry_path.resolve()),
                "gtGev": str(gt_gev_path.resolve()),
                "workerGev": str(worker_gev_path.resolve()),
                "gtTracks": str(gt_tracks_path.resolve()) if gt_tracks_path else None,
                "workerTracks": str(worker_tracks_path.resolve()) if worker_tracks_path else None,
            },
        }
        report_path.write_text(json.dumps(report_doc, ensure_ascii=False, indent=2), encoding="utf-8")

    smoke = {
        "alignmentCoverage": round(coverage, 4),
        "alignmentPairs": len(pairs),
        "pairPrecision": pair_precision,
        "splitCount": split_count,
        "mergeCount": merge_count,
        "outputMap": str(map_path.resolve()),
        "outputReport": str(report_path.resolve()) if report_path else None,
        "coverageGatePass": coverage >= 0.8,
        "precisionGatePass": pair_precision >= 0.95,
    }
    return smoke


def main() -> int:
    parser = argparse.ArgumentParser(description="Build GT ↔ Worker alignment_map.json (I13 offline)")
    parser.add_argument("--gt-gev", type=Path, default=DEFAULT_GT_GEV)
    parser.add_argument("--gt-registry", type=Path, default=DEFAULT_GT_REGISTRY)
    parser.add_argument("--gt-tracks", type=Path, default=DEFAULT_GT_TRACKS)
    parser.add_argument("--worker-gev", type=Path, default=DEFAULT_WORKER_GEV)
    parser.add_argument("--worker-registry", type=Path, default=DEFAULT_WORKER_REGISTRY)
    parser.add_argument("--worker-tracks", type=Path, default=DEFAULT_WORKER_TRACKS)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--clip-id", default="pass01_clip_002")
    parser.add_argument("--gt-run-id", default="pass01_clip_002")
    parser.add_argument("--worker-run-id", default="rc4_m1_pass01_clip_002")
    parser.add_argument("--map-confidence-min", type=float, default=0.6)
    parser.add_argument("--spatial-threshold-px", type=float, default=120.0)
    parser.add_argument("--no-report", action="store_true")
    args = parser.parse_args()

    for label, path in (
        ("gt-gev", args.gt_gev),
        ("gt-registry", args.gt_registry),
        ("worker-gev", args.worker_gev),
        ("worker-registry", args.worker_registry),
    ):
        if not path.is_file():
            print(f"[alignment] ERROR missing {label}: {path}", file=sys.stderr)
            return EXIT_VALIDATION

    cfg = BuildConfig(
        map_confidence_min=args.map_confidence_min,
        spatial_threshold_px=args.spatial_threshold_px,
        clip_id=args.clip_id,
        gt_run_id=args.gt_run_id,
        worker_run_id=args.worker_run_id,
    )

    smoke = build_alignment_map(
        gt_gev_path=args.gt_gev,
        gt_registry_path=args.gt_registry,
        worker_registry_path=args.worker_registry,
        worker_gev_path=args.worker_gev,
        gt_tracks_path=args.gt_tracks if args.gt_tracks.is_file() else None,
        worker_tracks_path=args.worker_tracks if args.worker_tracks.is_file() else None,
        output_dir=args.output_dir,
        cfg=cfg,
        write_report=not args.no_report,
    )

    print("[alignment] Smoke summary (v2)")
    print(f"  alignmentCoverage = {smoke['alignmentCoverage']}")
    print(f"  alignmentPairs    = {smoke['alignmentPairs']}")
    print(f"  pairPrecision     = {smoke['pairPrecision']}  (oracle 9)")
    print(f"  splitCount        = {smoke['splitCount']}")
    print(f"  mergeCount        = {smoke['mergeCount']}")
    print(f"  coverageGatePass  = {smoke['coverageGatePass']}")
    print(f"  precisionGatePass = {smoke['precisionGatePass']}")
    print(f"  outputMap         = {smoke['outputMap']}")
    if smoke.get("outputReport"):
        print(f"  outputReport      = {smoke['outputReport']}")
    return EXIT_SUCCESS


if __name__ == "__main__":
    raise SystemExit(main())
