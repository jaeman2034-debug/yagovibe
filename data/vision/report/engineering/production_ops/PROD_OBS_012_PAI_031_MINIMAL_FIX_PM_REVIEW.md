# PAI-031 / PROD-OBS-012 — Stale Error Minimal Fix · PM Review

**Document ID:** `PROD-OBS-012-PAI-031-MINIMAL-FIX-PM-REVIEW`  
**Date:** 2026-07-12 (KST)  
**Status:** ✅ **PM Review ACCEPTED** · ✅ **COMMIT GO** · ⏳ **Pre-Deploy Review / Deploy GO 대기**  
**Action Item:** **PAI-031** ▶ OPEN (Commit 진행 · Deploy/CLOSED 금지)  
**Incident:** **PROD-OBS-012** ▶ OPEN  
**Commit / Push:** ✅ (본 트랙)  
**Deploy / PASS / COMPLETE / CLOSED:** ❌ **금지** (Pre-Deploy 후 PM GO)

---

## 1. Root Cause (accepted)

**D + E** — 최신 run은 completed·GEV 89인데, 과거 failed sibling의 `error*`가 index/media에 stale로 남고 Job Monitor가 fallthrough로 빨간 배너를 렌더.

---

## 2. Minimal Fix Summary

| Fix | Layer | Change |
|---|---|---|
| **A** | CF write | `assignVisionMatchIndexErrorFields` — `status !== "failed"` 시 `errorCode`/`errorMessage` → `FieldValue.delete()` |
| **B** | CF write | media `visionStatus: completed` patch에 `visionLastError: FieldValue.delete()` |
| **C** | UI | `resolveVisionJobMonitorErrors` — `uiStatus === "completed"`이고 run error 없으면 index/queue fallthrough 차단 |

**우선순위:** Write clear = 1차 · UI guard = 2차 안전장치 (둘 다 적용).

---

## 3. Changed files

| File | Role |
|---|---|
| `functions/src/lib/academyVisionMatchIndexErrors.ts` | **new** — FIX A pure helper |
| `functions/src/lib/academyVisionFirestore.ts` | upsertVisionMatchIndex → FIX A |
| `functions/src/lib/academyVisionCore.ts` | media completed → FIX B |
| `src/lib/vision/visionJobMonitorTypes.ts` | FIX C `resolveVisionJobMonitorErrors` |
| `src/hooks/useVisionJobMonitor.ts` | FIX C 연결 |
| `tests/vision/pai031StaleErrorClear.test.ts` | Unit |
| `scripts/vision-pai031-stale-error-local-qa.ts` | Local Browser QA |
| `data/vision/report/engineering/production_ops/vision_pai031_stale_error_qa/*` | QA Fact |
| `data/vision/report/engineering/production_ops/PROD_OBS_012_PAI_031_*` | Review docs |

---

## 4. Clear field 목록

### Index (`visionMatchIndex`) — FIX A

| Field | On failed | On non-failed (queued/processing/completed/…) |
|---|---|---|
| `errorCode` | set if provided | **`FieldValue.delete()`** |
| `errorMessage` | set if provided | **`FieldValue.delete()`** |

### Media (`aiIngest/{mediaId}`) — FIX B

| Field | On completed success |
|---|---|
| `visionLastError` | **`FieldValue.delete()`** |

> Production 기존 stale 문서는 **수동 수정 금지**. CF Deploy 후 다음 성공 write에서 clear. 그 전까지는 **FIX C**가 표시를 차단.

---

## 5. UI guard 조건 (FIX C)

```text
1) run errorCode || run errorMessage  → 그대로 표시 (실제 failed run 유지)
2) else if uiStatus === "completed"   → error null (stale index/queue fallthrough 차단)
3) else                               → index ?? queue fallthrough (기존 failed/index 경로)
```

---

## 6. Unit 결과

```text
npx jest tests/vision/pai031StaleErrorClear.test.ts
Tests: 8 passed

+ regression: tests/vision/visionPlatformRoutes.test.ts — 8 passed
Total vision suite this track: 16 passed
```

| Case | Result |
|---|---|
| failed → error 표시 유지 | PASS |
| failed → completed success clear | PASS |
| completed + stale legacy → banner null | PASS |
| latest failed → banner 유지 | PASS |

---

## 7. Local QA Fact

**Script:** `npx tsx scripts/vision-pai031-stale-error-local-qa.ts`  
**Base:** `http://127.0.0.1:5173` (Vite · Production Hosting 아님)  
**Match:** `vision-pilot-pass01-clip-002`  
**JSON:** `vision_pai031_stale_error_qa/local_browser_qa.json`

| Check | Result |
|---|---|
| Job Monitor completed | **Y** |
| stale red banner hidden | **Y** (errorBannerCount **0**) |
| Team FII | **Y** |
| Ranking | **Y** |
| Trend | **Y** |
| Logic: completed+stale suppressed | **Y** |
| Logic: failed run kept | **Y** |
| pageErrors | 없음 |

---

## 8. Regression

| Item | Result |
|---|---|
| PAI-011 / 012 / 013 / 014 / 032 | 코드 비변경 |
| Day-03 DATE_GATE_PENDING | 비변경 |
| VOC-011 Count | 비변경 |
| 재분석 / Production data scrub | 미실행 |
| Hosting / CF Deploy / Rules | 미실행 |
| visionPlatformRoutes unit | PASS |

---

## 9. STOP — PM Review

구현·Unit·Local QA 완료. **여기서 STOP.**

- Commit / Push / Deploy 대기 (PM GO 시)
- PASS / COMPLETE / CLOSED 선언하지 않음
- CF Deploy 전까지 Production Hosting은 기존 stale banner가 남을 수 있음 (Local Vite에서는 FIX C로 미노출 확인)

**Next (PM):** GO → Commit → (CF+Hosting) Deploy → Post-Deploy Smoke · 또는 NO-GO
