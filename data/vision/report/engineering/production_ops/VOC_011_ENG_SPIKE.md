# VOC-011 — Eng Spike Report

**Document ID:** `VOC-011-ENG-SPIKE`  
**Status:** ✅ **SPIKE COMPLETE** (2026-07-11)  
**Scope LOCK:** `team + ageGroup` · `n ≥ 5` · Vision Parent Report  
**Day-03 Gate:** 🛑 별도 유지 · Official Fact 승격 금지

---

## Spike 질문 · 판정

| # | 질문 | 판정 | 근거 |
|---|---|---|---|
| 1 | `teamId + ageGroup` 선수 집합 조회 | ✅ **가능 (단순화)** | `ageGroup`은 **팀 문서** 필드 (`teams/{teamId}.ageGroup`). 선수별 ageGroup SoT 없음 → 1차 코호트 = **해당 팀 Vision 분석에 포함된 선수 집합** + 라벨용 `team.ageGroup` |
| 2 | 동일 기간 Vision metric 집계 | ✅ **가능** | 동일 `matchId`의 `playerFii[]` (fii_summary / Firestore `visionAnalysis`)에 FII·axes 이미 존재. 추가 기간 쿼리 없이 **경기 단위 평균** 산출 가능 |
| 3 | `n ≥ 5` Gate | ✅ **가능** | `playerFii` 유효 FII 개수 카운트 → `< 5`면 `peerBenchmark = null` / UI 미노출 |
| 4 | Parent Report에 `peerBenchmark` payload | ✅ **가능** | `ParentIntelligenceView` 확장 + `useParentIntelligence` / `buildParentIntelligenceFromFiiSummary`에서 조립 → `ParentIntelligenceSection` 카드 |

**종합:** 1차 MVP는 **신규 Firestore 루트 컬렉션·CF 없이** 기존 Parent Report 로드 경로에서 구현 가능.

---

## 데이터 모델 해석 (LOCK 정합)

```text
PM: team + ageGroup
코드 현실: ageGroup ∈ teams/{teamId} (팀 단위 1값)

→ 1차 의미:
   cohortKey = teamId + teams.ageGroup
   cohortPlayers = 해당 match 분석 playerFii[]
   displayLabel = "{ageGroup} 팀 평균" (예: U-12 팀 평균)

≠ 전국/타팀 U-12 평균
≠ position 필터 (2차)
```

| 리스크 | 완화 |
|---|---|
| `teams.ageGroup` 미설정 | 기준선 숨김 또는 「팀 평균」만 표시 (PM 카피 확정) |
| 분석 track이 멤버십과 1:1 아님 | n = **분석에 FII 있는 track 수** (멤버십 headcount 아님) · Official 카피에서 「분석 참여 또래」명시 |
| `teamFii.overall` ≠ 산술평균 | peer 기준선은 **`mean(playerFii.fii)`** 사용 권장 |

---

## 권장 `peerBenchmark` payload (초안)

```typescript
type PeerBenchmarkPayload = {
  cohortKey: string;           // `${teamId}:${ageGroup}`
  ageGroup: string | null;     // teams.ageGroup
  matchId: string;
  n: number;                   // valid playerFii count
  minN: 5;
  visible: boolean;            // n >= minN && ageGroup 정책 통과
  metric: "fii";
  childValue: number | null;   // 해당 자녀 FII
  peerMean: number | null;     // mean of playerFii.fii
  delta: number | null;        // child - peerMean
  copyKey: "team_age_group_avg";
};
```

`visible === false` → Parent UI 평균선 **미노출** (안내 문구는 선택 · PM).

---

## 구현 진입점 (코드)

| 단계 | 파일 |
|---|---|
| 집계 순수함수 | 신규 예: `src/lib/vision/peerBenchmarkFromPlayerFii.ts` |
| fii_summary 경로 | `fiiSummaryParentProvider.ts` |
| Firestore vision 경로 | `useParentIntelligence.ts` → `buildParentIntelligenceView` |
| View 타입 | `parentIntelligenceTypes.ts` |
| UI | `ParentIntelligenceSection` + 신규 카드 1개 |
| 표면 | `ParentVisionReportPage` (추가 라우트 불필요) |

Fixture 참고: `rc4_m2_fii_summary_clip_002.json` · `playerFii.length = 24` → Gate 통과 샘플 충분.

---

## OUT (Spike 범위 밖 · 유지)

- position 코호트
- Growth Report Parent View 연동
- 기간 누적 평균 (VOC-012)
- 신규 root collection / CF aggregate

---

## Next Gate

```text
PM SCOPE LOCK ✅
ENG SPIKE ✅
    ↓
구현 스펙 1p LOCK (metric=FII · 카피 · ageGroup 없음 정책)
    ↓
구현 (PAI-011 IMPLEMENT)
```

Day-03 Date Gate와 **독립**.

---

**Prepared:** Engineering Track A · 2026-07-11
