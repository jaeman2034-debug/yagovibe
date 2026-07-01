# YAGO Vision — Pilot #2 Final Review

**Status:** 📋 **PM Final Review** — Pilot #2 **Conditional PASS**  
**Date:** 2026-07-01  
**Branch:** `vision-v2-i13`  
**Baseline:** `vision-v1.0-final` 🔒 (운영 Baseline — 미변경)  
**Fixture:** `pass01_clip_002` · E2E run `e2e_pilot2` · Worker run `rc4_m1_pass01_clip_002`

> PM 판정: I13-5 Offline Pipeline · Alignment · Quality Evaluation **구현 LOCK**.  
> 남은 이슈는 **Gate Policy (Cohort 분리)** 및 **Firestore/GCS 운영 승인 절차**입니다.

---

## 0. Executive Summary

| 영역 | 판정 | 핵심 수치 |
|------|------|-----------|
| **Offline Pipeline** | ✅ PASS | Coverage **100%**, rejected **0**, verify Exit **0** |
| **Alignment Bridge v2** | ✅ PASS | Coverage **100%**, Pair Precision **100%** (9/9) |
| **Quality Evaluation** | ✅ LOCK | 3-mode 자동화 완료 |
| **Pilot #2 (Primary Gate)** | ✅ **Conditional PASS** | Endpoint Recall **80%**, Precision **92.3%** |
| **Pilot #2 (Legacy F1 gate)** | ⏳ HOLD | F1 **0.75** vs 0.77 (sparse GT cohort 영향) |
| **Firestore / GCS** | ⏳ **Not Ready** | Pilot Final Review 승인 후 별도 PM sign-off |

```text
Vision v1.0  🔒 Final PASS (운영 Baseline)

Vision v2 I13-5
  Design              ✅ LOCK
  Builder/Parser/Gen  ✅ LOCK
  Persist             ✅ LOCK
  Alignment           ✅ LOCK
  Quality Evaluation  ✅ LOCK
  Pilot #2 Review     ✅ Conditional PASS
  Firestore/GCS       ⏳ Pending
```

---

## 1. Pipeline Summary

### 1.1 Architecture (Read-Only upstream)

```text
Worker GEV (rc4_m1)
        +
tracks_registry.json
        ↓
Builder → Parser → Generator → Persist → Verify
        ↓
events_canonical.jsonl
graph.json / edges.json / nodes.json
```

**변경 금지 준수:** Worker · Tracking · GEV · Firestore · Callable · UI **미변경**.

### 1.2 E2E Smoke (`e2e_pilot2`)

| Check | 결과 |
|-------|------|
| Builder / Parser / Generator / Persist | Exit **0** |
| `verify.json` overallPass | **true** |
| Confirmed PASS | **13** |
| Rejected | **0** |
| **Pipeline Coverage** | **1.00** (≥ 0.60) |
| graphHash | `ee8087a833ebe088` |

**Artifacts:**

```text
D:\YAGO_AI\runs\tacticalV2\pass_network\pass01_clip_002\e2e_pilot2\
  events_canonical.jsonl
  coverage_report.json
  verify.json
  graph.json / edges.json / nodes.json
```

### 1.3 Pipeline 판정

**✅ PASS — LOCK**

Offline I13-5 파이프라인은 GT 품질·Track run mismatch와 **독립적으로** 정상 동작함이 확인되었다.

---

## 2. Alignment Summary

### 2.1 Problem (Track Alignment Analysis)

| 관찰 | 수치 |
|------|------|
| GT ↔ Worker trackId 교집합 | **0** |
| Strict endpoint TP (Phase A) | **0 / 5** |
| Parser Coverage | **100%** (rejected 0) |

**Root Cause:** GT는 `pass01_clip_002` tracking run, E2E Pred는 `rc4_m1` 재파이프라인 — **평가 기준선 불일치**, 파이프라인 결함 아님.

### 2.2 Alignment Builder v2 (`hybrid_spatial_temporal_v2`)

| Phase | alignmentCoverage | pairPrecision |
|-------|-------------------|---------------|
| Phase A (v1) | 55.6% (5/9) | 100% (oracle 7 subset) |
| **Phase B (v2)** | **100% (9/9)** | **100% (9/9)** |

