#!/usr/bin/env python3
"""
I13-5 — Pass Network Local Persist (P0).

Validates, atomically promotes, and verifies offline pass-network artifacts.
No Firestore, GCS, Callable, or Worker integration.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCHEMA_MANIFEST = "i13-pass-network-builder-manifest-v1"
SCHEMA_SUMMARY = "i13-pass-network-v1"
SCHEMA_NORMALIZED = "i13-pass-network-normalized-v1"
SCHEMA_GRAPH = "i13-pass-network-graph-v1"
PERSIST_VERSION = "0.1.0-p0"
DEFAULT_MIN_CONFIDENCE = 0.55

EXIT_SUCCESS = 0
EXIT_FAIL = 1
EXIT_MANIFEST_MISSING = 2
EXIT_PARTIAL = 3

REQUIRED_ROOT_FILES = (
    "summary.json",
    "normalized_events.json",
    "graph.json",
    "nodes.json",
    "edges.json",
    "metrics.json",
    "events_canonical.jsonl",
    "rejected.jsonl",
)
REQUIRED_WINDOWS = ("full.json", "h1.json", "h2.json")
SUPPORTED_SCHEMA_VERSIONS = {
    "manifest": {SCHEMA_MANIFEST},
    "summary": {SCHEMA_SUMMARY},
    "normalized": {SCHEMA_NORMALIZED},
    "graph": {SCHEMA_GRAPH},
    "metrics": {SCHEMA_GRAPH},
}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    text = path.read_text(encoding="utf-8")
    for line in text.splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def compute_graph_hash(
    confirmed: list[dict[str, Any]],
    min_confidence: float = DEFAULT_MIN_CONFIDENCE,
) -> str:
    payload = {
        "confirmed": sorted(
            confirmed,
            key=lambda e: (e.get("timestamp"), e.get("fromTrackId"), e.get("toTrackId")),
        ),
        "minConf": min_confidence,
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:16]


@dataclass
class ValidationResult:
    ok: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    degraded: bool = False
    graph_hash: str | None = None
    exit_code: int = EXIT_SUCCESS

    @property
    def partial_acceptable(self) -> bool:
        return self.degraded and self.ok


def _reason_code(row: dict[str, Any]) -> str | None:
    return row.get("reasonCode") or row.get("reason")


def validate(
    root: Path,
    *,
    require_manifest: bool = True,
    check_input_hashes: bool = True,
    min_confidence: float = DEFAULT_MIN_CONFIDENCE,
    allow_incomplete: bool = False,
) -> ValidationResult:
    root = root.resolve()
    result = ValidationResult(ok=True, exit_code=EXIT_SUCCESS)

    if not root.is_dir():
        result.ok = False
        result.errors.append("PERSIST_ROOT_MISSING")
        result.exit_code = EXIT_MANIFEST_MISSING
        return result

    incomplete = root / ".incomplete"
    if incomplete.exists() and not allow_incomplete:
        result.ok = False
        result.errors.append("PERSIST_INCOMPLETE_MARKER")
        result.exit_code = EXIT_FAIL
        return result

    manifest_path = root / "manifest.json"
    if require_manifest and not manifest_path.is_file():
        result.ok = False
        result.errors.append("PERSIST_MANIFEST_MISSING")
        result.exit_code = EXIT_MANIFEST_MISSING
        return result

    for name in REQUIRED_ROOT_FILES:
        if not (root / name).is_file():
            result.ok = False
            result.errors.append(f"PERSIST_FILE_MISSING:{name}")
    windows_dir = root / "windows"
    if not windows_dir.is_dir():
        result.ok = False
        result.errors.append("PERSIST_WINDOWS_INCOMPLETE")
    else:
        for name in REQUIRED_WINDOWS:
            if not (windows_dir / name).is_file():
                result.ok = False
                result.errors.append(f"PERSIST_WINDOWS_INCOMPLETE:{name}")

    if not result.ok:
        result.exit_code = EXIT_FAIL
        return result

    try:
        manifest = load_json(manifest_path) if manifest_path.is_file() else {}
        summary = load_json(root / "summary.json")
        normalized = load_json(root / "normalized_events.json")
        graph = load_json(root / "graph.json")
        nodes = load_json(root / "nodes.json")
        edges = load_json(root / "edges.json")
        metrics = load_json(root / "metrics.json")
    except (json.JSONDecodeError, OSError) as exc:
        result.ok = False
        result.errors.append(f"PERSIST_PARSE_ERROR:{exc}")
        result.exit_code = EXIT_FAIL
        return result

    if manifest_path.is_file():
        sv = manifest.get("schemaVersion")
        if sv not in SUPPORTED_SCHEMA_VERSIONS["manifest"]:
            result.ok = False
            result.errors.append(f"PERSIST_VERSION_MISMATCH:manifest:{sv}")

    if summary.get("schemaVersion") not in SUPPORTED_SCHEMA_VERSIONS["summary"]:
        result.ok = False
        result.errors.append(f"PERSIST_VERSION_MISMATCH:summary:{summary.get('schemaVersion')}")

    if normalized.get("schemaVersion") not in SUPPORTED_SCHEMA_VERSIONS["normalized"]:
        result.ok = False
        result.errors.append(
            f"PERSIST_VERSION_MISMATCH:normalized:{normalized.get('schemaVersion')}"
        )

    if graph.get("schemaVersion") not in SUPPORTED_SCHEMA_VERSIONS["graph"]:
        result.ok = False
        result.errors.append(f"PERSIST_VERSION_MISMATCH:graph:{graph.get('schemaVersion')}")

    if metrics.get("schemaVersion") not in SUPPORTED_SCHEMA_VERSIONS["metrics"]:
        result.ok = False
        result.errors.append(f"PERSIST_VERSION_MISMATCH:metrics:{metrics.get('schemaVersion')}")

    if not isinstance(nodes, list) or not isinstance(edges, list):
        result.ok = False
        result.errors.append("PERSIST_GRAPH_INCOMPLETE")

    confirmed = load_jsonl(root / "events_canonical.jsonl")
    rejected = load_jsonl(root / "rejected.jsonl")

    for i, ev in enumerate(confirmed):
        for key in ("fromTrackId", "toTrackId", "timestamp", "confidence"):
            if key not in ev:
                result.ok = False
                result.errors.append(f"PERSIST_CANONICAL_INVALID:line{i}:{key}")

    for i, ev in enumerate(rejected):
        if not _reason_code(ev):
            result.ok = False
            result.errors.append(f"PERSIST_REJECTED_INVALID:line{i}")

    computed_hash = compute_graph_hash(confirmed, min_confidence)
    result.graph_hash = computed_hash

    if manifest_path.is_file():
        manifest_hash = manifest.get("graphHash")
        if manifest_hash and manifest_hash != computed_hash:
            result.ok = False
            result.errors.append("PERSIST_GRAPH_HASH_MISMATCH")

        if check_input_hashes:
            inputs = manifest.get("inputs") or {}
            for key in ("gev", "registry"):
                block = inputs.get(key)
                if not isinstance(block, dict):
                    continue
                src = block.get("path")
                expected = block.get("sha256")
                if src and expected and Path(src).is_file():
                    actual = sha256_file(Path(src))
                    if actual != expected:
                        result.warnings.append(f"PERSIST_INPUT_HASH_DRIFT:{key}")

        exit_status = manifest.get("exitStatus")
        qc = manifest.get("qc") or {}
        summary_qc = summary.get("qc") or {}
        if exit_status == "partial":
            result.degraded = True
            if not qc.get("degraded") or not summary_qc.get("degraded"):
                result.ok = False
                result.errors.append("PERSIST_PARTIAL_QC_FLAG")

    if metrics.get("nodeCount") != len(nodes):
        result.ok = False
        result.errors.append("PERSIST_METRICS_NODE_MISMATCH")

    if metrics.get("edgeCount") != len(edges):
        result.ok = False
        result.errors.append("PERSIST_METRICS_EDGE_MISMATCH")

    if graph.get("metrics", {}).get("nodeCount") != len(nodes):
        result.warnings.append("PERSIST_GRAPH_METRICS_NODE_DRIFT")

    for wname in REQUIRED_WINDOWS:
        wdoc = load_json(windows_dir / wname)
        wm = wdoc.get("metrics") or {}
        wnodes = wdoc.get("nodes") or []
        wedges = wdoc.get("edges") or []
        if wm.get("nodeCount") != len(wnodes):
            result.ok = False
            result.errors.append(f"PERSIST_WINDOW_NODE_MISMATCH:{wname}")
        if wm.get("edgeCount") != len(wedges):
            result.ok = False
            result.errors.append(f"PERSIST_WINDOW_EDGE_MISMATCH:{wname}")

    if metrics.get("confirmedPasses") != len(confirmed):
        result.warnings.append("PERSIST_CONFIRMED_COUNT_DRIFT")

    if result.degraded and result.ok:
        result.exit_code = EXIT_PARTIAL
    elif not result.ok:
        result.exit_code = EXIT_FAIL
    else:
        result.exit_code = EXIT_SUCCESS

    return result


def _timestamp_suffix() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def rollback(output_dir: Path) -> bool:
    """Remove incomplete run or restore latest .bak backup."""
    output_dir = output_dir.resolve()
    if not output_dir.exists():
        return False

    incomplete = output_dir / ".incomplete"
    if incomplete.exists():
        shutil.rmtree(output_dir, ignore_errors=True)
        return True

    parent = output_dir.parent
    backups = sorted(parent.glob(f"{output_dir.name}.bak.*"), reverse=True)
    if backups:
        if output_dir.exists():
            shutil.rmtree(output_dir, ignore_errors=True)
        shutil.move(str(backups[0]), str(output_dir))
        return True
    return False


def persist(
    input_dir: Path,
    output_dir: Path,
    *,
    force: bool = False,
    min_confidence: float = DEFAULT_MIN_CONFIDENCE,
) -> int:
    input_dir = input_dir.resolve()
    output_dir = output_dir.resolve()

    val = validate(
        input_dir,
        require_manifest=True,
        check_input_hashes=False,
        min_confidence=min_confidence,
        allow_incomplete=True,
    )
    if not val.ok:
        print(f"[I13-5-persist] validate input FAIL: {val.errors}", file=sys.stderr)
        return val.exit_code if val.exit_code != EXIT_SUCCESS else EXIT_FAIL

    graph_hash = val.graph_hash
    if output_dir.exists() and not force:
        manifest_out = output_dir / "manifest.json"
        if manifest_out.is_file() and not (output_dir / ".incomplete").exists():
            old = load_json(manifest_out)
            if old.get("graphHash") == graph_hash:
                print("[I13-5-persist] IDEMPOTENT_SKIP", flush=True)
                return verify(output_dir, min_confidence=min_confidence)

    if (output_dir / ".incomplete").exists():
        rollback(output_dir)

    if output_dir.exists() and not force:
        print(
            "[I13-5-persist] output exists with different graphHash; use --force",
            file=sys.stderr,
        )
        return EXIT_FAIL

    parent = output_dir.parent
    parent.mkdir(parents=True, exist_ok=True)
    staging_name = f".{output_dir.name}.staging.{uuid.uuid4().hex[:8]}"
    staging = parent / staging_name

    backup_path: Path | None = None
    try:
        shutil.copytree(input_dir, staging)

        manifest_path = staging / "manifest.json"
        manifest = load_json(manifest_path)
        manifest["persist"] = {
            "persistVersion": PERSIST_VERSION,
            "persistedAt": utc_now_iso(),
            "sourceInputDir": str(input_dir),
        }
        manifest_path.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        reval = validate(
            staging,
            require_manifest=True,
            check_input_hashes=False,
            min_confidence=min_confidence,
            allow_incomplete=True,
        )
        if not reval.ok:
            print(f"[I13-5-persist] staging validate FAIL: {reval.errors}", file=sys.stderr)
            return reval.exit_code if reval.exit_code != EXIT_SUCCESS else EXIT_FAIL

        (staging / ".incomplete").write_text("persisting", encoding="utf-8")

        if output_dir.exists():
            backup_path = parent / f"{output_dir.name}.bak.{_timestamp_suffix()}"
            shutil.move(str(output_dir), str(backup_path))

        os.replace(str(staging), str(output_dir))
        staging = Path("/nonexistent")  # moved; prevent rmtree in finally

        inc = output_dir / ".incomplete"
        if inc.exists():
            inc.unlink()

        return verify(output_dir, min_confidence=min_confidence)
    except Exception as exc:
        print(f"[I13-5-persist] ERROR {exc}", file=sys.stderr)
        if staging.exists():
            shutil.rmtree(staging, ignore_errors=True)
        if backup_path and backup_path.exists() and not output_dir.exists():
            shutil.move(str(backup_path), str(output_dir))
        return EXIT_FAIL
    finally:
        if staging.exists():
            shutil.rmtree(staging, ignore_errors=True)


def verify(
    root: Path,
    *,
    min_confidence: float = DEFAULT_MIN_CONFIDENCE,
    write_verify: bool = True,
) -> int:
    root = root.resolve()
    val = validate(root, min_confidence=min_confidence)

    verify_doc: dict[str, Any] = {
        "schemaVersion": "i13-pass-network-verify-v1",
        "persistVersion": PERSIST_VERSION,
        "verifiedAt": utc_now_iso(),
        "root": str(root),
        "ok": val.ok,
        "degraded": val.degraded,
        "exitCode": val.exit_code,
        "graphHash": val.graph_hash,
        "errors": val.errors,
        "warnings": val.warnings,
        "artifacts": {
            "manifest": (root / "manifest.json").is_file(),
            "graph": (root / "graph.json").is_file(),
            "metrics": (root / "metrics.json").is_file(),
            "verify": (root / "verify.json").is_file(),
        },
    }

    if (root / "metrics.json").is_file():
        try:
            verify_doc["metrics"] = load_json(root / "metrics.json")
        except json.JSONDecodeError:
            pass

    if write_verify and root.is_dir():
        (root / "verify.json").write_text(
            json.dumps(verify_doc, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    status = "PASS" if val.ok and val.exit_code == EXIT_SUCCESS else (
        "PARTIAL" if val.partial_acceptable or val.exit_code == EXIT_PARTIAL else "FAIL"
    )
    print(
        f"[I13-5-persist] verify={status} exit={val.exit_code} "
        f"graphHash={val.graph_hash} errors={len(val.errors)}",
        flush=True,
    )
    return val.exit_code


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="I13-5 Pass Network Local Persist")
    parser.add_argument("--input-dir", type=Path, help="staging artifacts directory")
    parser.add_argument("--output-dir", type=Path, help="durable output directory")
    parser.add_argument("--verify", action="store_true", help="validate and write verify.json")
    parser.add_argument("--force", action="store_true", help="overwrite output (with backup)")
    parser.add_argument(
        "--min-confidence",
        type=float,
        default=DEFAULT_MIN_CONFIDENCE,
        help="graphHash min confidence (default 0.55)",
    )
    args = parser.parse_args(argv)

    if args.verify:
        if not args.output_dir:
            parser.error("--output-dir is required with --verify")
        return verify(args.output_dir, min_confidence=args.min_confidence)

    if args.input_dir and args.output_dir:
        return persist(
            args.input_dir,
            args.output_dir,
            force=args.force,
            min_confidence=args.min_confidence,
        )

    if args.output_dir and not args.input_dir:
        val = validate(args.output_dir, min_confidence=args.min_confidence)
        print(
            f"[I13-5-persist] validate ok={val.ok} exit={val.exit_code} errors={val.errors}",
            flush=True,
        )
        return val.exit_code

    parser.error("provide --output-dir --verify, or --input-dir and --output-dir")


if __name__ == "__main__":
    raise SystemExit(main())
