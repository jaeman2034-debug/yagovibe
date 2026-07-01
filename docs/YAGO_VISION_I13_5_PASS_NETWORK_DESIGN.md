# YAGO Vision I13-5 — Pass Network 상세 설계

**Status:** 📐 **DESIGN ONLY** — PM I13-5 Design Sign-off ✅ · 구현·Firestore·Callable 금지  
**Date:** 2026-07-01 (rev. 2 — Failure/Testing/Metrics/Open Issues)  
**Branch:** `vision-v2-i13`  
**Baseline:** `vision-v1.0-final` 🔒  
**Parent:** `docs/YAGO_VISION_I13_SPRINT_DESIGN.md`  
**Sprint Phase:** I13 Phase 1 — Pass Network (North Star Feature)

> PM Sprint 순서상 **I13-5 Pass Network**를 Phase 1로 착수한다.  
> 이후 Heatmap · Movement · Team Shape · Possession · Tactical Intelligence는 **Pass Network 이벤트·엣지 SoT를 재사용**한다.

---

## 0. 목표

90분 경기 영상에서 추출된 **패스 관계 그래프**를 안정적으로 생성하고, Coach Dashboard에서 시각화한다.

| 목표 | 설명 |
|------|------|
| Primary | `fromPlayer → toPlayer` 패스 네트워크 (가중·방향·시간창) |
| Secondary | Hub player · completion rate · zone-aware edge 집계 |
| Non-goal | GEV Engine 재작성 · v1.0 Parent Report UI 변경 · Avatar SoT 변경 |

---

## 1. Architecture

### 1.1 입력 (Read-Only · v1.0 SoT)

| 소스 | 경로 / 아티팩트 | 용도 |
|------|-----------------|------|
| **Tracking** | Worker `tracks.jsonl` / `tracks_registry.json` | 선수 위치·trackId·시간축 |
| **GEV Events** | `gev_events.jsonl` (`PASS`, `RECEIVE`, `TURNOVER`) | 패스 후보·확정 근거 |
| **Roster Map** | `teams/{teamId}/members` + academy `players` | `trackId` → `playerId` / displayName |
| **Match Meta** | `visionMatchIndex` / `visionAnalysis` | `matchId`, `teamId`, `fps`, `durationS` |
| **Pitch Norm** | RC3 tracking preset (0–1 normalized coords) | 엣지 거리·존 분류 |

**읽기 원칙:** I13-5 Feature Job은 **기존 CV Run 완료(`visionAnalysis.status=completed`) 이후**만 실행. Whisper · ROI · Detection Worker **미변경**.

### 1.2 처리 (I13-5 Feature Layer · 신규 · 오프라인 배치)

```text
┌─────────────────────────────────────────────────────────┐
│ Phase A — Ingest (read-only)                            │
│  load gev_events.jsonl + tracks_registry + roster map   │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│ Phase B — Pass Candidate (GEV + Tracking fusion)        │
│  GEV PASS/RECEIVE pairs                                 │
│  + segment-gap heuristic validation (RC3 tuning ref)    │
│  + dedupe (same frame / mirror RECEIVE)               │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│ Phase C — Pass Confirm                                  │
│  confidence ≥ threshold                                 │
│  both endpoints mapped to roster (or team track pool)   │
│  optional: spatial sanity (distance ≤ max pass m)       │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│ Phase D — Network Build                                 │
│  aggregate edges (count, success, avg distance)         │
│  compute node metrics (in/out degree, hub score)        │
│  time windows: full | half | 15min sliding              │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│ Phase E — Persist manifest + optional GCS payload       │
│  Firestore summary doc + large adjacency in GCS         │
└─────────────────────────────────────────────────────────┘
```

**실행 트리거 (설계):** `visionAnalysis` completed → `tacticalV2/passNetwork` job queued (RC5-3 Job Monitor 패턴 **재사용**, 신규 contract는 I13 Gate에서 고정).

### 1.3 출력

| 산출물 | 설명 |
|--------|------|
| **Pass Network Summary** | Firestore 문서 (Coach UI 직접 read) |
| **Pass Edge List** | GCS JSON (전체 엣지·시간창별; 90분 규모) |
| **Pass Events Canonical** | 확정 패스 이벤트 목록 (Heatmap · Possession 재사용) |
| **QC Metrics** | precision proxy vs GT (pilot clip), orphan rate |

---

