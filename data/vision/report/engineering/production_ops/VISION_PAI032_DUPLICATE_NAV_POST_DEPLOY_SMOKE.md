# PAI-032 Duplicate Nav — Post-Deploy Smoke

**Document ID:** `VISION-PAI032-DUPLICATE-NAV-POST-DEPLOY-SMOKE`  
**Date:** 2026-07-12 (KST)  
**Status:** ✅ **SMOKE PASS** (Production)  
**PM Final:** ⏳ **AWAITING** (COMPLETE/CLOSED 금지)  
**Deployed HEAD:** `437fc8a` (feature `7562ccb`)  
**Hosting:** https://yago-vibe-spt.web.app  
**Raw JSON:** `vision_pai032_nav_qa/prod_smoke/local_browser_qa.json`

---

## Smoke A — Parent Vision Report

| 항목 | 결과 |
|---|---|
| Nav render count | **1** |
| active `parent-report` | **Y** |
| Peer Benchmark | **Y** |
| Parent Intelligence cards | **Y** |

## Smoke B — Growth Profile

| 항목 | 결과 |
|---|---|
| Nav render count | **1** |
| active `player-profile` | **Y** |
| wrong `parent-report` active | **N** |
| accessDenied | **N** |

## Smoke C — Regression

| 항목 | 결과 |
|---|---|
| trackId-only Player 탭 숨김 | **Y** |
| Coach `#vision-coach` | **Y** |
| Match Detail Nav | **Y** (prior) |

**관측 오류:** 없음

---

## Engineering Verdict

```text
Production PAI-032 Post-Deploy Smoke = PASS
```

❌ COMPLETE / CLOSED 선언 금지 — **PM Final Review 대기**

**Recorded by:** Engineering Track A · 2026-07-12
