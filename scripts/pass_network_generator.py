#!/usr/bin/env python3
"""
I13-5 — Pass Network Generator.

Builds nodes, edges, window subgraphs, and graph metrics from normalized_events.json.
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

SCHEMA_GRAPH = "i13-pass-network-graph-v1"
GENERATOR_VERSION = "0.1.0-p0"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def load_normalized(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def zone_from_y(y: float) -> str:
    if y < 1 / 3:
        return "def"
    if y < 2 / 3:
        return "mid"
    return "att"


def bearing_deg(
    fr: tuple[float, float] | None,
    to: tuple[float, float] | None,
) -> float:
    if fr is None or to is None:
        return 0.0
    return (math.degrees(math.atan2(to[1] - fr[1], to[0] - fr[0])) + 360) % 360


def node_positions_from_events(
    confirmed: list[dict[str, Any]],
    fallback: dict[str, tuple[float, float]] | None = None,
) -> dict[str, tuple[float, float]]:
    """Infer average position per track from pass endpoints if registry missing."""
    buckets: dict[str, list[tuple[float, float]]] = defaultdict(list)
    for ev in confirmed:
        # normalized events may not have coords; use fallback only in P0
        pass
    out = dict(fallback or {})
    return out


def build_nodes_edges(
    confirmed: list[dict[str, Any]],
    positions: dict[str, tuple[float, float]] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    positions = positions or {}
    node_stats: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "passCount": 0,
            "receiveCount": 0,
            "trackId": "",
            "label": "",
            "fromPlayerId": None,
            "toPlayerId": None,
        }
    )
    edge_stats: dict[tuple[str, str], dict[str, Any]] = defaultdict(
        lambda: {"count": 0, "distances": [], "timestamps": [], "bearings": []}
    )

    for ev in confirmed:
        fr = str(ev["fromTrackId"])
        to = str(ev["toTrackId"])
        node_stats[fr]["trackId"] = fr
        node_stats[fr]["label"] = str(ev.get("fromPlayerId") or fr)
        if ev.get("fromPlayerId"):
            node_stats[fr]["fromPlayerId"] = ev["fromPlayerId"]
        node_stats[fr]["passCount"] += 1

        node_stats[to]["trackId"] = to
        node_stats[to]["label"] = str(ev.get("toPlayerId") or to)
        if ev.get("toPlayerId"):
            node_stats[to]["toPlayerId"] = ev["toPlayerId"]
        node_stats[to]["receiveCount"] += 1

        key = (fr, to)
        edge_stats[key]["count"] += 1
        edge_stats[key]["distances"].append(float(ev.get("distanceM") or 0))
        edge_stats[key]["timestamps"].append(float(ev["timestamp"]))
        edge_stats[key]["bearings"].append(
            bearing_deg(positions.get(fr), positions.get(to))
        )

    nodes: list[dict[str, Any]] = []
    for tid, st in sorted(node_stats.items()):
        pos = positions.get(tid)
        node: dict[str, Any] = {
            "trackId": tid,
            "label": st["label"],
            "passCount": st["passCount"],
            "receiveCount": st["receiveCount"],
            "degree": st["passCount"] + st["receiveCount"],
        }
        if st.get("fromPlayerId") or st.get("toPlayerId"):
            if st.get("fromPlayerId"):
                node["playerId"] = st["fromPlayerId"]
            elif st.get("toPlayerId"):
                node["playerId"] = st["toPlayerId"]
        if pos:
            node["positionAvg"] = {"x": pos[0], "y": pos[1]}
        nodes.append(node)

    max_count = max((e["count"] for e in edge_stats.values()), default=1)
    edges: list[dict[str, Any]] = []
    for (fr, to), st in sorted(edge_stats.items()):
        avg_d = sum(st["distances"]) / len(st["distances"]) if st["distances"] else 0.0
        avg_bearing = (
            sum(st["bearings"]) / len(st["bearings"]) if st["bearings"] else 0.0
        )
        fr_pos = positions.get(fr)
        to_pos = positions.get(to)
        mid_y = (
            (fr_pos[1] + to_pos[1]) / 2
            if fr_pos and to_pos
            else (fr_pos or to_pos or (0.5, 0.5))[1]
        )
        edges.append(
            {
                "fromTrackId": fr,
                "toTrackId": to,
                "fromPlayerId": next(
                    (n.get("playerId") for n in nodes if n["trackId"] == fr), None
                ),
                "toPlayerId": next(
                    (n.get("playerId") for n in nodes if n["trackId"] == to), None
                ),
                "count": st["count"],
                "weight": round(st["count"] / max_count, 4),
                "successRate": 1.0,
                "avgDistanceM": round(avg_d, 2),
                "direction": {
                    "bearingDeg": round(avg_bearing, 1),
                    "dominantZone": zone_from_y(mid_y),
                },
                "timestamps": st["timestamps"][:20],
            }
        )

    if nodes:
        hub = max(nodes, key=lambda n: n["degree"])
        for n in nodes:
            n["hubScore"] = round(n["degree"] / max(hub["degree"], 1), 4)

    return nodes, edges


def connected_components(nodes: list[dict[str, Any]], edges: list[dict[str, Any]]) -> int:
    parent: dict[str, str] = {n["trackId"]: n["trackId"] for n in nodes}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: str, b: str) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    for e in edges:
        union(e["fromTrackId"], e["toTrackId"])

    roots = {find(n["trackId"]) for n in nodes}
    return len(roots)


def graph_density(node_count: int, edge_count: int) -> float:
    if node_count < 2:
        return 0.0
    max_edges = node_count * (node_count - 1)
    return round(edge_count / max_edges, 4)


@dataclass
class GeneratorResult:
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    windows: dict[str, dict[str, Any]]
    metrics: dict[str, Any]
    hub_track_id: str | None = None


def build_window_graphs(
    normalized: dict[str, Any],
    positions: dict[str, tuple[float, float]] | None = None,
    duration_s: float | None = None,
) -> dict[str, dict[str, Any]]:
    windows: dict[str, dict[str, Any]] = {}
    parser_windows = normalized.get("windows")
    if isinstance(parser_windows, dict) and parser_windows:
        for wid, events in parser_windows.items():
            if not isinstance(events, list):
                continue
            n, e = build_nodes_edges(events, positions)
            windows[wid] = {
                "windowId": wid,
                "confirmedPasses": len(events),
                "nodes": n,
                "edges": e,
                "metrics": {
                    "nodeCount": len(n),
                    "edgeCount": len(e),
                    "connectedComponents": connected_components(n, e),
                    "density": graph_density(len(n), len(e)),
                },
            }
        return windows

    confirmed = normalized.get("confirmed") or []
    dur = duration_s or 90 * 60
    half = dur / 2

    def slice_events(t0: float, t1: float) -> list[dict[str, Any]]:
        return [e for e in confirmed if t0 <= float(e["timestamp"]) < t1]

    for wid, t0, t1 in (("full", 0, dur), ("h1", 0, half), ("h2", half, dur)):
        events = slice_events(t0, t1)
        n, e = build_nodes_edges(events, positions)
        windows[wid] = {
            "windowId": wid,
            "confirmedPasses": len(events),
            "nodes": n,
            "edges": e,
            "metrics": {
                "nodeCount": len(n),
                "edgeCount": len(e),
                "connectedComponents": connected_components(n, e),
                "density": graph_density(len(n), len(e)),
            },
        }
    return windows


def generate_from_normalized(
    normalized: dict[str, Any],
    *,
    positions: dict[str, tuple[float, float]] | None = None,
    duration_s: float | None = None,
) -> GeneratorResult:
    confirmed = list(normalized.get("confirmed") or [])
    nodes, edges = build_nodes_edges(confirmed, positions)
    windows = build_window_graphs(normalized, positions, duration_s)

    hub_track_id = None
    if nodes:
        hub_track_id = max(nodes, key=lambda n: n["degree"])["trackId"]

    metrics = {
        "schemaVersion": SCHEMA_GRAPH,
        "generatorVersion": GENERATOR_VERSION,
        "generatedAt": utc_now_iso(),
        "nodeCount": len(nodes),
        "edgeCount": len(edges),
        "connectedComponents": connected_components(nodes, edges),
        "density": graph_density(len(nodes), len(edges)),
        "confirmedPasses": len(confirmed),
        "hubTrackId": hub_track_id,
        "cameraCutCount": len(normalized.get("cameraCuts") or []),
        "rejectionReasons": normalized.get("rejectionReasons") or {},
    }

    return GeneratorResult(
        nodes=nodes,
        edges=edges,
        windows=windows,
        metrics=metrics,
        hub_track_id=hub_track_id,
    )


def write_generator_outputs(output_dir: Path, result: GeneratorResult) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    graph_doc = {
        "schemaVersion": SCHEMA_GRAPH,
        "generatorVersion": GENERATOR_VERSION,
        "generatedAt": utc_now_iso(),
        "nodes": result.nodes,
        "edges": result.edges,
        "windows": {
            wid: {
                "windowId": w["windowId"],
                "confirmedPasses": w["confirmedPasses"],
                "nodeCount": w["metrics"]["nodeCount"],
                "edgeCount": w["metrics"]["edgeCount"],
            }
            for wid, w in result.windows.items()
        },
        "metrics": result.metrics,
    }

    (output_dir / "graph.json").write_text(
        json.dumps(graph_doc, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (output_dir / "nodes.json").write_text(
        json.dumps(result.nodes, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (output_dir / "edges.json").write_text(
        json.dumps(result.edges, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (output_dir / "metrics.json").write_text(
        json.dumps(result.metrics, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    windows_dir = output_dir / "windows"
    windows_dir.mkdir(parents=True, exist_ok=True)
    for wid, wdoc in result.windows.items():
        (windows_dir / f"{wid}.json").write_text(
            json.dumps(wdoc, ensure_ascii=False, indent=2), encoding="utf-8"
        )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="I13-5 Pass Network Generator")
    parser.add_argument("--input", type=Path, required=True, help="normalized_events.json")
    parser.add_argument("--output-dir", type=Path, required=True, help="graph output directory")
    parser.add_argument("--registry", type=Path, help="optional tracks_registry for positions")
    args = parser.parse_args(argv)

    if not args.input.is_file():
        print(f"[I13-5-generator] ERROR missing input: {args.input}", file=sys.stderr)
        return 1

    normalized = load_normalized(args.input)
    positions: dict[str, tuple[float, float]] = {}
    duration_s = None
    if args.registry and args.registry.is_file():
        reg = json.loads(args.registry.read_text(encoding="utf-8"))
        duration_s = float(reg.get("durationS") or reg.get("duration_s") or 0)
        for t in reg.get("tracks") or []:
            if str(t.get("class", "")) != "person":
                continue
            tid = str(t.get("trackId", ""))
            pos = t.get("positionAvg") or t.get("avgPosition")
            if tid and isinstance(pos, dict):
                positions[tid] = (float(pos["x"]), float(pos["y"]))

    result = generate_from_normalized(
        normalized,
        positions=positions or None,
        duration_s=duration_s,
    )
    write_generator_outputs(args.output_dir, result)

    m = result.metrics
    print(
        f"[I13-5-generator] nodes={m['nodeCount']} edges={m['edgeCount']} "
        f"components={m['connectedComponents']} density={m['density']}",
        flush=True,
    )
    return 0 if m["nodeCount"] > 0 else 3


if __name__ == "__main__":
    raise SystemExit(main())