## 2. Firestore Schema

### 2.1 기존 컬렉션 (읽기 전용 · 변경 금지)

| Path | Read 필드 |
|------|-----------|
| `teams/{teamId}/visionMatchIndex/{matchId}` | `latestAnalysisId`, `hasVision`, `status` |
| `teams/{teamId}/matches/{matchId}/visionAnalysis/{analysisId}` | `fiiSummary`, `playerFii`, `teamFii`, `timeline` |
| `teams/{teamId}/media/{mediaId}/visionRuns/{runId}` | `pipelineStep`, `status`, artifact paths |

### 2.2 신규 컬렉션 필요 여부

**결론: 예 — additive subcollection 권장 (v1.0 Schema 무변경)**

| 제안 경로 | 문서 ID | 역할 |
|-----------|---------|------|
| `teams/{teamId}/matches/{matchId}/tacticalV2/passNetwork/v1` | `summary` | UI·index용 요약 |
| 동일 경로 | `windows/{windowId}` | half / period / custom window 요약 |
| `teams/{teamId}/matches/{matchId}/tacticalV2/jobs/{jobId}` | — | feature job status (RC5-3 패턴) |

**대안 (거부 권장):** `visionAnalysis` 내부 필드 embed — 문서 1MB 한도·v1.0 LOCK 충돌.

### 2.3 Summary Document (설계 스키마)

```typescript
// teams/{teamId}/matches/{matchId}/tacticalV2/passNetwork/v1/summary
{
  schemaVersion: "i13-pass-network-v1",
  matchId: string,
  teamId: string,
  sourceAnalysisId: string,      // visionAnalysis FK (read-only link)
  generatedAt: Timestamp,
  pipelineVersion: "i13-5-p0",

  // 집계 (전체 경기)
  metrics: {
    totalPasses: number,
    confirmedPasses: number,
    candidatePasses: number,
    completionRate: number,      // 1 - (turnover on pass chain / total)
    avgPassDistanceM: number,
    hubPlayerId?: string,
    hubTrackId?: string,
  },

  // UI용 top-N (전체 adjacency는 GCS)
  nodes: Array<{
    playerId?: string,
    trackId: string,
    label: string,
    positionAvg?: { x: number; y: number }, // normalized pitch
    passCount: number,
    receiveCount: number,
    degree: number,
  }>,

  edges: Array<{
    fromPlayerId?: string,
    toPlayerId?: string,
    fromTrackId: string,
    toTrackId: string,
    count: number,
    successRate: number,
    avgDistanceM: number,
    dominantZone?: "def" | "mid" | "att",
  }>,

  artifacts: {
    edgesGcsPath?: string,
    eventsGcsPath?: string,
    qcReportPath?: string,
  },

  qc: {
    gtClipId?: string,
    edgeCountDeltaPct?: number,
    orphanTrackPct?: number,
  },
}
```

**Security Rules (설계):** Coach/Staff read; client write 금지 (CF/Worker only).

---

## 3. Event Flow

```text
Detection (v1.0 LOCK — YOLO/CV Worker)
        │
        ▼
Tracking (tracks.jsonl — possession segments)
        │
        ▼
Pass Candidate
  ├─ GEV: adjacent segment A→B, gap ≤ max_pass_gap_s
  ├─ emit PASS + RECEIVE pair (vision_gev_engine.py)
  └─ I13: pair dedupe → single directed pass candidate
        │
        ▼
Pass Confirm
  ├─ confidence ≥ min_pass_confidence (preset ref: rc3_1_phase_c)
  ├─ from_track ≠ to_track
  ├─ roster map hit OR team-pool unknown bucket
  └─ spatial: pitch distance ≤ MAX_PASS_DISTANCE_M (config, default 60m)
        │
        ▼
Network Update
  ├─ increment edge(from, to)
  ├─ update node in/out counts
  ├─ append to time window buckets (15min / half)
  └─ compute hub (max eigenvector centrality approx OR degree*success)
        │
        ▼
Visualization (Client — I13-7 Coach Dashboard)
  ├─ force graph OR pitch overlay arcs
  └─ filter: time window · player · zone
```

### 3.1 GEV ↔ I13-5 경계

| 레이어 | 책임 |
|--------|------|
| `vision_gev_engine.py` | Pass **Candidate** 생성 (v1.0 LOCK) |
| I13-5 Feature Job | Confirm · dedupe · graph · persist |
| Coach UI | Read summary + optional GCS fetch |

