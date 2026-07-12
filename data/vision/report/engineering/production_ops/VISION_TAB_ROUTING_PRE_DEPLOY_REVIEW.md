# Vision Match Detail Tab Routing — Pre-Deploy Review

**Document ID:** `VISION-TAB-ROUTING-PRE-DEPLOY-REVIEW`  
**Date:** 2026-07-12 (KST)  
**Status:** 🔒 **GO** (PM APPROVED · Deploy 진행)  
**Feature commit:** **`918208c`** · `fix(vision): repair match detail tab routing`  
**Docs stamp:** `a86d097`  
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

# 🔒 **GO** (PM APPROVED 2026-07-12)

### 근거
- Feature commit `918208c` 확정 · Push Sync 0/0
- Local Browser QA 🔒 ACCEPTED · 4-tab actual click ALL PASS
- Hosting-only · CF/Rules/Team Hub/Play Lounge 미변경
- PAI-011/012 · Day-03 · PROD-OBS-012 분리 유지

### Forbidden until Post-Deploy Smoke + PM final
- COMPLETE / CLOSED
- Deploy 완료를 Smoke 전 최종 PASS로 확장 선언

---

## Next Gate

```text
Pre-Deploy GO 🔒
        ↓
Firebase Hosting Production deploy
        ↓
Deploy Fact
        ↓
Production 4-tab Post-Deploy Smoke
        ↓
PM Final Review (PASS / CLOSED 판정)
```

**Reviewed by:** Engineering Track A · 2026-07-12  
**PM:** GO/NO-GO 대기
