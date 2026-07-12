# PAI-032 Duplicate Nav — Local Browser QA Fact

**Document ID:** `VISION-PAI032-DUPLICATE-NAV-LOCAL-QA`  
**Date:** 2026-07-12 (KST)  
**Status:** 🔒 **ACCEPTED** (PM)  
**Script:** `scripts/vision-pai032-duplicate-nav-local-qa.ts`  
**Raw JSON:** `vision_pai032_nav_qa/local_browser_qa.json`

---

## Fix Summary

| Item | Value |
|---|---|
| Canonical owner | **Page-level** `VisionPlatformNav` |
| Removed | `ParentIntelligenceSection` internal Nav |
| Kept | `ParentVisionReportPage` · `PlayerGrowthProfilePage` page Nav |

---

## Local Browser QA

| Surface | Nav count | Active | Notes |
|---|---|---|---|
| Parent Report | **1** | `parent-report` **Y** | Peer **Y** · Cards **Y** |
| Growth Profile | **1** | `player-profile` **Y** | wrong parent-report active **N** |
| trackId Parent Report | **1** | — | Player tab hidden **Y** (PAI-014) |
| Coach `#vision-coach` | — | — | **Y** |

**Unit:** Ownership 3/3 · Route helpers 8/8  

**관측 오류:** 없음

---

## PM Acceptance

| Item | Value |
|---|---|
| Local Browser QA | 🔒 **ACCEPTED** |
| Commit | ✅ GO (후속) |

**Accepted by:** PM · 2026-07-12