**중요:** GEV 수정 없이 I13-5에서 **후처리 필터**로 품질 개선. GT 회귀는 `pilot_pass01_clip_002_gev_gt.json` 대비 edge F1로 측정.

---

## 4. Data Structure

### 4.1 Player Node

```typescript
interface PassNetworkNode {
  trackId: string;           // 항상 존재 (tracking SoT)
  playerId?: string;         // roster 매핑 성공 시
  label: string;             // displayName | trackId fallback
  teamSide?: "home" | "away" | "unknown";

  // Metrics
  passCount: number;         // outbound confirmed passes
  receiveCount: number;      // inbound
  turnoverCount: number;     // optional from GEV
  degree: number;            // passCount + receiveCount (undirected) or separate in/out

  positionAvg?: { x: number; y: number };
  positionStd?: { x: number; y: number };
  hubScore?: number;         // 0–1 normalized
}
```

### 4.2 Edge

```typescript
interface PassNetworkEdge {
  fromTrackId: string;
  toTrackId: string;
  fromPlayerId?: string;
  toPlayerId?: string;

  count: number;
  weight: number;            // normalized count / maxEdgeCount (visual)
  successRate: number;       // confirmed / (confirmed + failed attempts)
  avgDistanceM: number;
  maxDistanceM: number;

  direction: {
    bearingDeg: number;      // 0–360 from avg from→to vector on pitch
    dominantZone: "def" | "mid" | "att";
  };

  timestamps: number[];      // downsampled in summary; full in GCS artifact
}
```

### 4.3 Weight

| Weight 유형 | 공식 (설계) | UI 용도 |
|-------------|-------------|---------|
| `volume` | `count / max(count)` | 선 두께 |
| `success` | `successRate` | 색상 (green→amber) |
| `distance` | `1 - norm(avgDistanceM)` | optional 필터 |
| `hub` | `sqrt(deg(from)*deg(to))` | 강조 엣지 |

기본 시각화: **volume × success**.

### 4.4 Direction

- **Micro:** 각 패스 `atan2(to.y - from.y, to.x - from.x)` 평균 → `bearingDeg`
- **Macro:** 엣지 중점 존 → `defensive third | middle | attacking third` (pitch 0–1 기준 Y 축 3등분)
- **Flow overlay:** Coach View에서 상위 5 엣지 방향 화살표

### 4.5 Time Window

| windowId | 범위 | 용도 |
|----------|------|------|
| `full` | 0 – durationS | 기본 |
| `h1` / `h2` | 0–45 / 45–90 (또는 실제 half boundary) | 전반·후반 비교 |
| `w15_{n}` | 15분 슬라이딩 | Coach 타임라인 scrub |
| `possession_{k}` | Possession segment (I13-4 연동) | Phase 2 |

Window별 **독립 subgraph** 생성; summary doc는 `full` only, 나머지는 sub-docs 또는 GCS.

---

## 5. UI

### 5.1 Coach View (Primary · I13-7)

| 요소 | 설명 |
|------|------|
| 진입 | `/teams/:teamId/vision/match/:matchId` → **Pass Network** 탭 |
| Layout | Pitch overlay (nodes at `positionAvg`) + curved directed edges |
| Controls | Time window · min edge count · team side · player highlight |
| Cards | Hub player · total passes · completion % · top 3 connections |
| Empty | Vision Run 미완료 → RC5 파이프라인 CTA (기존) |

**v1.0 Validation Console:** 변경 없음 (별도 surface).

### 5.2 Parent View (Phase 2 · v1.0 LOCK until Gate)

| Phase | 노출 |
|-------|------|
| I13-5 P0 | **미노출** — Parent Report UI 변경 금지 |
| I13-5 P1 (별도 Gate) | Parent Vision Report에 **요약 1카드** ("핵심 연결 플레이어") — read-only |

### 5.3 Internal View (Ops / QA)

| Surface | 사용자 | 내용 |
|---------|--------|------|
| Job Monitor 확장 | Ops | passNetwork job status · latency |
| GT Diff Panel | QA | `pilot_pass01_clip_002` edge F1 · orphan list |
| Debug JSON | Engineering | GCS `events_canonical.jsonl` download link |

---

## 6. Performance

### 6.1 90분 · 22명 규모 추정

