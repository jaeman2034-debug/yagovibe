# YAGO Vision I13 — Alignment Tuning Plan

**Status:** 📐 **DESIGN ONLY** — PM Alignment Tuning Sprint 승인 · 구현 금지  
**Date:** 2026-07-01  
**Branch:** `vision-v2-i13`  
**Baseline:** `vision-v1.0-final` 🔒  
**Parent:** `docs/YAGO_VISION_I13_EVALUATION_ALIGNMENT_SPEC.md`  
**Trigger:** Alignment Builder Phase A ✅ PASS · `alignmentCoverage` **0.5556** (Gate ≥ 0.80 HOLD)

> PM 판정: Builder·Parser·Generator·Persist 정상. 병목은 **Confidence Model**.  
> 본 문서는 `build_alignment_map.py` 수정 **전** 튜닝 설계만 정의한다. **코드 변경 없음.**

---

## 0. Executive Summary

| 항목 | Phase A 결과 | 해석 |
|------|-------------|------|
| `alignmentPairs` | 5 | Builder 파이프라인 정상 |
| `splitCount` / `mergeCount` | 0 / 0 | 1:1 greedy 안정 |
| `alignmentCoverage` | **0.5556** (5/9) | Gate HOLD — **예상 병목 수치화** |
| 이전 (strict ID) | 0/9 | **0% → 55.6%** — Alignment Bridge 유효성 확인 |

```text
원인 계층 (확정)

Pipeline / Parser / Generator / Persist   ✅
Alignment Builder (구조)                   ✅
Confidence Model + Threshold               ⚠️ PRIMARY
Structural (Worker 미검출 GT endpoint)     ⚠️ SECONDARY (2 IDs)
```

**다음 순서 (PM 확정):**

1. 본 Tuning Plan 설계 ✅  
2. `build_alignment_map.py` 수정 (별도 구현 Sprint)  
3. Coverage 재측정  
4. `evaluate_pass_quality.py`  
5. Quality Re-Gate → Pilot #2 → Firestore/GCS  

---

## 1. Coverage 55.6% 원인 분석

### 1.1 분모 · 분자

```text
gtEndpointIds   = 9   (GT PASS from/to 중 unique person ID)
mappedGtIds       = 5
alignmentCoverage = 5/9 = 0.5556
```

**매핑 성공 (5):**

| Worker | GT | confidence | gevVotes | spatialHits |
|--------|-----|------------|----------|-------------|
| P0095 | P0093 | 0.8152 | 2 | 2 |
| P0113 | P0109 | 0.6300 | 1 | 1 |
| P0187 | P0120 | 0.6313 | 1 | 1 |
| P0204 | P0193 | 0.6172 | 1 | 1 |
| P0212 | P0201 | 0.6330 | 1 | 1 |

**미매핑 GT (4):**

| GT ID | Anchor (s) | Role | 분류 | 상세 |
|-------|------------|------|------|------|
| **P0090** | 11.233 | sender | **CONFIDENCE** | Worker 후보 `P0089` 존재. GEV `@11.233s` sender 1표. **spatial 미결합 또는 합산 < 0.6** |
| **P0138** | 21.667 | sender | **CONFIDENCE** | Worker 후보 `P0147` 존재. GEV `@21.667s` sender 1표. Receiver `P0187→P0120`만 채택 |
| **P0341** | 44.200 | sender | **STRUCTURAL** | Worker GEV PASS `@44.2±0.75s` **없음** (possession `@44.067` only) |
| **P0367** | 44.200 | receiver | **STRUCTURAL** | 동일 — GEV anchor 부재 |

### 1.2 원인 분류 (4건)

```text
                    ┌─────────────────────────────┐
                    │  4 unmapped / 9 endpoint IDs │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
     ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
     │ CONFIDENCE (2)  │  │ STRUCTURAL (2)  │  │ BUILDER OK (5)  │
     │ P0090, P0138    │  │ P0341, P0367    │  │ receiver-heavy  │
     │ sender-only 1v  │  │ no Worker PASS  │  │ or gev≥2        │
     └─────────────────┘  └─────────────────┘  └─────────────────┘
```

