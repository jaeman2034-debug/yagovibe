# YAGO Vision RC5-1 — Firestore Production Pipeline Report

**Date:** 2026-06-30  
**Milestone:** RC5-1  
**Gate:** Firestore Production Pipeline  
**판정:** ✅ **PASS 🔒**

**Prior:** RC5 Kick-off — `docs/YAGO_VISION_RC5_KICKOFF.md`  
**Design:** `docs/YAGO_VISION_RC5_1_FIRESTORE_PIPELINE_DESIGN.md`  
**Schema SoT:** `docs/YAGO_VISION_RC5_1_FIRESTORE_SCHEMA.md`

---

## 1. RC5-1 목표

실경기 업로드 → `startVisionAnalysis` → Firestore (`visionRuns` · `visionMatchIndex` · `visionAnalysis`) → Coach/Parent UI **Firestore 우선** 소비.

**수정 금지:** GEV Engine · FII Engine · GT · Baseline · Report Layer

---

## 2. RC5-1 Gate 결과

| Gate | 결과 |
|------|:----:|
| Upload → Run 생성 | ✅ `createVisionRunDoc` |
| Firestore 저장 | ✅ `appendVisionAnalysisAdmin` + FII embed |
| visionMatchIndex | ✅ `upsertVisionMatchIndex` + `pipelineStep` |
| visionAnalysis | ✅ match-scoped analysis + coach/parent insights |
| UI Firestore 조회 | ✅ `useCoachVisionAnalysis` onSnapshot |
| Fixture fallback | ✅ RC4 pilot 유지 |
| Idempotency | ✅ `teamId:matchId:videoHash` + completed skip |
| 실패 복구 | ✅ `retryVisionAnalysis` + `retrying` 상태 |
| Retry 성공 | ✅ `retryCount` + `retrying` → `completed` |
| 중복 Upload 방지 | ✅ `findCompletedVisionRun` / active guard |
| PipelineStep 갱신 | ✅ tracking → gev → persist → done |
| **RC5-1** | **PASS 🔒** |

---

## 3. 구현 요약

### Worker (RC5-1 wiring)

| 변경 | 설명 |
|------|------|
| `academyVisionAnalyze.js` | `--pipeline m2 --preset rc3_1_phase_c` |
| `mapFiiSummaryToVisionResult.js` | fii_summary → vision_result (엔진 미변경) |
| GEV upload | `gev_rc3_1_phase_c` 디렉터리 지원 |

### Cloud Functions

| 변경 | 설명 |
|------|------|
| `academyVisionFirestore.ts` | `pipelineStep`, `productionPreset`, FII fields on analysis |
| `academyVisionCore.ts` | persist `fiiSummary`, step tracking on processing/done |
| `academyVisionWorkerClient.ts` | parse worker `fii` payload |

### Client

| 변경 | 설명 |
|------|------|
| `visionRunTypes.ts` | `VisionPipelineStep` + labels |
| `useMatchVisionPipelineStatus.ts` | index `pipelineStep` read |
| `VisionPipelineStatusBadge` | analyzing 시 단계 표시 |

---

## 4. 데이터 흐름

```text
MP4 Upload
    ↓
startVisionAnalysis (CF)
    ↓
visionRuns (queued → processing → completed|failed)
visionMatchIndex (pipelineStep: queued → tracking → done)
    ↓
Worker m2 (rc3_1_phase_c)
    ↓
visionAnalysis (+ fiiSummary, coachInsights, parentInsights)
    ↓
Coach Dashboard / Parent Report (Firestore 우선 → fixture fallback)
```

---

## 5. 검증

```powershell
python scripts/vision/rc5_1_pipeline_gate.py
```

라이브 Firestore E2E는 staging/pilot 팀에서 `startVisionAnalysis` 호출로 검증 (별도 ops run sheet).

---

## 6. 다음 단계

**RC5-2 Auto Upload Queue** — 업로드 완료 시 자동 enqueue · worker trigger 안정화.

---

*RC5-1 — Production Pipeline wiring. LOCK assets unchanged.*
