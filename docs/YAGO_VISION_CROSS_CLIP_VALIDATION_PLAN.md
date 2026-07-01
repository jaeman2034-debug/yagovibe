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

### 2.4 Cross-Clip Aggregate Gate (PM 제안)

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
| pass01_clip_003 | — | — | — | ⏳ |
| pass01_clip_004 | — | — | — | ⏳ |

### 5.2 Alignment Layer

| Clip | alignmentCoverage | alignmentPairs | pairPrecision | split/merge |
|------|-------------------|----------------|---------------|-------------|
| pass01_clip_002 | **1.00** | 9 | **1.00** | 0/0 |
| pass01_clip_003 | — | — | — | ⏳ |
| pass01_clip_004 | — | — | — | ⏳ |

### 5.3 Quality Layer — Cohort A (Primary)

| Clip | Precision | recallStrictEndpoints | edgePrecision | Cohort A PASS |
|------|-----------|----------------------|---------------|---------------|
| pass01_clip_002 | **0.923** | **0.80** | **1.00** | ✅ |
| pass01_clip_003 | — | — | — | ⏳ |
| pass01_clip_004 | — | — | — | ⏳ |

### 5.4 Quality Layer — Cohort B (Diagnostic)

| Clip | recall (all) | F1 (all) | GT sparse % |
|------|--------------|----------|-------------|
| pass01_clip_002 | 0.632 | 0.750 | 74% (14/19) |
| pass01_clip_003 | — | — | TBD |
| pass01_clip_004 | — | — | TBD |

### 5.5 Strict (Regression reference)

| Clip | strict P/R/F1 | 비고 |
|------|---------------|------|
| pass01_clip_002 | 0 / 0 / 0 | cross-run expected |
| pass01_clip_003 | — | ⏳ |
| pass01_clip_004 | — | ⏳ |

---

## 6. Execution Schedule (Ops)

| Phase | Task | Owner | Status |
|-------|------|-------|--------|
| P0 | rc4_m1 Worker run clip_003/004 생성 | Ops | ⏳ **Blocker** |
| P1 | clip_003 Steps 1–3 | Eng/Ops | ⏳ |
| P2 | clip_004 Steps 1–3 | Eng/Ops | ⏳ |
| P3 | Cross-Clip comparison table 작성 | Eng | ⏳ |
| P4 | Cross-Clip Final Review doc | PM/Eng | ⏳ |
| P5 | Firestore/GCS 승인 검토 | PM | ⏳ |

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

---

## 8. Deliverables

| Deliverable | Format | Status |
|-------------|--------|--------|
| 본 Plan | `docs/YAGO_VISION_CROSS_CLIP_VALIDATION_PLAN.md` | ✅ |
| clip_003 per-clip artifacts | `D:\YAGO_AI\...\pass01_clip_003\` | ⏳ |
| clip_004 per-clip artifacts | `D:\YAGO_AI\...\pass01_clip_004\` | ⏳ |
| Cross-Clip comparison table | §5 filled | ⏳ |
| `YAGO_VISION_CROSS_CLIP_FINAL_REVIEW.md` | PM sign-off doc | ⏳ Post-validation |

---

## 9. Firestore / GCS Readiness (unchanged)

Cross-Clip Validation **PASS** 전까지:

```text
Firestore/GCS  →  Not Ready (Conditional Hold)
```

**승인 경로:**

```text
Cross-Clip 003 + 004 Cohort A PASS
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

**As of 2026-07-01:**

| Milestone | Status |
|-----------|--------|
| I13-5 Implementation | 🔒 LOCK |
| Pilot #2 Final Review | 🔒 `c3cee3c` |
| Cross-Clip Plan | ✅ **this doc** |
| rc4_m1 runs 003/004 | ⏳ **Not started — P0 blocker** |
| clip_003 validation | ⏳ Pending P0 |
| clip_004 validation | ⏳ Pending P0 |
| Cross-Clip aggregate | ⏳ Pending |
| Firestore/GCS | ⏳ Hold |

**다음 즉시 조치:** Ops — `pass01_clip_003` / `pass01_clip_004`에 대해 **rc4_m1 Worker pipeline 재실행** (clip_002와 동일 config lock).

---

## References

- `docs/YAGO_VISION_PILOT2_FINAL_REVIEW.md`
- `docs/YAGO_VISION_I13_EVALUATION_ALIGNMENT_SPEC.md`
- `data/vision/gt/pilot_gev_gt_manifest.json`
- `data/vision/gt/rc3_1_phase_c_lock.json`
- `scripts/build_alignment_map.py` · `scripts/evaluate_pass_quality.py`

---

*Cross-Clip Validation Plan — plan/ops only. No code changes. No Firestore/GCS.*
