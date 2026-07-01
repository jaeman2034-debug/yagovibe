# YAGO Vision — Cross-Clip Validation Plan

**Status:** 📐 **PLAN ONLY** — PM Cross-Clip Validation Sprint · **구현·코드 변경 금지**  
**Date:** 2026-07-01  
**Branch:** `vision-v2-i13`  
**Baseline:** `vision-v1.0-final` 🔒  
**Parent:** `docs/YAGO_VISION_PILOT2_FINAL_REVIEW.md`  
**Trigger:** Pilot #2 Conditional PASS · Firestore/GCS Conditional Hold

> PM 판정: I13-5 **기술 구현 LOCK**. 다음 단계는 **운영 검증** — Clip #2·#3에서 동일 품질 재현.  
> 본 문서는 **계획·절차·Gate**만 정의. Pipeline/Alignment/Evaluation **스크립트 수정 없음**.

---

## 0. Executive Summary

| 항목 | 상태 |
|------|------|
| Pilot #2 (`pass01_clip_002`) | ✅ Conditional PASS |
| Cross-Clip Validation | ⏳ **Not Started** |
| 대상 Clip | `pass01_clip_003`, `pass01_clip_004` |
| 목표 | Clip #1과 **동일 Gate Policy**로 품질 재현 확인 |
| Firestore/GCS | ⏳ Cross-Clip PASS + PM sign-off 후 |

```text
Pilot #2 (clip_002)  ✅
        ↓
Cross-Clip (003, 004)  ▶ PLAN (this doc)
        ↓
Cross-Clip Aggregate Review
        ↓
Firestore/GCS Sprint (별도 PM 승인)
        ↓
Beta Release
```

---

## 1. Purpose

### 1.1 Why Cross-Clip

Pilot #2는 **단일 fixture** (`pass01_clip_002`)에서만 검증되었다. PM 운영 승인 기준:

```text
Clip #1  +  Clip #2  (+ Clip #3 권장)
        ↓
동일 Pipeline · 동일 Gate Policy
        ↓
품질 재현 확인
        ↓
Firestore/GCS 승인
```

### 1.2 Non-Goals (본 Sprint)

| 금지 | 이유 |
|------|------|
| Worker / Tracking / GEV 수정 | v1.0-final 🔒 |
| Firestore / Callable / UI / Parent | Release Readiness 전 |
| `build_alignment_map.py` / `evaluate_pass_quality.py` **기능 추가** | LOCK — CLI flags만 사용 |
| GT annotation 변경 | Ops 별도 승인 |
| Threshold / Gate Policy 변경 | Pilot #2 Cohort A/B 유지 |

---

## 2. Gate Policy (Pilot #2에서 계승 · 변경 없음)

### 2.1 Cohort A — Strict Endpoint (Primary)

**운영 승인 기준.** Clip별 **독립** PASS 필요.

| Metric | Threshold |
|--------|-----------|
| Pipeline Coverage | ≥ **0.60** |
| Alignment Coverage | ≥ **0.80** |
| Aligned Precision (event) | ≥ **0.75** |
| **recallStrictEndpoints** | ≥ **0.80** |
| edgePrecision (aligned) | ≥ **0.70** |

> Legacy F1 (all-GT sparse cohort)은 **Primary Gate에 사용하지 않음**.

### 2.2 Cohort B — Sparse GT (Diagnostic)

| Metric | 용도 |
|--------|------|
| recall (all GT, aligned sparse) | GT completeness 참고 |
| F1 (all GT) | Diagnostic — PASS/FAIL 미사용 |

### 2.3 Strict / Time-only

| Mode | 용도 |
|------|------|
| strict | Regression baseline (same-run 비교용) — **PASS/FAIL 미사용** |
| time-only | GEV 시간축 diagnostic |

### 2.4 Alignment Coverage = 0 → **N/A** (PM Policy)

`gtEndpointIdCount = 0` (GT PASS에 `fromTrackId`/`toTrackId` 없음)인 Clip에서는:

