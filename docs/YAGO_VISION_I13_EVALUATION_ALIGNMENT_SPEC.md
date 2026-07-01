# YAGO Vision I13 — Evaluation Alignment Spec

**Status:** 📐 **DESIGN ONLY** — PM Evaluation Alignment Sprint 승인 · 구현 금지  
**Date:** 2026-07-01  
**Branch:** `vision-v2-i13`  
**Baseline:** `vision-v1.0-final` 🔒  
**Parent:** `docs/YAGO_VISION_I13_TRACK_ALIGNMENT_ANALYSIS.md`  
**Trigger:** Track Alignment Analysis ✅ PASS · Quality Gate ⏳ HOLD (Recall 0.47, Edge TP = 0)

> PM 판정: Offline Pipeline ✅ PASS · 평가 체계 정합성이 품질 Gate의 선행 조건.  
> 본 문서는 **Alignment Layer + Evaluation Mode** 설계만 정의한다. Worker · Tracking · GEV · Firestore · Callable 변경 없음.

---

## 0. Executive Summary

```text
GT (annotated on Run A)
        │
        ▼
Worker Registry / GEV (Run B)
        │
        ▼
Alignment Bridge  ←── 본 Sprint 설계 대상
        │
        ▼
Evaluation (strict | time-only | aligned)
        │
        ▼
Quality Re-Gate → Pilot #2 → Firestore/GCS
```

| 문제 | 원인 | 본 Spec 해결 |
|------|------|-------------|
| Recall 0.47, Edge TP = 0 | GT·Worker **trackId 교집합 0** | `aligned` mode + `alignment_map.json` |
| Coverage 100%인데 품질 HOLD | Parser 정상, **평가 기준 불일치** | Mode별 metric 분리 |
| Pipeline vs Quality Gate 혼동 | 단일 gate로 측정 | **Strict Gate** vs **Aligned Gate** 분리 |

**목표:** 모델·파이프라인을 바꾸지 않고, **신뢰할 수 있는 품질 지표**를 산출하는 평가 계층을 정의한다.

---

## 1. Evaluation Mode

세 가지 평가 모드는 **동일한 GT·동일한 Pred(confirmed PASS)** 에 대해 서로 다른 **identity 해석**을 적용한다.

### 1.1 `strict`

| 항목 | 정의 |
|------|------|
| **Identity** | GT `fromTrackId` / `toTrackId` 문자열과 Pred 문자열 **완전 일치** |
| **시간** | \|t_pred − t_gt\| ≤ `timestampToleranceS` (기본 **0.75s**, GT `matching` 블록과 동일) |
| **엔드포인트** | GT에 `fromTrackId`·`toTrackId` **둘 다** 있을 때만 endpoint match 시도 |
| **용도** | Regression baseline · **동일 tracking run** 재평가 · 배포 전 회귀 |
| **한계** | Run mismatch 시 Recall 과소 추정 (E2E `e2e_pilot2` 사례) |

**PASS pair match (strict):**

```text
MATCH iff
  eventType_pred = PASS
  AND |t_pred - t_gt| ≤ τ
  AND from_pred = from_gt
  AND to_pred   = to_gt
  AND from_gt, to_gt both present
```

### 1.2 `time-only`

| 항목 | 정의 |
|------|------|
| **Identity** | **무시** — trackId 비교 없음 |
| **시간** | \|t_pred − t_gt\| ≤ `timestampToleranceS` |
| **엔드포인트** | 무시 |
| **용도** | GEV·Parser가 **시간축 이벤트 검출** 능력만 측정 (identity noise 제거) |
| **한계** | 동일 시각 복수 PASS·오검출 구분 불가; **제품 품질 Gate로 단독 사용 금지** |

**PASS match (time-only):**

```text
MATCH iff
  eventType_pred = PASS
  AND |t_pred - t_gt| ≤ τ
```

Greedy 1:1 matching: GT·Pred PASS를 timestamp 오름차순 정렬 후, 각 GT에 가장 가까운 미매칭 Pred 1건 할당 (동일 Pred 재사용 금지).

### 1.3 `aligned`