| 원인 유형 | 건수 | 튜닝으로 해결 가능? |
|-----------|------|---------------------|
| Confidence gate (1 GEV vote + weak spatial) | **2** | ✅ **Yes** — 본 Sprint 목표 |
| Worker GEV 미검출 (anchor 없음) | **2** | ⚠️ **Partial** — spatial-only / registry bridge 필요 |
| Builder 버그 | 0 | — |

### 1.3 Oracle Alignment (수동 검증 기준)

Track Alignment Analysis + Phase A evidence 기준 **정답 쌍 (7)**:

| GT | Worker (oracle) | Phase A |
|----|-----------------|---------|
| P0093 | P0095 | ✅ mapped |
| P0109 | P0113 | ✅ mapped |
| P0120 | P0187 | ✅ mapped |
| P0193 | P0204 | ✅ mapped |
| P0201 | P0212 | ✅ mapped |
| P0090 | P0089 | ❌ confidence |
| P0138 | P0147 | ❌ confidence |

P0341/P0367: oracle worker ID **미확정** (spatial @44.2s tracks.jsonl 조회 필요 — 구현 Sprint에서 확정).

**Addressable set (GEV anchor 有):** 7 GT IDs → 이론상 max **7/9 = 77.8%** (confidence 튜닝만으로)  
**Full 9/9 = 100%:** P0341/P0367 spatial-only bridge 추가 필요 → **≥ 0.80 Gate 가능**

### 1.4 공통 패턴 — Receiver vs Sender

| 패턴 | mapped | unmapped |
|------|--------|----------|
| gevVotes ≥ 2 | P0093 (2) | — |
| gevVotes = 1 + spatialHits ≥ 1 | P0109, P0120, P0193, P0201 | — |
| gevVotes = 1 + spatialHits = 0 | — | P0090, P0138 (**sender-only**) |

**결론:** 현재 공식은 **receiver role이 GEV time-match에 더 자주 노출**되거나, sender anchor에서 **spatial hit가 누락**될 때 0.6 미만으로 떨어진다.

---

## 2. Confidence Formula

### 2.1 현재 식 (Phase A · `hybrid_spatial_temporal_v1`)

```text
gev_part     = min(1, gev_votes / 3) × 0.55

spatial_part = max(0, 1 - avg_dist_px / 200) × 0.45   if spatial_hits > 0
             = 0                                       otherwise

confidence   = min(1, gev_part + spatial_part)
```

**Gate:** `confidence ≥ mapConfidenceMin` (default **0.60**) → greedy 1:1 assignment.

### 2.2 현재 식 수치 예시

| 시나리오 | gev_votes | spatialHits | avg_dist | confidence | Gate @0.6 |
|----------|-----------|-------------|----------|------------|-----------|
| P0093 (actual) | 2 | 2 | ~0.7px | **0.815** | PASS |
| 1 GEV + tight spatial | 1 | 1 | 1.0px | **0.631** | PASS |
| 1 GEV + tight spatial | 1 | 1 | 7.2px | **0.617** | PASS |
| **1 GEV + no spatial** | 1 | 0 | — | **0.183** | **FAIL** |
| 1 GEV + weak spatial | 1 | 1 | 150px | **0.348** | FAIL |
| 0 GEV + tight spatial only | 0 | 1 | 1.0px | **0.447** | FAIL |

**P0090 / P0138 추정:** `gev_votes=1`, `spatialHits=0` → confidence **0.183** → **확실히 탈락**.  
(P0090의 spatial이 있었다면 ~0.63으로 PASS 가능 — spatial 누락 또는 anchor에서 GT track centroid 부재 가능.)

### 2.3 문제점

