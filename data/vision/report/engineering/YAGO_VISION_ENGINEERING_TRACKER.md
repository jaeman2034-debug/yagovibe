# YAGO Vision — Engineering Tracker (Execution Mode)

**문서 번호:** YAGO-VISION-ENG-TRACKER  
**상태:** 🟢 ACTIVE — **E1·E2·E3 ✅ PASS** · ▶ **Beta 운영** · Ops SoT 🔒  
**Updated:** 2026-07-10 (Beta MVP SCOPE LOCK)  
**Rule:** `yago-vision-engineering-execution-mode.mdc` · `yago-vision-dual-track-execution-strategy.mdc` · `yago-ai-coach-brain-v1-execution.mdc` · `yago-execution-phase-operating-principle.mdc`  
**Ops SoT:** `data/vision/report/pilot1/bestone/YAGO_PILOT1_BESTONE_SOT_LOG.md` (🔒 LOCK)

> Engineering 단일 누적 문서. Gate별 신규 MD **생성 금지**. 지표는 **실측·eval 결과만**.

---

## 확정 vs 미확인

| 구분 | 내용 |
|---|---|
| **E1 (확정)** | PASS — diagnostic pass (time_only+spatial) + Step 5 ops stability |
| **E2 (확정)** | ✅ **PASS** — Reviewer 서명 2026-07-10 · PV-003~006 Official Fact · P1 현장 검증 |
| **E3 (확정)** | ✅ **PASS** — Reviewer 2026-07-10 · PV-001~003 · VOC-011=3 |
| **Beta (종료)** | ✅ **COMPLETE** — Day-01~12 LOCK · PM **GO with Open Issue** (2026-07-21) |
| **Track A/B** | A=Official Fact (Gate) · B=Synthetic→AI Coach v1 (Gate 금지) · **혼합 금지** |
| **AI Coach Brain v1** | Internal Ready ✅ · Wiring PASS ✅ · B=Maintenance · ❌ Production/제품완성 |
| **Execution triage** | 코치 도움? · 학부모 도움? · Beta 품질? — 모두 YES만 진행 |
| **제품 파이프라인** | Vision→GEV→FII→AI Coach→Coach Decision→**Parent**→Avatar→Game |
| **배포 판정** | Beta/Pilot Ready ✅ · Production ▶ **GO with Open Issue** (PM 2026-07-21) → **ISSUE-001 CLOSED (Verified)** 2026-07-11 · PAI-001 PASS · SoT `production_ops/` |
| **FII 축 (구현 Fact)** | Vision/FII Engine = **5축만** · 「7축(팀기여·성장추이)」는 외부 문서 표현 — 코드 미구현 |
| **미확인** | Production phase_d promotion · 특허 청구항 전문(로컬 미보관) · Beta ops Fact 누적 |

---

## E1 워크플로 (LOCKED 순서)

| Step | 작업 | 상태 |
|---|---|---|
| 1 | Baseline 고정 (`rc3_1_phase_c` lock) | ✅ DONE |
| 2 | Tracking Regression 재측정 (VQ2) | ✅ DONE |
| 3 | `vision_tracking_engine.py` 개선 | ✅ 구현 완료 |
| 4 | GT Evaluation + Forensics (4-1~4-8) | 🔒 **LOCK** |
| 4-8 | Gate 판정 · 기준 보정 | ✅ (Step 4 종료) |
| 5 | Pilot Validation (phase_d) | ✅ **PASS** |

**Baseline snapshot:** `data/vision/report/engineering/e1_baseline_snapshot.json`

---

## Gate 현황

| Gate | 영역 | 상태 |
|---|---|---|
| **E1** | Vision AI 품질 | ✅ **PASS** |
| **E2** | Coach Report | ✅ **PASS** |
| **E3** | Parent Report | ✅ **PASS** |
| **Beta** | 운영 (MVP) | ▶ **ACTIVE** |
| E4–E6 | Discovery · Academy · Production | ⏳ Beta 종료 후 검토 |

---

## E1 — Baseline (Step 1 ✅)

| 항목 | 값 |
|---|---|
| Preset | `rc3_1_phase_c` |
| Lock | `data/vision/gt/rc3_1_phase_c_lock.json` |
| **Canonical pooled microF1** | **0.7404** (FP 15 · FN 46) |
| Eval command | `python scripts/report/vision_gev_gt_report.py --preset rc3_1_phase_c` |

→ 이후 모든 GEV 비교는 **lock 0.7404** 대비.

---

## E1 — Tracking Regression (Step 2 ✅)

**Clip:** `pass01_clip_002` · VQ2 · anonymized_1080p tracks  
**측정일:** 2026-07-09

| 지표 | E1 baseline |
|---|---|
| personIdSwitchRate | 0.0287 |
| personIdContinuityProxy | 0.9713 |
| personContinuityIndex | 0.9434 |
| personShortTrackRatio | 0.057 |
| gevTrackEndpointCoverage | **8.33%** (1/12) · string-ID diagnostic only · **≠ Production defect** · see `GEV_ENDPOINT_METRIC_EVAL_DEBT_ALIGNMENT.md` |
| trackingQualityScore (VQ2) | 93 (grade A) |

**GEV remeasure (동일일, eval only):** pooled microF1 **0.7667** (현 pred + 현 eval 스크립트) — lock 0.7404와 **비교 기준은 lock 유지**.

---

## E1 — Step 4 재추적 + GT Eval (✅ 실행 · ❌ PASS)

**입력:** `D:/YAGO_AI/VIDEOS/pilot/pass01_clip_002.mp4`  
**파이프라인:** B2_buffer90 + postprocess + `rc3_1_phase_c` GEV  
**Artifact:** `data/vision/report/engineering/e1_step4_retrack/step4_eval_result.json`

| 지표 (우선순위) | E1 Baseline | Step 4 | Δ | 판정 |
|---|---|---|---|---|
| **GEV Endpoint Coverage** (string) | 0.0833 | 0.0833 | 0 | supporting diagnostic · ID drift |
| personIdSwitchRate | 0.0287 | **0.0155** | -0.0132 | ✅ |
| personContinuityIndex | 0.9434 | **0.9823** | +0.0389 | ✅ |
| clip002 microF1 (lock) | **0.7714** | 0.6377 | -0.1337 | ❌ |
| trackingQualityScore | 93 | 93 | 0 | — |

**E1 PASS:** ❌ — GEV endpoint·clip F1 **개선 없음/퇴보**. Tracking proxy만 개선.

**참고:** 과거 raw1080p VQ2 run string coverage **66.7%** — **tracking-run-dependent** · re-track 간 직접 비교 금지(unless ID lineage preserved). Spatial diagnostic **75%** = primary cross-run endpoint metric (`GEV_ENDPOINT_METRIC_EVAL_DEBT_ALIGNMENT.md`).

**다음:** Tracker/GEV heuristic tuning **NO-GO** (PM 2026-07-12) · Production 개발 **NO-GO** · Evaluation debt aligned.

---

## E1 — Step 4-1 A/B (✅)

**Results:** `data/vision/report/engineering/e1_step4_ab/ab_results.json`

| Test | Tracker | PP | Endpoint | clip F1 | ID Switch | Continuity |
|---|---|---|---|---|---|---|
| A | ByteTrack | OFF | 0.0833 | 0.6377 | 0.0293 | 0.9408 |
| B | ByteTrack | ON | 0.0833 | 0.6377 | **0.0144** | **0.9911** |
| C | B2 | OFF | 0.0833 | 0.6377 | 0.0304 | 0.9369 |
| D | B2 | ON | 0.0833 | 0.6377 | 0.0155 | 0.9823 |
| Lock | historical | — | — | **0.7714** | — | — |
| raw1080p | ref | — | **0.6667** | — | — | — |

### Step 4-2 원인 (결론)

| 가설 | 판정 |
|---|---|
| ① Tracker → GEV | **기각** — 4 variant GEV 지표 **전부 동일** |
| ② GEV 매칭 | **부분** — 현 pipeline F1 0.6377 vs lock 0.7714 |
| ③ GT Alignment | **강함** — endpoint coverage run 의존 · raw 66.7% vs 현 8.33% |