| 항목 | 정의 |
|------|------|
| **Identity** | Pred trackId를 **`alignment_map.json` 경유** GT namespace로 투영 후 비교 |
| **시간** | \|t_pred − t_gt\| ≤ `timestampToleranceS` |
| **엔드포인트** | GT endpoint 有 → aligned(from_pred)=from_gt AND aligned(to_pred)=to_gt |
| **용도** | **Cross-run 평가** · Pilot #2 Quality Re-Gate **주 지표** |
| **전제** | `alignment_map.json`이 clip·run 쌍에 대해 유효 (`coverage` ≥ gate, §6) |

**PASS pair match (aligned):**

```text
align(id_worker) → id_gt | UNMAPPED

MATCH iff
  eventType_pred = PASS
  AND |t_pred - t_gt| ≤ τ
  AND from_gt, to_gt both present
  AND align(from_pred) = from_gt
  AND align(to_pred)   = to_gt
  AND align(from_pred), align(to_pred) ≠ UNMAPPED
```

GT endpoint 無 (timestamp only): `aligned` mode에서도 **strict와 동일하게 time-only fallback** 허용 여부는 §4.4 정책 참조.

### 1.4 Mode 선택 가이드

| 시나리오 | 권장 Mode |
|----------|-----------|
| GT와 Pred가 **동일 tracking run** | `strict` |
| Run mismatch · Pilot cross-run | `aligned` |
| GEV layer only 진단 | `time-only` |
| PM Quality Re-Gate (I13-5 confirmed) | **`aligned`** (primary) + `strict` (report) |
| Firestore/GCS 승인 Gate | **`aligned`** PASS 필수 |

---

## 2. Alignment Bridge

GT Track namespace와 Worker Track namespace 사이의 **오프라인 매핑 계층**.

### 2.1 입력 (Read-Only)

| Artifact | Role |
|----------|------|
| `gt_registry.json` | GT annotate 시 사용한 `tracks_registry.json` (Run A) |
| `worker_registry.json` | 평가 대상 Pred의 registry (Run B) |
| `gt_gev_gt.json` | GT PASS/RECEIVE with optional endpoints |
| `worker_gev.jsonl` | Worker GEV (spatial anchor 보조) |
| `confirmed_events.jsonl` | I13 Parser confirmed PASS (평가 Pred) |

**Run Lock (권장):** `alignment_map` 메타에 `gtRunId`, `workerRunId`, `clipId` 필수. Run A = GT annotation run.

### 2.2 매핑 단위

| Level | Key | Value | 설명 |
|-------|-----|-------|------|
| **Track pair** | `workerTrackId` (e.g. `P0095`) | `gtTrackId` (e.g. `P0093`) | 1:1 기본; split 시 1:N 허용 (§2.4) |
| **Unmapped** | `workerTrackId` | `null` | Worker-only track (FP edge 기여 가능) |
| **GT orphan** | — | `gtTrackId` in GT set, no worker | FN·coverage gap |

### 2.3 매핑 생성 파이프라인 (설계)

```text
Step 1 — Candidate generation
  For each (gtTrack, workerTrack):
    score = f(temporal, spatial, gev_cooccurrence)

Step 2 — Constraint solve
  Greedy / Hungarian on score matrix
  threshold ≥ mapConfidenceMin (default 0.6)

Step 3 — GEV anchor validation
  At GT PASS timestamps:
    worker sender/receiver bbox ≈ gt sender/receiver (IoU or dist)

Step 4 — Human review hook (optional)
  ambiguous pairs → review_queue in alignment_report

Step 5 — Emit alignment_map.json + alignment_report.json
```

### 2.4 Split · Merge 정책

| Phenomenon | Map shape | Evaluation 영향 |
|------------|-----------|-----------------|
| **1 player · 1 ID each run** | 1:1 | 이상적 |
| **Track split (Worker)** | 1 GT → N Worker | Pred edge endpoint 중 **하나라도** align되면 partial credit (Hybrid, §3.4) |
| **Track merge (Worker)** | N GT → 1 Worker | 보수적: 1:1만 채택, 나머지 `review` |
| **Occlusion re-ID** | 시간창별 piecewise map (v3) | v2: clip-level 단일 map; piecewise는 Out of Scope |

### 2.5 Alignment Coverage

```text
gtEndpointIds = unique IDs in GT PASS from/to (present only)
mappedGtIds   = { gtId | ∃ workerId: map(workerId)=gtId }
alignmentCoverage = |mappedGtIds| / |gtEndpointIds|
```

