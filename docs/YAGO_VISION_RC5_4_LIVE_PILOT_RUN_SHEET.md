# YAGO Vision RC5-4 — Live Pilot Run Sheet

**Date:** 2026-06-30  
**Status:** 📋 **OPS RUN** — INFRA READY 완료 후 실행  
**Operations Charter:** `YAGO_VISION_OPERATIONS_CHARTER_v1.md` 🔒  
**Operation Info:** `YAGO_VISION_RC5_4_OPERATION_INFO.md` (CONFIGURE_AT_OPS SoT)  
**Config SoT:** `data/vision/pilot/rc5_4_pilot_academy.json`  
**Hub:** `/teams/{teamId}/vision/pilot-beta`

> **목표:** 새 기능 없이 **실제 MP4 → Queue → Worker → Firestore → UI** + **VOC** + **운영 로그** 검증.  
> **PASS 🔒:** 아래 Gate 10/10 + `rc5_4_lock.json` → `liveBetaPass: true`.

---

## Pilot 성공 기준 (운영 KPI)

기술 PASS Gate 10/10과 **별도**로, Pilot #1 운영 성과를 아래 KPI로 평가합니다.  
Run Day 종료 후 `rc5_4_live_run_record.json` · `rc5_4_voc_summary.json` · Pilot Review에 실측값을 기록합니다.

| KPI | 목표 | 측정 방법 |
|-----|------|-----------|
| Report Open Rate | ≥ 80% | Parent Report URL 오픈 / 초대 Parent 수 |
| Coach 승인 평균 | ≤ 10분 | 업로드 완료 → Coach Dashboard·Match 확인 완료까지 |
| Parent 만족도 | ≥ 4.0 / 5.0 | Parent VOC 평균 (Pilot Beta Hub) |
| 재참여 의향 | ≥ 70% | Parent VOC 설문 또는 Pilot Review 인터뷰 |
| 시스템 성공률 | ≥ 95% | Live run 성공 건 / 시도 건 (`visionPilotOpsLog`) |

```text
⚠️ KPI 미달이어도 기술 Gate 10/10이면 rc5_4_lock PASS 가능.
   KPI는 RC5-5 운영 개선·베타 확대 판단의 기준선(baseline)으로 사용.
```

---

## 운영팀 역할 분담

| 역할 | 책임 |
|------|------|
| **PM** | Run Day 일정·체크리스트 진행, VOC·KPI 수집, Pilot Review·Action Item 정리 |
| **CTO** | Worker·CF·Firestore 파이프라인 가동 확인, 장애 시 기술 대응·Ops Log 검증 |
| **Coach** | 실 MP4 업로드, Coach UI·Timeline 확인, Coach VOC 입력 |
| **Parent** | Parent Report 확인, Parent VOC·재참여 의향 피드백 |
| **Support** | 현장 네트워크·계정·권한 지원, Run Sheet·체크리스트 기록 보조 |

---

## 사전 준비 (1회)

### A. Pilot Academy 정보 입력

`data/vision/pilot/rc5_4_pilot_academy.json` **및** `src/lib/vision/data/rc5_4_pilot_academy.json` (동기화) 에 실제 값 기입:

| 필드 | JSON 경로 | 예시 |
|------|-----------|------|
| teamId | `team.teamId` | `abc123team` |
| pilotName | `pilotName` | `○○아카데미 2026 봄 리그` |
| coachUid | `roles.coach.uid` | Firebase Auth uid |
| parentUid | `roles.parent.uid` | Firebase Auth uid |
| playerId | `roles.parent.playerId` | 자녀 playerProfiles id |
| matchId | `pilotMatchId` | 실경기 id 또는 신규 match doc id |

```text
⚠️ teamId / uid 는 ops run 전 반드시 CONFIGURE_AT_OPS → 실값 교체
```

### B. 환경 확인

- [ ] Cloud Functions 배포 (`submitVisionPilotFeedback`, `processVisionUploadQueue`, `startVisionAnalysis`)
- [ ] Vision Worker 가동 (`m2` · `rc3_1_phase_c`)
- [ ] Coach 계정: 해당 팀 staff 권한
- [ ] Parent 계정: guardian 링크 또는 pilot playerId

### C. Gate 스크립트 (인프라 회귀)

```powershell
python scripts/vision/rc5_4_pilot_beta_gate.py
python scripts/vision/rc5_3_job_monitor_gate.py
```

### D. Pre-Pilot Dry Run (권장 · 약 30분)

Live Pilot **전** 짧은 샘플 MP4로 권한·업로드·Job Monitor·Firestore를 1회 점검.  
체크리스트: `YAGO_VISION_RC5_4_PRE_PILOT_DRY_RUN.md` → **Go** 확인 후 Run Day 진행.

---

## Run Day — 7단계 체크리스트

### ① 실제 MP4 업로드

| # | 확인 | ✓ |
|---|------|---|
| 1 | `/teams/{teamId}/validation-console?matchId={matchId}` 접속 | |
| 2 | **Fixture 아님** — 실제 경기 MP4 선택 | |
| 3 | 경기(match) 선택 · 테스트 업로드 **OFF** | |
| 4 | 업로드 완료 · `visionQueueEnqueued` 응답 | |

**기록:** 업로드 시각 `____________` · mediaId `____________`

---

### ② Queue → Worker → Firestore