| 항목 | 추정 |
|------|------|
| GEV PASS events | ~800–1,500 / match (preset dependent) |
| Confirmed edges (unique pairs) | ~50–150 |
| Summary doc size | < 100 KB (top nodes/edges only) |
| Full edge artifact (GCS) | ~200 KB – 2 MB JSON |

### 6.2 배치 vs 실시간

| 모드 | 판정 | 설명 |
|------|------|------|
| **배치 (권장 P0)** | ✅ | CV Run 완료 후 30–120s 내 feature job — Coach는 완료 후 조회 |
| **준실시간 (P1)** | ⚠️ | 15min window incremental update — Worker streaming 미구현 시 **보류** |
| **실시간 (라이브)** | ❌ P0 범위 외 | Tracking live ingest + sub-second graph — Vision v3+ |

**SLO (설계):**

- Feature job p95 < **120s** (90분 영상, post-CV)
- Coach UI first paint (summary only) < **2s** (Firestore read)
- GCS full graph lazy load < **5s** on demand

### 6.3 확장성

- 22명 × 22명 adjacency = 484 cells sparse → 문제 없음
- 90분 @ 30fps tracking → Pass Confirm은 **이벤트 수준** 처리 (frame 전수 X)

---

## 7. Vision v1.0과의 연동 · 영향

| 영역 | 영향 | 조치 |
|------|------|------|
| **CV Run** | 없음 | 기존 `startVisionAnalysis` · Worker pipeline 유지 |
| **GEV Engine** | 없음 | READ `gev_events.jsonl` only |
| **FII / fii_summary** | 없음 | Pass Network는 **병렬 파생**; FII 수치 덮어쓰기 금지 |
| **Growth Signals (I9)** | 없음 | 해석·성장 파이프라인 독립 |
| **Avatar / OVR (I11)** | 없음 | `playerGrowthAvatar` 미참조 |
| **Parent Report (I12)** | P0 없음 | UI·route·callable 무변경 |
| **Kakao Share / PDF** | 없음 | 기존 growth report 경로 유지 |
| **Firestore v1.0 paths** | 없음 | `tacticalV2/*` **additive only** |

### 7.1 재사용 계약 (다운스트림)

I13-5 확정 패스 이벤트 (`events_canonical.jsonl`)를 다음 Sprint가 consume:

| Consumer | 재사용 필드 |
|----------|-------------|
| I13 Heatmap | pass endpoints → zone density boost |
| I13 Team Shape | pass chain → line height proxy |
| I13 Possession | pass within segment |
| I13 Tactical Intel | hub + top edges → LLM facts |
| I13 Vision Index | `buildup` axis input |

---

## 8. Gate — I13-5 PASS 조건

### 8.1 Technical Gate

| # | 조건 | 측정 |
|---|------|------|
| G1 | Pilot replay | `pass01_clip_002` end-to-end feature job PASS |
| G2 | Edge recall | vs `pilot_pass01_clip_002_gev_gt.json` PASS pairs — recall ≥ **0.80** |
| G3 | Edge precision | precision ≥ **0.75** (confirmed / candidates) |
| G4 | Orphan rate | unmapped track endpoints < **15%** of confirmed passes |
| G5 | Persist | summary doc + GCS artifact both readable |
| G6 | Idempotency | same `analysisId` re-run → identical graph hash |
| G7 | v1.0 regression | `npm run build` · existing Vision E2E scripts PASS |
| G8 | Latency | feature job p95 < **120s** on pilot hardware |

### 8.2 Product Gate

| # | 조건 |
|---|------|
| P1 | Coach가 Hub player 1명 이상 식별 가능 (UI review) |
| P2 | Top 3 edges가 영상 리뷰와 **정성 일치** (PM sign-off) |
| P3 | Parent UI **무변경** 확인 |

### 8.3 Lock Gate (PASS 후)

- I13-5 schema version `i13-pass-network-v1` 고정
- GEV · v1.0 Callable 변경 금지 유지
- 변경은 `i13-pass-network-v2` + 새 Gate only

---

## 9. Failure & Recovery Strategy

I13-5는 GEV/Tracking **후처리 레이어**이므로, upstream 실패·불확실성은 **버리지 않고 분류·격리·부분 persist**한다.

### 9.1 공통 처리 원칙