Gate: `alignmentCoverage` ≥ **0.80** — 미달 시 `aligned` mode 결과 **무효** (§6).

---

## 3. Matching Rule

PASS 이벤트·엣지 매칭에 적용 가능한 규칙 집합. Evaluation Mode와 **조합**하여 사용한다.

### 3.1 Strict Match

| 차원 | 규칙 |
|------|------|
| Time | \|Δt\| ≤ τ |
| Sender | `from_pred === from_gt` |
| Receiver | `to_pred === to_gt` |
| GT endpoint | both required |
| Pred | I13 `confirmed` PASS only |

**Edge Strict Match:** directed edge `(from,to)` 문자열 완전 일치 + 위 PASS pair match 존재.

### 3.2 Temporal Match

| 차원 | 규칙 |
|------|------|
| Time | \|Δt\| ≤ τ |
| Identity | ignored |
| Greedy | 1 GT ↔ 1 Pred max |

`time-only` mode의 기본 규칙. RECEIVE는 v2 평가에서 optional (PASS-centric).

### 3.3 Spatial Match

Registry bbox 또는 GEV event position을 사용한 **동일 시각 동일 위치** 매칭.

| 신호 | 계산 |
|------|------|
| Position @t | `registry.getTrack(id).bboxAt(t)` or interpolated |
| Distance | centroid L2 in normalized pitch coords |
| Match | dist ≤ `spatialThresholdM` (default **3.0m** pitch-equivalent) |

**Track pair score (spatial-temporal):**

```text
score(gtId, workerId) =
  w_t · exp(-|t_anchor - t*| / σ_t)
+ w_s · exp(-dist(bbox_gt, bbox_worker) / σ_s)
+ w_g · gevCooccur(gtId, workerId, PASS windows)
```

`alignment_map` 생성 시 사용. 단독으로 Quality Gate 판정에는 **Hybrid**와 결합.

### 3.4 Hybrid Match

Production-aligned 평가용 **복합 규칙** (`aligned` mode 기본).

```text
Hybrid PASS match :=
  Temporal Match (|Δt| ≤ τ)
  AND (
    Strict Match on raw IDs
    OR Aligned Match (align(from_pred), align(to_pred) vs GT endpoints)
  )
```

| GT endpoint | Hybrid behavior |
|-------------|-----------------|
| both present | aligned endpoint match required |
| missing | Temporal only → counts as **partial GT** (별도 FN class `FN_SPARSE_GT`) |
| one present | v2: time + aligned on present endpoint only; absent endpoint ignored |

**Edge Hybrid Match:** PASS pair Hybrid match 성공 시 `(align(from), align(to))` edge TP.

### 3.5 Matching precedence (동일 Pred 복수 GT 후보)

1. smallest \|Δt\|
2. higher `mapConfidence` on both endpoints
3. higher spatial score @t
4. tie → GT timestamp ascending, mark `ambiguous` in report

---

## 4. Quality Metrics

모든 mode에서 **동일 Pred 집합**(I13 `events_canonical.jsonl` confirmed PASS)과 **동일 GT**를 사용한다.

### 4.1 공통 정의

| Symbol | Meaning |
|--------|---------|
| G | GT PASS events (type=PASS) |
| P | Pred confirmed PASS events |
| τ | `timestampToleranceS` (default 0.75) |
| M_mode | §1 mode-specific matcher |

**Event-level:**

```text
TP = |{ g ∈ G : ∃ p ∈ P, M_mode(g, p) }|
FP = |{ p ∈ P : ∄ g ∈ G, M_mode(g, p) }|
FN = |{ g ∈ G : ∄ p ∈ P, M_mode(g, p) }|

Precision = TP / (TP + FP)   if (TP+FP) > 0 else 0
Recall    = TP / (TP + FN)   if (TP+FN) > 0 else 0
F1        = 2·P·R / (P+R)   if (P+R) > 0 else 0
```

**Coverage (Pipeline — mode-independent):**

```text
Coverage = |confirmed PASS| / |GEV PASS candidates after dedupe|
```

Coverage는 **I13 Parser 처리율** 지표이며 Alignment Layer와 무관. Gate ≥ **0.60** (기존 I13-5 design 유지).

### 4.2 Mode별 Metric 산출

