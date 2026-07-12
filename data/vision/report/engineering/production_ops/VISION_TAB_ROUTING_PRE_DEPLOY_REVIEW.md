# Vision Match Detail Tab Routing — Pre-Deploy Review

**Document ID:** `VISION-TAB-ROUTING-PRE-DEPLOY-REVIEW`  
**Date:** 2026-07-12 (KST)  
**Status:** ⏳ **AWAITING PM GO / NO-GO**  
**Feature commit:** **`918208c`** · `fix(vision): repair match detail tab routing`  
**Full SHA:** `918208c` (see `git log -1`)  
**Day-03:** 🛑 DATE_GATE_PENDING 미변경  
**PAI-011 / PAI-012:** 🔒 COMPLETE/CLOSED 미변경  
**PROD-OBS-012:** ▶ OPEN 후보 미변경

---

## Scope

Vision Match Detail 상단 탭 라우팅 회귀 수정 (Minimal Fix):

| 탭 | Fix |
|---|---|
| Coach | Play Lounge 제거 → Match Detail `#vision-coach` |
| Match | hash clear · Match Detail 유지 |
| Timeline | `#vision-timeline` + scrollIntoView · empty/non-pilot 앵커 유지 |
| Parent | ranking `playerId`/`trackId` → Parent Vision Report · `/home/parent`·`/home/admin` fallback 제거 |

**Non-scope:** Team Hub route · Play Lounge 자체 · PAI-011/012 logic · PROD-OBS-012 · Day-03

---

## Checklist

| # | 항목 | 결과 | Evidence |
|---|---|---|---|
| 1 | Canonical branch | ✅ **vision-v2-i13** | push target |
| 2 | Deploy target (의도) | ✅ **Firebase Hosting only** | CF/Rules 미포함 |
| 3 | Unit tests | ✅ **PASS** | `visionPlatformRoutes` 7 + trend/peer regression |
| 4 | Local Browser QA (actual click) | 🔒 **ACCEPTED** | `VISION_TAB_ROUTING_LOCAL_BROWSER_QA.md` · 4-tab ALL PASS |
| 5 | 신규 CF / root SoT / Firestore Index | ✅ **N** | client route helpers + nav only |
| 6 | Team Hub 변경 | ✅ **N** | Observation only |
| 7 | Rollback parent (Hosting) | ✅ **`30170a1`** | PAI-012 deployed HEAD |

---

## Pre-Deploy 판정

# ⏳ **AWAITING PM GO / NO-GO**

### 근거 (Engineering)
- Root Cause · Canonical mapping PM ACCEPT
- Minimal Fix 적용 · Jest PASS
- Local Browser QA 4-tab actual click **ALL PASS** · PM ACCEPTED
- Hosting-only 프론트 변경 예상

### Forbidden until PM GO
- Production deploy
- COMPLETE / CLOSED
- Deploy 완료 선언

---

## Next Gate

```text
Commit + Push ✅
        ↓
Pre-Deploy Review ⏳ (본 문서)
        ↓
PM GO / NO-GO
        ↓
(GO 시) Firebase Hosting deploy → Deploy Fact → Post-Deploy Smoke
```

**Reviewed by:** Engineering Track A · 2026-07-12  
**PM:** GO/NO-GO 대기