**핵심 개선 (Threshold 0.60 유지):**

| 개선 | Rescue |
|------|--------|
| GEV saturation `/2` + sender weight 1.25× | P0090 |
| Spatial floor (≤15px + GEV≥1) | sender-only 쌍 |
| gev_spatial_fallback (±0.5s) | P0138 |
| spatial-only bridge (IoU + dist) | P0341, P0367 |

**Output:**

```text
D:\YAGO_AI\runs\tacticalV2\alignment\pass01_clip_002\
  alignment_map.json
  alignment_report.json
```

### 2.3 Alignment 판정

**✅ PASS — LOCK**

---

## 3. Quality Summary

### 3.1 Evaluation Framework

| Mode | 용도 | Pilot Gate |
|------|------|------------|
| **strict** | Regression baseline (same-run) | ❌ PASS/FAIL 판정에 사용 안 함 |
| **time-only** | GEV 시간축 diagnostic | ❌ Diagnostic only |
| **aligned** | Cross-run Pilot 품질 | ✅ **Primary** |

**Tool:** `scripts/evaluate_pass_quality.py` (commit `acef205`)

**Output:**

```text
e2e_pilot2/
  evaluation_summary.json
  strict_metrics.json
  time_metrics.json
  aligned_metrics.json
```

### 3.2 PM Gate Policy — Two Cohort Model

PM 결정: **Gate threshold 수정 없음.** Cohort 분리로 Pilot 품질을 정확히 평가.

#### Cohort A — Strict Endpoint (Primary Gate)

```text
GT PASS 중 fromTrackId + toTrackId 모두 있는 PASS만 평가
```

| Metric | Threshold | 결과 | 판정 |
|--------|-----------|------|------|
| recallStrictEndpoints | ≥ **0.80** | **0.80** (4/5) | ✅ PASS |
| Precision (aligned, event) | ≥ 0.75 | **0.923** | ✅ PASS |
| edgePrecision (aligned) | ≥ 0.70 | **1.00** (4/4) | ✅ PASS |
| alignmentCoverage | ≥ 0.80 | **1.00** | ✅ PASS |
| pipeline Coverage | ≥ 0.60 | **1.00** | ✅ PASS |

**Cohort A Endpoint F1 (aligned edges):** **0.8889** (≥ 0.77 ✅)

> Primary Gate는 **recallStrictEndpoints + Precision + edgePrecision + Coverage** 로 판정.  
> Legacy 단일 F1(all-GT sparse cohort)은 Primary Gate에서 **제외**.

#### Cohort B — Sparse GT (Diagnostic Only)

```text
GT PASS 19건 중 endpoint 無 14건 포함 cohort
```

| Metric | 결과 | 용도 |
|--------|------|------|
| recall (all GT, aligned sparse) | 0.632 | Diagnostic |
| F1 (all GT, aligned sparse) | **0.750** | Diagnostic — GT sparse 영향 |
| recallWithSparse | 0.632 | Ops · GT backfill 참고 |

**Cohort B는 Pilot PASS/FAIL에 사용하지 않음.**

### 3.3 Pilot #2 Gate Matrix

| Gate Layer | PASS | 비고 |
|------------|------|------|
| Pipeline | ✅ | Coverage 100% |
| Alignment | ✅ | Coverage 100%, Precision 100% |
| **Cohort A (Primary)** | ✅ | Endpoint Recall 80%, P 92.3% |
| Cohort B (Diagnostic) | ⏳ | F1 0.75 — GT sparse, pipeline 결함 아님 |
| Legacy overallQualityPass | ⏳ | F1 cohort 혼합 — **정책상 Primary로 대체** |

### 3.4 Pilot #2 최종 판정

## **Conditional PASS**

| 조건 | 상태 |
|------|------|
| Pipeline 100% | ✅ |
| Alignment 100% | ✅ |
| Primary Endpoint Recall 80% | ✅ |
| Primary Precision 92.3% | ✅ |
| Legacy F1 (sparse cohort) | ⏳ 2pp margin — **Gate Policy 분리로 해소** |

---

## 4. Strict Metrics (Regression Baseline)