| 원칙 | 설명 |
|------|------|
| **No silent drop** | 버려진 candidate는 `rejected.jsonl`에 reason code 기록 |
| **Partial graph OK** | 일부 구간 실패해도 확정 패스만으로 summary persist 허용 |
| **v1.0 untouched** | Recovery는 I13-5 job 내부만; GEV/Tracking 재실행은 별도 CV Run |
| **QC surfacing** | `summary.qc.*` + Internal View에 rejection breakdown 노출 |

**Persist 정책 요약**

| 상태 | summary persist | events_canonical | rejected log |
|------|:---------------:|:----------------:|:------------:|
| Full PASS | ✅ | ✅ | ✅ (optional) |
| Partial (≥50% confirmed vs candidates) | ✅ + `qc.degraded=true` | ✅ | ✅ |
| Severe (<50% or ingest fail) | ❌ job `failed` | ❌ | ✅ |

---

### 9.2 시나리오별 정의

각 항목: **Detection → Fallback → Recovery → Persist**

#### Track Lost

| 단계 | 처리 |
|------|------|
| **Detection** | `fromTrackId`/`toTrackId`가 `tracks_registry`에 없거나 segment gap > `TRACK_CONTINUITY_MAX_S` |
| **Fallback** | 동일 timestamp ±`0.5s` 내 nearest active track 보간; 실패 시 endpoint를 `unknown_track` bucket |
| **Recovery** | 보간 성공 → candidate 유지 + `meta.recoveredTrack=true`; 실패 → **reject** (`TRACK_LOST`) |
| **Persist** | reject만 events에서 제외; 나머지 그래프는 persist; `qc.orphanTrackPct` 갱신 |

#### Ball Lost

| 단계 | 처리 |
|------|------|
| **Detection** | GEV PASS with `has_ball=false` (gap ≤ `pass_no_ball_max_gap_s`) |
| **Fallback** | RC3 Phase A 규칙 **그대로 수용** — I13-5는 추가 필터만 적용 |
| **Recovery** | `confidence < 0.55` → downgrade to `candidate_only`; `≥ 0.55` → confirm with `meta.ballLost=true` |
| **Persist** | confirmed는 persist; `candidate_only`는 canonical 제외, rejected log에 기록 |

#### Receiver Missing

| 단계 | 처리 |
|------|------|
| **Detection** | GEV PASS without `toTrackId` (GT clip에도 존재) |
| **Fallback** | 동일 timestamp RECEIVE 이벤트 pairing; 없으면 next-segment possessor 추론 |
| **Recovery** | pairing 성공 → synthetic `toTrackId`; 실패 → **reject** (`RECEIVER_MISSING`) — edge 미생성 |
| **Persist** | reject; from-node outbound count만 optional increment 안 함 |

#### Multiple Candidate

| 단계 | 처리 |
|------|------|
| **Detection** | 동일 `(fromTrack, toTrack, frame±1)` 다중 PASS 또는 A→B / A→C 동시 high conf |
| **Fallback** | 최고 `confidence` 1건 선택; 동점 시 shortest spatial distance 우선 |
| **Recovery** | 나머지 → `reject` (`MULTI_CANDIDATE_SUPERCEDED`); winner만 confirm |
| **Persist** | winner만 canonical + edge++; rejected log에 alternates 보관 (QA용) |

#### Low Confidence

| 단계 | 처리 |
|------|------|
| **Detection** | `confidence < MIN_CONFIRM_CONF` (default **0.55**, preset ref `rc3_1_phase_c`) |
| **Fallback** | `0.45 ≤ conf < 0.55` → `candidate_only` bucket (graph 미반영) |
| **Recovery** | `conf < 0.45` → **reject** (`LOW_CONFIDENCE`) |
| **Persist** | confirmed만 persist; summary에 `metrics.candidatePasses` vs `confirmedPasses` 분리 |

#### Out of ROI

| 단계 | 처리 |
|------|------|
| **Detection** | endpoint pitch norm outside `[0,1]` or ROI mask (future) |
| **Fallback** | clamp to pitch bounds; clamp 거리 > `ROI_CLAMP_MAX_M` → reject |
| **Recovery** | clamp 유효 시 `meta.roiClamped=true`로 confirm 허용 |
| **Persist** | confirm 시 persist; 과다 clamp(>10% candidates) → `qc.degraded=true` |

#### Camera Cut