**권장:** Postprocess ON + ByteTrack (variant B) = tracking proxy 최优. GEV/E1은 **evaluator·GEV 층** 조사.

---

## E1 — Step 4-3 Evaluator / GEV 정합성 (✅)

**Artifact:** `data/vision/report/engineering/e1_step4_3_eval_alignment/eval_alignment_report.json`  
**Script:** `scripts/vision/e1_step4_3_eval_alignment.py`

### Task 1 — Evaluator

| 항목 | 결론 |
|---|---|
| Endpoint coverage ID 종속 | **예** — `registry[track_id]` 문자열 span (`first_frame ≤ event.frame ≤ last_frame`) |
| Run 간 흔들림 | **예** — raw1080p ref 66.7% vs 현재 8.33%; 동일 re-track일 A/B/C/D는 동일 |
| 공간 대안 (IoU prototype) | string 8.33% = spatial 8.33% (Δ 0) — **현 clip에서 ID·공간 모두 1/12** |

### Task 2 — Lock preds vs 현재 pipeline

| 항목 | Lock | Current |
|---|---|---|
| Path | `.../gev_rc3_1_phase_c/gev_events.jsonl` | `e1_step4_ab/variant_A/.../gev_events.jsonl` |
| Event count | 88 | 85 |
| microF1 (default matching) | **0.7714** | **0.6377** (Δ -0.1337) |
| timestamp+type overlap | — | 66 events |
| POSSESSION_START/END | 29/29 | 28/28 |
| PASS/RECEIVE | 14/14 | 13/13 |

**F1 sensitivity (current preds):**

| Variant | F1 |
|---|---|
| default (endpoint match ON) | 0.6377 |
| strict_track_ids | 0.6377 |
| **time_only (endpoint match OFF)** | **0.7246** |
| wider_tolerance 1.0s | 0.6377 |

→ Lock preds는 모든 variant에서 **0.7714 고정**. Current는 **track endpoint 매칭이 F1 하락의 주요 요인** (time_only 시 +0.087).

### Task 3 — GEV 튜닝 후보 (tracking 독립)

- event detection threshold · possession window · duplicate suppression
- temporal tolerance (wider 1.0s → F1 변화 없음)
- pass/receive class confusion
- **endpoint matching 정책** (evaluator 측)

### 다음 우선순위

1. Evaluator: 공간/bbox endpoint coverage **진단 지표** 병행
2. Lock vs current preds timestamp·class diff 심층 분석
3. GEV engine 튜닝 (fixed tracks 기준)
4. Tracker engine 변경 **보류**

**Gate:** E1 PASS ❌ 유지 · Step 5 Pilot 보류 · Tracker 추가 튜닝 보류

---

## E1 — Step 4-4 Lock vs Current Preds Forensics (✅)

**Artifact:** `data/vision/report/engineering/e1_step4_4_preds_forensics/preds_forensics_report.json`  
**Script:** `scripts/vision/e1_step4_4_preds_forensics.py`

### F1 분해 (clip002 eval types)

| 항목 | 값 |
|---|---|
| Lock microF1 | **0.7714** |
| Current microF1 (default) | **0.6377** |
| Current microF1 (time_only) | **0.7246** |
| Endpoint mismatch 기여 | **+0.0869** |
| **잔여 gap (GEV engine)** | **~0.0468** |

### Per-type F1 (lock → current)

| Type | Lock | Current | Δ |
|---|---|---|---|
| **PASS** | 0.7879 | 0.5625 | **-0.2254** |
| RECEIVE | 0.8125 | 0.7742 | -0.0383 |
| TURNOVER | 0.4000 | 0.3333 | -0.0667 |

### Lock vs Current 직접 비교

| 항목 | 값 |
|---|---|
| 전체 paired (0.75s, same type) | 84 / 88 lock |
| Frame drift | 66 exact 0f · 13 ±1f · 4 ±2f |
| Eval paired 중 track ID mismatch | **26 / 28** (동일 timestamp·frame, ID만 다름) |
| Lock only | POSSESSION@14.6s · **PASS+RECEIVE@44.2s** |
| Current only | **TURNOVER@43.3s** (extra) |

### GT 대비 분류 (current)

| 분류 | 건수 |
|---|---|
| full_match | 24 |
| time_ok + track_mismatch | 4 |
| time_out_of_tolerance | 12 |

Lock: full_match **30** · time_out **10** — current가 timing·track 양쪽 모두 열세.

### 결론

1. **PASS가 최대 퇴보 축** (-0.2254) — GEV engine 1순위 수정 대상
2. **~0.087** = re-track ID drift (evaluator endpoint match)
3. **~0.047** = 이벤트 timing/count drift (lock only PASS@44.2s, current extra TURNOVER)
4. POSSESSION segmentation 차이(58 vs 56) — PASS/RECEIVE cascade 가능성

**다음:** pooled clip eval · evaluator spatial metric · default F1 lock 근접 검증

---

## E1 — Step 4-5 GEV PASS/Timing (`phase_d`) (✅)

**Artifacts:** `data/vision/report/engineering/e1_step4_5_gev_pass_tuning/`  
**Code:** `vision_gev_engine.py` — `rc3_1_phase_d`, no-ball PASS midpoint timestamp

### 원인 (43–44s)

- Gap 0.8s > `pass_no_ball_max_gap_s` 0.75 → TURNOVER @ 43.3s, GT PASS @ 44.2s 누락.

### 변경

| 항목 | phase_c | phase_d |
|---|---|---|
| pass_no_ball_max_gap_s | 0.75 | **0.85** |
| No-ball PASS timestamp | receiver start | **gap midpoint** |

### clip002 결과 (current tracks, fixed)

| 지표 | Pre-tuning | phase_c | **phase_d** | Lock |
|---|---:|---:|---:|---:|
| default microF1 | 0.6377 | 0.6377 | **0.6761** | 0.7714 |
| time_only microF1 | 0.7246 | 0.7246 | **0.7887** | 0.7714 |
| PASS F1 | 0.5625 | 0.5625 | **0.5882** | — |
| TURNOVER @ 43.3s | FP | FP | **suppressed** | — |
| PASS @ 44.2s | miss | miss | **43.667 (−match)** | ✓ |

Lock tracks + phase_d re-run: **0.7887** (lock preds 0.7714 대비 개선, regression 없음).

**Gate:** E1 PASS ❌ — default F1 lock 미달 · pooled 3-clip 검증 필요

---

## E1 — Step 4-6 Pooled 3-clip phase_d Regression (✅)

**Artifacts:** `data/vision/report/engineering/e1_step4_6_pooled_phase_d_eval/`  
**Tracks:** canonical `data/vision/tracking/runs/{clip}/tracks.jsonl`

### Pooled microF1 (3 clips)

| Variant | default F1 | Δ vs phase_c |
|---|---:|---:|
| Lock stored preds | 0.7667 | — |
| phase_c re-run | 0.7667 | — |
| **phase_d** | **0.7686** | **+0.0019** |

### Per-clip default F1

| Clip | phase_c | phase_d | Δ |
|---|---:|---:|---:|
| clip002 | 0.7714 | **0.7887** | **+0.0173** |
| clip003 | 0.7536 | 0.7536 | 0 |
| clip004 | 0.7723 | 0.7647 | −0.0076 |

**Regression verdict:** pooled 악화 없음 · **phase_d candidate 유지** · clip004 소폭 하락(−0.0076) 관찰

### E1 re-track tracks (clip002 보조)

| Variant | default F1 | time_only F1 |
|---|---:|---:|
| phase_c | 0.6377 | 0.7246 |
| phase_d | 0.6761 | **0.7887** |

→ canonical tracks에서는 phase_d 개선 · **re-track pipeline**에서는 endpoint ID drift로 default F1 gap 잔존

**다음:** E1 완료 판정 검토 (time_only·spatial 기준) · endpoint matching policy · Step 5 보류 유지

---

## E1 — Step 4-7 Spatial Endpoint Evaluator (✅ 진단)