| Metric | strict | time-only | aligned |
|--------|--------|-----------|---------|
| Precision | raw ID + τ | τ only | map + τ |
| Recall | raw ID + τ | τ only | map + τ |
| F1 | harmonic | harmonic | harmonic |
| Coverage | shared | shared | shared |
| Edge P/R | raw endpoints | N/A (또는 time-only edge) | aligned endpoints |

각 mode 결과는 `evaluation_summary.json` 내 `modes.strict`, `modes.timeOnly`, `modes.aligned` 블록으로 **병렬 기록**.

### 4.3 Edge-Level Metrics (Pass Network topology)

| Metric | strict / aligned |
|--------|------------------|
| GT edges | unique `(from,to)` from GT PASS with both endpoints |
| Pred edges | unique `(from,to)` from confirmed PASS |
| Edge TP | exact directed match under mode identity rules |
| Edge FP | pred edge ∉ matched set |
| Edge FN | gt edge ∉ matched set |
| Edge Precision | Edge TP / (Edge TP + Edge FP) |

`e2e_pilot2` 관찰: strict Edge TP = **0** (교집합 0). aligned mode에서 Edge TP > 0 기대.

### 4.4 GT Sparse Endpoint 정책

GT 19 PASS 중 14건 endpoint 無 (Track Alignment Analysis §5.3).

| Mode | Sparse GT PASS 처리 |
|------|---------------------|
| strict | FN (endpoint match 불가) |
| time-only | TP 가능 (temporal match) |
| aligned | **Dual report:** `recall_strictEndpoints` (5건 기준) + `recall_withSparse` (time fallback 허용 시 19건 기준) |

PM Quality Gate (§6)는 **`recall_strictEndpoints` (aligned)** 를 primary로 사용. Sparse fallback metric은 **보조 리포트** only.

### 4.5 참고 Baseline (동일 Run)

| Layer | Pred source | PASS Recall (strict-ish) |
|-------|-------------|--------------------------|
| GEV RC3 same-run | `pass01_clip_002` GEV | **0.6842** |
| I13 E2E cross-run | `rc4_m1` + Parser | **0.4737** (strict) |

Evaluation Alignment Sprint 완료 후 **aligned recall**이 same-run GEV recall에 **근접**하는지 확인 (§6.3).

---

## 5. Output Artifacts

오프라인 평가 스크립트(구현은 별 Sprint)가 emit하는 JSON 산출물.

### 5.1 `alignment_map.json`

```json
{
  "schemaVersion": "yago-vision-alignment-map-v1",
  "clipId": "pass01_clip_002",
  "gtRunId": "pass01_clip_002",
  "workerRunId": "rc4_m1_pass01_clip_002",
  "createdAt": "2026-07-01T00:00:00Z",
  "method": "hybrid_spatial_temporal_v1",
  "mapConfidenceMin": 0.6,
  "pairs": [
    {
      "workerTrackId": "P0095",
      "gtTrackId": "P0093",
      "confidence": 0.92,
      "evidence": ["gev_pass@13.433s", "spatial@13.4s"],
      "reviewStatus": "auto"
    },
    {
      "workerTrackId": "P0089",
      "gtTrackId": "P0090",
      "confidence": 0.88,
      "evidence": ["gev_pass@11.233s"],
      "reviewStatus": "auto"
    }
  ],
  "unmappedWorker": ["P0428"],
  "unmappedGt": [],
  "alignmentCoverage": 1.0,
  "stats": {
    "pairCount": 9,
    "gtEndpointIdCount": 9,
    "mappedGtIdCount": 9
  }
}
```

### 5.2 `alignment_report.json`

```json
{
  "schemaVersion": "yago-vision-alignment-report-v1",
  "clipId": "pass01_clip_002",
  "status": "pass",
  "gtRunId": "pass01_clip_002",
  "workerRunId": "rc4_m1_pass01_clip_002",
  "alignmentCoverage": 1.0,
  "coverageGate": { "min": 0.8, "pass": true },
  "ambiguousPairs": [],
  "reviewQueue": [],
  "driftSummary": {
    "gtWorkerIdIntersection": 0,
    "medianSenderIdDelta": null,
    "systemicDrift": true,
    "notes": "ByteTrack re-ID across runs; no constant offset"
  },
  "pairDiagnostics": [
    {
      "gtTrackId": "P0093",
      "workerTrackId": "P0095",
      "anchorTimestamp": 13.433,
      "spatialDistM": 0.4,
      "confidence": 0.92
    }
  ],
  "inputs": {
    "gtRegistry": "data/vision/tracking/runs/pass01_clip_002/tracks_registry.json",
    "workerRegistry": "data/vision/pipeline/runs/rc4_m1_pass01_clip_002/tracks_registry.json",
    "gtGev": "data/vision/gt/pilot_pass01_clip_002_gev_gt.json"
  }
}
```