| 단계 | 처리 |
|------|------|
| **Detection** | frame gap > `CAMERA_CUT_GAP_S` (default **2.0s**) or tracking discontinuity flag |
| **Fallback** | cut 구간 **패스 candidate 생성 금지** (cross-cut false pass 방지) |
| **Recovery** | cut 이후 새 segment에서만 candidate 재개; window bucket 경계로 표시 |
| **Persist** | cut 전후 별도 subgraph 가능; full match summary는 양쪽 합산 + `qc.cameraCuts=n` |

#### Occlusion

| 단계 | 처리 |
|------|------|
| **Detection** | track confidence drop / bbox area < threshold mid-pass |
| **Fallback** | GEV already emitted → spatial sanity check 강화 (`MAX_PASS_DISTANCE_M` ↓ 20%) |
| **Recovery** | sanity fail → downgrade `candidate_only`; pass → `meta.occlusionSuspect=true` |
| **Persist** | confirmed만 persist; suspect 비율 >20% → `qc.degraded=true` |

---

### 9.3 Job-Level Failure

| Failure | 동작 |
|---------|------|
| `gev_events.jsonl` missing | job `failed`, no persist, alert Ops |
| empty events | job `failed`, suggest CV re-run |
| roster map empty | persist with trackId-only nodes, `qc.rosterMapped=false` |
| Firestore write fail | retry 3x → job `failed`, GCS artifact retained for manual replay |
| Idempotent re-run | overwrite same `sourceAnalysisId` summary (hash must match) |

---

## 10. Testing Strategy

구현 Phase에서 **GEV/Tracking mock**으로 I13-5만 격리 테스트한다.

### 10.1 Unit Test

| 대상 | 케이스 |
|------|--------|
| PASS/RECEIVE dedupe | mirror pair → single directed pass |
| Multiple candidate | confidence tie-break · spatial tie-break |
| Low confidence | threshold boundary 0.44 / 0.45 / 0.55 / 0.56 |
| Receiver missing | pairing / reject |
| Edge aggregation | count, weight, successRate |
| Time window | h1/h2/w15 bucket boundaries |
| Hub score | degree-only vs weighted |

**Fixture:** synthetic `gev_events.jsonl` (10–30 events), mini `tracks_registry.json`.

### 10.2 Integration Test

| 시나리오 | 입력 | 기대 |
|----------|------|------|
| Pilot clip replay | `pass01_clip_002` worker artifacts | summary JSON schema valid |
| GT alignment | `pilot_pass01_clip_002_gev_gt.json` | recall/precision computed |
| Partial degrade | 30% tracks removed (simulated) | partial persist + `qc.degraded` |
| Idempotency | 2× same analysisId | identical graph hash |
| v1.0 regression | no changes to `vision_gev_engine.py` | file hash unchanged |

### 10.3 Smoke Test

| # | Command / Action | PASS |
|---|------------------|------|
| S1 | `python .../pass_network_builder.py --gev ... --registry ...` | exit 0 + `summary.json` |
| S2 | `python scripts/vision/i13_pass_network_gt_metrics.py` | metrics JSON + PASS verdict |
| S3 | `npm run build` | no import errors (client hooks optional P1) |
| S4 | Existing `rc4_6_e2e_demo.py --validate-only` | v1.0 pipeline unaffected |

### 10.4 Pilot Acceptance

| 단계 | 담당 | 기준 |
|------|------|------|
| QA GT diff | Engineering | G2/G3 Gate 수치 |
| Coach UI review | PM + Coach pilot | P1/P2 Product Gate |
| Ops job monitor | Ops | job status · latency G8 |
| Parent regression | QA | Parent routes unchanged (P3) |

**Pilot #2:** full 90min academy match — optional after clip PASS.

---

## 11. Metrics

### 11.1 Quality Metrics

| Metric | 정의 | Target (I13-5 PASS) |
|--------|------|---------------------|
| **Precision** | `confirmed PASS pairs` / `all GEV PASS candidates` (post-dedupe) | ≥ **0.75** |
| **Recall** | `matched GT PASS pairs` / `GT PASS total` (timestamp ±0.75s, track match) | ≥ **0.80** |
| **F1** | harmonic mean of precision & recall | ≥ **0.77** |
| **False Positive (FP)** | confirmed but no GT match | report only; minimize |
| **False Negative (FN)** | GT PASS with no confirmed edge | report only; minimize |
| **Coverage** | `confirmed` / (`confirmed` + `rejected` + `candidate_only`) | ≥ **0.60** |
| **Orphan rate** | passes with unmapped `playerId` endpoint | < **15%** |

