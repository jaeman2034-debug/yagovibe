#!/usr/bin/env python3
"""
I13-5 — Pass Network Parser.

Normalizes GEV PASS events: receiver resolution, camera cuts, ranking, tiers, windows.
Read-only on GEV/Tracking engines. No Firestore / Callable.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCHEMA_NORMALIZED = "i13-pass-network-normalized-v1"
PARSER_VERSION = "0.1.0-p0"
DEFAULT_MIN_CONFIRM = 0.55
DEFAULT_CANDIDATE_FLOOR = 0.45
DEFAULT_CAMERA_CUT_GAP_S = 2.0
DEFAULT_RECEIVE_PAIR_TOLERANCE_S = 0.15
DEFAULT_MAX_PASS_DISTANCE_M = 60.0


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        return []
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def load_registry(path: Path | None) -> dict[str, Any]:
    if path is None or not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def load_roster(path: Path | None) -> dict[str, str]:
    """trackId -> playerId"""
    if path is None or not path.is_file():
        return {}
    doc = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(doc, dict) and "mappings" in doc:
        raw = doc["mappings"]
    else:
        raw = doc
    if not isinstance(raw, dict):
        return {}
    return {str(k): str(v) for k, v in raw.items()}


@dataclass
class ParserConfig:
    min_confirm_confidence: float = DEFAULT_MIN_CONFIRM
    candidate_floor: float = DEFAULT_CANDIDATE_FLOOR
    camera_cut_gap_s: float = DEFAULT_CAMERA_CUT_GAP_S
    receive_pair_tolerance_s: float = DEFAULT_RECEIVE_PAIR_TOLERANCE_S
    max_pass_distance_m: float = DEFAULT_MAX_PASS_DISTANCE_M


@dataclass
class ParseResult:
    confirmed: list[dict[str, Any]]
    rejected: list[dict[str, Any]]
    candidate_only: list[dict[str, Any]]
    windows: dict[str, list[dict[str, Any]]]
    camera_cuts: list[float]
    rejection_reasons: dict[str, int]
    meta: dict[str, Any] = field(default_factory=dict)


def person_tracks(registry: dict[str, Any]) -> list[dict[str, Any]]:
    tracks = registry.get("tracks") if isinstance(registry.get("tracks"), list) else []
    return [t for t in tracks if str(t.get("class", "")) == "person"]


def track_positions(registry: dict[str, Any]) -> dict[str, tuple[float, float]]:
    out: dict[str, tuple[float, float]] = {}
    for t in person_tracks(registry):
        tid = str(t.get("trackId", ""))
        pos = t.get("positionAvg") or t.get("avgPosition")
        if tid and isinstance(pos, dict):
            out[tid] = (float(pos.get("x", 0.5)), float(pos.get("y", 0.5)))
    return out


def pitch_distance_m(
    a: tuple[float, float] | None,
    b: tuple[float, float] | None,
    pitch_length_m: float = 105.0,
) -> float:
    if a is None or b is None:
        return 0.0
    dx = (b[0] - a[0]) * pitch_length_m
    dy = (b[1] - a[1]) * pitch_length_m * 0.68
    return (dx * dx + dy * dy) ** 0.5


def build_receive_index(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        e
        for e in events
        if str(e.get("eventType", "")).upper() == "RECEIVE"
    ]


def resolve_receiver(
    pass_ev: dict[str, Any],
    receives: list[dict[str, Any]],
    tolerance_s: float,
) -> str | None:
    to_id = str(pass_ev.get("toTrackId") or "").strip()
    if to_id.startswith("P"):
        return to_id

    ts = float(pass_ev.get("timestamp") or 0)
    fr = str(pass_ev.get("fromTrackId") or "")
    best: tuple[float, str] | None = None

    for rcv in receives:
        rts = float(rcv.get("timestamp") or 0)
        if abs(rts - ts) > tolerance_s:
            continue
        rfr = str(rcv.get("fromTrackId") or "")
        rto = str(rcv.get("toTrackId") or "")
        if rfr == fr and rto.startswith("P"):
            dist = abs(rts - ts)
            if best is None or dist < best[0]:
                best = (dist, rto)
        elif rto.startswith("P") and not fr:
            dist = abs(rts - ts)
            if best is None or dist < best[0]:
                best = (dist, rto)

    return best[1] if best else None


def detect_camera_cuts(timestamps: list[float], gap_s: float) -> list[float]:
    if not timestamps:
        return []
    sorted_ts = sorted(timestamps)
    cuts: list[float] = []
    for i in range(len(sorted_ts) - 1):
        gap = sorted_ts[i + 1] - sorted_ts[i]
        if gap >= gap_s:
            cuts.append(sorted_ts[i + 1])
    return cuts


def dedupe_pass_candidates(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    passes = [e for e in events if str(e.get("eventType", "")).upper() == "PASS"]
    seen: set[tuple[Any, ...]] = set()
    out: list[dict[str, Any]] = []
    for p in passes:
        ts = round(float(p.get("timestamp", 0)), 3)
        fr = str(p.get("fromTrackId") or "")
        to = str(p.get("toTrackId") or "")
        key = (ts, fr, to)
        if key in seen:
            continue
        seen.add(key)
        out.append(dict(p))
    return out


def rank_multiple_candidates(
    candidates: list[dict[str, Any]],
    positions: dict[str, tuple[float, float]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Pick winner per (fromTrack, time bucket); superseded -> rejected."""
    buckets: dict[tuple[str, float], list[dict[str, Any]]] = defaultdict(list)
    for ev in candidates:
        fr = str(ev.get("fromTrackId") or "")
        bucket_t = round(float(ev.get("timestamp", 0)), 1)
        buckets[(fr, bucket_t)].append(ev)

    winners: list[dict[str, Any]] = []
    superseded: list[dict[str, Any]] = []

    for _, group in buckets.items():
        if len(group) == 1:
            winners.append(group[0])
            continue

        def sort_key(ev: dict[str, Any]) -> tuple[float, float]:
            conf = float(ev.get("confidence") or 0.0)
            fr = str(ev.get("fromTrackId") or "")
            to = str(ev.get("toTrackId") or "")
            dist = pitch_distance_m(positions.get(fr), positions.get(to))
            return (-conf, dist)

        ranked = sorted(group, key=sort_key)
        winners.append(ranked[0])
        for loser in ranked[1:]:
            superseded.append({**loser, "reason": "MULTI_CANDIDATE_SUPERSEDED"})

    winners.sort(key=lambda e: float(e.get("timestamp") or 0))
    return winners, superseded