**목적:** 동일 tracking run 회귀 비교. Cross-run Pilot **PASS/FAIL에 사용하지 않음**.

| Metric | 값 |
|--------|-----|
| TP / FP / FN | 0 / 13 / 19 |
| Precision | 0.00 |
| Recall | 0.00 |
| F1 | 0.00 |
| edgeTp | 0 / 5 GT edges |

**해석:** GT Run ≠ Worker Run → trackId 교집합 0 → **예상된 regression baseline**.  
Track Alignment Analysis (§2.1)과 일치.

---

## 5. Time-only Metrics (Diagnostic)

**목적:** Identity noise 제거 후 GEV·Parser **시간축 검출력** 측정.

| Metric | 값 |
|--------|-----|
| TP / FP / FN | 12 / 1 / 7 |
| Precision | **0.923** |
| Recall | 0.632 |
| F1 | 0.750 |

**해석:** 시간 매칭 자체는 양호 (12/19 GT). Recall gap은 endpoint·identity가 아닌 **sparse GT + 미검출** 혼합.

---

## 6. Aligned Metrics (Pilot Primary)

### 6.1 Event-Level (All GT — Cohort B reference)

| Metric | 값 |
|--------|-----|
| TP / FP / FN | 12 / 1 / 7 |
| Precision | **0.923** |
| Recall | 0.632 |
| F1 | 0.750 |

### 6.2 Endpoint Cohort (Cohort A — Primary)

| Metric | 값 |
|--------|-----|
| GT with endpoints | **5** |
| recallStrictEndpoints | **0.80** (4 TP, 1 FN) |
| recallStrictTp / Fn | 4 / 1 |

**미매칭 GT endpoint (1건):** `@44.2s P0341→P0367` — Worker confirmed PASS 미포함 (structural FN at event layer; alignment map은 spatial bridge로 ID 매핑 성공).

### 6.3 Edge-Level (Aligned topology)

| Metric | 값 |
|--------|-----|
| edgeTp | **4** |
| edgePrecision | **1.00** |
| edgeRecall | 0.80 |
| edge F1 | **0.889** |
| gtAnnotatedEdges | 5 |
| confirmedEdgesAligned | 4 |

---

## 7. GT Sparse 영향

### 7.1 GT PASS 구성 (`pilot_pass01_clip_002_gev_gt.json`)

| 구분 | 건수 | 비율 |
|------|------|------|
| GT PASS total | **19** | 100% |
| Endpoint 有 (from + to) | **5** | 26% |
| Endpoint 無 (timestamp only) | **14** | 74% |

### 7.2 영향 경로

```text
Legacy F1 (19건 cohort)
        ↓
14 sparse PASS → FN inflation
        ↓
Recall 0.632 → F1 0.750 (< 0.77)
        ↓
Pipeline 품질이 아닌 GT annotation completeness 영향
```

### 7.3 Cohort A vs B 분리 효과

| Cohort | Recall | F1 | Pilot Gate |
|--------|--------|-----|------------|
| A (5 endpoint) | **0.80** | **0.889** (edge) | ✅ Primary |
| B (19 all) | 0.632 | 0.750 | Diagnostic only |

**권장 Ops (v2.1, 별도 승인):** 14 sparse PASS에 from/to backfill (영상 리뷰) → Cohort B diagnostic 개선.

---

## 8. Remaining Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | Cross-run strict ID always 0 | 🟡 Known | Alignment map + aligned mode |
| R2 | GT sparse 74% → legacy F1 misleading | 🟡 Known | **Cohort A Primary Gate** (PM approved) |
| R3 | Single fixture (`pass01_clip_002`) | 🟡 Medium | Pilot #3+ clips before production |
| R4 | spatial-only bridge @ no-GEV anchors | 🟢 Low | IoU+dist verified; pairPrecision 100% |
| R5 | Firestore/GCS premature deploy | 🔴 Blocked | PM sign-off gate |
| R6 | v1.0 Worker/GEV drift | 🟢 Low | vision-v1.0-final 🔒 |

---

## 9. Recommendation

### 9.1 Immediate (Approved)

