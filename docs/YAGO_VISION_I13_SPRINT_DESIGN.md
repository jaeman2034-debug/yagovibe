# YAGO Vision I13 Sprint — Design Document (v2 Product Layer)

**Status:** 📐 **DESIGN ONLY** — 구현 금지 (Gate 승인 전)  
**Date:** 2026-07-01  
**Baseline:** `vision-v1.0-final` · RC5 → I12 LOCK 🔒  
**Proposed branch:** `vision-v2-i13` (착수 시 생성)  
**Sprint codename:** I13 — Tactical Visualization & Intelligence 2.0

---

## 0. Executive Summary

Vision v1.0은 **Whisper → CV → Signals → Interpretation → Growth → Avatar → Parent** 파이프라인을 Final PASS로 닫았다.

I13 Sprint는 **동일 Engine/Worker Baseline 위에** 코치·부모가 이해할 수 있는 **전술 시각화 레이어**를 추가한다. Detection/Tracking/GEV Core를 재작성하지 않고, **파생 분석·시각화·Coach Dashboard 통합**에 집중한다.

| 원칙 | 내용 |
|------|------|
| v1.0 LOCK | I8–I12 Schema·Callable·Parent Report·Avatar SoT **변경 금지** |
| Additive only | I13 산출물은 **신규 컬렉션/경로** 또는 **read-only 파생 뷰** |
| SoT | Tracking/GEV/FII v1.0 출력 → I13 Feature Job → UI Surface |
| Gate | 설계 승인 → `vision-v2-i13` 브랜치 → I13-1부터 순차 구현 |

---

## 1. Scope Map (I13-1 ~ I13-8)

```text
[GEV/Tracking v1.0 SoT]
        │
        ▼
┌───────────────────────────────────────┐
│  I13 Feature Extraction Layer (NEW)   │
│  pass_graph · heatmap · movement ·    │
│  shape · possession_segments          │
└───────────────────────────────────────┘
        │
        ├─► I13-1 Pass Network
        ├─► I13-2 Heatmap
        ├─► I13-3 Player Movement Map
        ├─► I13-4 Team Shape
        ├─► I13-5 Possession Flow
        ├─► I13-6 Tactical Intelligence (narrative)
        ├─► I13-7 Coach Dashboard (surface integration)
        └─► I13-8 Vision Index 2.0 (composite score)
```

---

## 2. I13-1 — Pass Network

### 목표
경기 내 **패스 이벤트 그래프**를 코치가 한 화면에서 파악.

### 입력 SoT (v1.0 유지)
- `teams/{teamId}/visionMatches/{matchId}` — match meta
- GEV events: `PASS`, `RECEIVE` (또는 동등 이벤트 타입)
- Player track IDs ↔ roster `playerId` 매핑 (기존 normalization)

### 산출물 (신규 · 제안)
```text
teams/{teamId}/visionMatches/{matchId}/tacticalV2/passNetwork/v1
```

```typescript
{
  schemaVersion: "i13-pass-network-v1",
  matchId,
  teamId,
  generatedAt,
  nodes: Array<{ playerId, label, positionAvg: {x,y}, passCount, receiveCount }>,
  edges: Array<{ fromPlayerId, toPlayerId, count, successRate, avgDistanceM }>,
  metrics: { totalPasses, completionRate, keyNodePlayerId?, hubPlayerId? },
}
```

### UI Surface
- Coach Dashboard 탭: **Pass Network** (force-directed 또는 pitch overlay)
- Parent Vision Report: **요약 카드만** (v1.0 Parent UI 변경은 I13-7 Gate 후)

### Gate
- Pilot clip GT 대비 edge count 오차 ≤ 15%
- Coach Review: “핵심 패스 허브” 1명 이상 식별 가능

---

## 3. I13-2 — Heatmap

### 목표
팀/선수 **공간 점유·활동 밀도** 히트맵.

### 입력
- Tracking positions (frame-level, pitch-normalized 0–1)
- Team segment (own team track IDs)

### 산출물
```text
teams/{teamId}/visionMatches/{matchId}/tacticalV2/heatmaps/v1/{scope}
```
`scope`: `team` | `player:{playerId}`