### 5.3 `evaluation_summary.json`

```json
{
  "schemaVersion": "yago-vision-evaluation-summary-v1",
  "clipId": "pass01_clip_002",
  "evaluatedAt": "2026-07-01T00:00:00Z",
  "predSource": "events_canonical.jsonl",
  "gtSource": "pilot_pass01_clip_002_gev_gt.json",
  "alignmentMapRef": "alignment_map.json",
  "timestampToleranceS": 0.75,
  "pipeline": {
    "coverage": 1.0,
    "confirmedPass": 13,
    "rejected": 0,
    "overallPass": true
  },
  "modes": {
    "strict": {
      "tp": 0,
      "fp": 13,
      "fn": 5,
      "precision": 0.0,
      "recall": 0.0,
      "f1": 0.0,
      "edgeTp": 0,
      "edgePrecision": 0.0,
      "gate": { "pass": false, "tier": "strict" }
    },
    "timeOnly": {
      "tp": 12,
      "fp": 1,
      "fn": 7,
      "precision": 0.923,
      "recall": 0.632,
      "f1": 0.75,
      "gate": { "pass": false, "tier": "diagnostic" }
    },
    "aligned": {
      "tp": null,
      "fp": null,
      "fn": null,
      "precision": null,
      "recall": null,
      "f1": null,
      "recallStrictEndpoints": null,
      "edgeTp": null,
      "edgePrecision": null,
      "gate": { "pass": null, "tier": "aligned_primary" }
    }
  },
  "qualityGate": {
    "strictPass": false,
    "alignedPass": null,
    "pipelinePass": true,
    "overallQualityPass": false
  },
  "notes": "aligned values null until alignment_map implemented"
}
```

**파일 배치 (권장):**

```text
{runDir}/
  alignment_map.json
  alignment_report.json
  evaluation_summary.json
  events_canonical.jsonl      ← 기존 I13 출력
  metrics_report.json         ← legacy; evaluation_summary가 supersede
```

---

## 6. Acceptance Gate

Quality Gate를 **Pipeline** · **Strict** · **Aligned** 세 층으로 분리한다.

### 6.1 Pipeline Gate (기존 · 유지)

| Check | Threshold | E2E `e2e_pilot2` |
|-------|-----------|------------------|
| Builder / Parser / Generator / Persist exit | 0 | ✅ |
| `verify.json` overallPass | true | ✅ |
| Coverage | ≥ 0.60 | ✅ 1.00 |
| rejected | report only | 0 |

**Pipeline PASS ≠ Quality PASS.**

### 6.2 Strict Quality Gate (회귀 · same-run)

| Metric | Threshold | 용도 |
|--------|-----------|------|
| Precision | ≥ 0.75 | 동일 run regression |
| Recall | ≥ 0.80 | 동일 run regression |
| F1 | ≥ 0.77 | 동일 run regression |

Cross-run 평가에서 strict FAIL은 **예상 가능** — 단독으로 Firestore/GCS 차단 사유가 되지 않음.

### 6.3 Aligned Quality Gate (Pilot · cross-run PRIMARY)

**전제:** `alignment_report.status = pass` AND `alignmentCoverage` ≥ **0.80**.

| Metric | Threshold | Mode |
|--------|-----------|------|
| Precision | ≥ **0.75** | `aligned` |
| Recall (`recallStrictEndpoints`) | ≥ **0.80** | `aligned`, GT endpoint 有 5건만 |
| Recall (`recallWithSparse`) | ≥ 0.80 (보조) | `aligned` + time fallback, 19건 |
| F1 | ≥ **0.77** | `aligned` primary |
| Edge Precision | ≥ **0.70** | `aligned` |
| Coverage | ≥ 0.60 | pipeline |