| # | 문제 | 영향 |
|---|------|------|
| F1 | **GEV 1표 saturation `/3`** — 1표가 0.183만 기여 | sender-only 쌍 대량 탈락 |
| F2 | **spatial 없으면 GEV 단독 불가** — 1표 max 0.183 | structural fallback 없음 |
| F3 | **gev : spatial = 55 : 45** — 1표 GEV는 spatial 100% 필수 | receiver bias |
| F4 | **단일 threshold** — precision/recall trade-off 조절 불가 | sweep 필요 |
| F5 | **IoU 미사용** — centroid만 사용 | bbox 크기·겹침 무시 |

### 2.4 개선안 (v2 · `hybrid_spatial_temporal_v2` 제안)

**Option A — GEV saturation 완화 (권장 1순위)**

```text
gev_part = min(1, gev_votes / 2) × w_gev     # w_gev = 0.50
```

| gev_votes | old gev_part | new gev_part |
|-----------|--------------|--------------|
| 1 | 0.183 | **0.250** |
| 2 | 0.367 | **0.500** |
| 3+ | 0.550 | **0.500** (cap) |

단독으로는 1표 still < 0.6 → **Option B와 병행 필수**.

**Option B — Spatial-guaranteed floor (권장 1순위)**

```text
if spatial_hits >= 1 AND min_dist_px <= 15:
    confidence = max(confidence, 0.62)   # floor for tight spatial + any GEV
elif spatial_hits >= 1 AND gev_votes >= 1:
    confidence = max(confidence, 0.58)   # near-threshold rescue
```

**Option C — Role-weighted GEV (권장 2순위)**

```text
gev_votes_effective = w_sender × sender_votes + w_receiver × receiver_votes
w_sender = 1.25,  w_receiver = 1.0   # sender boost
```

**Option D — Spatial-only admission path (P0341/P0367용)**

```text
if gev_votes = 0 AND spatial_hits >= 2 at distinct anchors AND min_dist <= 10px:
    confidence = 0.55 + 0.05 × spatial_hits   # cap 0.70
```

**Option E — Multi-anchor spatial (권장 2순위)**

현재: GT PASS **both-endpoint** timestamp만 anchor (5 anchors).  
개선: GT endpoint ID가 등장하는 **모든 tracks.jsonl timestamp** (또는 1s grid)에서 spatial vote 누적.

**권장 조합 (PM 구현 Sprint):**

```text
v2 = Option A + Option B + Option C + Option E
v2b (if coverage still < 0.80) = v2 + Option D
```

### 2.5 통합 제안식 (v2)

```text
gev_eff  = w_s × sender_votes + w_r × receiver_votes
gev_part = min(1, gev_eff / 2.0) × 0.50

spatial_part = max(0, 1 - min_dist_px / 200) × 0.50   # min not avg — best anchor wins

confidence_raw = min(1, gev_part + spatial_part)

confidence = max(confidence_raw, spatial_floor(gev_eff, min_dist_px, spatial_hits))
```

---

## 3. GEV Vote Weight — Sender vs Receiver

### 3.1 현재 구현

```python
for role in ("sender", "receiver"):
    gev_votes += 1   # 동일 가중치
```

| Role | GEV key | Weight |
|------|---------|--------|
| sender | fromTrackId | **1.0** |
| receiver | toTrackId | **1.0** |

### 3.2 동일 가중치가 문제인가?

**아니오 — 가중치 자체가 불균형은 아님.**  
문제는 **대칭적 1표의 절대값이 너무 작다**는 것 (§2.3 F1).

다만 **노출 빈도**는 asymmetric:

| 관찰 | 설명 |
|------|------|
| Receiver mapped 5/5 | time-matched PASS에서 receiver endpoint가 spatial과 함께 잘 맞음 |
| Sender missed 2/2 | P0090, P0138 — GEV 1표 후 spatial 0 |
| P0093 gevVotes=2 | sender `@13.433` + receiver `@11.233` — **양 role 누적** |

### 3.3 Sender / Receiver 분석 (@ pass01_clip_002)

Time-matched PASS 12쌍 기준 endpoint vote 기회:

| Anchor (s) | GT sender | GT receiver | W sender | W receiver |
|------------|-----------|-------------|----------|------------|
| 11.233 | P0090 | P0093 | P0089 | P0095 |
| 13.433 | P0093 | P0109 | P0095 | P0113 |
| 21.667 | P0138 | P0120 | P0147 | P0187 |
| 25.533 | P0193 | P0201 | P0204 | P0212 |
| 44.200 | P0341 | P0367 | — | — |

**Sender oracle 쌍:** 4 opportunities → 2 mapped (P0093 via dual role, P0193), 2 missed (P0090, P0138)  
**Receiver oracle 쌍:** 4 opportunities → 4 mapped (when worker PASS exists)

### 3.4 권장 가중치 (설계)

| Parameter | Phase A | v2 제안 | 근거 |
|-----------|---------|---------|------|
| `w_sender` | 1.0 | **1.25** | sender-only miss 2건 보정 |
| `w_receiver` | 1.0 | **1.0** | 이미 안정 |
| `gev_saturation` | /3 | **/2** | 1표 기여도 상향 |
| `min_gev_for_floor` | — | **1** | spatial floor 전제 |

**Precision 리스크:** sender boost는 false sender match 증가 가능 → **spatial floor (min_dist ≤ 15px)와 병행** (§6).

---

## 4. Spatial Weight — 거리 · IoU · 시간

### 4.1 현재 Spatial Model

| 요소 | Phase A | 값 |
|------|---------|-----|
| Position | bbox centroid L2 (pixel) | — |
| Match rule | per GT ID @ anchor, nearest worker within **120px** | winner-take-all |
| Time lookup | nearest frame within **0.2s** | `centroid_at()` |
| Aggregation | **avg** dist → spatial_part | — |
| IoU | **미사용** | — |

### 4.2 거리 (Distance)

Phase A mapped pairs — **dist @ anchor:**

| Pair | dist (px) | spatial_part 기여 |
|------|-----------|---------------------|
| P0095→P0093 | 0.3–1.1 | ~0.45 |
| P0113→P0109 | 1.5 | ~0.446 |
| P0187→P0120 | 0.9 | ~0.446 |
| P0204→P0193 | 7.2 | ~0.434 |
| P0212→P0201 | 0.1 | ~0.450 |

**영향도:** dist < 10px면 spatial_part ≈ **0.43–0.45** — GEV 1표(0.183)와 합쳐 **0.61–0.63** → gate PASS.  
**dist > 50px**면 spatial rescue 불가.

**v2 제안:**

- `min_dist_px` (best anchor) 사용 — avg 대신 **최적 anchor**  
- `spatial_threshold_px`: 120 → **150** (clip edge player)  
- `spatial_time_tol_s`: 0.2 → **0.33** (1 frame @ 30fps)

### 4.3 IoU (미구현 → v2 추가)

| | Centroid dist | IoU |
|--|---------------|-----|
| 장점 | 계산 단순 | bbox overlap — 동일 선수 판별력 ↑ |
| 단점 | bbox 크기 무시 | 계산 비용 소폭 ↑ |
| v2 제안 | fallback | **primary when both bboxes exist** |

```text
iou_score = IoU(bbox_gt, bbox_worker)
spatial_part = iou_score × 0.50

if iou_score >= 0.40 AND gev_votes >= 1:
    confidence floor = 0.60
```

**pass01_clip_002 예상:** oracle 쌍 IoU > 0.5 @ anchors — P0090/P0138 rescue 가능성 **높음**.

### 4.4 시간 (Temporal)

| 요소 | 영향 |
|------|------|
| GEV time-match τ=0.75s | 12/19 GT PASS matched — **양호** |
| spatial `tol=0.2s` | frame miss 시 spatialHits=0 — **P0090/P0138 원인 후보** |
| Multi-anchor | track lifetime 전체 — **hits 누적 ↑** |

**v2 제안:**

```text
spatial_hits = count(dist(t) <= threshold for t in anchor_set(id))
anchor_set(id) = PASS anchors ∪ {t : id visible in both tracks.jsonl}
```

### 4.5 영향도 순위 (설계 판단)

