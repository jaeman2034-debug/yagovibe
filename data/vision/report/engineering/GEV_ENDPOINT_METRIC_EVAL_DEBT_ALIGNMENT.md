# GEV Track Endpoint Coverage — Evaluation Debt Alignment

**Document ID:** `GEV-ENDPOINT-METRIC-EVAL-DEBT-ALIGNMENT`  
**Date:** 2026-07-12  
**Status:** 🔒 **ALIGNED** (docs / metric SoT only)  
**PM Decision:** Production development **NO-GO** · Evaluation debt alignment **GO**

> **NOT** a Production defect · **NOT** a Product PAI · **NOT** Vision v3 · **NOT** tracker/GEV heuristic tuning.

---

## Canonical measured Facts (preserved)

| Metric | Value | Source |
|---|---|---|
| String `gevTrackEndpointCoverage` | **0.0833 (8.33%)** · hits **1** / slots **12** | `e1_tracking_vq2_remeasure.json` · clip002 anonymized |
| Historical raw string coverage | **66.7%** | prior raw1080p VQ2 run (tracking-run-dependent) |
| Spatial endpoint coverage | **75.0%** (= lock) | Step 4-7 / 4-8 · `e1_gate_decision.md` |
| time_only microF1 (clip002 E1 re-track) | **0.7887** > lock **0.7714** | Step 4-8 |

---

## Metric classification

### String endpoint coverage (`gev_track_endpoint_coverage`)

- **Type:** run-dependent **string-ID diagnostic**
- **Definition:** literal GT `fromTrackId`/`toTrackId` ∈ registry `[first_frame, last_frame]` at event frame  
  (`yago-worker/lib/vision/vision_tracking_quality_vq2.py`)
- **MUST NOT** be read as Production endpoint association success rate
- **Cross-run:** not directly comparable unless track-ID lineage is preserved
- **Primary cause of 8.33%:** historical GT IDs tied to a tracking run + re-track Ultralytics ID reassignment + literal string evaluator (**GT alignment + evaluator design**)

### Spatial endpoint coverage

- **Type:** **primary diagnostic** for cross-run endpoint quality comparison
- **Value:** **75%** (preserved; already proven in Step 4-8)
- Detection presence at GT endpoint positions — not string ID equality

### time_only microF1

- **Type:** **regression guard** (endpoint match OFF)
- Preserved evidence: 0.7887 ≥ lock 0.7714 (Step 4-8) — **no re-run required**

---

## Evaluation rule (LOCKED)

```text
Cross-run endpoint quality:
  1. spatial association = PRIMARY diagnostic
  2. time_only F1 = regression guard
  3. literal string-ID coverage = supporting diagnostic only
```

Optional experiment: **not required** — Step 4-8 already proves spatial ≥ 75% and time_only F1 preserved.

---

## Separated from

- Production Hosting / CF / GEV write path  
- PAI-031 (GEV 46 success write) — **unaffected**  
- PAI-033 CLOSED · Prod-W01 Day-01 DATE_GATE_PENDING · PAI-022 PLANNED  

**Code changed in this alignment:** **N**

---

**Recorded:** 2026-07-12 · PM Evaluation Debt Alignment  
**END**