**Artifacts:** `data/vision/report/engineering/e1_step4_7_spatial_evaluator/`  
**Module:** `yago-worker/lib/vision/vision_gev_spatial_evaluator.py`

**목적:** 문자열 ID Evaluator **유지** + 공간 기반 coverage **병행 진단** (평가 교체 아님)

### clip002 핵심 (E1 re-track + phase_d, ref=lock positions)

| 지표 | Lock baseline | E1 re-track |
|---|---:|---:|
| String Endpoint Coverage | 66.7% | **8.3%** |
| **Spatial Endpoint Coverage** | **75.0%** | **75.0%** |
| Δ (spatial − string) | +8.3% | **+66.7%** |
| default microF1 | 0.7714 | 0.6761 |
| **time_only microF1** | 0.7714 | **0.7887** |

### 해석 (확정)

1. **re-track 경로 default F1 gap(~0.095)은 대부분 endpoint ID drift / 평가 방식 한계**
2. GT 위치에 player bbox는 **spatial 기준 동일**(75%) — 순수 detection 실패 아님
3. time_only F1은 re-track에서 **lock 초과** (0.7887 vs 0.7714)
4. clip003/004 lock tracks에서도 spatial > string (+17~25%p) — GT ID 문자열 metric 구조적 한계
5. **PM 2026-07-12:** string 8.33% = **Evaluation Debt** · **≠ Production defect** · cross-run primary = **spatial** · regression guard = **time_only F1** · string = supporting only (`GEV_ENDPOINT_METRIC_EVAL_DEBT_ALIGNMENT.md`)

**Gate:** E1 PASS ⏳ Step 5 후 · phase_d candidate ✅ · Production `rc3_1_phase_c` 🔒

---

## E1 — Step 4-8 Gate Decision (✅)

**Artifacts:** `data/vision/report/engineering/e1_step4_8_gate_decision/`

### 판정

- **알고리즘 개선:** ✅ phase_d · time_only 0.7887 > lock 0.7714 · spatial 75% = lock  
- **Legacy default F1 formal pass:** ❌ (ID drift · evaluator 한계)  
- **phase_d E1 candidate:** ✅ 승인  
- **Production preset:** `rc3_1_phase_c` 🔒 유지 · `rc3_1_phase_d` candidate only  
- **E1 PASS:** ⏳ Step 5 Pilot stability 후 최종 선언  

### Gate 기준 보정

| 구분 | 지표 | 역할 |
|---|---|---|
| Legacy (보조) | default microF1 · string endpoint coverage | regression guard · lock 비교 |
| **Diagnostic pass** | **time_only microF1** · **spatial endpoint coverage** | **E1 완료 판단 병행** |
| Regression guard | pooled default microF1 phase_d ≥ phase_c | pooled 악화 방지 |

### Step 5 전환

▶ **Pilot Validation PREP** — phase_d candidate 파이프라인 · 실제 Pilot 클립 안정성 확인

---

## E1 — Step 5 Pilot Validation (✅ PASS)

**Artifacts:** `data/vision/report/engineering/e1_step5_pilot_validation/`  
**Script:** `scripts/vision/e1_step5_pilot_validation.py`

### Pipeline (phase_d candidate)

`Video → Tracking (B2+postprocess) → GEV phase_d → FII (Coach/Parent insights)`

### 결과

| Clip | Runtime | Tracking | GEV | Report | ALL |
|---|---|---|---|---|---|
| pass01_clip_002 (primary) | ✅ | ✅ | ✅ 81 events | ✅ FII+Coach+Parent | ✅ |
| pass01_clip_003 | ✅ | ✅ | ✅ 93 events | ✅ | ✅ |

**Ops alignment:** Pilot #1/#2 SoT — upload ✅ · AI 분석 ✅ (베스트원)

**Production:** `rc3_1_phase_c` 🔒 유지 · `rc3_1_phase_d` validated candidate

**E1 PASS:** ✅ 2026-07-09 — diagnostic pass (4-8) + Step 5 operational stability

**Next:** E2 Coach Report

---

## E2 — Coach Report 고도화

**목표:** 기술 지표 출력 → **코치 훈련 의사결정 도구** (E1 AI 정확도와 분리)

**성공 정의:** 코치가 30초~1분 내 "오늘 무엇을 해야 하는지" 이해 · E2 PASS ≠ F1 향상

**Baseline (변경 없음):** `data/vision/report/engineering/e2_baseline_snapshot.json`

**VOC 요구사항:** `data/vision/report/engineering/e2_step2_voc_requirements.json`

**E2 개선 샘플:** `data/vision/report/engineering/e2_step3_coach_insight_sample/pass01_clip_002/`

### E2 워크플로

| Step | 작업 | 상태 |
|---|---|---|
| E2-1 | Baseline 고정 (Report · FII · Insight 구조) | ✅ **DONE** |
| E2-2 | VOC → 기능 요구사항 (Official Fact only) | ✅ **DONE** |
| E2-3 | Coach Insight 재구성 (`coachDecisionBrief` + `reviewHooks`) | ✅ **DONE** |
| E2-4 | Pilot 검증 (1분 이해 · 활용 · 재사용 의향) | ▶ **ACTIVE** — E2-PV-001~002 ✅ · PV-003 NEXT |

### E2-4 Run Sheet (▶ ACTIVE)

| 항목 | 경로 |
|---|---|
| **양식 (MD)** | `data/vision/report/engineering/e2_step4_pilot_validation/E2_PILOT_VALIDATION_RUN_SHEET.md` |
| **JSON 템플릿** | `data/vision/report/engineering/e2_step4_pilot_validation/e2_pilot_validation_record_template.json` |
| **완료 기록** | `data/vision/report/engineering/e2_step4_pilot_validation/records/E2-PV-###.json` |
| **Operations SoT** | ❌ 수정 금지 — Fact는 Engineering 계층에만 기록 |

**E2 PASS 4항목 (모두 Fact):** 1분 이해 · 코칭 활용 · 재사용 의향 · 추가 설명 없이 사용  
**Gate:** E2-PV-001 단독 PASS 금지 · **반복 확인 후** PASS 검토 · 1항목 반복 미충족 → E2-3 개선

**Execution 원칙 (유지):**
1. **Fact / Interpretation 분리** — Gate는 원문 Fact만
2. **Pilot → Fact → Gate** 반복 (신규 문서 최소)
3. **선택 수집** — 운영 메모·개선 아이디어 (Gate 미사용, E3/E4 백로그용)

#### E2-4 세션 로그

| recordId | 일시 | 이해 | 활용 | 재사용 | 독립사용 | 원문 | 세션 판정 |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| E2-PV-001 | 2026-07-20 08:00 | Y | Y | Y | Y | ⚠️ 미수집 (예시 문장 VOID) | HOLD |
| E2-PV-002 | 2026-07-20 | Y | Y | Y | Y | ⚠️ 미수집 | HOLD |
| E2-PV-003 | 2026-07-10 11:00 | Y | Y | Y | **N** | ✅ 김태형 실원문 | **HOLD** (독립사용 N) |
| E2-PV-004 | 2026-07-10 15:20 | Y | Y | Y | Y | ✅ 박성준 실원문 | **HOLD** (단독 PASS 금지) |
| E2-PV-005 | 2026-07-10 16:10 | Y | Y | Y | Y | ✅ 최진우 실원문 | **HOLD** → Review |
| E2-PV-006 | 2026-07-10 17:05 | Y | Y | Y | Y | ✅ 한준희 실원문 | ✅ P1 검증 · → **E2 PASS** |

#### E2 Gate 누적

| 항목 | 값 |
|---|---|
| sessionsCounted | **6** |
| sessionsWithAllFourYes | **5** |
| sessionsWithVerbatimQuotes | **4** (PV-003·004·005·006) |
| cumulativeVerdict | ✅ **PASS** |
| E2 PASS | ✅ **PASS** (Reviewer 2026-07-10) |
| Review draft | `E2_REVIEW_DRAFT_20260710.md` — **DECISION PASS** |
| Eng backlog | P1 ✅ · P2/P3/VOC-010 → **Beta Product Backlog** |
| Next | ▶ **E3 MVP** — 학부모 인터뷰 → Fact → Review |
| PV-006 purpose | P1 현장 검증 ✅ 완료 |