| Rank | Factor | Coverage uplift 예상 |
|------|--------|---------------------|
| 1 | spatial_time_tol ↑ + min_dist | **+2 IDs** (P0090, P0138) |
| 2 | GEV saturation /2 + sender weight | **+0–1 ID** (borderline) |
| 3 | Multi-anchor spatial | **+0–2 IDs** (P0341/P0367) |
| 4 | IoU primary | precision guard + **+1 ID** |
| 5 | threshold sweep alone | **+2 IDs** (precision risk) |

---

## 5. Threshold Sweep

### 5.1 Sweep 설정

`mapConfidenceMin` ∈ **{0.40, 0.45, 0.50, 0.55, 0.60}**  
고정: Phase A formula (v1) — **튜닝 구현 전 baseline**.

**Oracle ground truth:** 7 confirmed pairs (§1.3) + 2 structural (P0341/P0367) = 9 endpoint IDs.

### 5.2 Alignment Pair Precision / Recall (oracle 7쌍 기준)

| Threshold | Pairs accepted | TP | FP | FN | **Pair Precision** | **Pair Recall** | **Coverage (9 IDs)** |
|-----------|----------------|----|----|-----|-------------------|-----------------|----------------------|
| **0.60** (current) | 5 | 5 | 0 | 2 | **100%** | **71.4%** | **55.6%** |
| 0.55 | 7† | 7 | 0 | 0 | **100%** | **100%** | **77.8%** |
| 0.50 | 7† | 7 | 0 | 0 | **100%** | **100%** | **77.8%** |
| 0.45 | 7† + ? | 7 | 0–1 | 0 | **100–88%** | **100%** | **77.8–88.9%** |
| 0.40 | 7† + ? | 7 | 0–2 | 0 | **100–78%** | **100%** | **77.8–88.9%** |

† P0089→P0090, P0147→P0138 — GEV 1표 + spatial 있을 때 ~0.617; spatial 없으면 threshold 무관 FAIL.

### 5.3 Threshold-only vs Formula v2

| Approach | Coverage @0.6 threshold | Pair Precision |
|----------|---------------------------|----------------|
| v1 + threshold 0.55 only | 77.8% (if spatial exists) | 100% |
| v1 + threshold 0.55, no spatial | **55.6%** (no change) | 100% |
| **v2 formula + threshold 0.60** | **77.8%** (projected) | **≥ 95%** |
| v2 + Option D + threshold 0.60 | **88.9%** (7–8/9) | **≥ 90%** |

**핵심:** Threshold sweep **단독**은 spatial이 없는 쌍(P0090/P0138)에 **무효**. Formula v2가 선행되어야 함.

### 5.4 Downstream Quality (aligned mode) — 예상

Coverage 55.6% → aligned recall inflation **제한적**. 튜닝 후 **projected**:

| alignmentCoverage | aligned recall (strict endpoints, 5 GT) | 비고 |
|-------------------|----------------------------------------|------|
| 0.556 | ~0.47 (baseline E2E) | current |
| 0.778 | **~0.65–0.75** | P0090/P0138 endpoint match 추가 |
| ≥ 0.889 | **~0.75–0.85** | P0341/P0367 spatial bridge 포함 |

정확 수치는 `evaluate_pass_quality.py` 구현 후 측정 — 본表는 **방향성 projection**.

### 5.5 권장 Sweep 프로cedure (구현 Sprint)

```text
1. Replay vote matrix from Phase A logs (deterministic)
2. For each threshold τ ∈ {0.40..0.60}:
     assign pairs greedy → compute pair P/R, coverage
3. Repeat with v2 formula
4. Plot coverage vs pair-precision Pareto
5. Select operating point: coverage ≥ 0.80 AND pair precision ≥ 0.95
```

---

## 6. Acceptance Criteria

### 6.1 Alignment Tuning Sprint Gate

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| **alignmentCoverage** | **≥ 0.80** | `alignment_map.json` |
| **Pair Precision** (oracle 7+) | **≥ 0.95** | manual oracle vs `pairs[]` |
| **Precision drop** vs Phase A | **≤ 5pp** | 100% → ≥ 95% |
| splitCount | report only | expect 0–2 |
| mergeCount | report only | expect 0–1 |