```typescript
{
  schemaVersion: "i13-heatmap-v1",
  grid: { rows: 32, cols: 48 },
  values: number[][], // normalized density
  peakCell: { row, col },
  coveragePct: number,
}
```

### UI
- Pitch overlay (Canvas/SVG), Coach Dashboard
- Export: PNG (Storage, Parent PDF v2는 별 Gate)

### Gate
- 시각 검수: 골대·센터서클 위치 정합
- Tracking dropout 구간 mask 처리 문서화

---

## 4. I13-3 — Player Movement Map

### 목표
선수별 **이동 궤적·스프린트 구간·활동 반경** 시각화.

### 입력
- Per-player track timeline
- Speed derived from normalized coords + fps

### 산출물
```text
.../tacticalV2/movement/v1/{playerId}
```

```typescript
{
  schemaVersion: "i13-movement-v1",
  playerId,
  totalDistanceM,
  sprintCount,
  maxSpeedKmh,
  activityRadiusM,
  pathSample: Array<{ t, x, y }>, // downsampled for UI
  zones: { defensiveThirdPct, middleThirdPct, attackingThirdPct },
}
```

### UI
- Player Profile / Coach player drill-down
- Parent: 단일 선수 선택 시 “활동 영역” 미니맵 (I12 확장, 별도 Gate)

---

## 5. I13-4 — Team Shape

### 목표
**포메이션 압축·라인 높이·폭** 시계열.

### 입력
- Frame-sampled team centroid + defensive/mid/attacking line Y
- Optional: set-piece exclude windows

### 산출물
```text
.../tacticalV2/teamShape/v1
```

```typescript
{
  schemaVersion: "i13-team-shape-v1",
  samples: Array<{
    t,
    defensiveLineY,
    midBlockY,
    attackingLineY,
    widthM,
    compactnessScore,
  }>,
  avgShape: { formationLabel?: string, confidence },
}
```

### UI
- Coach Dashboard: shape timeline slider
- Match Detail: RC4 `visionMatchDetailPath` 내 Shape 섹션

---

## 6. I13-5 — Possession Flow

### 목표
**점유 구간·전환·턴오버** 타임라인.

### 입력
- GEV possession / ball-owner events (v1.0)
- RC4-2 M2 참고: possession chains 개념

### 산출물
```text
.../tacticalV2/possession/v1
```

```typescript
{
  schemaVersion: "i13-possession-v1",
  segments: Array<{
    startT, endT,
    teamSide: "home" | "away",
    outcome: "shot" | "turnover" | "out" | "half",
    zoneStart, zoneEnd,
  }>,
  metrics: { homePossessionPct, avgSegmentDurationS, turnovers },
}
```

### UI
- Horizontal bar timeline (Coach)
- Link to Pass Network segment filter

---

## 7. I13-6 — Tactical Intelligence

### 목표
I8 Interpretation 위에 **전술 내러티브** (코치용). LLM은 **기존 server callable** 패턴만 사용.

### 입력
- I13-1~5 aggregated metrics
- 기존 `fii_summary` / interpretation candidates (read-only)

### 산출물
```text
.../tacticalV2/intelligence/v1
```

```typescript
{
  schemaVersion: "i13-tactical-intel-v1",
  bullets: string[],
  risks: string[],
  opportunities: string[],
  sourceFeatures: ["passNetwork", "heatmap", "shape", "possession"],
  modelRef: string,
}
```

### 규칙
- **신규 Callable** — I13 Gate에서 contract 고정
- Parent-facing copy는 I12 톤 유지 (별도 review)

---

## 8. I13-7 — Coach Dashboard

### 목표
기존 Coach/Play 진입점에 I13 시각화 **단일 허브** 통합.

### Route (제안 · v1.0 URL Constitution 준수)
```text
/teams/:teamId/vision/match/:matchId          ← 기존 Match Detail
/teams/:teamId/vision/match/:matchId/tactical ← I13 Hub (신규)
```

또는 Play 탭 내 `VisionPlatformNav` `current="coach-tactical"` 세그먼트 확장.

### Layout (wireframe)
```text
┌─────────────────────────────────────────┐
│ VisionPlatformNav · matchId · teamId    │
├──────────────┬──────────────────────────┤
│ Possession   │ Pass Network             │
│ Flow (I13-5) │ (I13-1)                  │
├──────────────┼──────────────────────────┤
│ Heatmap      │ Team Shape timeline      │
│ (I13-2)      │ (I13-4)                  │
├──────────────┴──────────────────────────┤
│ Tactical Intelligence (I13-6)           │
└─────────────────────────────────────────┘
```