| # | 확인 | ✓ |
|---|------|---|
| 1 | `visionUploadQueue/{mediaId}` → `queued` → `processing` | |
| 2 | `visionRuns/{runId}` 생성 · status 진행 | |
| 3 | `visionMatchIndex/{matchId}` 동기 | |
| 4 | 완료 시 `visionAnalysis/{analysisId}` 저장 | |

**기록:** runId `____________` · analysisId `____________`

---

### ③ Job Monitor 단계

Pilot Beta Hub 또는 Coach Dashboard에서 단계 확인:

```text
upload → queued → tracking → gev → fii → persist → done
```

| # | 확인 | ✓ |
|---|------|---|
| 1 | progress% 증가 | |
| 2 | 최종 `done` / completed | |
| 3 | 실패 시 errorCode · 재시도 버튼 동작 | |

**기록:** 총 처리 시간 `______` ms · 성공/실패 `______`

---

### ④ Coach UI

| 화면 | URL | ✓ |
|------|-----|---|
| Coach Dashboard | `/teams/{teamId}/play?matchId={matchId}` | |
| Team FII / Match Summary | Coach 섹션 카드 | |
| Match Detail | `/teams/{teamId}/vision/match/{matchId}` | |
| Timeline | Match Detail `#vision-timeline` | |

---

### ⑤ Parent UI

| 화면 | URL | ✓ |
|------|-----|---|
| Parent Report | `/home/parent/vision/report?teamId=…&playerId=…&matchId=…` | |
| 성장 요약 / 하이라이트 | Parent 카드 표시 | |
| 추천 훈련 (있는 경우) | Parent insights | |

---

### ⑥ VOC 입력 (핵심)

Pilot Beta Hub (`/teams/{teamId}/vision/pilot-beta`) 또는 동일 폼:

| Persona | ★ (1~5) | 코멘트 요약 | ✓ |
|---------|---------|-------------|---|
| **Coach** | | | |
| **Parent** | | | |

Firestore: `teams/{teamId}/visionPilotVoc/{vocId}`

---

### ⑦ 운영 로그

Pilot Beta Hub → **운영 로그 요약** 또는 Firestore `visionPilotOpsLog`:

| 항목 | 기록 |
|------|------|
| pipelineElapsedMs | |
| success | true / false |
| errorCode | (없으면 —) |
| startedFrom | auto / manual / retry |
| retryCount | |

---

## RC5-4 PASS Gate (10/10)

| # | Gate | Run ✓ | Ops 서명 |
|---|------|:-----:|----------|
| 1 | 실제 MP4 업로드 | | |
| 2 | Queue 정상 동작 | | |
| 3 | Job Monitor 완료 (done) | | |
| 4 | Firestore 저장 | | |
| 5 | Coach UI 확인 | | |
| 6 | Parent UI 확인 | | |
| 7 | Timeline 확인 | | |
| 8 | 운영 로그 기록 | | |
| 9 | Coach VOC | | |
| 10 | Parent VOC | | |

**10/10 달성 시:**

1. `data/vision/pilot/rc5_4_live_run_record.json` 작성 (템플릿 사용)
2. `data/vision/pilot/rc5_4_voc_summary.json` 에 VOC 반영
3. `data/vision/gt/rc5_4_lock.json` → `liveBetaPass: true`, `verdict: PASS`, gates `live*` → `true`
4. `docs/YAGO_VISION_RC5_4_REPORT.md` 라이브 섹션 갱신
5. Manifest `rc5M4.verdict` → `PASS`

---

## 실패 시

| 증상 | 확인 |
|------|------|
| Queue stuck `queued` | client `processVisionUploadQueue` 호출 여부 · CF 로그 |
| Worker timeout | worker 가동 · storagePath |
| UI empty | Firestore `visionAnalysis` 존재 · fixture fallback (`VITE_VISION_FII_PILOT`) |
| Ops log 없음 | CF 배포 · matchId + non-test upload |

**재시도:** Job Monitor **재시도** 또는 Pilot Beta Hub에서 재실행.

---

## RC5-4에서 하지 않는 것

- GEV / FII 알고리즘 변경
- GT / Baseline / Report 수정
- `rc3_1_phase_c` preset 변경
- 신규 플랫폼 기능

---

## 다음: RC5-5

Live PASS 후 → **RC5-5 Production Operations** (서버 trigger 자동화 · 모니터링 · SLA).

Pilot Review 완료 후 Action Item은 `YAGO_VISION_RC5_4_PILOT_REVIEW.md`에 기록.  
Pilot #1 종료 시 `YAGO_VISION_RC5_PILOT1_EXECUTIVE_SUMMARY.md` (1페이지 요약) 작성.  
RC5 운영 SoT: `YAGO_VISION_RC5_OPS_DAILY_LOG.md` · `YAGO_VISION_RC5_OPS_KPI_DASHBOARD.md` · `YAGO_VISION_RC5_OPS_IMPROVEMENT_BACKLOG.md`

---

## Vision Product Roadmap (참고)

Pilot #1 이후 제품·운영 확장 경로. RC5-4 범위 밖 — **일정·범위 변경 없음**.

```text
Pilot #1  (RC5-4 Live Beta — 현재)
    ↓
Pilot #2  (추가 아카데미 · 운영 KPI 반복 검증)
    ↓
Pilot #3  (다종목·다경기 규모 확대)
    ↓
Federation Pilot  (협회 단위 운영 OS 연동)
    ↓
Commercial Beta  (유료·SLA·지원 체계)
    ↓
Official Launch
```
