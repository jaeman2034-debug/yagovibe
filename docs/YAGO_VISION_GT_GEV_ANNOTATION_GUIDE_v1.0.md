# YAGO Vision — GT GEV Annotation Guide v1.0

**Status:** 🔒 **FINAL** — GT Dataset Improvement Sprint (2026-06-29)  
**Scope:** Pass Network GEV Ground Truth (`pilot_pass01_clip_*_gev_gt.json`)  
**Reference clip:** `pass01_clip_002`  
**Baseline:** Git `0ff7498` · Vision v2 I13-5 🔒 COMPLETE

> **OPS ONLY** — Worker · Tracking · GEV · Firestore · Callable · UI **변경 금지**

---

## 1. Purpose

Cross-Clip Primary Gate (Cohort A)는 GT PASS 이벤트의 **endpoint track ID** (`fromTrackId` / `toTrackId`)가 있어야 Alignment Bridge와 Endpoint Recall을 계산할 수 있습니다.

clip_003 · clip_004는 timestamp-only GT로 인해 `alignmentCoverage = N/A` 상태였습니다. 본 가이드는 clip_002와 **동일 규칙**으로 endpoint backfill을 수행하기 위한 운영 표준입니다.

---

## 2. Schema

**File pattern:**

```text
data/vision/gt/pilot_pass01_clip_{NNN}_gev_gt.json
```

**Header (required):**

| Field | Value |
|-------|-------|
| `schemaVersion` | `yago-vision-gt-gev-v1` |
| `clipId` | `pass01_clip_{NNN}` |
| `status` | `complete` |
| `fps` | `30.0` |
| `annotator` | `manual_opencv_v2_1` (또는 실제 annotator) |
| `matching.timestampToleranceS` | `0.75` |
| `matching.matchTrackEndpoints` | `true` |

**Event fields (PASS):**

| Field | Required | Notes |
|-------|----------|-------|
| `eventType` | ✅ | `PASS` |
| `timestamp` | ✅ | 초 단위, 영상 기준 |
| `frame` | ✅ | `round(timestamp × fps)` |
| `label` | ✅ | `manual_gt` |
| `fromTrackId` | **Sprint 필수** | GT annotation run의 sender track ID |
| `toTrackId` | **Sprint 필수** | GT annotation run의 receiver track ID |

**Event fields (RECEIVE / TURNOVER):**

| Field | Required | Notes |
|-------|----------|-------|
| `fromTrackId` | 선택 | clip_002: TURNOVER 일부만 endpoint 기록 |
| `toTrackId` | 선택 | PASS와 동일 timestamp co-label 시 생략 가능 |

---

## 3. Track ID Namespace (Critical)

**GT track ID는 반드시 GT annotation era tracking run에서 가져옵니다.**

```text
data/vision/tracking/runs/pass01_clip_{NNN}/tracks.jsonl
data/vision/tracking/runs/pass01_clip_{NNN}/tracks_registry.json
```

| Run | 용도 | GT에 사용 |
|-----|------|-----------|
| `pass01_clip_{NNN}` (GT era) | Human annotation reference | ✅ **YES** |
| `rc4_m1_pass01_clip_{NNN}` (Worker) | Pipeline prediction | ❌ **NO** — Alignment Bridge가 매핑 |

> clip_002 분석에서 확인: GT run ID와 Worker run ID는 **교집합 0**. GT에 Worker ID를 넣으면 Alignment가 실패합니다.

---

## 4. Annotation Workflow

### Step 1 — Timestamp labeling (완료 상태)

영상에서 PASS / RECEIVE / TURNOVER 이벤트 시각을 기록합니다. (clip_003/004는 RC2-2.2에서 완료)

### Step 2 — Candidate review

힌트 전용 (자동 정답 아님):

```text
data/vision/gt/pilot_pass01_clip_{NNN}_gev_gt_candidates.json
data/vision/tracking/runs/pass01_clip_{NNN}/gev_rc3_1_phase_c/gev_events.jsonl
```

**규칙:**

