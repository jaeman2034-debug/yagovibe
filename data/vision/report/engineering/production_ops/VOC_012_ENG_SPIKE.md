# VOC-012 — Eng Spike Report

**Document ID:** `VOC-012-ENG-SPIKE`  
**Status:** ✅ **SPIKE COMPLETE** (2026-07-12)  
**PM Scope LOCK:** Coach only · 현재 경기 FII ↔ 이전 최대 **3**경기 평균 · 이전 **n ≥ 2** · FII only · Vision Coach Report  
**구현:** ❌ 금지 · ⏳ PM Review / Impl Spec 대기  
**동결:** PAI-011 CLOSED · VOC-011 원장 **15** · Day-03 DATE_GATE_PENDING

---

## Spike 질문 · 판정

| # | 질문 | 판정 | 근거 |
|---|---|---|---|
| 1 | `teamId` 기준 이전 `visionAnalysis` match 조회 | ✅ **가능** | 권장: `teams/{teamId}/visionMatchIndex/{matchId}` 목록 → `status=completed` + `analysisId` 있는 항목만 · 분석 본문: `teams/.../matches/{matchId}/visionAnalysis` (`getLatestVisionAnalysis`) |
| 2 | 현재 match 제외 + 시간순 정렬 | ✅ **가능** | `matchId !== current` 필터 · 정렬키: `analysisCompletedAt` 또는 `updatedAt` (index 문서) · 없으면 analysis `createdAt` |
| 3 | `findPlayerFiiEntry` 계열 매칭 재사용 | ✅ **가능** | `playerIdentityResolver.findPlayerFiiEntry` · Ranking의 `playerId`/`trackId` → `resolvePlayerIdentity` |
| 4 | previous max 3 / n≥2 rollup | ✅ **가능** | 순수함수: 이전 최대 3개 매치 mean(FII) · `n = previousWithValidFii` · `n < 2` → `visible=false` |
| 5 | Coach view trend payload 확장 | ✅ **가능** | 코드 SoT 타입명: **`CoachDashboardVisionProviderView`** (별칭 CoachIntelligenceView 아님) · optional `matchFlowTrend` 필드 추가 |
| 6 | Firestore query/index 추가 필요 | ✅ **1차 불필요** | 팀 단위 `visionMatchIndex` **list + 클라이언트 정렬/필터**로 충분 · composite index / collectionGroup / 신규 CF **불필요** |

**종합:** 신규 CF·신규 root SoT·신규 composite index 없이, 기존 team-scoped 읽기 + 클라이언트 집계로 MVP 가능.

---

## PM Scope LOCK (반영)

| 항목 | LOCK |
|---|---|
| 사용자 | Coach only |
| 윈도우 | 최근 **K-match**, K=**3** (이전 경기만) |
| 비교 | 현재 경기 FII ↔ 이전 최대 3경기 **평균** FII |
| Gate | 이전 표본 **n ≥ 2** · 미만 카드 **미노출** |
| 지표 | FII only |
| Surface | Vision Coach Report (`CoachVisionAnalysisSection` / Ranking 인접) |
| Parent / Growth / telemetry | ❌ 제외 |
| 신규 CF / root SoT | ❌ 금지 |

### 카피 LOCK (PM)

| 조건 | 카피 |
|---|---|
| 기본 타이틀 | **최근 경기 흐름 비교** |
| n=3 | `현재 FII {cur} · 최근 3경기 평균 {avg} · {±delta}` |
| n=2 | **최근 2경기 평균과 비교** (+ 동일 수치 포맷) |
| n&lt;2 | 미노출 |

---

## 권장 데이터 경로

```text
teams/{teamId}/visionMatchIndex/{matchId}
  status, analysisId | latestAnalysisId, analysisCompletedAt, updatedAt, hasVision
        ↓ filter: completed + analysisId present + matchId ≠ current
        ↓ sort desc by analysisCompletedAt|updatedAt
        ↓ take ≤ 3
teams/{teamId}/matches/{matchId}/visionAnalysis/{analysisId}
  playerFii[]  (getLatestVisionAnalysis 또는 index.analysisId get)
        ↓ per player: findPlayerFiiEntry
        ↓ mean of previous FIIs → delta = current - mean
```

