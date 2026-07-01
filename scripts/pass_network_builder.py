#!/usr/bin/env python3
"""
I13-5 — Pass Network Offline Builder (Phase 1).

Reads GEV + tracks_registry (read-only). Writes local artifacts only.
No Firestore, no Callable, no GEV/Tracking engine changes.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
import time
import traceback
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from pass_network_parser import ParserConfig, parse_gev_events, to_normalized_document, write_normalized
from pass_network_generator import generate_from_normalized, write_generator_outputs

SCHEMA_MANIFEST = "i13-pass-network-builder-manifest-v1"
SCHEMA_SUMMARY = "i13-pass-network-v1"
BUILDER_VERSION = "0.1.0-p2"
DEFAULT_MIN_CONFIDENCE = 0.55
DEFAULT_QUEUE_ROOT = Path(r"D:\YAGO_AI\runs\tacticalV2\queue")

EXIT_SUCCESS = 0
EXIT_VALIDATION = 1
EXIT_RUNTIME = 2
EXIT_PARTIAL = 3


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


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


def load_registry(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


class JsonlLogger:
    def __init__(self, path: Path | None) -> None:
        self.path = path
        self._fh = path.open("w", encoding="utf-8") if path else None

    def log(
        self,
        level: str,
        phase: str,
        message: str,
        job_id: str | None = None,
        duration_ms: int | None = None,
        extra: dict[str, Any] | None = None,
    ) -> None:
        rec = {
            "ts": utc_now_iso(),
            "level": level,
            "phase": phase,
            "message": message,
        }
        if job_id:
            rec["jobId"] = job_id
        if duration_ms is not None:
            rec["durationMs"] = duration_ms
        if extra:
            rec["extra"] = extra
        line = json.dumps(rec, ensure_ascii=False)
        print(f"[I13-5] phase={phase} level={level} {message}", flush=True)
        if self._fh:
            self._fh.write(line + "\n")
            self._fh.flush()

    def close(self) -> None:
        if self._fh:
            self._fh.close()


@dataclass
class BuilderConfig:
    min_confirm_confidence: float = DEFAULT_MIN_CONFIDENCE
    max_pass_distance_m: float = 60.0
    partial_persist_threshold: float = 0.5
    time_windows: list[str] = field(default_factory=lambda: ["full", "h1", "h2"])
    roster_path: Path | None = None


@dataclass
class BuildResult:
    exit_code: int
    exit_status: str
    graph_hash: str
    confirmed: list[dict[str, Any]]
    rejected: list[dict[str, Any]]
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    rejection_reasons: dict[str, int]
    degraded: bool
    timings_ms: dict[str, int]


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


def load_roster(path: Path | None) -> dict[str, str]:
    if path is None or not path.is_file():
        return {}
    doc = json.loads(path.read_text(encoding="utf-8"))
    raw = doc.get("mappings", doc) if isinstance(doc, dict) else {}
    return {str(k): str(v) for k, v in raw.items()} if isinstance(raw, dict) else {}


def compute_graph_hash(confirmed: list[dict[str, Any]], cfg: BuilderConfig) -> str:
    payload = {
        "confirmed": sorted(
            confirmed,
            key=lambda e: (e.get("timestamp"), e.get("fromTrackId"), e.get("toTrackId")),
        ),
        "minConf": cfg.min_confirm_confidence,
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:16]


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def run_build(
    gev_path: Path,
    registry_path: Path,
    output_dir: Path,
    *,
    job_id: str | None = None,
    match_id: str | None = None,
    team_id: str | None = None,
    analysis_id: str | None = None,
    force: bool = False,
    dry_run: bool = False,
    cfg: BuilderConfig | None = None,
) -> BuildResult:
    cfg = cfg or BuilderConfig()
    job_id = job_id or str(uuid.uuid4())
    timings: dict[str, int] = {}
    t0 = time.perf_counter()

    if not dry_run:
        output_dir.mkdir(parents=True, exist_ok=True)
    log_path = output_dir / "builder.log" if not dry_run else None
    logger = JsonlLogger(log_path)
    logger.log("INFO", "ingest", "status=start", job_id=job_id)

    if not gev_path.is_file():
        logger.close()
        raise ValidationError("INGEST_GEV_MISSING", f"gev not found: {gev_path}")
    if not registry_path.is_file():
        logger.close()
        raise ValidationError("INGEST_REGISTRY_INVALID", f"registry not found: {registry_path}")

    t_ingest = time.perf_counter()
    events = load_jsonl(gev_path)
    registry = load_registry(registry_path)
    positions = track_positions(registry)
    timings["ingest_duration_ms"] = int((time.perf_counter() - t_ingest) * 1000)

    if not events:
        logger.close()
        raise ValidationError("INGEST_GEV_MISSING", "gev_events empty")

    pass_count = sum(1 for e in events if str(e.get("eventType", "")).upper() == "PASS")
    if pass_count == 0:
        logger.close()
        raise ValidationError("INGEST_NO_PASS_EVENTS", "no PASS events in gev")

    logger.log(
        "INFO",
        "ingest",
        f"status=done events={len(events)} passes={pass_count}",
        job_id=job_id,
        duration_ms=timings["ingest_duration_ms"],
    )

    t_confirm = time.perf_counter()
    parser_cfg = ParserConfig(
        min_confirm_confidence=cfg.min_confirm_confidence,
        max_pass_distance_m=cfg.max_pass_distance_m,
    )
    roster = load_roster(cfg.roster_path)
    parsed = parse_gev_events(
        events,
        registry,
        roster=roster,
        cfg=parser_cfg,
        duration_s=float(registry.get("durationS") or registry.get("duration_s") or 0),
    )
    confirmed = parsed.confirmed
    rejected = parsed.rejected + parsed.candidate_only
    reasons = parsed.rejection_reasons
    candidate_n = parsed.meta.get("rawPassCount", len(confirmed) + len(rejected))
    logger.log(
        "INFO",
        "parser",
        f"confirmed={len(confirmed)} rejected={len(rejected)} "
        f"candidate_only={len(parsed.candidate_only)} camera_cuts={len(parsed.camera_cuts)}",
        job_id=job_id,
    )
    timings["confirm_duration_ms"] = int((time.perf_counter() - t_confirm) * 1000)

    t_net = time.perf_counter()
    duration_s = float(registry.get("durationS") or registry.get("duration_s") or 0)
    normalized_doc = to_normalized_document(parsed)
    generated = generate_from_normalized(
        normalized_doc,
        positions=positions,
        duration_s=duration_s,
    )
    nodes, edges = generated.nodes, generated.edges
    graph_hash = compute_graph_hash(confirmed, cfg)
    timings["network_duration_ms"] = int((time.perf_counter() - t_net) * 1000)

    candidate_n = int(candidate_n)
    confirm_ratio = len(confirmed) / candidate_n if candidate_n else 0.0
    degraded = len(rejected) > 0 and confirm_ratio < 1.0
    partial = degraded and confirm_ratio >= cfg.partial_persist_threshold

    if not confirmed:
        exit_code = EXIT_PARTIAL if partial else EXIT_VALIDATION
        exit_status = "partial" if partial else "failed"
    elif degraded:
        exit_code = EXIT_PARTIAL
        exit_status = "partial"
    else:
        exit_code = EXIT_SUCCESS
        exit_status = "success"

    timings["total_duration_ms"] = int((time.perf_counter() - t0) * 1000)

    if dry_run:
        logger.log("INFO", "persist", "dry-run skip write", job_id=job_id)
        logger.close()
        return BuildResult(
            exit_code=exit_code,
            exit_status=exit_status,
            graph_hash=graph_hash,
            confirmed=confirmed,
            rejected=rejected,
            nodes=nodes,
            edges=edges,
            rejection_reasons=reasons,
            degraded=degraded,
            timings_ms=timings,
        )

    incomplete = output_dir / ".incomplete"
    if output_dir.exists() and any(output_dir.iterdir()) and not force:
        manifest_existing = output_dir / "manifest.json"
        if manifest_existing.is_file():
            old = json.loads(manifest_existing.read_text(encoding="utf-8"))
            if old.get("graphHash") == graph_hash:
                logger.log("INFO", "persist", "IDEMPOTENT_SKIP", job_id=job_id)
                logger.close()
                return BuildResult(
                    exit_code=EXIT_SUCCESS,
                    exit_status="success",
                    graph_hash=graph_hash,
                    confirmed=confirmed,
                    rejected=rejected,
                    nodes=nodes,
                    edges=edges,
                    rejection_reasons=reasons,
                    degraded=degraded,
                    timings_ms=timings,
                )

    output_dir.mkdir(parents=True, exist_ok=True)
    incomplete.write_text("building", encoding="utf-8")

    try:
        write_jsonl(output_dir / "events_canonical.jsonl", confirmed)
        write_jsonl(output_dir / "rejected.jsonl", rejected)
        write_normalized(output_dir / "normalized_events.json", parsed)
        write_generator_outputs(output_dir, generated)

        hub_track = generated.hub_track_id or generated.metrics.get("hubTrackId")
        summary = {
            "schemaVersion": SCHEMA_SUMMARY,
            "matchId": match_id,
            "teamId": team_id,
            "sourceAnalysisId": analysis_id,
            "generatedAt": utc_now_iso(),
            "pipelineVersion": BUILDER_VERSION,
            "metrics": {
                "totalPasses": candidate_n,
                "confirmedPasses": len(confirmed),
                "candidatePasses": candidate_n,
                "completionRate": round(len(confirmed) / candidate_n, 4) if candidate_n else 0,
                "avgPassDistanceM": round(
                    sum(e.get("distanceM", 0) for e in confirmed) / len(confirmed), 2
                )
                if confirmed
                else 0,
                "hubTrackId": hub_track,
            },
            "nodes": nodes[:50],
            "edges": edges[:100],
            "qc": {
                "degraded": degraded,
                "orphanTrackPct": 0.0,
                "rejectionReasons": reasons,
            },
        }
        (output_dir / "summary.json").write_text(
            json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        manifest = {
            "schemaVersion": SCHEMA_MANIFEST,
            "builderVersion": BUILDER_VERSION,
            "matchId": match_id,
            "teamId": team_id,
            "analysisId": analysis_id,
            "inputs": {
                "gev": {
                    "path": str(gev_path.resolve()),
                    "sha256": sha256_file(gev_path),
                    "eventCount": len(events),
                },
                "registry": {
                    "path": str(registry_path.resolve()),
                    "sha256": sha256_file(registry_path),
                    "trackCount": len(person_tracks(registry)),
                },
            },
            "outputs": {
                "summary": "summary.json",
                "eventsCanonical": "events_canonical.jsonl",
                "rejected": "rejected.jsonl",
                "normalized": "normalized_events.json",
                "graph": "graph.json",
                "nodes": "nodes.json",
                "edges": "edges.json",
                "metrics": "metrics.json",
                "windows": "windows/",
            },
            "graphHash": graph_hash,
            "startedAt": utc_now_iso(),
            "completedAt": utc_now_iso(),
            "exitStatus": exit_status,
            "timings": timings,
            "qc": {"degraded": degraded, "rejectionReasons": reasons},
        }
        (output_dir / "manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        logger.log("INFO", "persist", f"status=done graph_hash={graph_hash}", job_id=job_id)
    finally:
        if incomplete.exists():
            incomplete.unlink()
        logger.close()

    return BuildResult(
        exit_code=exit_code,
        exit_status=exit_status,
        graph_hash=graph_hash,
        confirmed=confirmed,
        rejected=rejected,
        nodes=nodes,
        edges=edges,
        rejection_reasons=reasons,
        degraded=degraded,
        timings_ms=timings,
    )


class ValidationError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def process_queue(queue_root: Path, *, force: bool = False, retry: int = 0) -> int:
    for sub in ("pending", "processing", "completed", "failed"):
        (queue_root / sub).mkdir(parents=True, exist_ok=True)

    worst = EXIT_SUCCESS
    pending_files = sorted((queue_root / "pending").glob("*.json"))
    for job_file in pending_files:
        job_id = job_file.stem
        processing = queue_root / "processing" / job_file.name
        shutil.move(str(job_file), str(processing))
        job = json.loads(processing.read_text(encoding="utf-8"))
        attempt = int(job.get("attempt") or 0) + 1
        job["attempt"] = attempt

        try:
            result = run_build(
                Path(job["gevPath"]),
                Path(job["registryPath"]),
                Path(job["outputDir"]),
                job_id=job_id,
                match_id=job.get("matchId"),
                team_id=job.get("teamId"),
                analysis_id=job.get("analysisId"),
                force=force,
            )
            job["exitCode"] = result.exit_code
            job["graphHash"] = result.graph_hash
            dest = queue_root / ("completed" if result.exit_code in (EXIT_SUCCESS, EXIT_PARTIAL) else "failed")
            dest_job = dest / job_file.name
            dest_job.write_text(json.dumps(job, ensure_ascii=False, indent=2), encoding="utf-8")
            processing.unlink()
            worst = max(worst, result.exit_code)
        except ValidationError as exc:
            job["error"] = {"code": exc.code, "message": str(exc)}
            if attempt <= retry:
                job["attempt"] = attempt
                shutil.move(str(processing), str(queue_root / "pending" / job_file.name))
                processing_retry = queue_root / "pending" / job_file.name
                processing_retry.write_text(json.dumps(job, ensure_ascii=False, indent=2), encoding="utf-8")
            else:
                failed = queue_root / "failed" / job_file.name
                failed.write_text(json.dumps(job, ensure_ascii=False, indent=2), encoding="utf-8")
                processing.unlink()
            worst = max(worst, EXIT_VALIDATION)
        except Exception as exc:
            job["error"] = {"code": "RUNTIME", "message": str(exc), "trace": traceback.format_exc()}
            failed = queue_root / "failed" / job_file.name
            failed.write_text(json.dumps(job, ensure_ascii=False, indent=2), encoding="utf-8")
            if processing.exists():
                processing.unlink()
            worst = max(worst, EXIT_RUNTIME)

    return worst


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="I13-5 Pass Network Offline Builder")
    parser.add_argument("--gev", type=Path, help="gev_events.jsonl path")
    parser.add_argument("--registry", type=Path, help="tracks_registry.json path")
    parser.add_argument("--output-dir", type=Path, help="output directory")
    parser.add_argument("--job-id", type=str, default=None, help="optional job id")
    parser.add_argument("--match-id", type=str, default=None)
    parser.add_argument("--team-id", type=str, default=None)
    parser.add_argument("--analysis-id", type=str, default=None)
    parser.add_argument("--roster", type=Path, default=None, help="trackId->playerId JSON")
    parser.add_argument("--retry", type=int, default=0, help="queue retry max attempts")
    parser.add_argument("--force", action="store_true", help="overwrite existing output")
    parser.add_argument("--dry-run", action="store_true", help="validate only, no write")
    parser.add_argument("--process-queue", action="store_true", help="process file queue")
    parser.add_argument("--queue-dir", type=Path, default=DEFAULT_QUEUE_ROOT)
    args = parser.parse_args(argv)

    if args.process_queue:
        return process_queue(args.queue_dir, force=args.force, retry=args.retry)

    if not args.gev or not args.registry or not args.output_dir:
        parser.error("--gev, --registry, and --output-dir are required (unless --process-queue)")

    build_cfg = BuilderConfig(roster_path=args.roster)
    attempts = max(1, args.retry + 1)
    last_exc: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            result = run_build(
                args.gev,
                args.registry,
                args.output_dir,
                job_id=args.job_id,
                match_id=args.match_id,
                team_id=args.team_id,
                analysis_id=args.analysis_id,
                force=args.force,
                dry_run=args.dry_run,
                cfg=build_cfg,
            )
            return result.exit_code
        except ValidationError:
            return EXIT_VALIDATION
        except Exception as exc:
            last_exc = exc
            if attempt < attempts:
                time.sleep(min(30 * attempt, 120))
                continue
            print(f"[I13-5] RUNTIME_ERROR {exc}", file=sys.stderr)
            traceback.print_exc()
            return EXIT_RUNTIME

    if last_exc:
        return EXIT_RUNTIME
    return EXIT_RUNTIME


if __name__ == "__main__":
    raise SystemExit(main())