### 11.2 Operational Metrics

| Metric | 정의 | Target |
|--------|------|--------|
| **Latency (job)** | ingest → persist wall time | p95 < **120s** (90min) |
| **Latency (UI)** | Firestore summary read → first paint | < **2s** |
| **Degraded rate** | jobs with `qc.degraded=true` | < **20%** (pilot) |
| **Rejection breakdown** | count by reason code | dashboard (Internal View) |

### 11.3 Persisted QC Block (summary.qc 확장)

```typescript
qc: {
  precision?: number;
  recall?: number;
  f1?: number;
  falsePositives?: number;
  falseNegatives?: number;
  coverage?: number;
  orphanTrackPct?: number;
  degraded?: boolean;
  rejectionReasons?: Record<string, number>; // TRACK_LOST, LOW_CONFIDENCE, ...
  cameraCuts?: number;
}
```

---

## 12. Open Issues

### 12.1 v2 Scope (I13 Sprint · IN)

| Item | Sprint | 비고 |
|------|--------|------|
| Pass Network offline builder | I13-5 P0 | Worker lib only |
| GT metrics script | I13-5 P0 | pilot clip |
| Firestore `tacticalV2/passNetwork` persist | I13-5 P1 | Gate 후 CF |
| Coach Pass Network tab | I13-7 | read summary |
| Heatmap / Movement / Shape reuse canonical events | I13+ | Pass Network SoT |
| 15min window subgraphs | I13-5 P1 | GCS |
| Parent summary card | I13-5 P2 | 별도 Product Gate |

### 12.2 v3 Scope (OUT of I13 · deferred)

| Item | 이유 |
|------|------|
| Live / sub-second graph update | streaming tracking 미구현 |
| Ball trajectory–based pass verify | 별도 ball tracking Gate |
| Cross-match player identity merge | multi-match graph |
| Auto formation classification ML | Team Shape v2 |
| 3D pitch visualization | platform deferred |
| GEV engine tuning / preset change | v1.0 LOCK |

### 12.3 Out of Scope (명시적 제외)

- Whisper · ROI · Detection model 변경
- `playerGrowthAvatar` · Avatar Promotion · Parent Report v1.0 UI
- Growth Signals · Interpretation · FII 수식 변경
- Reference GT lock JSON 수정 (`data/vision/gt/*`)
- 실시간 라이브 경기 Pass Network

### 12.4 Open Questions (구현 전 결정)

| # | Question | Owner | Default |
|---|----------|-------|---------|
| OQ1 | `MIN_CONFIRM_CONF` = 0.55 고정 vs preset별 override? | Engineering | preset ref, I13 config file |
| OQ2 | unknown_track bucket을 UI에 표시할지? | PM | P0: hide, aggregate in "기타" |
| OQ3 | GCS artifact bucket = 기존 Firebase Storage path? | Ops | same project, `tacticalV2/` prefix |
| OQ4 | 90min half boundary — fixed 45' vs detected? | PM | P0: fixed; P1: whistle detect |

---

## 13. 구현 순서 (Gate 승인 후 · 참고)

| Step | 작업 | 산출 |
|------|------|------|
| 1 | `pass_network_builder.py` (worker lib) | offline JSON |
| 2 | GT metrics script | `i13_pass_network_gt_metrics.py` |
| 3 | Firestore persist CF (신규 · Gate 후) | summary doc |
| 4 | `usePassNetworkSummary` hook | client read |
| 5 | Coach Pass Network tab (I13-7 일부) | UI |

**현재 단계:** PM I13-5 Design Sign-off ✅ — 구현은 **Worker Offline Builder** Gate 후 착수.

---

## 14. References

- `docs/YAGO_VISION_I13_SPRINT_DESIGN.md`
- `docs/YAGO_VISION_RC5_1_FIRESTORE_SCHEMA.md`
- `docs/YAGO_VISION_RC4_2_M2_REPORT.md`
- `data/vision/gt/pilot_pass01_clip_002_gev_gt.json`
- `yago-worker/lib/vision/vision_gev_engine.py` (PASS emit)
- `src/lib/vision/visionPlatformRoutes.ts`

---

*YAGO Vision I13-5 Pass Network — Design v2. PM Sign-off ✅. No code until implementation Gate.*
