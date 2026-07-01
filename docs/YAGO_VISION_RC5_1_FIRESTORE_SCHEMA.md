# YAGO Vision RC5-1 — Firestore Schema (Implementation SoT)

**Date:** 2026-06-30  
**Status:** ✅ **IMPLEMENTED** (RC5-1 PASS — ops enhanced)  
**Parent:** `docs/YAGO_VISION_RC5_1_REPORT.md`  
**CF module:** `functions/src/lib/academyVisionFirestore.ts`  
**Client types:** `src/lib/vision/visionRunTypes.ts`

> 운영 파이프라인 스키마만 정의. GEV/FII 엔진 · GT · Baseline · Report Layer는 RC5-1 범위 밖.

---

## 1. 컬렉션 경로

| Collection | Path | Scope |
|------------|------|-------|
| `visionRuns` | `teams/{teamId}/media/{mediaId}/visionRuns/{runId}` | Job (media 단위) |
| `visionMatchIndex` | `teams/{teamId}/visionMatchIndex/{matchId}` | Match 조회 인덱스 (Coach · Parent · Timeline 공용) |
| `visionAnalysis` | `teams/{teamId}/matches/{matchId}/visionAnalysis/{analysisId}` | 분석 결과 SoT |

---

## 2. visionRuns

### 상태 머신

```text
queued → processing → completed
     ↘ retrying ↗        ↘ failed → retrying → …
queued → cancelled
```

| 설계 용어 | Firestore 값 | UI |
|-----------|--------------|-----|
| `running` | `processing` | `analyzing` |
| 재처리 중 | `retrying` | `retrying` |

### pipelineStep · progress

| pipelineStep | progress |
|--------------|----------|
| upload | 5 |
| queued | 10 |
| tracking | 25 |
| gev | 50 |
| fii | 75 |
| persist | 90 |
| done | 100 |

### 필드

| Field | Type | 설명 |
|-------|------|------|
| `status` | enum | `queued` \| `retrying` \| `processing` \| `completed` \| `failed` \| `cancelled` |
| `pipelineStep` | enum | `upload` … `done` |
| `progress` | number | 0–100 (`pipelineStep`에서 파생) |
| `videoHash` | string | `resolveVideoHashFromMedia` (storagePath+size 또는 explicit) |
| `idempotencyKey` | string | `{teamId}:{matchId}:{videoHash}` |
| `retryCount` | number | 재시도 누적 (`startedFrom: retry`) |
| `startedAt` | timestamp | `retrying` / `processing` 진입 |
| `createdAt` / `updatedAt` / `completedAt` / `failedAt` | timestamp | |
| `errorCode` / `errorMessage` | string | 실패 시 |
| `pipelineVersion` | string | `m2` |
| `productionPreset` | string | `rc3_1_phase_c` (고정) |

### Idempotency

- 키: `teamId:matchId:videoHash` — **같은 경기 + 같은 영상** 중복 실행 방지
- 다른 영상 재업로드 시 `videoHash` 변경 → 새 Run 허용
- `findActiveVisionRun`: `queued` \| `retrying` \| `processing` → `already-exists`
- `findCompletedVisionRun`: 완료 + 동일 키 → 기존 run/analysis 반환 (`idempotent`)

---

## 3. visionMatchIndex

| Field | Type | 설명 |
|-------|------|------|
| `hasVision` | boolean | Vision 파이프라인 진입 여부 |
| `latestRunId` | string | `runId` alias |
| `latestAnalysisId` | string | `analysisId` alias |
| `analysisCompletedAt` | timestamp | `status: completed` 시 |
| `pipelineStep` / `progress` | | run과 동기 |
| `videoHash` / `idempotencyKey` | string | 중복 방지 조회 |
| `status` | enum | run status + `uploading` |

---

## 4. visionAnalysis

| Field | Type | 설명 |
|-------|------|------|
| `analysisVersion` | string | `rc5_1` (ops artifact version) |
| `preset` | string | `rc3_1_phase_c` |
| `pipelineVersion` | string | `m2` |
| `teamFii` / `playerFii` | object/array | |
| `coachInsights` / `parentInsights` | object | FII denorm |
| `timeline` / `summary` | object | FII embed |
| `fiiSummary` | object | worker 원본 embed |

### UI 읽기 순서

```text
Firestore visionAnalysis (latest)
    ↓ 없으면
Fixture fallback
```

---

## 5. Callable API

| Callable | 역할 |
|----------|------|
| `startVisionAnalysis` | Run 생성 → worker → persist (idempotent skip 지원) |
| `retryVisionAnalysis` | `retrying` → `processing` → 완료/실패 |
| `cancelVisionAnalysis` | `queued` 만 취소 |
| `getVisionPipelineStatus` | index + pipelineStep + progress |

---

## 6. 검증

```powershell
python scripts/vision/rc5_1_pipeline_gate.py
python scripts/vision/rc4_6_e2e_demo.py --validate-only
```

Lock: `data/vision/gt/rc5_1_lock.json`
