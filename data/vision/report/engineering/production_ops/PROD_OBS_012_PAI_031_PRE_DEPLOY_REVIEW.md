# PAI-031 / PROD-OBS-012 — Pre-Deploy Review

**Document ID:** `PROD-OBS-012-PAI-031-PRE-DEPLOY-REVIEW`  
**Date:** 2026-07-12 (KST)  
**Status:** ⏳ **PM GO / NO-GO 대기**  
**Action Item:** **PAI-031** ▶ OPEN  
**Incident:** **PROD-OBS-012** ▶ OPEN  
**Production Deploy:** ❌ **금지** (본 문서 범위 = Review only)  
**PASS / COMPLETE / CLOSED:** ❌ **선언 금지**

---

## 0. Commit / Push Fact

| Item | Value |
|---|---|
| Branch | `vision-v2-i13` |
| Feature commit | `68f37ab` — `fix(vision): clear stale Job Monitor errors on success (PAI-031)` |
| Pushed HEAD | `68f37ab` (`origin/vision-v2-i13`) |
| Parent (Hosting/CF rollback baseline) | `9b1176a` |
| Remote | `origin/vision-v2-i13` |

---

## 1. Scope reminder

| In | Out |
|---|---|
| Fix A index success clear | Production deploy (until PM GO) |
| Fix B media `visionLastError` clear | Production data scrub |
| Fix C UI completed guard | 재분석 강제 실행 |
| Hosting + CF deploy plan | Day-03 / VOC-011 / PAI-011~014/032 |

---

## 2. Deploy surface split (REQUIRED)

### A. Hosting deploy — **required for Fix C**

| Item | Detail |
|---|---|
| Why | Job Monitor `resolveVisionJobMonitorErrors` — completed 시 stale index/queue fallthrough 차단 |
| Paths | `src/hooks/useVisionJobMonitor.ts` · `src/lib/vision/visionJobMonitorTypes.ts` |
| Effect after Hosting-only | Production Match Detail에서 **stale red banner 미노출** 가능 |
| Does **not** complete PAI-031 | Index/media Firestore stale fields **그대로** · 다음 성공 write에도 clear 안 됨 |

**Hosting-only deploy로 PAI-031 전체 수정 완료를 선언하지 않는다.**

### B. Cloud Functions / backend deploy — **required for Fix A / B**

| Item | Detail |
|---|---|
| Why | 성공 write 경로에서 stale error 필드 명시적 `FieldValue.delete()` |
| Source (Fix A) | `functions/src/lib/academyVisionMatchIndexErrors.ts` · `academyVisionFirestore.ts` (`upsertVisionMatchIndex`) |
| Source (Fix B) | `functions/src/lib/academyVisionCore.ts` (media completed patch) |
| Runtime entry | Lazy exports via `modulePathFromLibSrc("lib/academyVisionAnalysisCallables")` |
| **Callable / deploy targets** | `startVisionAnalysis` · `retryVisionAnalysis` · (queue) `processVisionUploadQueue` 경로가 Core 호출 |
| Build gate | **Deploy 전 `functions` TypeScript build 필수** — 현재 `functions/lib/.../academyVisionMatchIndexErrors.js` **없음**, compiled Core/Firestore는 PAI-031 clear 로직 **미반영** 상태였음 |

| Clear fields (after successful CF write) | |
|---|---|
| Index | `errorCode`, `errorMessage` |
| Media | `visionLastError` |

### C. Combined requirement

| Goal | Needs |
|---|---|
| Banner 즉시 미노출 | **Hosting (Fix C)** |
| Stale 필드 근본 clear + 재발 방지 | **CF build + deploy (Fix A/B)** + **다음 natural successful write** (재분석 강제 금지 · 수동 data scrub 금지) |
| PAI-031 “수정 완료” 선언 | Hosting **+** CF 둘 다 + Post-Deploy 검증 후 (별도 PM) |

---

## 3. Rollback

| Layer | Rollback |
|---|---|
| **Hosting** | 직전 Hosting release / parent commit로 재배포 (`firebase hosting:clone` 또는 이전 HEAD frontend) |
| **CF / backend** | 직전 Functions revision으로 rollback · 또는 이전 feature commit에서 `functions` 재배포 |
| Parent commit (pre-feature) | `9b1176a` |

Note: Hosting만 rollback하면 Fix C 배너 가드가 사라지고, CF만 rollback하면 이후 성공 write의 clear가 다시 빠질 수 있음. **표면별로 독립 rollback.**

---

## 4. Post-Deploy verification plan (PM GO 후)

1. **Hosting 배포 후** — `vision-pilot-pass01-clip-002` Job Monitor stale red banner **미노출** · completed 표시  
2. **실제 failed fixture** — failed/error 상태 배너 **유지**  
3. **CF 배포 후** — 다음 **natural** successful write에서 index `error*` clear · media `visionLastError` clear (강제 재분석 금지 · 수동 문서 수정 금지)  
4. FII / Ranking / Trend 회귀 없음  

---

## 5. Repo note (Pre-Deploy honesty)

`academyVision*.ts` 일부는 기존에 **local untracked**로 CF 배포되어 온 이력이 있다. 본 Commit은 PAI-031 Fix A/B touch file을 포함한다. CF Deploy 시 **반드시 로컬 build 산출물(`functions/lib`)에 Fix A/B가 반영됐는지** 확인한다.

---

## 6. STOP

Commit / Push 완료 후 **Pre-Deploy Review에서 STOP.**  
**Production Deploy / PASS / COMPLETE / CLOSED 대기 — PM GO / NO-GO.**