```text
alignmentCoverage = 0  →  품질 FAIL 아님  →  N/A
```

| 상황 | 표기 | Gate |
|------|------|------|
| endpoint GT 有 | alignmentCoverage 수치 | Cohort A Primary |
| endpoint GT 無 | **N/A** | Cohort B Diagnostic only |

---

### 2.5 Cross-Clip Aggregate Gate (PM 제안)

개별 Clip Cohort A PASS **AND** 아래 aggregate 조건:

| Aggregate | Threshold | 비고 |
|-----------|-----------|------|
| Clips passing Cohort A | **≥ 2 / 2** (003, 004) | PM minimum |
| Mean recallStrictEndpoints | ≥ **0.80** | clip 가중 평균 |
| Min recallStrictEndpoints | ≥ **0.70** | single-clip floor (PM 확정) |
| Mean alignmentCoverage | ≥ **0.80** | — |

> Clip #3 (`pass01_clip_004`)까지 포함 시 **3-clip aggregate** 권장 — PM Roadmap.

---

## 3. Target Clips

### 3.1 Fixture Inventory

| Clip | GT | Video | GT-era Tracking | rc4_m1 Worker Run | Pilot #2 Baseline |
|------|-----|-------|-----------------|-------------------|-------------------|
| `pass01_clip_002` | ✅ | ✅ D: | ✅ `tracking/runs/pass01_clip_002` | ✅ `rc4_m1_pass01_clip_002` | ✅ **DONE** |
| `pass01_clip_003` | ✅ | ✅ D: | ✅ `tracking/runs/pass01_clip_003` | ⏳ **Missing** | ⏳ Pending |
| `pass01_clip_004` | ✅ | ✅ D: | ✅ `tracking/runs/pass01_clip_004` | ⏳ **Missing** | ⏳ Pending |

**GT paths:**

```text
data/vision/gt/pilot_pass01_clip_003_gev_gt.json
data/vision/gt/pilot_pass01_clip_004_gev_gt.json
```

**GT PASS counts (approx):** clip_003 **11** · clip_004 **20** (RC3 baseline F1: 0.66 / 0.77).

### 3.2 Prerequisite — Worker Run Lock

Clip_002와 동일 정책:

```text
GT annotation run  ≠  rc4_m1 Worker run  (cross-run)
        ↓
Alignment Bridge 필수 (build_alignment_map.py v2)
        ↓
Aligned evaluation 필수
```

**Blocker (현재):** `rc4_m1_pass01_clip_003`, `rc4_m1_pass01_clip_004` pipeline run **미존재**.

**해결 (Ops — 코드 변경 없음):**

1. 기존 RC4 M1 Worker 파이프라인을 clip_003/004 영상에 **재실행** (clip_002와 동일 lock/config)
2. 산출물 배치:

```text
data/vision/pipeline/runs/rc4_m1_pass01_clip_003/
  gev_rc3_1_phase_c/gev_events.jsonl
  tracks_registry.json
  tracks.jsonl

data/vision/pipeline/runs/rc4_m1_pass01_clip_004/
  (동일 구조)
```

> Worker **재실행**은 v1.0 engine 사용 — **엔진 수정 없음**.

---

## 4. Per-Clip Validation Procedure

Clip별 **동일 4단계** (clip_002 E2E 재현). **스크립트 수정 없음** — CLI 인자만 clip별 변경.

### Step 1 — I13-5 Offline Pipeline

```powershell
# 예시 — clip_003 (경로는 rc4_m1 run 생성 후 확정)
python scripts/pass_network_builder.py `
  --gev data/vision/pipeline/runs/rc4_m1_pass01_clip_003/gev_rc3_1_phase_c/gev_events.jsonl `
  --registry data/vision/pipeline/runs/rc4_m1_pass01_clip_003/tracks_registry.json `
  --output-dir D:\YAGO_AI\runs\tacticalV2\pass_network\pass01_clip_003\e2e_pilot2