1. 영상에서 PASS 순간을 pause
2. `tracks.jsonl` overlay 또는 tracking 영상으로 sender / receiver 확인
3. candidates/GEV timestamp가 ±0.75s 이내면 힌트로 사용
4. **영상 확인 없이 GEV를 그대로 복사 금지** (Pilot #2 R2: label noise)

### Step 3 — Endpoint backfill

각 PASS 이벤트에 `fromTrackId` + `toTrackId` 추가.

**clip_002 reference pattern:**

- 19 PASS 중 5개만 endpoint 기록 (sparse) → Pilot #2 Conditional PASS
- Sprint 목표 (§11 Cross-Clip Plan): clip_003/004는 **모든 PASS** endpoint backfill

### Step 4 — Validation checklist

| Check | Method |
|-------|--------|
| JSON schema valid | `python -m json.tool` |
| PASS count unchanged | backfill 전후 PASS 수 동일 |
| Track IDs exist in GT registry | registry에 ID 존재 확인 |
| No Worker IDs in GT | `rc4_m1` prefix run ID 미사용 |
| Timestamp monotonic | frame = round(ts × 30) |

---

## 5. clip_002 Reference Summary

| Metric | clip_002 |
|--------|----------|
| PASS events | 19 |
| PASS with both endpoints | 5 (26%) |
| Unique endpoint GT IDs (alignment) | 9 |
| Alignment coverage (post-bridge v2) | 1.00 |
| Cohort A recallStrictEndpoints | 0.80 |

**대표 endpoint 예시:**

```json
{
  "eventType": "PASS",
  "timestamp": 11.233,
  "frame": 337,
  "label": "manual_gt",
  "fromTrackId": "P0090",
  "toTrackId": "P0093"
}
```

---

## 6. clip_003 / clip_004 Backfill Record (2026-06-29)

**Method:** GT-era GEV + candidates 힌트 → timestamp match (≤0.75s) → endpoint assign  
**Annotator note:** 영상 재검증 권장 (Ops sign-off 전)

| Clip | PASS count | Endpoints filled | Unique endpoint IDs |
|------|------------|------------------|---------------------|
| pass01_clip_003 | 11 | 11/11 | 22 |
| pass01_clip_004 | 20 | 20/20 | 40 |

**Ambiguous cases (영상 재확인 권장):**

| Clip | Timestamp | Source | Endpoints | Note |
|------|-----------|--------|-----------|------|
| clip_003 | 13.467 | GEV @ 13.5s | P0112→P0117 | Δt 0.033s |
| clip_003 | 27.467 | GEV @ 28.033s | P0200→P0228 | Δt 0.566s |
| clip_003 | 42.167 | GEV TURNOVER | P0293→P0321 | PASS/TURNOVER co-label |
| clip_003 | 55.6 | GEV @ 56.033s | P0388→P0397 | Δt 0.433s |
| clip_004 | 3.7 | GEV @ 4.233s | P0010→P0014 | Δt 0.533s |
| clip_004 | 45.467 | GEV TURNOVER | P0354→P0379 | turnover-adjacent |

---

## 7. Post-Backfill Ops (기존 CLI만)

코드 수정 없이 clip별 실행:

```powershell
# Alignment
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

# Quality Evaluation
python scripts/evaluate_pass_quality.py `
  --gt data/vision/gt/pilot_pass01_clip_003_gev_gt.json `
  --pred D:\YAGO_AI\runs\tacticalV2\pass_network\pass01_clip_003\e2e_pilot2\events_canonical.jsonl `
  --alignment-map D:\YAGO_AI\runs\tacticalV2\alignment\pass01_clip_003\alignment_map.json `
  --coverage-report D:\YAGO_AI\runs\tacticalV2\pass_network\pass01_clip_003\e2e_pilot2\coverage_report.json `
  --output-dir D:\YAGO_AI\runs\tacticalV2\pass_network\pass01_clip_003\e2e_pilot2
```

clip_004는 경로의 `003` → `004` 치환.

---

## 8. Gate Criteria (unchanged)

| Gate | Threshold | Source |
|------|-----------|--------|
| Pipeline Coverage | ≥ 0.60 | verify.json |
| Alignment Coverage | ≥ 0.80 | alignment_report.json |
| Cohort A recallStrictEndpoints | ≥ 0.80 | evaluation_summary.json |
| Cohort A edgePrecision | ≥ 0.95 | evaluation_summary.json |
| Cross-Clip Aggregate Primary | All clips PASS | §5.6 Cross-Clip Plan |

---

## 9. Engineering Lock

| Allowed | Forbidden |
|---------|-----------|
| GT JSON edit | Worker / Tracking / GEV code |
| Candidates JSON review | Firestore / Callable / UI |
| Existing CLI re-run | New features / scripts |
| Ops docs | Alignment threshold tuning |

---

## References

- `docs/YAGO_VISION_CROSS_CLIP_VALIDATION_PLAN.md` §11
- `docs/YAGO_VISION_PILOT2_FINAL_REVIEW.md` — Cohort A/B policy
- `docs/YAGO_VISION_I13_EVALUATION_ALIGNMENT_SPEC.md`
- `data/vision/gt/pilot_pass01_clip_002_gev_gt.json` — reference GT

**PM Sign-off:** _Pending Ops video re-verification_
