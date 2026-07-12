# PROD-OBS-012 / PAI-031 — VISION_ANALYSIS_FAILED / no GEV events Root Cause Review

**Document ID:** `PROD-OBS-012-PAI-031-ROOT-CAUSE-REVIEW`  
**Date:** 2026-07-12 (KST)  
**Status:** 📝 **ROOT CAUSE REVIEW** · ⏳ **PM Review 대기**  
**Action Item:** **PAI-031** ▶ OPEN  
**Incident:** **PROD-OBS-012** ▶ OPEN  
**Code change:** ❌ **금지** (본 문서 범위)  
**Production data change:** ❌ **금지**  
**재분석 실행:** ❌ **금지**  
**PASS / COMPLETE / CLOSED:** ❌ **선언 금지** (PM Review 후)

---

## 0. Scope / Non-goals

| In | Out |
|---|---|
| 오류 문구 source · Job Monitor 매핑 · Production 저장 상태 읽기 | 코드 수정 |
| A~E 분류 · Minimal Fix 필요 여부 | Hosting / CF / Rules 배포 |
| PAI-011 / 012 / 013 / 014 / 032 비변경 | Day-03 DATE_GATE_PENDING 승격 |
| | VOC-011 Count 변경 · 재분석 |

**대상 match:** `vision-pilot-pass01-clip-002`  
**teamId:** `D7TUZaOtfxdBc4P0lQLx`  
**Inspect:** 2026-07-12 read-only Firestore (emulator env cleared)

---

## 1. Observed Fact (UI)

PAI-012 Post-Deploy Smoke / Match Detail Job Monitor:

```text
JOB MONITOR · 완료 · 100%
[VISION_ANALYSIS_FAILED] no GEV events: /tmp/yago-worker/vision-1783164468430-e246e63c/tracking/gev_rc3_1_phase_c/gev_events.jsonl
```

동일 화면에서:

- Team FII / Ranking / Match Summary 정상 (spotcheck: Source `fii_summary.json`, Team FII 62, P0100 FII 72)
- Match Summary 문구에 **「GEV … 89개 이벤트」** 명시
- PAI-012 Trend (최근 3경기 Avg/Δ) 정상

> 지시문 관측 문구의 `no GEV events for match`는 요약형. **실제 저장·UI 원문은 path suffix가 있는 `no GEV events: /tmp/.../gev_events.jsonl`.**

---

## 2. Root Cause (Verdict)

**현재 Production 최신 Vision 분석이 실패한 것이 아니다.**

**Root Cause = D (stale error on `visionMatchIndex`) + E (Job Monitor error fallthrough)**

1. 과거 sibling run `14005e1260f84342b22bf06a`가 실제로 `failed` + `VISION_ANALYSIS_FAILED` + GEV 0으로 종료하며 index/media에 오류 필드를 기록했다.  
2. 이후 최신 run `3e3daf4ba52c49b89b18ea44`는 **`completed` / GEV 89 / analysis `anKy2SHYCVWWLqeGwOuN` (playerFii 24)** 로 성공했다.  
3. 성공 경로의 `upsertVisionMatchIndex`는 `errorCode`/`errorMessage`를 **truthy일 때만** patch하므로, 완료 시 `null`을 넘겨도 **merge로 stale 오류가 지워지지 않는다.**  
4. `useVisionJobMonitor`는 `uiStatus`를 latest run의 `completed`로 잡으면서, `error*`는 `runDoc ?? index ?? queue`로 합친다 → run에 오류가 없으면 **index의 stale 실패 문구를 그대로 빨간 배너에 표시**한다.

**PM 가설 확인:** “전체 Vision 분석 실패” 가능성은 낮다. **GEV 0(과거 실패) 메시지가 성공 완료 UI에 과도하게 남는 매핑/잔존 상태 문제**가 핵심이다.

---

## 3. Classification (A~E)

| ID | 의미 | 본 match 판정 |
|---|---|---|
| **A** | 실제 분석 Job FAILED | **과거 run만 Yes** (`14005e…`). **최신 run No** |
| **B** | 분석 완료 + GEV 0 | **No** — 최신 run `gevEventCount: 89` |
| **C** | GEV query/path mismatch | **No** — 최신 run `gevStatus: completed`, analysis·FII 존재. UI 문구는 과거 실패 path의 잔존 |
| **D** | stale error state | **Yes — Primary** (`visionMatchIndex.error*` + `media.visionLastError`) |
| **E** | UI status mapping 오류 | **Yes — Amplifier** (완료 + stale error 동시 표시) |

