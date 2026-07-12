# VISION_START Product Entry — Root Cause & Minimal Fix

**Document ID:** `VISION_START_PRODUCT_ENTRY_ROOT_CAUSE_AND_MINIMAL_FIX`  
**Track:** Vision Start Path 복구 (**NOT** PAI-031 Fix)  
**Status:** ✅ **SHIPPED** · Production validated  
**Feature commit:** `605ff549de0c7b4c3881535b3950166d7abd00e9`  
**Branch:** `vision-v2-i13`  
**Hosting:** https://yago-vibe-spt.web.app  

**PAI-031 (separate):** 🔒 **PASS / COMPLETE / CLOSED** (2026-07-12) — this track is **not** reclassified as PAI-031 Fix.

---

## 1. Root Cause Confirm

| Fact | Value |
|---|---|
| Component | `PlayTabVisionMount.tsx` |
| Call site before fix | **없음** |
| Mount route | `/teams/:teamId/play` |
| Start action | `startVisionAnalysis` / `retryVisionAnalysis` |

---

## 2. Minimal Fix (shipped)

| File | Change |
|---|---|
| `PlayTab.tsx` | mount + `vision-*` URL preserve |
| `CoachVisionAnalysisSection.tsx` | deployed CF only |
| `index.ts` | export |

---

## 3. Commit / Push / Deploy

| Item | Value |
|---|---|
| commit | `605ff54` |
| branch | `vision-v2-i13` |
| deploy | Firebase Hosting / yago-vibe-spt |

---

## 4. Production UI Validation

| Item | Fact |
|---|---|
| entry | PASS |
| clicked | Vision 분석 실행 |
| backend | startVisionAnalysis |
| mediaId | `21c9234af1f843d3aa0b73b0` |
| visionRunId | `d26e62d4d22745d3a696e329` |
| successful write | Y · GEV 46 |

JSON: `vision_start_product_entry/prod_validation_report.json`

---

## 5. Relation to PAI-031

Controlled write enabled by this Product Entry track **validated** PAI-031 Fix A/B/C clear behavior.  
Track classification remains **Product Entry / Vision Start Path recovery**.

**END**