python scripts/pass_network_persist.py validate ...
python scripts/pass_network_persist.py persist ...
python scripts/pass_network_persist.py verify ...
```

**Pipeline Gate (clip별):**

| Check | Threshold |
|-------|-----------|
| Exit code | 0 |
| verify.json overallPass | true |
| Coverage | ≥ 0.60 |

### Step 2 — Alignment Map

```powershell
python scripts/build_alignment_map.py `
  --gt-gev data/vision/gt/pilot_pass01_clip_003_gev_gt.json `
  --gt-registry data/vision/tracking/runs/pass01_clip_003/tracks_registry.json `
  --gt-tracks data/vision/tracking/runs/pass01_clip_003/tracks.jsonl `
  --worker-gev data/vision/pipeline/runs/rc4_m1_pass01_clip_003/gev_rc3_1_phase_c/gev_events.jsonl `
  --worker-registry data/vision/pipeline/runs/rc4_m1_pass01_clip_003/tracks_registry.json `
  --worker-tracks data/vision/pipeline/runs/rc4_m1_pass01_clip_003/tracks.jsonl `
  --output-dir D:\YAGO_AI\runs\tacticalV2\alignment\pass01_clip_003 `
  --clip-id pass01_clip_003 `
  --worker-run-id rc4_m1_pass01_clip_003
```

**Alignment Gate:**

| Check | Threshold |
|-------|-----------|
| alignmentCoverage | ≥ **0.80** |
| pairPrecision (oracle TBD per clip) | ≥ **0.95** |

### Step 3 — Quality Evaluation

```powershell
python scripts/evaluate_pass_quality.py `
  --gt data/vision/gt/pilot_pass01_clip_003_gev_gt.json `
  --pred D:\YAGO_AI\runs\tacticalV2\pass_network\pass01_clip_003\e2e_pilot2\events_canonical.jsonl `
  --alignment-map D:\YAGO_AI\runs\tacticalV2\alignment\pass01_clip_003\alignment_map.json `
  --coverage-report D:\YAGO_AI\runs\tacticalV2\pass_network\pass01_clip_003\e2e_pilot2\coverage_report.json `
  --output-dir D:\YAGO_AI\runs\tacticalV2\pass_network\pass01_clip_003\e2e_pilot2
