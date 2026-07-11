# Beta Archive Index (Baseline)

**Status:** 🔒 READ-ONLY · Baseline  
**Purpose:** Production 문서와 Beta 산출물을 분리하되, LOCK된 Beta 경로를 깨지 않고 인덱스로 보존한다.

> Beta 원본은 `../../beta_ops/`에 유지한다.  
> Tracker·Ledger·Decision 링크 정합성을 위해 **파일을 이동하지 않는다.**

---

## Locked Baseline

| Artifact | Path | Status |
|---|---|---|
| Day records | `../../beta_ops/records/BETA-DAY-001.json` ~ `012.json` | 🔒 OFFICIAL_FACT_LOCKED |
| ISSUE-001 | `../../beta_ops/issues/BETA-ISSUE-001.json` | ⚠️ OPEN (P1) |
| Week-2 Review | `../../beta_ops/BETA_WEEK_02_PRODUCTION_REVIEW.md` | 🔒 REVIEW LOCK |
| PM Decision | `../../beta_ops/BETA_PM_PRODUCTION_DECISION.md` | 🔒 GO with Open Issue |

---

## Decision Snapshot

| 항목 | 값 |
|---|---|
| 판정 | GO with Open Issue |
| 판정일 | 2026-07-21 |
| Known Issue | BETA-ISSUE-001 OPEN · P1 |
| VOC (종료 시점) | VOC-011=14 · VOC-012=7 |

---

## Production 이관

운영 실행은 `../PRODUCTION_RUN_SHEET.md` 및 `../PRODUCTION_ACTION_ITEMS.md`로 이관됨.

---

**Updated:** 2026-07-21