**PM Quality Re-Gate PASS 조건:**

```text
pipelinePass
AND alignmentCoverage ≥ 0.80
AND modes.aligned.precision ≥ 0.75
AND modes.aligned.recallStrictEndpoints ≥ 0.80
AND modes.aligned.f1 ≥ 0.77
```

### 6.4 Gate Decision Matrix

| Pipeline | Strict | Aligned | Firestore/GCS |
|----------|--------|---------|---------------|
| PASS | PASS | PASS | ✅ 승인 가능 (PM 별도 sign-off) |
| PASS | FAIL | PASS | ✅ cross-run 허용 |
| PASS | FAIL | FAIL | ⛔ 보류 |
| FAIL | * | * | ⛔ 보류 |

### 6.5 Sprint 완료 기준 (설계 단계)

| # | Deliverable | Status |
|---|-------------|--------|
| D1 | 본 문서 (`YAGO_VISION_I13_EVALUATION_ALIGNMENT_SPEC.md`) | 📐 this |
| D2 | `alignment_map.json` schema frozen | ✅ §5.1 |
| D3 | `evaluation_summary.json` schema frozen | ✅ §5.3 |
| D4 | Triple mode + dual gate 정의 | ✅ §1, §6 |
| D5 | 구현 (`evaluate_aligned.py` 등) | ⬜ 다음 Sprint |

---

## 7. Out of Scope

본 Sprint 및 Alignment **구현** Sprint에서 금지·보류 항목.

| 항목 | 이유 |
|------|------|
| **Worker** 수정 | PM explicit lock |
| **Tracking engine** (`vision_tracking_engine.py`) | Identity는 평가 계층에서 흡수 |
| **GEV engine** (`vision_gev_engine.py`) | v1.0-final 🔒 |
| **I13 Parser / Builder / Generator** 로직 변경 | Pipeline 이미 PASS |
| **Firestore / GCS** persist | Quality Re-Gate 전 |
| **Callable / Cloud Functions** | — |
| **Coach / Parent UI** | — |
| **Jersey / roster re-ID (v3)** | 장기 Platform |
| **Piecewise time-varying alignment map** | v2는 clip-level 단일 map |
| **Hub UI** | 별도 트랙 · K3 증빙 우선 |

**허용 (다음 구현 Sprint):**

- 오프라인 스크립트: alignment map 생성 · triple evaluation · JSON emit
- GT endpoint backfill (Ops · annotation workflow)
- E2E fixture policy: Evaluation Run Lock 문서화
- `pass_network_e2e_validate.py` 확장 (PM 승인 후)

---

## 8. Implementation Sketch (참고 · 본 Sprint 미착수)

구현 시 권장 모듈 경계 (설계 참고용).

```text
scripts/
  alignment/
    build_alignment_map.py    # registry + GEV → alignment_map.json
    evaluate_pass_quality.py  # 3 modes → evaluation_summary.json
    alignment_report.py       # diagnostics → alignment_report.json
```

```text
evaluate_pass_quality(
  gt_path,
  pred_path,
  alignment_map_path | null,
  mode: strict | time-only | aligned,
  τ = 0.75,
) → EvaluationResult
```

---

## 9. Project State (post-spec)

```text
Vision v1.0                    🔒 Final PASS

Vision v2
  Offline Pipeline             ✅ PASS
  Track Alignment Analysis     ✅ PASS
  Evaluation Alignment Spec    ✅ PASS (this doc)
  Evaluation Alignment Impl    ▶ next
  Quality Re-Gate
  Pilot #2
  Firestore/GCS
```

---

## References

- `docs/YAGO_VISION_I13_TRACK_ALIGNMENT_ANALYSIS.md` — root cause, drift table
- `docs/YAGO_VISION_I13_5_PASS_NETWORK_DESIGN.md` — §11 Metrics, Coverage
- `data/vision/gt/pilot_pass01_clip_002_gev_gt.json` — GT matching block
- `data/vision/report/rc3_1_phase_c/pass01_clip_002/gt_metrics.json` — same-run baseline
- E2E: `D:\YAGO_AI\runs\tacticalV2\pass_network\pass01_clip_002\e2e_pilot2\`

---

*I13 Evaluation Alignment Spec — design only. No Worker, Tracking, GEV, Firestore, or Callable changes.*
