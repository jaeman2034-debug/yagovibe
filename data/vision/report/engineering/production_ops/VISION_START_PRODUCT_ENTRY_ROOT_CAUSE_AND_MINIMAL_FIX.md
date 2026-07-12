# VISION_START Product Entry — Root Cause & Minimal Fix

**Document ID:** `VISION_START_PRODUCT_ENTRY_ROOT_CAUSE_AND_MINIMAL_FIX`  
**Track:** Vision Start Path 복구 (별도 트랙)  
**NOT** PAI-031 Fix  
**Status:** ▶ **PM REVIEW** (코드 최소 수정 · Local QA PASS · Commit/Push/Deploy 금지)  
**observedAt KST:** `2026-07-12T18:19:54+09:00`

**Related:** PAI-031 remains `DEPLOYED / VERIFICATION PENDING`  
**mediaId (untouched):** `21c9234af1f843d3aa0b73b0`

---

## 1. Root Cause Confirm

| Fact | Value |
|---|---|
| Component | `src/components/vision/PlayTabVisionMount.tsx` |
| Props | `teamId`, `matchId`, `authUid?`, `memberRole?`, `variant?`, `enabled?` → wraps `CoachVisionAnalysisSection` |
| Intended surface | Play Tab (`/teams/:teamId/play`) |
| Call site before fix | **없음** (component만 존재, route mount 0) |
| Product copy | Validation Console → “Play 탭 → Vision Coach에서 Vision 분석 실행” |
| Start action | `VisionRunControl.handleRun` → `callStartVisionAnalysis` / `callRetryVisionAnalysis` |
| Backend target (deployed) | CF `startVisionAnalysis`, `retryVisionAnalysis` (`functions/index.ts` lazy export) |
| Not deployed | `processVisionUploadQueue` (client 호출 가능했으나 export 없음) |

부가 원인:

1. Play URL `?matchId=vision-pilot-…`가 `completedGames`에 없으면 최신 종료 경기로 **rewrite**되어 Vision context 유실.
2. `VisionRunControl` failed 분기가 undeployed `processVisionUploadQueue`를 우선 호출.

---

## 2. Minimal Fix Scope (적용됨)

| Change | File | Why |
|---|---|---|
| `PlayTabVisionMount` call site | `src/components/team/play/PlayTab.tsx` | lounge + default variant에 최소 mount |
| vision matchId preserve | same | `vision-*` / pilot matchId URL rewrite 방지 + `visionMatchId` URL 우선 |
| start action → deployed CF only | `src/components/vision/CoachVisionAnalysisSection.tsx` | `processVisionUploadQueue` 제거, `start`/`retry`만 사용 |
| re-export | `src/components/vision/index.ts` | `PlayTabVisionMount` export |

**금지 준수:** 신규 CF / `processVisionUploadQueue` export / Rules / Firestore patch / PAI-031 Fix A/B/C 변경 / Day-03 / VOC-011 count — 없음.

**자동 실행 없음:** mount만으로는 분석 시작 안 함. 사용자 클릭 필요.

---

## 3. Call Site / Route / Backend

| Item | Value |
|---|---|
| **PlayTabVisionMount call site** | `PlayTab` lounge: `PlayLoungeSection title="Vision Coach"` · default: section `data-testid="play-tab-vision-mount-slot"` |
| **Mount Product route** | `/teams/:teamId/play?matchId=…` (`TeamPlayPage` → `PlayTab variant="lounge"`) |
| **Existing start action** | button `data-testid="vision-run-analysis-button"` → `callStartVisionAnalysis` (queued/none) or `callRetryVisionAnalysis` (failed) |
| **Backend target** | Production CF `startVisionAnalysis` / `retryVisionAnalysis` (asia-northeast3) |
| **Context** | `teamId` + URL/`visionMatchId` → `visionMatchIndex.mediaId` (e.g. `21c9234…`) |

---

## 4. Local Browser QA Fact

**Script:** `scripts/vision-start-product-entry-local-qa.ts`  
**Artifact:** `data/vision/report/engineering/production_ops/vision_start_product_entry/local_browser_qa_fact.json`  
**Result:** ✅ **LOCAL QA PASS (wiring only)**

| # | Check | Result |
|---|---|---|
| 1 | Product route 정상 열림 | PASS |
| 2 | PlayTabVisionMount 노출 | PASS (`slotVisible`, `coachSectionVisible`) |
| 3 | uploaded media context (`vision-pilot-pass01-clip-002`) | PASS (`matchIdPreserved`) |
| 4 | start control 노출 | PASS — `Vision 분석 실행` |
| 5 | 클릭 전 visionRuns = 0 | PASS (`runCountBefore=0`) |
| 6 | 클릭 시 approved start | PASS — intercepted hit `startVisionAnalysis` only |
| 7 | direct Firestore write | N (없음) |
| 8 | 신규 CF / processVisionUploadQueue | N — hit 없음 |
| 9 | Play Lounge / Match Detail regression | PASS — lounge 유지 · Match Detail 열림 · `/play` 오리다이렉트 없음 |
| — | Production 분석 강제 실행 | **N** (CF stub fulfill · `runCountAfter=0`) |

Screenshots:

- `vision_start_product_entry/local_qa_play_tab.png`
- `vision_start_product_entry/local_qa_match_detail.png`

---

## 5. Regression

| Surface | Observation |
|---|---|
| Play Lounge | Vision Coach 섹션 추가 외 기존 섹션 유지 |
| Vision Match Detail | panel + Job Monitor 정상 · 의도치 않은 `/play` redirect 없음 |
| PAI-031 Fix A/B/C | 코드 미변경 |
| media `21c9234…` | 삭제/수정 없음 · visionRuns 여전히 0 |

---

## 6. STOP — PM Review

| Item | Status |
|---|---|
| Code minimal fix | ✅ done (working tree) |
| Local Browser QA | ✅ PASS |
| Commit | ❌ 금지 · PM 판정 대기 |
| Push / Deploy | ❌ 금지 |
| PAI-031 PASS/COMPLETE/CLOSED | ❌ 금지 · **VERIFICATION PENDING** 유지 |
| Next (PM GO 후) | Commit → Deploy → Production UI에서 Vision 분석 시작 → PAI-031 10항 |

**END · STOP for PM Review**