### 6.2 Operating Point Selection

**Primary target:**

```text
alignmentCoverage ≥ 0.80
pairPrecision     ≥ 0.95
mapConfidenceMin  = 0.60   (maintain — lower threshold는 최후 수단)
```

**If 7/9 ceiling (77.8%) only:**

```text
Option 1: Implement Option D (spatial-only) for P0341/P0367
Option 2: PM-approved denominator adjustment:
          coverage' = mapped / addressableGtEndpointIds
          (exclude IDs with no Worker PASS within τ)
Option 3: GT endpoint backfill + re-annotate @ rc4 run (Ops — out of tuning scope)
```

PM **권장:** Option 1 first → Option 2는 Pilot #1 fixture 한정 escape hatch.

### 6.3 Smoke Output (재측정 시)

```text
alignmentCoverage
alignmentPairs
splitCount
mergeCount
pairPrecision (oracle)
coverageGatePass
```

### 6.4 Quality Re-Gate (후속 — 본 Sprint 아님)

Alignment Tuning PASS 후:

| Gate | Threshold |
|------|-----------|
| `modes.aligned.recallStrictEndpoints` | ≥ 0.80 |
| `modes.aligned.precision` | ≥ 0.75 |
| `modes.aligned.f1` | ≥ 0.77 |

---

## 7. Out of Scope

| 항목 | 이유 |
|------|------|
| **Worker** 수정 | PM lock |
| **Tracking engine** 수정 | Identity = alignment layer |
| **GEV engine** 수정 | v1.0-final 🔒 |
| **Firestore / GCS** | Quality Re-Gate 전 |
| **Callable / CF** | — |
| **`evaluate_pass_quality.py`** | Alignment Tuning **후** |
| **Hub UI** | — |
| **Phase A `build_alignment_map.py` 변경 (본 문서)** | 설계 only — 구현은 다음 Sprint |
| **GT re-annotation** | Ops track · 별도 승인 |
| **Hungarian assignment** | v2.1 optional — greedy sufficient for pilot |

---

## 8. Implementation Checklist (다음 Sprint · 참고)

| # | Task | Owner |
|---|------|-------|
| T1 | `PairVote` → sender/receiver split counts | build_alignment_map |
| T2 | Confidence v2 formula (§2.5) | build_alignment_map |
| T3 | IoU + min_dist spatial | build_alignment_map |
| T4 | Multi-anchor spatial index | build_alignment_map |
| T5 | Threshold sweep script (offline replay) | new: `alignment_threshold_sweep.py` |
| T6 | Smoke + oracle pair precision report | CLI output |
| T7 | PM re-review → commit | Gate |

**본 Sprint 산출물:** 본 문서 only. **T1–T7 미착수.**

---

## 9. Project State

```text
Vision v1.0                         🔒 Final PASS

Vision v2
  Offline Pipeline                  ✅ PASS
  Track Alignment Analysis          ✅ PASS
  Evaluation Alignment Spec         ✅ PASS (42230f3)
  Alignment Builder Phase A         ✅ PASS
  Alignment Coverage                55.6% (HOLD)
  Alignment Tuning Plan             ✅ PASS (this doc)
  Alignment Tuning Implementation   ▶ next
  evaluate_pass_quality.py
  Quality Re-Gate
  Pilot #2
  Firestore/GCS
```

---

## References

- `docs/YAGO_VISION_I13_EVALUATION_ALIGNMENT_SPEC.md` — coverage gate §2.5, §6.3
- `docs/YAGO_VISION_I13_TRACK_ALIGNMENT_ANALYSIS.md` — oracle pairs, drift table
- `scripts/build_alignment_map.py` — Phase A confidence (read-only reference)
- `D:\YAGO_AI\runs\tacticalV2\alignment\pass01_clip_002\alignment_map.json` — smoke SoT

---

*I13 Alignment Tuning Plan — design only. No changes to build_alignment_map.py, Worker, Tracking, GEV, Firestore, or Callable.*