```

**Output (clip별):**

```text
evaluation_summary.json
strict_metrics.json
time_metrics.json
aligned_metrics.json
```

### Step 4 — Clip Report Row

각 clip 완료 후 아래 표에 1행 추가 (수동 또는 향후 aggregate script — **본 Sprint: 수동**).

---

## 5. Cross-Clip Comparison Template

### 5.1 Pipeline Layer

| Clip | Coverage | Confirmed | Rejected | verifyPass |
|------|----------|-----------|----------|------------|
| pass01_clip_002 | **1.00** | 13 | 0 | ✅ |
| pass01_clip_003 | **1.00** | 15 | 0 | ✅ |
| pass01_clip_004 | **1.00** | 20 | 0 | ✅ |
| **평균** | **1.00** | — | — | **3/3 PASS** |

### 5.2 Alignment Layer

| Clip | alignmentCoverage | Pairs | GT endpoint IDs | 판정 |
|------|-------------------|-------|-----------------|------|
| pass01_clip_002 | **1.00** | 9 | 9 | ✅ |
| pass01_clip_003 | **N/A** | 0 | **0** | N/A — endpoint GT 없음 |
| pass01_clip_004 | **N/A** | 0 | **0** | N/A — endpoint GT 없음 |

> clip_003/004: Alignment **실패 ≠ Pipeline 실패**. GT에 track endpoint가 없어 Bridge 입력 불가.

### 5.3 Quality Layer — Cohort A (Primary)

| Clip | Precision | recallStrictEndpoints | edgePrecision | Cohort A PASS |
|------|-----------|----------------------|---------------|---------------|
| pass01_clip_002 | **0.923** | **0.80** | **1.00** | ✅ Conditional PASS |
| pass01_clip_003 | — | **N/A** | **N/A** | ⏳ GT backfill 필요 |
| pass01_clip_004 | — | **N/A** | **N/A** | ⏳ GT backfill 필요 |

### 5.4 Quality Layer — Cohort B (Diagnostic)

| Clip | Precision | Recall | F1 | GT sparse % |
|------|-----------|--------|-----|-------------|
| pass01_clip_002 | 0.923 | 0.632 | 0.750 | 74% (14/19) |
| pass01_clip_003 | 0.667 | **0.909** | 0.769 | **100%** (11/11) |
| pass01_clip_004 | **0.950** | **0.950** | **0.950** | **100%** (20/20) |
| **평균** | **0.847** | **0.830** | **0.823** | — |

### 5.5 Strict (Regression reference)

| Clip | strict P/R/F1 | 비고 |
|------|---------------|------|
| pass01_clip_002 | 0 / 0 / 0 | cross-run expected |
| pass01_clip_003 | 0 / 0 / 0 | endpoint GT 없음 |
| pass01_clip_004 | 0 / 0 / 0 | endpoint GT 없음 |

### 5.6 Aggregate Summary (2026-07-01 Ops 실행)

| 항목 | clip_002 | clip_003 | clip_004 | 평균 | Gate |
|------|----------|----------|----------|------|------|
| Pipeline Coverage | 1.00 | 1.00 | 1.00 | **1.00** | ✅ PASS |
| Alignment Coverage | 1.00 | N/A | N/A | — | ⏳ GT Hold |
| Precision (aligned) | 0.923 | 0.667 | 0.950 | 0.847 | Diagnostic |
| Recall (aligned) | 0.632 | 0.909 | 0.950 | 0.830 | Diagnostic |
| F1 (aligned) | 0.750 | 0.769 | 0.950 | 0.823 | Diagnostic |
| Edge Precision | 1.00 | N/A | N/A | — | ⏳ GT Hold |
| **Overall Gate (Primary)** | **PASS** | **HOLD** | **HOLD** | **HOLD** | ⏳ |

**PM 판정:** Offline Pipeline **🔒 PASS (3/3)** · Cross-Clip Primary Gate **⏳ GT Dataset Hold**

---

## 6. Execution Schedule (Ops)

| Phase | Task | Owner | Status |
|-------|------|-------|--------|
| P0 | rc4_m1 Worker run clip_003/004 생성 | Ops | ✅ **Done** |
| P1 | clip_003 Steps 1–3 | Eng/Ops | ✅ Pipeline+Eval Done · Alignment N/A |
| P2 | clip_004 Steps 1–3 | Eng/Ops | ✅ Pipeline+Eval Done · Alignment N/A |
| P3 | Cross-Clip comparison table 작성 | Eng | ✅ §5.6 |
| P4 | Cross-Clip Final Review doc | PM/Eng | ⏳ GT Sprint 후 |
| P5 | Firestore/GCS 승인 검토 | PM | ⏳ GT Dataset Hold |

**예상 소요 (Ops 가동 후):** clip당 ~30min (Pipeline + Alignment + Eval).

---

## 7. Risks & Mitigations

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| R1 | rc4_m1 run 미존재 | Blocker | P0 Worker 재실행 (no code change) |
| R2 | clip_003 GT label noise (RC3 co-exist flags) | FN inflation | Cohort A only; Ops GT review |
| R3 | clip_004 longer / more PASS | Alignment stress | v2 spatial bridge already proven |
| R4 | Oracle pairPrecision clip별 미정의 | Report gap | Step 2 후 alignment evidence로 oracle 확정 |
| R5 | Single-clip PASS but aggregate FAIL | Release delay | Min recall floor 0.70 |
| R6 | **GT endpoint missing (003/004)** | Alignment N/A | **GT Improvement Sprint** (§11) |

---

## 8. Deliverables

| Deliverable | Format | Status |
|-------------|--------|--------|
| 본 Plan | `docs/YAGO_VISION_CROSS_CLIP_VALIDATION_PLAN.md` | ✅ |
| clip_003 per-clip artifacts | `D:\YAGO_AI\...\pass01_clip_003\` | ✅ |
| clip_004 per-clip artifacts | `D:\YAGO_AI\...\pass01_clip_004\` | ✅ |
| Cross-Clip comparison table | §5.6 | ✅ |
| `YAGO_VISION_CROSS_CLIP_FINAL_REVIEW.md` | PM sign-off doc | ⏳ GT Sprint 후 |

---

## 9. Firestore / GCS Readiness

Cross-Clip Primary Gate **미충족** — Hold 유지.

**Hold 사유 (정확한 표현):**

```text
Ground Truth Dataset not sufficient for Endpoint Evaluation
```

> ~~Pipeline 미완성~~ ❌ — Pipeline은 **3/3 PASS (Coverage 100%)**

**승인 경로:**

```text
GT Dataset Improvement (clip_003/004 endpoint backfill)
        ↓
