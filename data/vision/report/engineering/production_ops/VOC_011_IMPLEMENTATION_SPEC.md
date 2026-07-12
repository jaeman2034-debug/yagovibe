# VOC-011 Implementation Spec (1p) — LOCK

**Document ID:** `VOC-011-IMPL-SPEC`  
**Status:** 🔒 **SCOPE LOCK** · ✅ **구현 검증 PASS** · 🔒 **PAI-011 COMPLETE / CLOSED** (Production Smoke PASS)  
**PAI:** PAI-011 🔒 COMPLETE/CLOSED  
**Day-03:** 🛑 DATE_GATE_PENDING 미변경  
**Day-03:** 🛑 DATE_GATE_PENDING 분리 · Official Fact / VOC 15→16 금지

> Manual QA: `VOC_011_MANUAL_QA.md` · **FINAL PASS**  
> Visual: `VOC_011_VISUAL_SPOTCHECK.md` · **ACCEPTED**  
> 코드: `peerBenchmarkFromPlayerFii.ts` · `ParentPeerBenchmarkCard` · unit+harness 9 PASS

---

## IN (v1)

| 항목 | LOCK |
|---|---|
| Cohort | `teamId` + `teams.ageGroup` (라벨·cohortKey) |
| ageGroup 없음 | **「팀 평균」폴백** · Gate 동일 |
| Sample Gate | valid `playerFii` **n ≥ 5** |
| n < 5 | `peerBenchmark` **미노출** (`null`) |
| Matching | **`findPlayerFiiEntry` 재사용** |
| Aggregate | 동일 `matchId` · `mean(playerFii.fii)` |
| Metric | FII only |
| Payload | `ParentIntelligenceView.peerBenchmark` |
| Surface | Vision Parent Report (`ParentIntelligenceSection`) |
| Primary copy | `같은 팀·연령 선수 평균과 비교` |
| Fallback copy | `팀 평균과 비교` |

## OUT (v1)

신규 root SoT · 신규 Cloud Function · position cohort · Growth Report 연동 · 전국/리그 평균

---

## Payload

```typescript
peerBenchmark: {
  cohortKey: string;       // `${teamId}:${ageGroup ?? "team"}`
  ageGroup: string | null;
  matchId: string;
  n: number;
  minN: 5;
  visible: true;           // only present when n >= 5
  metric: "fii";
  childValue: number | null;
  peerMean: number;        // rounded 1 decimal
  delta: number | null;    // child - peerMean when child known
  headlineCopy: string;    // primary | fallback
} | null
```

## Code map

| Unit | Path |
|---|---|
| Aggregate | `src/lib/vision/peerBenchmarkFromPlayerFii.ts` |
| Types | `parentIntelligenceTypes.ts` |
| Wire | `useParentIntelligence.ts` · `fiiSummaryParentProvider.ts` · `buildParentIntelligenceView.ts` |
| UI | `ParentPeerBenchmarkCard` → `ParentIntelligenceSection` |

## Gate after code

`Build/Test → PM Review → PAI-011 PASS → Deploy → Post-Deploy Smoke PASS → COMPLETE/CLOSED` 🔒

---

**Locked by:** PM 최종 3개 확정 · 2026-07-11  
**Closed:** 2026-07-11 · Production verified `64270a3`
