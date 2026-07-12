# VOC-012 Implementation Spec (1p) — LOCK

**Document ID:** `VOC-012-IMPL-SPEC`  
**Status:** 🔒 **SCOPE LOCK** · ✅ IMPLEMENT · 🔒 Manual QA FINAL PASS · ✅ Visual ACCEPTED · ✅ **PAI-012 PASS**  
**PAI:** PAI-012 ✅ PASS · ❌ COMPLETE/CLOSED 금지  
**Day-03:** 🛑 DATE_GATE_PENDING 미변경  
**PAI-011 / VOC-011 원장 15:** 🔒 유지

Upstream: `VOC_012_ENG_SPIKE.md` · `VOC_012_CUMULATIVE_TREND_DESIGN_REVIEW.md`  
Manual QA: `VOC_012_MANUAL_QA.md` · Visual: `VOC_012_VISUAL_SPOTCHECK.md`

---

## IN (v1)

| 항목 | LOCK |
|---|---|
| User | **Coach only** |
| Surface | Vision Coach Report (`CoachVisionAnalysisSection`) |
| Metric | **FII only** |
| Comparison | 현재 경기 player FII ↔ 이전 최대 **3**경기 mean FII |
| Current match | **제외** |
| Gate | 이전 표본 **n ≥ 2** (선수별 유효 이전 FII 수) |
| n < 2 | Trend **미노출** (`null` / 행·카드 숨김) |
| Matching | **`findPlayerFiiEntry` 재사용** |
| Match source | `visionMatchIndex` → `visionAnalysis` |
| Ordering | `analysisCompletedAt` 우선 · `updatedAt` fallback |
| Rollup | **client-side pure function** |
| Payload | `CoachDashboardVisionProviderView.matchFlowTrend` (+ per-player map) |
| Title | **최근 경기 흐름 비교** |
| windowCopy n=3 | **최근 3경기 평균과 비교** |
| windowCopy n=2 | **최근 2경기 평균과 비교** |

## OUT (v1)

신규 CF · 신규 root SoT · 신규 Firestore Index · Growth/telemetry · Parent surface · 7-day window · Brain

---

## Payload

```typescript
matchFlowTrend: {
  headlineCopy: "최근 경기 흐름 비교";
  windowCopy: "최근 3경기 평균과 비교" | "최근 2경기 평균과 비교";
  /** team window size used (2|3) — previous matches with analysis */
  windowN: 2 | 3;
  previousMatchIds: string[];
  /** players with n>=2; key = playerId || trackId */
  byPlayer: Record<string, {
    n: number;
    minN: 2;
    maxK: 3;
    visible: true;
    metric: "fii";
    currentFii: number;
    previousMean: number; // 1 decimal
    delta: number;        // current - mean, 1 decimal
    previousMatchIds: string[];
    playerId?: string;
    trackId?: string;
    name?: string;
  }>;
} | null  // null when team previous analyses < 2 OR no player visible
```

Display line: `현재 FII {cur} · 최근 {n}경기 평균 {avg} · {±delta}`

---

## Code map

| Unit | Path |
|---|---|
| Aggregate | `src/lib/vision/matchFlowTrendFromPlayerFii.ts` |
| Index → analysis load | `src/lib/vision/loadPreviousVisionAnalysesForTrend.ts` |
| Types | `visionTypes.ts` (`CoachDashboardVisionProviderView`) |
| Wire | `useCoachMatchFlowTrend.ts` → `VisionCoachDashboardProvider` |
| UI | `CoachMatchFlowTrendCard` + Ranking Δ · `CoachVisionAnalysisSection` |

## Gate after code

```text
IMPLEMENT ✅ → Unit/Harness ✅ → Manual QA FINAL PASS ✅
        → Coach Visual Spot-check ACCEPTED ✅
        → PAI-012 PASS ✅
        → Commit/Push → Pre-Deploy Review
```

❌ COMPLETE/CLOSED · Production 배포 완료 선언 금지

---

**Locked by:** PM · 2026-07-12 · Spec LOCK → IMPLEMENT 승인
