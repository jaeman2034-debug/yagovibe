# YAGO Vision RC5-2 — Auto Upload Queue (Design)

**Date:** 2026-06-30  
**Status:** ✅ **IMPLEMENTED**  
**Parent:** RC5-1 `docs/YAGO_VISION_RC5_1_CLOSURE_REPORT.md`

---

## 목표

실경기 MP4 업로드 확인 후 **Vision Upload Queue**에 등록하고, RC5-1 Firestore Pipeline(`startVisionAnalysis` / `executeAcademyVisionAnalysis`)과 자동 연결.

**수정 금지:** GEV/FII Engine · GT · Baseline · Report · `rc3_1_phase_c`

---

## 흐름

```text
MP4 PUT 완료
    ↓
confirmAcademyMediaUpload
    ↓
visionUploadQueue/{mediaId}  (uploaded → queued)
    ↓
processVisionUploadQueue (callable, client auto-trigger)
    ↓
RC5-1 executeAcademyVisionAnalysis (startedFrom: auto)
    ↓
visionRuns / visionMatchIndex / visionAnalysis
```

---

## Firestore: visionUploadQueue

**Path:** `teams/{teamId}/visionUploadQueue/{mediaId}`

| Field | 설명 |
|-------|------|
| `teamId` / `matchId` / `mediaId` | |
| `storagePath` / `sizeBytes` | |
| `videoHash` / `idempotencyKey` | `teamId:matchId:videoHash` |
| `status` | `uploaded` \| `queued` \| `processing` \| `completed` \| `failed` |
| `runId` / `analysisId` | RC5-1 연결 |
| `errorCode` | `upload-missing` \| `invalid-video` \| `duplicate-active` \| `worker-failed` |

---

## Callables

| Callable | 역할 |
|----------|------|
| `confirmAcademyMediaUpload` | 큐 `uploaded`+`queued` 등록 (fast) |
| `processVisionUploadQueue` | 큐 처리 + RC5-1 파이프라인 (long, 900s) |

---

## Client

- `AcademyMp4UploadPanel` — confirm 후 `processVisionUploadQueue` 자동 호출
- `useVisionUploadQueueStatus` — 큐 상태 구독
- `CoachVisionAnalysisSection` — 자동 진행 중 표시 · 실패 시 재시도

---

## RC5-3 후보

서버 사이드 Firestore trigger로 `processVisionUploadQueue` 완전 자동화 (client 의존 제거).