def apply_roster(events: list[dict[str, Any]], roster: dict[str, str]) -> None:
    for ev in events:
        fr = str(ev.get("fromTrackId") or "")
        to = str(ev.get("toTrackId") or "")
        if fr in roster:
            ev["fromPlayerId"] = roster[fr]
        if to in roster:
            ev["toPlayerId"] = roster[to]


def merge_windows(
    confirmed: list[dict[str, Any]],
    duration_s: float,
) -> dict[str, list[dict[str, Any]]]:
    half = (duration_s or 90 * 60) / 2
    end = duration_s or 1e9

    def slice_events(t0: float, t1: float) -> list[dict[str, Any]]:
        return [e for e in confirmed if t0 <= float(e["timestamp"]) < t1]

    return {
        "full": slice_events(0, end),
        "h1": slice_events(0, half),
        "h2": slice_events(half, end),
    }


def parse_gev_events(
    events: list[dict[str, Any]],
    registry: dict[str, Any],
    *,
    roster: dict[str, str] | None = None,
    cfg: ParserConfig | None = None,
    duration_s: float | None = None,
) -> ParseResult:
    cfg = cfg or ParserConfig()
    roster = roster or {}
    positions = track_positions(registry)
    receives = build_receive_index(events)

    raw_candidates = dedupe_pass_candidates(events)
    pass_timestamps = [float(e.get("timestamp") or 0) for e in raw_candidates]
    camera_cuts = detect_camera_cuts(pass_timestamps, cfg.camera_cut_gap_s)

    resolved: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    reasons: dict[str, int] = defaultdict(int)

    for ev in raw_candidates:
        fr = str(ev.get("fromTrackId") or "")
        if not fr.startswith("P"):
            rejected.append({**ev, "reason": "TRACK_LOST"})
            reasons["TRACK_LOST"] += 1
            continue

        to = resolve_receiver(ev, receives, cfg.receive_pair_tolerance_s)
        if not to:
            rejected.append({**ev, "reason": "RECEIVER_MISSING"})
            reasons["RECEIVER_MISSING"] += 1
            continue

        ev = {**ev, "toTrackId": to}
        if fr == to:
            rejected.append({**ev, "reason": "SELF_PASS"})
            reasons["SELF_PASS"] += 1
            continue

        resolved.append(ev)

    ranked, superseded = rank_multiple_candidates(resolved, positions)
    for s in superseded:
        rejected.append(s)
        reasons["MULTI_CANDIDATE_SUPERSEDED"] += 1

    confirmed: list[dict[str, Any]] = []
    candidate_only: list[dict[str, Any]] = []

    for ev in ranked:
        conf = float(ev.get("confidence") or 0.7)
        fr = ev["fromTrackId"]
        to = ev["toTrackId"]
        ts = float(ev.get("timestamp") or 0)
        dist = pitch_distance_m(positions.get(fr), positions.get(to))

        if dist > cfg.max_pass_distance_m:
            rejected.append({**ev, "reason": "DISTANCE_SANITY", "detail": round(dist, 2)})
            reasons["DISTANCE_SANITY"] += 1
            continue

        normalized = {
            "eventType": "PASS",
            "timestamp": ts,
            "frame": ev.get("frame"),
            "fromTrackId": fr,
            "toTrackId": to,
            "confidence": conf,
            "distanceM": round(dist, 2),
        }

        if conf >= cfg.min_confirm_confidence:
            confirmed.append(normalized)
        elif conf >= cfg.candidate_floor:
            candidate_only.append({**normalized, "tier": "candidate_only"})
            reasons["CANDIDATE_ONLY"] += 1
        else:
            rejected.append({**normalized, "reason": "LOW_CONFIDENCE", "detail": conf})
            reasons["LOW_CONFIDENCE"] += 1

    apply_roster(confirmed, roster)
    apply_roster(candidate_only, roster)
    apply_roster(rejected, roster)

    dur = duration_s
    if dur is None:
        dur = float(registry.get("durationS") or registry.get("duration_s") or 0)
    windows = merge_windows(confirmed, dur)

    return ParseResult(
        confirmed=confirmed,
        rejected=rejected,
        candidate_only=candidate_only,
        windows=windows,
        camera_cuts=camera_cuts,
        rejection_reasons=dict(reasons),
        meta={
            "parserVersion": PARSER_VERSION,
            "rawPassCount": len(raw_candidates),
            "cameraCutCount": len(camera_cuts),
        },
    )