Alignment + Evaluation 재실행 (기존 스크립트, 코드 변경 없음)
        ↓
Cross-Clip Primary Gate PASS
        ↓
Cross-Clip Final Review PM sign-off
        ↓
Persist R-2~R-5 implementation Sprint (별도 승인)
        ↓
Firestore/GCS PM sign-off
        ↓
Beta Release
```

---

## 10. Current Progress Report

**As of 2026-07-01 (Ops 실행 완료):**

| Milestone | Status |
|-----------|--------|
| I13-5 Offline Pipeline | 🔒 **PASS (3/3 clips, Coverage 100%)** |
| Alignment Engine | 🔒 PASS (clip_002 proven) |
| Quality Evaluation | 🔒 PASS |
| Pilot #2 Final Review | 🔒 `c3cee3c` |
| Cross-Clip Plan | 🔒 `c4d8a4f` |
| rc4_m1 runs 003/004 | ✅ Done (~213s / ~205s CPU) |
| clip_003 validation | ✅ Pipeline PASS · Alignment **N/A** |
| clip_004 validation | ✅ Pipeline PASS · Alignment **N/A** · Diagnostic P/R **95%** |
| Cross-Clip aggregate | ✅ §5.6 · Primary Gate **HOLD** |
| Firestore/GCS | ⏳ **GT Dataset Hold** |

**Blocker:** GT Annotation — clip_003/004 PASS에 `fromTrackId`/`toTrackId` 없음.

---

## 11. GT Dataset Improvement Sprint (Next)

**Status:** 📐 **OPS ONLY** — 코드·Worker·Tracking·GEV 변경 금지

### 11.1 목표

clip_002와 **동일 Annotation Level** 확보:

```text
data/vision/gt/pilot_pass01_clip_003_gev_gt.json
data/vision/gt/pilot_pass01_clip_004_gev_gt.json
```

각 PASS 이벤트에 `fromTrackId` / `toTrackId` backfill (영상 + tracks.jsonl 리뷰).

### 11.2 Backfill 후 재실행 (기존 스크립트만)

```text
build_alignment_map.py   (CLI clip별)
        ↓
evaluate_pass_quality.py (CLI clip별)
        ↓
§5.6 Aggregate Report 갱신
```

### 11.3 금지

Worker · Tracking · GEV · Firestore · Callable · UI · Parent · **신규 기능 개발**

### 11.4 완료 조건

| Check | Target |
|-------|--------|
| clip_003/004 gtEndpointIdCount | > 0 |
| clip별 alignmentCoverage | ≥ 0.80 |
| clip별 Cohort A Primary | PASS |
| Cross-Clip aggregate Primary | PASS |

---

## References

- `docs/YAGO_VISION_PILOT2_FINAL_REVIEW.md`
- `docs/YAGO_VISION_I13_EVALUATION_ALIGNMENT_SPEC.md`
- `data/vision/gt/pilot_gev_gt_manifest.json`
- `data/vision/gt/rc3_1_phase_c_lock.json`
- `scripts/build_alignment_map.py` · `scripts/evaluate_pass_quality.py`

---

*Cross-Clip Validation Plan — plan/ops only. No code changes. No Firestore/GCS.*