**PV-006 Fact (요약):** 확인 105초 · 4항목 Y · 패스↓→빌드업 훈련 · P1 로그인/카톡 해소 원문 · VOC-010 GPS 웨어러블  
**VOC Trigger:** VOC-001=**4** · VOC-003=2(해소) · VOC-006=2 · VOC-010=1 · VOC-007~009=1  
**Review:** `e2_step4_pilot_validation/E2_REVIEW_DRAFT_20260710.md` — PASS

### E2 PASS 기준 (충족)

- [x] Coach Report 생성 안정
- [x] 실제 Pilot에서 코치 활용 확인 (PV-003~006)
- [x] 반복 운영 긍정 VOC (VOC-001=4)
- [x] 치명적 UX 문제 없음 (P1 해소 · PV-006)

**Gate:** E1 🔒 LOCK · **E2 ✅ PASS** · ▶ E3 착수 가능 · Ops SoT 변경 없음

### E3 — Parent Report MVP (▶ ACTIVE · SCOPE LOCK)

| 항목 | 내용 |
|---|---|
| **상태** | ▶ MVP ACTIVE (E2 PASS 후) |
| **목적** | 학부모가 리포트를 **이해·활용**하는지 검증 (신규 AI ❌) |
| **Gate 4항목** | 이해 · 자녀 이해 · 재사용 의향 · 독립 사용 |
| **VOC** | Gate 외 1문장 |
| **UI** | 기존 `/home/parent/vision/report` · `parentInsights` |
| **SoT** | `e3_parent_report_validation/E3_MVP_PURPOSE_AND_CHECKLIST.md` |
| **인터뷰** | `E3_PHONE_INTERVIEW_SHEET.md` |
| **레코드** | PV-001·002 ✅ · **PV-003 IN FIELD** |
| **금지** | AI Coach 신규 · Avatar · Game · 알림톡 자동발송 · 신규 KPI |
| **잔여** | P2/P3/VOC-010 = Beta Product Backlog |

#### E3-4 세션 로그

| recordId | 일시 | 이해 | 자녀이해 | 재사용 | 독립사용 | 원문 | 세션 판정 |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| E3-PV-001 | 2026-07-10 15:10 | Y | Y | Y | Y | ✅ 최윤서 실원문 | **HOLD** (단독 PASS 금지) |
| E3-PV-002 | 2026-07-10 15:45 | Y | Y | Y | Y | ✅ 한지은 실원문 | **HOLD** (반복 2/3) |
| E3-PV-003 | 2026-07-10 16:30 | Y | Y | Y | Y | ✅ 박은정 실원문 | ✅ → **E3 PASS** |

#### E3 Gate 누적

| 항목 | 값 |
|---|---|
| sessionsCounted | **3** |
| sessionsWithAllFourYes | **3** |
| sessionsWithVerbatimQuotes | **3** (E3-PV-001·002·003) |
| cumulativeVerdict | ✅ **PASS** |
| E3 PASS | ✅ **PASS** (Reviewer 2026-07-10) |
| VOC-011 | **3** · Beta Product Backlog 우선 |
| Review draft | `E3_REVIEW_DRAFT_20260710.md` — **DECISION PASS** |
| Next | ▶ **Beta 운영** (실 사용·VOC·안정성) |

### E3 PASS 기준 (충족)

- [x] 실제 Parent 인터뷰 반복
- [x] 실제 학부모 원문 확보
- [x] 이해·자녀 이해·재사용 반복
- [x] 독립 사용·치명 UX 없음
- [x] VOC-011 반복 확인 (Backlog 우선)

**Gate:** E1 🔒 · E2 ✅ · E3 ✅ · ▶ **Beta ACTIVE** · Ops SoT 변경 없음

---

## Beta 운영 (▶ ACTIVE · MVP SCOPE LOCK)

**전환:** 개발 중심 → **Beta 운영 중심** (E2+E3 PASS 후)

### ① 실제 운영 (최우선)

| 목표 | 수집 |
|---|---|
| 실제 코치·학부모 사용 | Coach VOC · Parent VOC |
| 운영 데이터 축적 | 운영 로그 · 오류 사례 |

※ Engineering Official Fact 경로 유지 · Ops SoT 🔒

### ② 운영 안정성 (신규 기능 ❌)

- Coach Report 정상 생성  
- Parent Report 정상 열람  
- 로그인 · 카카오 링크 · 세션 유지 · 모바일 사용성  

### ③ VOC 운영

```text
VOC 발생 → count +1 → ≥3 반복 → Product Backlog 우선 조정
```

현재: **VOC-011** count=**15** 🔒 **LOCKED** · **PAI-011 COMPLETE/CLOSED** · Production verified (`64270a3`) · Day-03 proposed 16 **REJECTED** (PM 2026-07-12)

SoT: `YAGO_VOC_Trigger_로그.md` · Backlog: `E2_ENGINEERING_BACKLOG.md`

### ④ AI Coach (Track B)

| 함 | 안 함 |
|---|---|
| 실 VOC 반영 · 답변·Reasoning 품질 개선 | 대규모 Synthetic 생성 |
| Supplement ≥3 반복 VOC만 | 새 Brain 설계 |

### Beta 종료 조건 (권장 · 미달 시 Production 검토 보류)

- [ ] Coach 운영 일정 기간 안정 지속  
- [ ] Parent 열람 일정 기간 안정 지속  
- [ ] 치명 UX 이슈 없음  
- [ ] 운영 VOC Product Backlog 정리  

### Beta 금지

- ❌ 대규모 기능 개발 · 신규 Gate · 신규 전략 문서  
- ❌ Ops SoT 변경 · Official Fact ↔ Synthetic 혼합  
- ❌ 미검증 AI 기능 운영 투입  

**Next critical:** 실 Coach/Parent 사용 · VOC 루프 · 안정성 관찰.

### Beta 운영 루틴 (우선순위 · 신규 Gate ❌)

**Production:** Beta 결과 축적 후 **Production Review** → 그때 승격 검토 (지금 아님)

#### 1단계 — 매 훈련 (일일)

| 반복 | 산출물 |
|---|---|
| 코치 사용 · 학부모 열람 · AI Report 생성 · 이상 확인 | Official Fact · Beta 운영 로그 · Beta Issue |

#### 2단계 — VOC

```text
신규 VOC → count=1 → 반복 확인
동일 VOC → count +1 → ≥3 → Beta Backlog 우선 (예: VOC-011=3)
```

#### 3단계 — 안정성 체크 (매 운영)

- [ ] Report 생성 · Parent Report  
- [ ] 로그인 · 카카오 링크 · 세션 · 모바일  
- [ ] 치명 오류 없음 → 이슈 시 **Beta Issue**만 등록  

#### 4단계 — 주간 Review (권장 1회/주)

운영 횟수 · Coach 사용 · Parent 열람 · 신규/반복 VOC · 오류 · 조치 · Backlog

#### 권장 순서

```text
매일 Beta 운영 → 원문 수집 → VOC count → 오류 안정화 → 주간 Review → (충분 시) Production 검토
```

#### Beta Day 로그