def parse_from_canonical_jsonl(
    canonical_path: Path,
    *,
    registry: dict[str, Any] | None = None,
    roster: dict[str, str] | None = None,
    cfg: ParserConfig | None = None,
    duration_s: float | None = None,
) -> ParseResult:
    """Re-normalize existing events_canonical.jsonl (tier/window enrichment)."""
    events = load_jsonl(canonical_path)
    wrapped = [
        {**e, "eventType": "PASS", "confidence": e.get("confidence", 0.72)}
        for e in events
    ]
    return parse_gev_events(
        wrapped,
        registry or {},
        roster=roster,
        cfg=cfg,
        duration_s=duration_s,
    )


def to_normalized_document(result: ParseResult) -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_NORMALIZED,
        "parserVersion": PARSER_VERSION,
        "generatedAt": utc_now_iso(),
        "confirmed": result.confirmed,
        "rejected": result.rejected,
        "candidateOnly": result.candidate_only,
        "windows": result.windows,
        "cameraCuts": result.camera_cuts,
        "rejectionReasons": result.rejection_reasons,
        "meta": result.meta,
    }


def write_normalized(path: Path, result: ParseResult) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(to_normalized_document(result), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="I13-5 Pass Network Parser")
    parser.add_argument("--gev", type=Path, help="gev_events.jsonl (primary input)")
    parser.add_argument(
        "--input",
        type=Path,
        help="events_canonical.jsonl (re-normalize mode)",
    )
    parser.add_argument("--registry", type=Path, help="tracks_registry.json")
    parser.add_argument("--roster", type=Path, help="trackId->playerId JSON")
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="normalized_events.json output path",
    )
    parser.add_argument("--min-confidence", type=float, default=DEFAULT_MIN_CONFIRM)
    parser.add_argument("--camera-cut-gap", type=float, default=DEFAULT_CAMERA_CUT_GAP_S)
    args = parser.parse_args(argv)

    if not args.gev and not args.input:
        parser.error("one of --gev or --input is required")

    cfg = ParserConfig(
        min_confirm_confidence=args.min_confidence,
        camera_cut_gap_s=args.camera_cut_gap,
    )
    roster = load_roster(args.roster)
    registry = load_registry(args.registry)

    if args.gev:
        events = load_jsonl(args.gev)
        if not events:
            print("[I13-5-parser] ERROR empty gev input", file=sys.stderr)
            return 1
        result = parse_gev_events(events, registry, roster=roster, cfg=cfg)
    else:
        result = parse_from_canonical_jsonl(
            args.input,
            registry=registry,
            roster=roster,
            cfg=cfg,
        )

    write_normalized(args.output, result)
    print(
        f"[I13-5-parser] confirmed={len(result.confirmed)} "
        f"rejected={len(result.rejected)} candidate_only={len(result.candidate_only)} "
        f"camera_cuts={len(result.camera_cuts)}",
        flush=True,
    )
    return 0 if result.confirmed else 3


if __name__ == "__main__":
    raise SystemExit(main())