### v1.0 분리
- Validation Console, Parent Report, Avatar Promotion **미변경**
- Coach Dashboard = **additive route/tab**

---

## 9. I13-8 — Vision Index 2.0

### 목표
경기 단위 **복합 전술 지표** (0–100). Avatar OVR(I11)과 **별도** 유지.

### 입력
- I13-1~6 normalized sub-scores
- Optional: 기존 FII team index

### 산출물
```text
.../tacticalV2/visionIndex/v1
```

```typescript
{
  schemaVersion: "i13-vision-index-v1",
  overall: number,
  axes: {
    buildup: number,
    pressing: number,
    width: number,
    transition: number,
    stability: number,
  },
  weights: Record<string, number>,
}
```

### 표시 규칙
| Surface | 지표 | SoT |
|---------|------|-----|
| Coach | Vision Index 2.0 | `tacticalV2/visionIndex` |
| Parent Avatar | OVR | `playerGrowthAvatar.ovr` (v1.0 LOCK) |
| Parent Growth | Growth Score | `playerGrowthHistory` (v1.0 LOCK) |

---

## 10. Architecture & Pipeline

### Feature Job (신규 · Worker 확장 Gate 필요)

```text
visionMatch COMPLETE (v1.0)
    → trigger: tacticalV2FeatureJob
    → read: tracking + gev + roster
    → write: tacticalV2/* subcollections
    → emit: job status (RC5-3 monitor 패턴 재사용)
```

### Storage
- 대용량 grid/trajectory: Firestore 문서 크기 한도 → **GCS + manifest doc** 패턴
- 로컬 dev: `D:\YAGO_AI\runs\tacticalV2\` (junction 호환)

### Client
- 신규 hooks: `useTacticalV2PassNetwork`, `useTacticalV2Heatmap`, …
- 기존 `useParentIntelligence` **미변경** (I12 LOCK)

---

## 11. Implementation Order (post-Gate)

| Phase | Item | Dependency |
|-------|------|------------|
| P0 | I13 Gate 승인 · `vision-v2-i13` 브랜치 | 설계 sign-off |
| P1 | I13-5 Possession Flow | GEV v1.0 |
| P2 | I13-1 Pass Network | P1 |
| P3 | I13-2 Heatmap · I13-3 Movement | Tracking |
| P4 | I13-4 Team Shape | P3 |
| P5 | I13-6 Tactical Intelligence | P1–P4 |
| P6 | I13-8 Vision Index 2.0 | P1–P5 |
| P7 | I13-7 Coach Dashboard UI | P1–P6 |

---

## 12. Explicit Non-Goals (v1.0 LOCK)

다음은 I13 설계/구현에서 **건드리지 않음**:

- Whisper / ROI / CV Detection Worker
- `playerGrowthAvatar` Schema · Promotion Apply
- Parent Vision Report 레이아웃 (I13-7 전까지)
- `shareParentGrowthReportKakaoOrWebShare` contract
- `data/vision/gt/*` lock JSON (읽기만)

---

## 13. Gate Checklist (I13 Sprint Start)

- [ ] PM / Architect I13 Design Sign-off
- [ ] Firestore tacticalV2 path review (additive schema doc)
- [ ] Callable contract draft (I13-6 only)
- [ ] Branch `vision-v2-i13` from `vision-v1.0-final`
- [ ] Pilot replay: `pass01_clip_002` E2E fixture
- [ ] KPI: Coach Dashboard LCP · feature job latency SLO

---

## 14. References

- `docs/YAGO_VISION_V1_0_FINAL_PASS_DECLARATION.md`
- `docs/YAGO_VISION_RC4_2_M2_REPORT.md` (possession chains)
- `docs/YAGO_VISION_V3_IDEAS.md` (GEV/Pass/Possession ideas)
- `src/lib/vision/visionPlatformRoutes.ts`
- `data/vision/gt/rc5_4_lock.json`

---

*YAGO Vision I13 — Design only. No implementation until Gate approval.*