의도된 정책인가? **“no GEV → FAILED”는 당시 failed run에는 타당**했으나, **성공 완료 후에도 FAILED 카피를 현재 상태로 노출하는 것은 의도된 UX로 보기 어렵다.**

---

## 4. Production 저장 상태 (Fact)

### 4.1 `visionMatchIndex/{matchId}`

| Field | Value |
|---|---|
| status | `completed` |
| hasVision | `true` |
| pipelineStep | `done` |
| progress | `100` |
| mediaId | `e246e63c61fa48629b523962` |
| latestRunId / runId | `3e3daf4ba52c49b89b18ea44` |
| latestAnalysisId / analysisId | `anKy2SHYCVWWLqeGwOuN` |
| **errorCode** | **`VISION_ANALYSIS_FAILED`** ← stale |
| **errorMessage** | **`no GEV events: /tmp/.../gev_events.jsonl`** ← stale |

### 4.2 Latest `visionRuns/{runId}` = `3e3daf4ba52c49b89b18ea44`

| Field | Value |
|---|---|
| status | `completed` |
| pipelineStep | `done` |
| progress | `100` |
| gevStatus | `completed` |
| **gevEventCount** | **89** |
| analysisId | `anKy2SHYCVWWLqeGwOuN` |
| errorCode / errorMessage | **없음 (null)** |

### 4.3 Failed sibling run `14005e1260f84342b22bf06a`

| Field | Value |
|---|---|
| status | `failed` |
| gevStatus | `failed` |
| gevEventCount | `0` |
| errorCode | `VISION_ANALYSIS_FAILED` |
| errorMessage | `no GEV events: /tmp/.../gev_events.jsonl` |

(OPS KPI 분류에도 동일 run이 operational failure로 기록됨.)

### 4.4 `visionAnalysis` (match subcollection)

| Fact | Value |
|---|---|
| 문서 수 | **7** |
| Linked latest | `anKy2SHYCVWWLqeGwOuN` · run `3e3daf4…` · **playerFiiCount: 24** · error 없음 |
| 기타 | playerFii 24 문서 복수 · 일부 구버전 0/1건 |

### 4.5 `aiIngest/{mediaId}`

| Field | Value |
|---|---|
| visionStatus | `completed` |
| visionLastRunId | `3e3daf4ba52c49b89b18ea44` |
| visionLastAnalysisId | `anKy2SHYCVWWLqeGwOuN` |
| **visionLastError** | **동일 stale `no GEV events: /tmp/...`** (완료 merge가 필드를 지우지 않음) |

---

## 5. 오류 생성 Call Sites

### 5.1 `VISION_ANALYSIS_FAILED` (errorCode)

| Location | When |
|---|---|
| `functions/src/lib/academyVisionCore.ts` | worker `status !== "ok"` → `updateVisionRunStatus({ status: "failed", errorCode: "VISION_ANALYSIS_FAILED", errorMessage: worker.error })` |
| same file `catch` | unexpected exception → same errorCode + `message` |

타입 선언: `functions/src/lib/academyVisionTypes.ts`.

### 5.2 `no GEV events: <path>` (errorMessage)

| Fact | Note |
|---|---|
| Production 저장값 | failed run + index + media에 **동일 문자열** 존재 |
| 현재 workspace 소스 | exact literal `no GEV events:` **미검색** (과거 worker/engine 버전이 stdout `error`로 반환했을 가능성) |
| 현 worker 관련 | `academyVisionAnalyze.js` empty GEV → `gevStatus: "empty"` / reason `no-gev-events-detected` (하드 FAIL 카피와 별 경로) |
| FII empty copy | `fii_engine.py` — “No GEV events detected” (insight 문구, Job Monitor errorCode와 다름) |

→ **문구 본체는 과거 failed worker 응답이 CF를 통해 run/index에 기록된 것.** 현재 최신 run이 그 메시지를 새로 쓰지 않음.

### 5.3 UI render

| Layer | Path |
|---|---|
| Panel | `VisionJobMonitorPanel.tsx` — `job.errorMessage`면 rose 배너 · `[errorCode] message` |
| Hook merge | `useVisionJobMonitor.ts` L136–138: `runDoc?.error* ?? index?.error* ?? queue?.error*` |
| uiStatus | latest run `completed` → `"completed"` (오류와 독립) |
| Surfaces | Match Detail / Timeline / Coach section / Team Hub entry / Pilot Beta |