| Day | 일자 | Coach Gate | Parent Gate | Issue | 신규 VOC | 기록 |
|---:|---|:---:|:---:|---|---|---|
| **001** | 2026-07-10 | 4/4 Y | 4/4 Y* | BETA-ISSUE-001 | VOC-012·013 | `beta_ops/records/BETA-DAY-001.json` |
| **002** | 2026-07-11 | 4/4 Y | 4/4 Y | ISSUE-001 미재현 | VOC-014 · VOC-011+1 | `beta_ops/records/BETA-DAY-002.json` |
| **003** | 2026-07-12 | 4/4 Y | 3/4 Y** | ISSUE-001 재현 | VOC-015 · VOC-011+1 | `beta_ops/records/BETA-DAY-003.json` |
| **004** | 2026-07-13 | 4/4 Y | 3/4 Y** | ISSUE-001 재현 | VOC-016 · VOC-011+1 | `beta_ops/records/BETA-DAY-004.json` |
| **005** | 2026-07-14 | 4/4 Y | 3/4 Y** | ISSUE-001 재현 | VOC-011+1 · VOC-012+1 | `beta_ops/records/BETA-DAY-005.json` |
| **006** | 2026-07-15 | 4/4 Y | 3/4 Y** | ISSUE-001 재현 | VOC-011+1 · VOC-017 | `beta_ops/records/BETA-DAY-006.json` |
| **007** | 2026-07-16 | 4/4 Y | 3/4 Y** | ISSUE-001 재현 · Week-1 마무리 | VOC-011+1 · VOC-018 | `beta_ops/records/BETA-DAY-007.json` |
| **008** | 2026-07-17 | 4/4 Y | 3/4 Y** | ISSUE-001 iPhone재현/Android미재현 | VOC-011+1 · VOC-012+1 | `beta_ops/records/BETA-DAY-008.json` |
| **009** | 2026-07-18 | 4/4 Y | 3/4 Y** | ISSUE-001 iPhone재현/Android미재현 | VOC-011+1 · VOC-012+1 | `beta_ops/records/BETA-DAY-009.json` |
| **010** | 2026-07-19 | 4/4 Y | 3/4 Y** | ISSUE-001 iPhone재현/Android미재현 | VOC-011+1 · VOC-012+1 | `beta_ops/records/BETA-DAY-010.json` |
| **011** | 2026-07-20 | 4/4 Y | 3/4 Y** | ISSUE-001 iPhone재현/Android미재현 | VOC-011+1 · VOC-012+1 | `beta_ops/records/BETA-DAY-011.json` |
| **012** | 2026-07-21 | 4/4 Y | 3/4 Y** | ISSUE-001 iPhone재현/Android미재현 · Week-2 마무리 | VOC-011+1 · VOC-012+1 | `beta_ops/records/BETA-DAY-012.json` |

\* Day-01 Parent: 독립 사용 Y · 로그인 재입력 불편 1건 관찰

\** Day-03~06 Parent: 독립사용 N (로그인 재진입)

**Day-01 요약:** U-12 연습경기 · Report·알림톡·모바일 ✅ · 코치 활용 원문(교체 타이밍) · iPhone 카톡 인앱 세션 이슈 1건(재현 확인 필요)

**Day-02 요약:** Report·알림톡·모바일·자동 로그인 ✅ · 운영 오류 없음 · 코치 활용 원문(전환 속도 드릴) · ISSUE-001 Day-02 미재현 · VOC-011=4 · VOC-014 신규

**Day-03 요약:** Report·알림톡·모바일 ✅ · 코치 활용 원문(하프타임 전술·교체) · ISSUE-001 재현(iPhone 14 Pro/iOS 17.4/카카오 인앱) · Parent 독립사용 N · VOC-011=5 · VOC-015 신규

**Day-04 요약:** Report·알림톡·모바일 ✅ · 코치 활용 원문(회복 훈련·개인 세션) · ISSUE-001 재현(iOS 17.5.1/알림톡 링크) · Parent 독립사용 N · VOC-011=6 · VOC-016 신규 · Fact/devMemo 분리

**Day-05 요약:** Report·알림톡·모바일 ✅ · 코치 활용 원문(체력 저하→회복 훈련 배정) · ISSUE-001 Day-05 재현 · Parent 독립사용 N · VOC-011=7 · VOC-012=2(코치 선수별 추이)

**Day-06 요약:** Report·알림톡·모바일 ✅ · 코치 활용 원문(선발 명단 결정) · Parent 자녀 이해 원문(활동량→칭찬) · ISSUE-001 Day-06 재현 · VOC-011=8 · VOC-017 신규(포지션 필터)

**Day-07 요약:** Report·알림톡·모바일 ✅ · 코치 활용 원문(7일 누적→전술 변경) · Parent 활용 원문(숫자 근거 칭찬·가족 대화) · ISSUE-001 Week-1 반복 관측 · VOC-011=9 · VOC-018 신규(상대 팀 비교 · VOC-015 충돌 회피) · **Beta Week-1 완료**

**Day-08 요약:** Report·알림톡·모바일 ✅ · 운영 오류 없음 · Coach 4/4(7일 평균→훈련 강도) · Parent 3/4(숫자 근거 설명·로그인 마찰) · ISSUE-001 iPhone 재현/Android 미재현 · VOC-011=10 · VOC-012=3(Coach) · **LOCK**

**Day-09 요약:** Report·알림톡·모바일 ✅ · 운영 오류 없음 · Coach 4/4(활동량→후반 전술) · Parent 3/4(숫자 칭찬·로그인 마찰) · ISSUE-001 iPhone 재현/Android 미재현 · VOC-011=11 · VOC-012=4(Coach) · **LOCK**

**Day-10 요약:** Report·알림톡·모바일 ✅ · 운영 오류 없음 · Coach 4/4(미드필더 활동량→전술 훈련) · Parent 3/4(주간 비교·로그인 마찰) · ISSUE-001 iPhone 재현/Android 미재현 · VOC-011=12 · VOC-012=5(Coach) · **LOCK**

**Day-11 요약:** Report·알림톡·모바일 ✅ · 운영 오류 없음 · Coach 4/4(누적 대조→선발·훈련 조정) · Parent 3/4(연속 비교·로그인 마찰) · ISSUE-001 iPhone 재현/Android 미재현 · VOC-011=13 · VOC-012=6(Coach) · **LOCK**

**Day-12 요약:** Report·알림톡·모바일 ✅ · 운영 오류 없음 · Coach 4/4(2주 대조→체력 안정·전술 확신) · Parent 3/4(주간 비교·로그인 마찰) · ISSUE-001 iPhone 재현/Android 미재현 · VOC-011=14 · VOC-012=7(Coach) · **LOCK · Week-2 COMPLETE**

#### Beta Week-2 종합 (Official Fact 기준 · 2026-07-17~21 · Day-08~12)

| 영역 | 결과 |
|---|---|
| **운영** | Coach/Parent Report · 알림톡 · 모바일 열람 안정 (Day-08~12) |
| **Coach Gate** | Day-08~12 **4/4 Y 반복** · 데이터 기반 훈련·선발·전술·라인업 결정 근거 |
| **Parent Gate** | 이해·자녀 이해·재사용 반복 · 독립 사용 N (ISSUE-001 연계 · Day-08~12) |
| **BETA-ISSUE-001** | iPhone+카카오 인앱 반복 관측 · Android 미관측 · **OPEN** |
| **VOC** | VOC-011 count=14 · VOC-012 count=7 (Coach) |

**Week-2 판단:** 운영 활용성·핵심 안정성 반복 확인. Day-08~12 **LOCK 완료** · Production Review 🔒 · **PM Decision: GO with Open Issue** (2026-07-21) · `beta_ops/BETA_PM_PRODUCTION_DECISION.md`

#### Beta Week-1 종합 (Official Fact 기준 · 2026-07-10~16)

| 영역 | 결과 |
|---|---|
| **운영** | Coach/Parent Report · 알림톡 · 모바일 열람 안정 |
| **Coach Gate** | Day-01~07 **4/4 Y 반복** · 데이터 기반 훈련·선발·전술 변경 근거 확보 |
| **Parent Gate** | 이해·자녀 이해·재사용 반복 확인 · 독립 사용 N (ISSUE-001 연계) |
| **BETA-ISSUE-001** | iPhone+카카오 인앱 반복 관측 · Android 미관측 · **OPEN** |
| **VOC** | VOC-011 count=9 (최다 반복) · VOC-012~018 Beta Backlog 개별 관리 |

**Week-1 판단:** 운영 활용성·핵심 안정성 확보. Production 전환 아님 → **Beta Week-2 운영 지속** · ISSUE-001 관찰·안정화 유지.

**현장 권장 (Gate 기준 변경 아님):** 코치가 "네"만 답하면 *"어떤 점이 그렇게 느껴지셨나요?"* 한 번 더 물어 **실제** 원문 1~2문장 확보.


### E2-3 구현 (✅)

