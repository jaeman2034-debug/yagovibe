# RC5-7 — J5 UI Verification Report

**Status:** PASS ✅ (Callable + Firestore) · UI Manual ⏳  
**Date:** 2026-06-29  
**Pilot:** team `D7TUZaOtfxdBc4P0lQLx` · media `9b4c4c8c58dc4169b603af25`

---

## PASS 조건 대조

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | approved cvRun reload | ✅ | `reviewStatus=approved` · `analysisStatus=completed` |
| 2 | cvGrowthLinks History | ✅ | Firestore count **1** · linkId `6f09729ed0ab49188f00152e` |
| 3 | CV Signals Preview render path | ✅ | `CvGrowthInternalSection` → `CvSignalsPreviewCard` |
| 4 | signalCount | ✅ | Firestore **9** · Callable **9** |
| 5 | VISIBILITY_RATIO · SESSION_CONFIDENCE 등 | ✅ | 9 keys in Firestore; UI grid shows 4 primary (J5 design) |
| 6 | Firestore ↔ UI 일치 | ✅ Callable smoke | `getCvGrowthLinksContext` PASS |

---

## Firestore SoT

```json
{
  "mediaId": "9b4c4c8c58dc4169b603af25",
  "status": "completed",
  "privacyStatus": "anonymized",
  "cvActiveRunId": "1ac305ed36c949e59c3a7d46",
  "cvGrowthLinks": 1,
  "signalCount": 9
}
```

**Signal keys:** VISIBILITY_RATIO, SESSION_CONFIDENCE, ROI_QUALITY, FLOW_STABILITY, MOVEMENT_CONSISTENCY, TRACKING_COVERAGE, PHYSICAL_ACTIVITY_INDEX, PHYSICAL_RELATIVE_DISTANCE, PHYSICAL_HIGH_INTENSITY_RUNS

---

## Callable Smoke

```powershell
$env:SMOKE_TEAM_ID='D7TUZaOtfxdBc4P0lQLx'
$env:SMOKE_MEDIA_ID='9b4c4c8c58dc4169b603af25'
$env:SMOKE_ACTOR_UID='jMLLIxyOVkN1HERAd2gz88uKj9e2'
node scripts/smoke-cv-i7-callable.mjs
```

**Result:** ✅ `history=1` · `signals=9` · `latest=6f09729ed0ab…`

---

## UI에서 J5 보는 위치

1. Validation Console **Step 2** — MP4 패널 상단 **CV Run · Internal (I6)**
2. 또는 **Step 5** — cyan **CV Interpretation Pilot** 블록 (RC5-7b: upload `mediaId` 우선)

**찾을 텍스트:**

- `CV Signals Preview (J5)`
- `Measured · read-only`
- Visibility Ratio · Session Confidence · …
- `cvGrowthLinks History (1)`

**DEV 패널 Media ID가 `9b4c4c8c…`인지 확인** (smoke mediaId `45b254…`와 다름)

---

## RC5-7b Frontend Fix (Step 5 mediaId)

Step 5에서 `cvPilotMediaId`가 upload session보다 우선되어 J5가 빈 media를 조회하던 문제 수정:

```ts
// Before: cvPilotMediaId ?? mediaId
// After:  mediaId ?? cvPilotMediaId
```

---

## Pilot #1 Final GO Scorecard

| Tier | Item | Status |
|------|------|--------|
| RC5-5 | Whisper → APPROVED | ✅ PASS |
| RC5-6 | J3 cvGrowthLinks | ✅ PASS |
| RC5-7 | J5 Callable + Firestore | ✅ PASS |
| RC5-7 | J5 UI 스크린샷 | ⏳ PM 캡처 |
| Out of scope | Parent Report CV · Job Monitor | ⏳ I7-6 / Vision |

**Operational PM Final GO:** RC5-7 Callable/Firestore PASS 기준 **Pilot #1 CV Core Pipeline GO** 가능. J5 UI 캡처 1장 = 최종 증빙 완료.

---

## Change Freeze

Engine · Firestore Schema · Worker · Functions — **변경 없음**  
Frontend: Step 5 mediaId 우선순위 1줄만 (UI read path)
