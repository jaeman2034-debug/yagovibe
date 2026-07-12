# Production Incidents

**Document ID:** `PRODUCTION-INCIDENTS-001`  
**SoT:** `PRODUCTION_RUN_SHEET.md`  
**Status:** ▶ ACTIVE

> Official Fact와 분석 분리. Known Issue 재현도 여기에 누적 가능.

---

## Severity

| Level | 의미 |
|---|---|
| S1 | 핵심 경로 중단 (Report / 알림톡 / 모바일) |
| S2 | Known Issue 악화 · 신규 로그인/세션 장애 |
| S3 | 부분 불편 · 우회 가능 |

---

## Incident Log

| ID | Date | Severity | Summary (Official Fact) | Linked Issue | Status |
|---|---|---|---|---|---|
| **PROD-OBS-012** | 2026-07-12 | S3 | Production Coach Match Detail Job Monitor에 `[VISION_ANALYSIS_FAILED] no GEV events ...` 빨간 문구 관측. PAI-012 Trend 카드·Avg/Δ는 정상. | PAI-031 | ▶ **OPEN** · PAI-031 **DEPLOYED / VERIFICATION PENDING** |

### PROD-OBS-012 Detail

```text
Incident ID: PROD-OBS-012
Date: 2026-07-12 (KST)
Severity: S3 (우회 가능 · 핵심 Trend UX 비차단)
Environment: Production Hosting · Coach Vision Match Detail
  teamId=D7TUZaOtfxdBc4P0lQLx
  matchId=vision-pilot-pass01-clip-002
Official Fact:
  Job Monitor에 VISION_ANALYSIS_FAILED / no GEV events 문구 표시됨.
  동일 화면에서 「최근 3경기 평균과 비교」·Ranking Avg/Δ 정상.
Analysis (Minimal Fix implemented — not CLOSED):
  FIX A/B write clear + FIX C UI guard. Local Vite QA: banner hidden.
  Detail: PROD_OBS_012_PAI_031_MINIMAL_FIX_PM_REVIEW.md
  Production Hosting still may show stale banner until Deploy (no data scrub).
Action / Link:
  PAI-031 · PM Review STOP · Commit/Deploy는 PM GO 후
Status: OPEN · PAI-031 DEPLOYED / VERIFICATION PENDING
  (Hosting Fix C Smoke PASS · CF Fix A/B live · natural success write clear 대기)
```

### Template

```text
Incident ID:
Date:
Severity:
Environment: (device / OS / entry)
Official Fact: (관측만)
Analysis (not Official Fact):
Action / Link:
Status: OPEN | MITIGATED | CLOSED
```

---

## Known Issue Cross-ref

| Issue | Priority | Status | Detail |
|---|---|---|---|
| BETA-ISSUE-001 | P1 | CLOSED (Verified) | `../beta_ops/issues/BETA-ISSUE-001.json` · PAI-001 |
| PROD-OBS-012 | S3 | OPEN · Root Cause Review | Job Monitor stale FAILED · PAI-031 · `PROD_OBS_012_PAI_031_ROOT_CAUSE_REVIEW.md` |

---

**Updated:** 2026-07-12 · PAI-031 Root Cause Review (PM Review pending)