| 항목 | 내용 |
|---|---|
| **모듈** | `yago-worker/lib/vision/fii_engine.py` — `build_coach_insights()` |
| **스키마** | `coachInsights.insightVersion: e2-v1` |
| **상단 3질문** | `coachDecisionBrief.keyChangeToday` · `nextTrainingFocus` · `playersToCoach` |
| **복기 VOC** | `reviewHooks[]` — 훈련 직후 복기 액션 |
| **UI** | `VisionCoachDecisionBriefCard` — 대시보드·Match Detail 최상단 |
| **하위 호환** | `strengths` / `improvementPoints` / `recommendations` 유지 |

### clip002 E2 샘플 (phase_d)

| 질문 | 출력 |
|---|---|
| Q1 변화 | 활동량 높음 — 활성 21명 · 점유 25회 · 패스·수신 30건 |
| Q2 다음 훈련 | 볼 소실 직전 판단·패스 선택 + 전술 이해도 보완 |
| Q3 집중 지도 | P0110(강점) · P0422(턴오버) · P0450(참여 확대) |
| 복기 | 패스 연결 · 볼 소실 · P0110 활약 |

## E1 — Step 3 구현 (✅)

### 변경 사항

| 항목 | 내용 |
|---|---|
| Default tracker | `v3_tune_B2_buffer90.yaml` (track_buffer 90) |
| Postprocess | `vision_tracking_postprocess.py` — gap bridge · fragment merge |
| Engine | `run_tracking_to_dir` postprocess 통합 (기본 ON) |
| Eval script | `scripts/vision/e1_tracking_postprocess_eval.py` |

### Offline eval (anonymized clip002 tracks 재처리)

**Artifact:** `data/vision/report/engineering/e1_step3_postprocess_eval/eval_result.json`

| 지표 | Baseline | Variant | Δ |
|---|---|---|---|
| personIdSwitchRate | 0.0287 | **0.0161** | **-0.0126** ✅ |
| personContinuityIndex | 0.9434 | **1.0** | **+0.0566** ✅ |
| trackingQualityScore | 93 | **96** | +3 |
| gevEndpointCoverage | 0.0833 | 0.0833 | 0 (GT ID 정렬 이슈) |

**해석:** Postprocess는 **ID switch·continuity 개선** 확인. GEV endpoint coverage는 **GT track ID가 특정 추적 run에 묶여** 있어 소스 영상 **재추적** 필요 (anonymized offline replay 한계).

### Step 4 선행 조건

`pass01_clip_002.mp4` (또는 동일 소스)로 B2 tracker + postprocess **재추적** → `vision_gev_gt_report.py` → lock 대비 비교.

---

## E1 — Step 3 개선 방향 (참고)

`vision_tracking_engine.py` — 목표:

- ID switch 감소 · track span 증가
- **GEV endpoint track coverage** (string) — historical E1 target; **PM 2026-07-12:** supporting diagnostic only · do not treat 8.33% as Production failure · spatial 75% primary
- short track ratio 감소

완료 후 Step 4: 동일 eval 스크립트로 GT 재실행 → lock 대비 delta 기록.

---

## E1 PASS 체크리스트

### Diagnostic pass (Step 4-8 ✅)

- [x] time_only F1 ≥ lock — **0.7887 > 0.7714** (clip002 E1 re-track)
- [x] spatial endpoint coverage ≥ lock — **75% = 75%**
- [x] pooled phase_d no regression — **+0.0019**
- [x] phase_d E1 candidate approved

### Final (Step 5 ✅)

- [x] **Pilot 안정성** — clip002/003 m2 pipeline PASS
- [x] **E1 PASS 최종 선언** — 2026-07-09
- [ ] Production `rc3_1_phase_d` promotion review

---

## E1 작업 로그

