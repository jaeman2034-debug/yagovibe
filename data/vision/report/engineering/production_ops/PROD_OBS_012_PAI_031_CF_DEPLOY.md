# PAI-031 / PROD-OBS-012 — Cloud Functions Deploy Fact

**Document ID:** `PROD-OBS-012-PAI-031-CF-DEPLOY`  
**Date:** 2026-07-12 (KST)  
**Status:** ✅ **CF TARGETS DEPLOYED** · ❌ **PAI-031 COMPLETE/CLOSED 금지**  
**Feature:** `68f37ab`  
**Scope:** Fix A + Fix B (success write clear)

---

## Pre-check

| Item | Fact |
|---|---|
| Build gate | PASS · `PROD_OBS_012_PAI_031_BUILD_GATE.md` |
| Index export | `functions/index.ts` → `academyVisionAnalysisCallables`: `startVisionAnalysis`, `retryVisionAnalysis`, `cancelVisionAnalysis`, `getVisionPipelineStatus` |
| `processVisionUploadQueue` | 모듈 내 export 존재 · **index lazy attach 목록에는 없음** → 본 배포 target 제외 |
| Dependency | start/retry → `executeAcademyVisionAnalysis` (Core) → `upsertVisionMatchIndex` (Firestore) · Fix A/B 포함 |

---

## Deploy Fact

```text
배포 일시: 2026-07-12 ~12:16 KST
Command:
  node scripts/deploy-functions.mjs deploy --only functions:startVisionAnalysis,functions:retryVisionAnalysis
Project: yago-vibe-spt
Region: asia-northeast3
Targets updated:
  + startVisionAnalysis
  + retryVisionAnalysis
Full functions deploy: N (targeted only)
Rules deploy: N
```

---

## Fix coverage on these targets

| Fix | Behavior after this deploy |
|---|---|
| **A** | non-failed `upsertVisionMatchIndex` → `errorCode`/`errorMessage` `FieldValue.delete()` |
| **B** | media completed → `visionLastError` `FieldValue.delete()` |

---

## Verification state (mandatory)

```text
Production 데이터 수동 수정: 금지
강제 재분석: 금지
다음 natural successful Vision write 관측 대기

PAI-031 status: DEPLOYED / VERIFICATION PENDING
```

Natural success write 관측 시 확인:

1. index status = completed  
2. index stale error fields cleared  
3. media status = completed  
4. media visionLastError cleared  
5. latest successful run error 없음  
6. Job Monitor red banner 없음  

→ 그 후 **PM Final Review** 에서만 PASS/FAIL → COMPLETE/CLOSED 판정.

---

**Recorded:** 2026-07-12
