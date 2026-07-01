# YAGO Vision RC5-3 — Job Monitor (Design)

**Date:** 2026-06-30  
**Status:** ✅ **IMPLEMENTED**  
**Parent:** RC5-2 `docs/YAGO_VISION_RC5_2_REPORT.md`

---

## 목표

업로드 후 Vision 분석이 **어느 단계까지 진행됐는지** Firestore 실시간 구독으로 표시.

**수정 금지:** GEV/FII Engine · GT · Baseline · Report · `rc3_1_phase_c`

---

## 파이프라인 단계 (UI)

```text
upload → queued → tracking → gev → fii → persist → done
```

실패/재시도:

```text
failed → retrying → processing → … → completed
```

---

## Firestore 구독 (3-source merge)

| Source | Path | 필드 |
|--------|------|------|
| Index | `visionMatchIndex/{matchId}` | status, pipelineStep, progress, errors |
| Queue | `visionUploadQueue/{mediaId}` | uploaded/queued/processing/… |
| Run | `media/{mediaId}/visionRuns/{runId}` | retryCount, startedAt, completedAt, pipelineStep |

**Hook:** `useVisionJobMonitor(teamId, matchId)`

**UI:** `VisionJobMonitorPanel`

---

## UI 배치

| Surface | Variant |
|---------|---------|
| Coach Dashboard (PlayTab) | full |
| Team Hub entry card | compact |
| Match Detail | compact |
| Timeline panel | compact |

---

## Retry

- `failed` → `processVisionUploadQueue` 또는 `retryVisionAnalysis`
- UI `retrying` 상태는 run/index 구독으로 표시

---

## Server automation (RC5-3+ 설계만)

현재: `confirm` → queue enqueue → **client** `processVisionUploadQueue`

**RC5-4 후보:** Firestore `onDocumentWritten` on `visionUploadQueue` where `status == queued` → CF `processVisionUploadQueueItem` (client 의존 제거).

```text
visionUploadQueue/{mediaId}
  status: queued
      ↓ (future trigger)
processVisionUploadQueueItem (server-only)
```

이 트리거는 RC5-3 범위 밖 — 설계 문서에만 기록.

---

## PASS Gate

- run status 실시간 · pipelineStep · progress%
- failed/error · retry · retrying
- completed → Coach/Parent/Timeline 링크
- fixture fallback 유지
- RC5-1/RC5-2 회귀