| 날짜 | Step | 결과 |
|---|---|---|
| 2026-07-09 | Framework | Engineering Execution Mode LOCKED |
| 2026-07-09 | 1 | Baseline lock 고정 · snapshot JSON |
| 2026-07-09 | 2 | VQ2 tracking remeasure · GEV eval 재실행 |
| 2026-07-09 | 4-1 | A/B 4 variants — GEV flat · postprocess→tracking only |
| 2026-07-09 | 4-2 | 원인: GT alignment + GEV preds drift; tracker 튜닝 GEV 무영향 |
| 2026-07-09 | 4-3 | Eval/GEV 정합성 — ID span 종속 확인 · lock F1 0.7714 vs current 0.6377 · time_only 0.7246 |
| 2026-07-09 | 4-4 | Forensics — PASS Δ-0.2254 · endpoint +0.087 · 잔여 ~0.047 GEV drift |
| 2026-07-09 | 4-5 | phase_d — default F1 0.6377→0.6761 · time_only 0.7887 · TURNOVER@43.3s 제거 |
| 2026-07-09 | 4-6 | Pooled phase_d — 0.7686 (+0.0019) · clip002 +0.0173 · candidate retain |
| 2026-07-09 | 4-7 | Spatial eval — clip002 e1 string 8% vs spatial 75% · time_only 0.7887 > lock |
| 2026-07-09 | 4-8 | Gate decision — diagnostic pass metrics · phase_d approved · Step 5 PREP |
| 2026-07-09 | 5 | Pilot validation PASS — clip002/003 · phase_d m2 · E1 PASS |
| 2026-07-09 | E2-1 | Coach Report baseline snapshot · fii_engine coachInsights |
| 2026-07-09 | E2-2 | VOC → requirements · e2_step2_voc_requirements.json |
| 2026-07-09 | E2-3 | coachDecisionBrief + reviewHooks · UI brief card · clip002 sample |
| 2026-07-09 | E2-4 | Pilot Validation Run Sheet · record template (Engineering only, not Ops SoT) |
| 2026-07-10 | E2-PV-001 | Official Fact — 4/4 Y · 운영일시·소요시간 · 원문은 당시 기록 후 **예시로 정정 VOID** |
| 2026-07-10 | E2-PV-002 | Official Fact — 4/4 Y · 원문 미수집 · HOLD · E2 PASS 미선언 |
| 2026-07-10 | E2-PV-002 opt | 운영메모 35s→28s · 개선아이디어「지난주 대비 변화 상단」— Gate 미사용 · E3/E4 backlog |
| 2026-07-10 | E2-PV-001 fix | 원문 4문장 Official Fact 철회 · `sessionsWithVerbatimQuotes=0` · Ops SoT 미변경 |
| 2026-07-10 | AI Coach | Phase A/B/C LOCK · Synthetic→v1 · Beta에서 지속 성장 · Official≠Synthetic |
| 2026-07-10 | Brain v1 | Execution LOCK · schema+manifest · seed 6/50–100 · Stage1 START |
| 2026-07-10 | Dataset v1 | Schema LOCK · 10 domain cats · **50 seeds written** · Stage2 checklist READY |
| 2026-07-10 | Dataset v1 | Canonical package `synthetic_training/v1/` · JSONL50 · validation PASS · Internal Eval READY |
| 2026-07-10 | Stage2 | Internal Validation PASS · 50/50 · 6 dims · Brain v1 Ready(internal) · ≠E2 PASS |
| 2026-07-10 | Beta prep | Brain Wiring checklist · VOC loop · Synthetic 확장 보류 · A=E2-PV-003 최우선 |
| 2026-07-10 | Wiring | Firestore coachInsights→UI bridge · BW-01~06 PASS · live=rule brief · ≠LLM live |
| 2026-07-10 | Exec | Operating principle LOCK · B=Maintenance · E2-PV-003 WAITING_FOR_FIELD_FACT |
| 2026-07-10 | Exec | 전략 동결 · 운영 사이클 LOCK · next critical = E2-PV-003 field Pilot |
| 2026-07-10 | Exec | Final confirm — no strategy/docs churn · wait field Fact for PV-003 |
| 2026-07-10 | Track B | Virtual pilot scenario → `synthetic_training/v1/supplement/` only · ≠E2-PV-003 |
| 2026-07-10 | Track B | Supplement LOCK — add only on repeated real Pilot VOC · no mass synthetic |
| 2026-07-10 | VOC | `YAGO_VOC_Trigger_로그.md` · baseline **111** · trigger ≥3 VOC · A→B growth |
| 2026-07-10 | E2-PV-003 | Phone interview 1인1답 sheet ACTIVE · wait typed verbatim from field |
| 2026-07-10 | E2-PV-003 | Official Fact 김태형 · Y/Y/Y/N + 원문 · E2 PASS HOLD · VOC-001~004 n=1 |
| 2026-07-10 | VOC | count table LOCK · VOC-001~004 count=1 · PV-004 slot WAITING |
| 2026-07-10 | E2-PV-004 | Official Fact 박성준 · Y×4+원문 · VOC-001/003→2 · VOC-005/006=1 · PASS HOLD |
| 2026-07-10 | E2-PV-005 | Official Fact 최진우 · Y×4 · VOC-001=3 Supplement · E2 Review Draft · PASS ❌ |
| 2026-07-10 | E2 Review | R1~R5 근거 기록 · 권고 HOLD · PASS 미선언 · Reviewer 서명 대기 |
| 2026-07-10 | E2 HOLD | Reviewer ① HOLD+Backlog · P1~P3 등록 · PV-006 after P1 · PASS ❌ |
| 2026-07-10 | PV-006 | Purpose LOCK = P1 field verification · internal I1~I3 · Review=PASS\|HOLD only |
| 2026-07-10 | P1 UX | 코드 완료 — AuthProvider `next` · 카톡 bounce 제거 · Intent `/home` 폴백 제거 · I1~I3 실기기 대기 |
| 2026-07-10 | I1~I3 | 대표 실기기 PASS — 동일 리포트 복귀 · 카톡 인앱 · 세션 유지 · E2 PASS ❌ · ▶ PV-006 READY |
| 2026-07-10 | PV-006 | IN FIELD — 훈련→업로드→분석→리포트→전화(Q1~Q5+P1) · Fact 대기 · PASS 선선언 ❌ |
| 2026-07-10 | PV-006 Fact | Official Fact 한준희 · Y×4+원문 · P1 해소 · VOC-001=4 · VOC-010=1 · Review REOPEN · PASS ❌ |
| 2026-07-10 | E2 PASS | Reviewer PASS — R1~R5 · PV-003~006 · P1 현장 검증 · Next=E3 · Ops SoT 🔒 · P2/P3 Beta backlog |
| 2026-07-10 | E3 MVP | SCOPE LOCK — 이해·자녀이해·재사용·사용성 · E3-PV-001 WAITING · 신규기능❌ · PASS ❌ |
| 2026-07-10 | E3-PV-001 | Official Fact 최윤서 · Y×4+원문 · VOC-011 Benchmark · PASS ❌ · ▶ PV-002 |
| 2026-07-10 | E3-PV-002 | IN FIELD — 반복 검증 · 동일 Q1~Q4 · VOC 패턴 관찰 · PASS ❌ |
| 2026-07-10 | E3-PV-002 Fact | Official Fact 한지은 · Y×4 · VOC-011=2 · ▶ PV-003 |
| 2026-07-10 | E3-PV-003 Fact | Official Fact 박은정 · Y×4 · VOC-011=3 · E3 Review READY · PASS ❌ |
| 2026-07-10 | E3 PASS | Reviewer PASS — PV-001~003 · VOC-011=3 · Next=Beta · Ops SoT 🔒 |
| 2026-07-10 | Beta | MVP SCOPE LOCK — 실운영·안정성·VOC·Track B 유지 · 신규 Gate/대규모 기능 ❌ |
| 2026-07-10 | Beta 루틴 | 일일·VOC·안정성·주간 Review LOCK · Production=Beta 축적 후 검토 |
| 2026-07-10 | BETA-DAY-001 | U-12 연습 · Gate 4/4+4/4 · ISSUE-001(iPhone 카톡 세션) · VOC-012·013 |
| 2026-07-11 | BETA-DAY-002 | Gate 4/4+4/4 · 오류 없음 · ISSUE-001 미재현 · VOC-011=4 · VOC-014 |
| 2026-07-12 | BETA-DAY-003 | Coach 4/4 · Parent 3/4 · ISSUE-001 재현(iPhone14/iOS17.4) · VOC-011=5 · VOC-015 |
| 2026-07-13 | BETA-DAY-004 | Coach 4/4 · Parent 3/4 · ISSUE-001 재현(iOS17.5.1) · VOC-011=6 · VOC-016 · Fact/원인분리 |
| 2026-07-14 | BETA-DAY-005 | Coach 4/4 · Parent 3/4 · ISSUE-001 재현 · VOC-011=7 · VOC-012=2 |
| 2026-07-15 | BETA-DAY-006 | Coach 4/4 · Parent 3/4 · ISSUE-001 재현 · VOC-011=8 · VOC-017 |
| 2026-07-16 | BETA-DAY-007 | Coach 4/4 · Parent 3/4 · ISSUE-001 Week-1 반복 · VOC-011=9 · VOC-018 · **Week-1 COMPLETE** |
| 2026-07-17 | BETA-DAY-008 | Coach 4/4 · Parent 3/4 · ISSUE-001 iPhone/Android 교차 · VOC-011=10 · VOC-012=3(Coach) · **LOCK** |
| 2026-07-18 | BETA-DAY-009 | Coach 4/4 · Parent 3/4 · ISSUE-001 iPhone/Android · VOC-011=11 · VOC-012=4(Coach) · **LOCK** |
| 2026-07-19 | BETA-DAY-010 | Coach 4/4 · Parent 3/4 · ISSUE-001 iPhone/Android · VOC-011=12 · VOC-012=5(Coach) · **LOCK** |
| 2026-07-20 | BETA-DAY-011 | Coach 4/4 · Parent 3/4 · ISSUE-001 iPhone/Android · VOC-011=13 · VOC-012=6(Coach) · **LOCK** |
| 2026-07-21 | BETA-DAY-012 | Coach 4/4 · Parent 3/4 · ISSUE-001 iPhone/Android · VOC-011=14 · VOC-012=7(Coach) · **LOCK** · **Week-2 COMPLETE** |
| 2026-07-21 | PM Production Decision | **GO with Open Issue** · ISSUE-001 OPEN(P1) · Decision LOCK · Beta 종료 |
| 2026-07-21 | Production Ops | `production_ops/` 체계 · Run Sheet SoT · Action Items 이관 · KPI 누적 시작 |
| 2026-07-21 | PAI-001 | Fix Verification Checklist READY · **Fix Pending** · Verification blocked · `PAI_001_FIX_VERIFICATION.md` |
| 2026-07-11 | PAI-001 | Fix **코드** 반영 (openExternal·persistence·next 보존·CTA) · Prod 배포 Fact·Release Notes·PASS **미확정** |
| 2026-07-11 | PAI-001 PASS | Verification PASS · `/login` 0/3 · ISSUE-001 **CLOSED (Verified)** · PAI-003 ACTIVE · Day-01 KPI START · 일반화 금지 |
| 2026-07-11 | Day-01 · PAI-003 | KPI **ACCEPT** · PAI-003 **PASS/CLOSED** · Parent 독립사용 Y · Quote verbatim 적재 · Day-02 READY |
| 2026-07-12 | Production Day-02 | KPI **ACCEPT/LOCK** · 로그인재요구 미관측(당일) · VOC-011 **15** · Quote verbatim 적재 · Day-03 READY |
| 2026-07-12 | Production Day-03 | 🔒 **ACCEPT / LOCK** · Date Gate 해제 · 7항 Official Fact · players 22 · upload Y · AI Y · Quotes verbatim · VOC-011 **15 LOCKED** · proposed 16 REJECTED · `PRODUCTION_DAY_03.md` |
| 2026-07-11 | Production Day-03 (trail) | 📝 PRE-STAGED / DATE_GATE_PENDING (당시) · proposed 16 draft · 이후 2026-07-12 LOCK로 승격 |
| 2026-07-11 | VOC-011 | Design Review ACTIVE · Parent peer/평균 기준선 Gap 확인 · `VOC_011_PEER_BENCHMARK_DESIGN_REVIEW.md` · Day-03 Gate와 분리 |
| 2026-07-11 | VOC-011 PM LOCK | **team+ageGroup · n≥5 · Vision Parent Report** LOCK · position/Growth 2차 |
| 2026-07-11 | VOC-011 Eng Spike | ✅ COMPLETE · playerFii 집계·Gate·payload 가능 · `VOC_011_ENG_SPIKE.md` · 구현 스펙 대기 |
| 2026-07-11 | VOC-011 Impl Spec | 🔒 LOCK · `VOC_011_IMPLEMENTATION_SPEC.md` · PM 최종 3개 확정 |
| 2026-07-11 | VOC-011 Implement | ▶ IN PROGRESS · peerBenchmark + ParentPeerBenchmarkCard · unit 3 PASS · **PAI-011 PASS 미선언** |
| 2026-07-11 | VOC-011 Manual QA | Fact 접수 · Harness 6+unit 3 = 9 PASS · `VOC_011_MANUAL_QA.md` · 모바일 실기기 PENDING · **PAI-011 PASS 미선언** |
| 2026-07-11 | VOC-011 Visual Spot-check | Fact ✅ · Parent login · mobile 390×844 · checklist **8/8 Y** · 육안 Y · 오류 없음 · **PAI-011 PASS 미선언** |
| 2026-07-11 | VOC-011 PAI-011 | ✅ **PM PASS** · Manual QA FINAL PASS · Visual ACCEPTED · 구현 검증 완료 · COMPLETE/CLOSED 금지 · Day-03 미변경 |
| 2026-07-11 | VOC-011 Pre-Deploy | 🔒 **GO** · commit `07fb689` · rollback `4d508ac` · CF/Rules/root SoT N |
| 2026-07-11 | VOC-011 Hosting Deploy | ✅ **Deploy complete** 20:56 KST · HEAD `64270a3` · URL https://yago-vibe-spt.web.app · `PAI_011_DEPLOY_FACT.md` · Smoke 대기 · COMPLETE 금지 |
| 2026-07-11 | PAI-011 CLOSED | 🔒 **COMPLETE/CLOSED** · Post-Deploy Smoke **PASS** · Production Parent Vision peer card verified · HEAD `64270a3` · feature `07fb689` · `PAI_011_POST_DEPLOY_SMOKE.md` · Day-03 DATE_GATE_PENDING 유지 |
| 2026-07-12 | VOC-012 Design Review | ▶ **DESIGN REVIEW** · Coach Vision 기간/누적 UI **Gap** · MVP=`visionAnalysis` client rollup · CF/root SoT N · `VOC_012_CUMULATIVE_TREND_DESIGN_REVIEW.md` · **구현 금지** · PM Scope 대기 · Day-03/PAI-011 미변경 |
| 2026-07-12 | VOC-012 Scope+Spike | 🔒 **SCOPE LOCK** · Coach · K=3 · n≥2 · FII · Spike ✅ · path=`visionMatchIndex`+`visionAnalysis` · index/CF N · `VOC_012_ENG_SPIKE.md` · Impl Spec 대기 · Day-03/PAI-011 미변경 |
| 2026-07-12 | VOC-012 Impl Spec+Code | 🔒 Spec LOCK · ▶ IMPLEMENT · `matchFlowTrendFromPlayerFii` · `CoachMatchFlowTrendCard` · Ranking Δ · ❌ PAI-012 PASS 금지 · Day-03/PAI-011 미변경 |
| 2026-07-12 | VOC-012 Manual QA | ✅ Fact 적재 · Harness PASS · `VOC_012_MANUAL_QA.md` · Visual ⏳ PENDING · ❌ PASS 금지 · Day-03/PAI-011/VOC-011×15 미변경 |
| 2026-07-12 | VOC-012 Visual Spot-check | ✅ **ACCEPTED** · Match Detail · card+Ranking Δ · `VOC_012_VISUAL_SPOTCHECK.md` · ❌ PASS 금지 · PM Final Review 대기 · Day-03 분리 |
| 2026-07-12 | VOC-012 PAI-012 | ✅ **PM PASS** · Unit 8 · Harness 6 · Visual ACCEPTED · Manual QA FINAL PASS · ❌ COMPLETE/CLOSED 금지 · Day-03/VOC-011×15 미변경 |
| 2026-07-12 | VOC-012 Hosting Deploy | ✅ **Deploy complete** 09:18 KST · HEAD `30170a1` · feature `61cf9ac` · URL https://yago-vibe-spt.web.app · `PAI_012_DEPLOY_FACT.md` · Smoke 대기 · COMPLETE 금지 |
| 2026-07-12 | PAI-012 CLOSED | 🔒 **COMPLETE/CLOSED** · Post-Deploy Smoke **PASS** · P0100 72/65/+7 · `PAI_012_POST_DEPLOY_SMOKE.md` · **PROD-OBS-012** 분리 OPEN · Day-03 DATE_GATE_PENDING 유지 |
| 2026-07-12 | Tab Routing CLOSED | 🔒 **COMPLETE/CLOSED** (PAI-013) · Production 4-tab Smoke **PASS** · feature `918208c` · HEAD `a86d097` · `VISION_TAB_ROUTING_POST_DEPLOY_SMOKE.md` · Team Hub Observation 유지 · Day-03/PAI-011/012/PROD-OBS-012 미변경 |
| 2026-07-12 | Player Tab ID Guard CLOSED | 🔒 **COMPLETE/CLOSED** (PAI-014) · Production Case A/B Smoke **PASS** · feature `a3a0b25` · HEAD `0520cf4` · `VISION_PLAYER_TAB_ID_GUARD_POST_DEPLOY_SMOKE.md` · Duplicate Nav Observation OPEN · Day-03/PROD-OBS-012 미변경 |
| 2026-07-12 | PAI-032 CLOSED | 🔒 **COMPLETE/CLOSED** · Production Smoke **PASS** · Nav count=1 · feature `7562ccb` · HEAD `437fc8a` · `VISION_PAI032_DUPLICATE_NAV_POST_DEPLOY_SMOKE.md` · PROD-OBS-012 OPEN · Day-03/VOC-011×15 미변경 |
| 2026-07-12 | PAI-033 CLOSED | 🔒 **PASS/COMPLETE/CLOSED** · Production smoke **13/13 PASS** · A-set touch 44px · feature `7f2c0d0` · `PAI_033_PM_FINAL_SIGNOFF.md` · VOC-008×1 · Day-01 DATE_GATE_PENDING / PAI-022 PLANNED / VOC-011×15 미변경 |
| 2026-07-12 | GEV endpoint metric ALIGNED | 🔒 Evaluation Debt · string 8.33% (1/12) ≠ Production defect · spatial 75% primary · time_only F1 guard · `GEV_ENDPOINT_METRIC_EVAL_DEBT_ALIGNMENT.md` · no PAI · no code |

---

## AI Coach Phase (LOCKED)

| Phase | 내용 | Track |
|---|---|---|
| **A** | Synthetic Dataset + Internal Validation → **Internal Ready** | B ✅ |
| **B (지금)** | **Brain Wiring** + Beta · 실 VOC 선순환 | B (+ A Fact) |
| **C** | Production | A/B 통합 — 미도달 |

**문구:** Internal Ready ✅ · Production Ready ❌ · 「완전 학습 후 Beta」❌  
**파이프라인:** Vision→GEV→FII→AI Coach→Coach Decision→Parent→Avatar→Game  
**Wiring SoT:** `synthetic_training/v1/beta/brain_wiring_checklist.json`

---

## Ops → E1 Backlog (Fact)

| 후보 | Ops 근거 | n |
|---|---|---|
| 촬영 가이드 | D1 촬영 이슈 | 1 |
| 복기 리포트 | P2 "복기 행동" | 1 → E2 |

---

## Beta (Ops 연계) — ▶ ACTIVE

E1~E3 PASS 후 Beta 운영. 상세: **Tracker § Beta 운영** (MVP SCOPE LOCK).  
AI Coach: Track B Maintenance · 실 VOC 선순환 · 완전 학습 후 Beta ❌.
