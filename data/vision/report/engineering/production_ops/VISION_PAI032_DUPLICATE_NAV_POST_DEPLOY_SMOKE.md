# PAI-032 Duplicate Nav — Post-Deploy Smoke

**Document ID:** `VISION-PAI032-DUPLICATE-NAV-POST-DEPLOY-SMOKE`  
**Date:** 2026-07-12 (KST)  
**Status:** 🔒 **FINAL PASS / ACCEPTED**  
**Issue:** 🔒 **COMPLETE / CLOSED**  
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

## Smoke C — Regression

| 항목 | 결과 |
|---|---|
| trackId-only Player 탭 숨김 | **Y** |
| Coach `#vision-coach` | **Y** |

**관측 오류:** 없음

---

## PM Final Review

```text
PAI-032 Duplicate Vision Nav = PASS / COMPLETE / CLOSED 🔒
```

| Item | Value |
|---|---|
| Feature | `7562ccb` |
| Deployed HEAD | `437fc8a` |

**Separated OPEN:** PROD-OBS-012 / PAI-031 · Day-03 DATE_GATE_PENDING · VOC-011×15

**Closed by:** PM Final Review · 2026-07-12