| # | Action | Status |
|---|--------|--------|
| 1 | LOCK I13-5 Pipeline + Alignment + Quality Evaluation | ✅ |
| 2 | Adopt **Two-Cohort Gate Policy** (A=Primary, B=Diagnostic) | ✅ PM approved |
| 3 | Pilot #2 **Conditional PASS** | ✅ |
| 4 | Commit `evaluate_pass_quality.py` | ✅ `acef205` |

### 9.2 Before Firestore/GCS

| # | Action | Owner |
|---|--------|-------|
| 1 | PM sign-off on this Final Review | PM |
| 2 | Persist layer design review (`I13-5 PERSIST_SPEC` R-2~R-5) | Eng |
| 3 | Optional: GT endpoint backfill (14 sparse) | Ops |
| 4 | Second clip validation (recommended) | Eng |
| 5 | Firestore/GCS **별도 PM 승인** | PM |

### 9.3 Not Recommended Now

| Action | Reason |
|--------|--------|
| Lower F1 threshold to 0.75 | Gate dilution — Cohort 분리로 대체 |
| Modify Worker/Tracking/GEV | v1.0-final 🔒 |
| Deploy Firestore before PM sign-off | 운영 품질 기준 미확정 |

---

## 10. Firestore / GCS Ready 여부

### 10.1 Readiness Checklist

| Criterion | Ready? |
|-----------|--------|
| Offline Pipeline PASS | ✅ |
| Alignment Coverage ≥ 0.80 | ✅ 1.00 |
| Primary Endpoint Recall ≥ 0.80 | ✅ |
| Primary Precision ≥ 0.75 | ✅ 0.923 |
| Quality Evaluation automated | ✅ |
| Pilot #2 Final Review PM sign-off | ⏳ **this doc** |
| Persist Firestore/GCS spec (R-2~R-5) | ⏳ design only |
| Multi-clip validation | ✅ Pipeline 3/3 · Primary Gate ⏳ GT Hold |

### 10.2 PM 판정

## Firestore / GCS: **Not Ready — Conditional Hold**

**사유 (2026-07-01 갱신):**

```text
Ground Truth Dataset not sufficient for Endpoint Evaluation
```

- ~~Pipeline 미완성~~ ❌ — Offline Pipeline **3/3 PASS (Coverage 100%)**
- clip_003/004: GT PASS에 `fromTrackId`/`toTrackId` 없음 → Alignment **N/A** (품질 FAIL 아님)
- clip_004 Diagnostic: Precision/Recall **95%** — GEV→Parser→Pipeline 안정

**승인 경로:**

```text
GT Dataset Improvement (clip_003/004 endpoint backfill)
        ↓
Alignment + Evaluation 재실행 (기존 스크립트)
        ↓
Cross-Clip Primary Gate PASS
        ↓
Cross-Clip Final Review PM sign-off
        ↓
Persist R-2~R-5 implementation Sprint (별도 승인)
        ↓
Firestore/GCS PM sign-off
        ↓
Pilot Beta
```

---

## 11. Commit & Artifact Index

| Artifact | Commit / Path |
|----------|---------------|
| Evaluation Alignment Spec | `42230f3` |
| Alignment Tuning Plan | `5653001` |
| `build_alignment_map.py` v2 | `b3a0998` |
| `evaluate_pass_quality.py` | `acef205` |
| Pipeline (Builder/Persist) | `a7f70c9`, `67a78ab` |
| E2E output | `D:\YAGO_AI\...\e2e_pilot2\` |
| Alignment map | `D:\YAGO_AI\...\alignment\pass01_clip_002\` |

---

## 12. References

- `docs/YAGO_VISION_I13_EVALUATION_ALIGNMENT_SPEC.md`
- `docs/YAGO_VISION_I13_ALIGNMENT_TUNING_PLAN.md`
- `docs/YAGO_VISION_I13_TRACK_ALIGNMENT_ANALYSIS.md`
- `docs/YAGO_VISION_I13_5_PASS_NETWORK_DESIGN.md`
- `data/vision/gt/pilot_pass01_clip_002_gev_gt.json`

---

*Pilot #2 Final Review — PM Conditional PASS. Firestore/GCS pending PM sign-off.*