### 5.4 Index write that leaves stale errors

```216:217:functions/src/lib/academyVisionFirestore.ts
  if (params.errorCode) patch.errorCode = params.errorCode;
  if (params.errorMessage) patch.errorMessage = params.errorMessage;
```

`updateVisionRunStatus`는 완료 시 `errorCode: null`을 넘기지만, 위 `if`가 **null을 skip** → merge 잔존.

성공 시 media는 `visionStatus/visionLastRunId/...`만 set하고 **`visionLastError`를 delete하지 않음** (`academyVisionCore.ts` completed media patch).

---

## 6. PAI-012 Trend source vs Job Monitor source

| Surface | Data source | errorCode 의존? |
|---|---|---|
| **Trend (PAI-012)** | `visionMatchIndex`의 **completed** rows → `visionAnalysis.playerFii` rollup (`loadPreviousVisionAnalysesForTrend` / `matchFlowTrendFromPlayerFii`) | **No** — status/analysisId·hasVision 기준 |
| **Coach FII / Ranking** | Firestore `visionAnalysis` 또는 pilot `fii_summary` fixture (`useCoachVisionAnalysis` / `shouldUseFiiSummaryPilot`) | **No** |
| **Job Monitor** | index + latest `visionRuns` + upload queue · **error\* fallthrough to index** | **Yes — stale index error 노출** |

따라서 Trend·FII가 정상인데 Job Monitor만 FAILED로 보이는 현상과 **완전 정합**한다.

---

## 7. Impact

| Area | Impact |
|---|---|
| Severity | S3 (우회 가능 · 핵심 FII/Trend 비차단) — Incident 유지 |
| Trust | 완료(100%)와 FAILED 카피 **모순** → 운영자/코치 혼란 |
| Analytics | KPI에 과거 failed run은 이미 분류됨 · **현재 화면은 최신 성공을 실패처럼 오인**시킬 수 있음 |
| Re-analysis | 불필요 (최신 run·analysis·GEV 89 이미 존재) |
| Scope | 동일 패턴: 한 번 실패한 뒤 재시도 성공한 **다른 match의 index**에도 stale `error*` 가능 |

---

## 8. Minimal Fix 필요 여부

**Yes — Minimal Fix 권고 (구현은 PM GO 후).**

제안 (우선순위):

1. **Write path (CF):** `upsertVisionMatchIndex` — `status !== "failed"`일 때 `errorCode`/`errorMessage`를 `FieldValue.delete()` (또는 명시 null overwrite가 merge에서 동작하도록).  
2. **Write path (CF):** media completed 시 `visionLastError: FieldValue.delete()`.  
3. **Read path (UI, optional belt):** `useVisionJobMonitor` — `uiStatus === "completed"`(또는 latest run에 error 없음)이면 index/queue stale error를 표시하지 않음.

**비권고 (이번 트랙):** 재분석 · Production 문서 수동 scrub alone without write-path fix · Hosting/CF 범위 확대.

**Data scrub:** write-path 수정 후 필요 시 해당 match index/media stale 필드만 정리 — **별도 PM 승인**.

---

## 9. Deliverable Checklist

| Item | Result |
|---|---|
| Root Cause | **D + E** (stale index error + Job Monitor fallthrough). 최신 분석 실패 아님 |
| 실제 저장 상태 | index `completed` + stale errors; latest run `completed`; media `completed` + stale `visionLastError` |
| GEV count (latest) | **89** |
| analysis / job / run | analysis `anKy2SHYCVWWLqeGwOuN` · playerFii **24** · run **completed** |
| 오류 생성 call site | CF `academyVisionCore` FAILED 매핑 · 메시지는 과거 failed run worker error · index clear 누락 |
| UI mapping | `VisionJobMonitorPanel` ← `useVisionJobMonitor` error fallthrough |
| 영향 범위 | Job Monitor 카피 신뢰 · S3 · Trend/FII 비차단 |
| Minimal Fix 필요 | **Yes** (PM GO 대기) |

---

## 10. STOP

본 문서로 **Root Cause Review 완료.**  
**PM Review에서 STOP.**

- PASS / COMPLETE / CLOSED 선언하지 않음  
- 코드·데이터·재분석·Hosting/CF/Rules 변경 없음  
- PAI-011 / 012 / 013 / 014 / 032 · Day-03 DATE_GATE_PENDING · VOC-011×15 비변경

**Next (PM only):** GO → Minimal Fix 트랙 / NO-GO → 추가 조사 범위 지정
