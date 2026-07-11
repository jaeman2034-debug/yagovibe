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
| — | — | — | Production 개시 후 기록 | — | — |

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
| BETA-ISSUE-001 | P1 | OPEN | `../beta_ops/issues/BETA-ISSUE-001.json` |

---

**Updated:** 2026-07-21