**Rules (기존):**
- `visionMatchIndex` read: `isSignedIn() && isActiveMember(teamId)`
- `visionAnalysis` read: active member (또는 parentLink — Coach 경로에서는 member)

**대안 (비권장 1차):** `matches` stub 전수 list — Vision 완료 여부 불명확 · index가 더 정확.

**비권장:** `collectionGroup("visionAnalysis")` — index·rules 추가 압력 · Scope와 불필요.

---

## 권장 payload (초안)

```typescript
type MatchFlowTrendPayload = {
  metric: "fii";
  currentMatchId: string;
  /** previous matches used (2 or 3) */
  n: number;
  minN: 2;
  maxK: 3;
  visible: true;
  currentFii: number;
  previousMean: number;   // mean of up to 3 previous
  delta: number;          // currentFii - previousMean
  previousMatchIds: string[];
  headlineCopy: "최근 경기 흐름 비교";
  windowCopy: "최근 3경기 평균과 비교" | "최근 2경기 평균과 비교";
};

// visible === false → UI 미노출 (n < 2 또는 current FII 없음)
```

팀 스트립(옵션, Spec에서 확정): `teamPreviousMean` vs `teamCurrentMean` — **선수별 Ranking Δ가 core**.

---

## 구현 진입점 (코드 · 미구현)

| 단계 | 파일 |
|---|---|
| 순수 집계 | 신규 예: `src/lib/vision/matchFlowTrendFromPlayerFii.ts` |
| Index list helper | 신규 소형 reader (또는 `visionFirestore` 확장) — `visionMatchIndex` list |
| Analysis load | 기존 `getLatestVisionAnalysis` |
| Identity | `findPlayerFiiEntry` / `resolvePlayerIdentity` |
| View 타입 | `CoachDashboardVisionProviderView` (+ optional trend map/array) |
| Wire | `useCoachVisionAnalysis` 또는 전용 hook `useCoachMatchFlowTrend` |
| UI | Ranking Δ 컬럼 및/또는 「최근 경기 흐름 비교」카드 · `CoachVisionAnalysisSection` |

Fixture/QA: 단일 pilot match만 있으면 Gate로 숨김 → **Harness에 이전 2~3 match mock** 필수.

---

## 리스크 · 완화

| 리스크 | 완화 |
|---|---|
| `trackId` drift across matches | `playerId` 우선 · 없으면 `trackId` · 매칭 실패 시 해당 선수 행만 trend 숨김 |
| `visionMatchIndex` 미기입 레거시 분석 | analysis만 있고 index 없음 → 그 매치는 윈도우에서 제외 (문서화) |
| Read 비용 (N analyses) | N≤3 + current 1 = ≤4 latest docs · 팀 index list 1회 |
| Pilot 데이터 부족 | Unit/Harness로 n=0,1,2,3 케이스 고정 · Prod Smoke는 multi-match 팀 필요 |
| Growth/telemetry 혼입 | Scope LOCK · import 금지 |

---

## Index / CF 판정

| 항목 | 필요? |
|---|---|
| 신규 composite index | **N** (list 후 클라이언트 정렬) |
| collectionGroup visionAnalysis | **N** |
| 신규 CF | **N** |
| 신규 root SoT | **N** |
| Rules 변경 | **N** (기존 active member read로 충분 · 구현 전 재확인만) |

> 나중에 `where('status','==','completed').orderBy('analysisCompletedAt','desc').limit(4)` 최적화 시 composite index **선택** — v1 비필수.

---

## OUT (유지)

- Parent 「지난주」그래프
- Growth / `playerSkillSnapshots` / `getPlayerTrendIntelligence`
- Calendar 7d/14d 윈도우
- 신규 Brain / Synthetic
- Day-03 Official Fact · VOC-011 count

---

## Next Gate

```text
PM SCOPE LOCK ✅
ENG SPIKE ✅
        ↓
Implementation Spec 1p LOCK (카피·팀 스트립 여부·Harness)
        ↓
IMPLEMENT (별도 지시 · PAI-012)
```

---

**Prepared:** Engineering Track A · 2026-07-12  
**Upstream:** `VOC_012_CUMULATIVE_TREND_DESIGN_REVIEW.md`
