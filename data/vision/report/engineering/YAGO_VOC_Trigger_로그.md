# YAGO VOC Trigger 로그

**계층:** Engineering · Track A → Track B 성장 트리거  
**상태:** 🔒 LOCK  
**Updated:** 2026-07-12

> ❌ Operations SoT 아님 · ❌ Official Fact 아님 · ❌ Engineering Gate 근거 아님  
> Brain Ready / Wiring PASS 판정은 **이 문서가 아니라** 로컬 산출물로만 한다.  
> - Brain: `synthetic_training/v1/stage2/internal_validation_report.json`  
> - Wiring: `synthetic_training/v1/beta/brain_wiring_checklist.json`

---

## Synthetic Dataset 기준선 (LOCK)

| 항목 | 값 |
|---|---|
| **운영 기준 건수** | **111** (고정) |
| **신규 대량 Synthetic 생성** | 🚫 **보류** — 111로 운영 |
| **부족분 채우기 생성** | 🚫 금지 |

### 로컬 인벤토리 (Fact · 2026-07-10)

| 경로 | 건수 | 비고 |
|---|---:|---|
| `synthetic_training/v1/synthetic_ai_coach_seed_v1.jsonl` | 50 | Canonical seed |
| `synthetic_training/scenarios/v1/*.json` | 50 | Domain seed (병렬 포맷) |
| `synthetic_training/scenarios/v1_legacy_interaction/*.json` | 6 | Legacy (SoT 아님) |
| `synthetic_training/v1/supplement/*.jsonl` | 3 | Supplement |
| **합계 (가산)** | **109** | |
| **문서 기준선 LOCK** | **111** | 대량 생성으로 맞추지 않음 |

---

## 성장 구조 (LOCK)

```text
Track A 가 Track B 를 성장시킨다 (역방향 금지)

E2-PV-003 실제 Pilot
        ↓
Official Fact 기록
        ↓
VOC Trigger 로그 갱신 (본 문서)
        ↓
반복 패턴 확인
        ↓
(동일·유사 VOC 3회 이상)
Track B Supplement 추가
```

**VOC가 먼저, Synthetic은 나중.**

---

## Supplement 트리거 (LOCK)

Track B `supplement/` 신규 생성 조건 — **모두** 충족:

1. 실제 Pilot / 실제 코치·학부모 VOC  
2. **동일·유사 VOC가 3회 이상** 반복  
3. Official Fact / Gate에 쓰지 않음 (Track B only)  
4. `notForGate: true` · Synthetic 라벨 유지  

3회 미만 · 가상 일회성 · 대량 선제 추가 → **금지**.

---

## Track A 최우선

| 항목 | 상태 |
|---|---|
| E2-PV-003 | ✅ `OFFICIAL_FACT_RECORDED` (2026-07-10 · 김태형) |
| E2-PV-004 | ✅ `OFFICIAL_FACT_RECORDED` (2026-07-10 · 박성준) |
| E2-PV-005 | ✅ `OFFICIAL_FACT_RECORDED` (2026-07-10 · 최진우) |
| E2-PV-006 | ✅ `OFFICIAL_FACT_RECORDED` (2026-07-10 · 한준희 · P1 검증) |
| E3-PV-001 | ✅ `OFFICIAL_FACT_RECORDED` (2026-07-10 · 최윤서) |
| E3-PV-002 | ✅ `OFFICIAL_FACT_RECORDED` (2026-07-10 · 한지은) |
| E3-PV-003 | ✅ `OFFICIAL_FACT_RECORDED` (2026-07-10 · 박은정) |
| Official Fact | 현장만 · 전략/문서 추가 금지 |
| E2 PASS | ✅ PASS (Reviewer 2026-07-10) |
| E3 PASS | ✅ PASS (Reviewer 2026-07-10) |
| Beta | ▶ 운영 준비 |

---

## VOC 패턴 · 반복 횟수 (count)

같은 취지 의견이 나오면 **count만 +1**.  
**count ≥ 3** 일 때만 Track B `supplement/` 후보 → 생성 검토.

| VOC ID | VOC 패턴 | count | 세션 이력 | 분류 | Supplement? |
|---|---|---:|---|---|---|
| VOC-001 | 데이터 기반 코칭 (감 → 데이터) | **4** | PV-003·004·005·006 | value | ✅ **생성** `SYN-ACB-V1-PLC-008` (count≥3 시) |
| VOC-002 | 학부모 상담 자료 활용 (출력·공유) | **1** | PV-003 | E3 signal | ❌ |
| VOC-003 | 로그인/접속 UX (카톡 인앱·로그인 화면) | **2** | PV-003·004 (PV-005·006 재현 없음 · P1 현장 해소) | usability | ❌ · P1 현장 검증됨 |
| VOC-004 | 훈련 가이드 / 드릴 영상 추천 요청 | **1** | PV-003 | product | ❌ |
| VOC-005 | 하프타임 실시간 리포트 요약 → 후반 전술 | **1** | PV-004 | product | ❌ |
| VOC-006 | 누적 데이터 활용 (라인업·체력 사이클) | **2** | PV-004·005 | product | ❌ |
| VOC-007 | 연령별 기준값(심박수 등) 설명 | **1** | PV-005 | product | ❌ |
| VOC-008 | 모바일 버튼 터치 영역 | **1** | PV-005 | usability | ❌ · eng backlog |
| VOC-009 | 코치 승인 후 카카오 알림톡 자동 발송 | **1** | PV-005 | product / E3 | ❌ |
| VOC-010 | GPS/웨어러블 원탭 연동 → 자동 리포트 | **1** | PV-006 | product / long-term | ❌ |
| VOC-011 | Parent 리포트 또래/포지션 평균 비교 (Benchmark) | **15** | E3-PV-001·002·003·BETA-DAY-002~012 · **Production Day-02 Parent** | product / E3 | ✅ **PAI-011 COMPLETE/CLOSED** (Production verified) · count **15 LOCKED** · Day-03 Official Fact **ACCEPT/LOCK** · proposed 16 **REJECTED** (로그인 마찰 신규 Fact 없음) |
| VOC-012 | 성장·기간 추이 비교 시각화 (Parent 지난주 대비 · Coach 선수별 누적) | **7** | BETA-DAY-001·005·008~012 | product / E3 | ✅ **PAI-012 COMPLETE/CLOSED** (Production verified) · count **7** 유지 · PROD-OBS-012 분리 · Day-03 gate 분리 |
| VOC-013 | Coach 리포트 히스토리 모아보기 | **1** | BETA-DAY-001 | product | ❌ · 관찰 |
| VOC-014 | Coach 오늘의 MVP · 베스트11 추천 | **1** | BETA-DAY-002 | product | ❌ · 관찰 |
| VOC-015 | Coach 팀 대시보드 (Team Dashboard) | **1** | BETA-DAY-003 | product | ❌ · 관찰 |
| VOC-016 | Coach 기간별 PDF 다운로드 | **1** | BETA-DAY-004 | product | ❌ · 관찰 |
| VOC-017 | Coach 포지션별 데이터 필터링 | **1** | BETA-DAY-006 | product | ❌ · 관찰 |
| VOC-018 | Coach 상대 팀 비교 분석 | **1** | BETA-DAY-007 | product | ❌ · 관찰 |

### 원문 앵커 (Official Fact · records 전문 참조)

| VOC ID | 세션 | 대표 원문 |
|---|---|---|
| VOC-001 | PV-003 | "맨날 감으로만 하다가 숫자로 보니까 애들 설득하기도 편하대요." |
| VOC-001 | PV-004 | "리포트 수치를 보여주니까 애들도 군말 없이 수긍하대요." |
| VOC-001 | PV-005 | "윙백 고강도 주행 거리가 짧게 나와서… 애들이 바로 납득하고…" |
| VOC-001 | PV-006 | "패스 성공률 떨어진 거 보고 압박 탈출이랑 빌드업 훈련 비중을 더 늘렸습니다." |
| VOC-002 | PV-003 | "학부모들 상담할 때 이거 출력해서 보여주면 끝날 것 같아서요." |
| VOC-003 | PV-003 | "모바일 카카오톡 브라우저에서… 화면이 튕기더라고요." |
| VOC-003 | PV-004 | "로그인 화면이 먼저 나오더라고요. 자동 로그인이 유지됐으면 좋겠어요." |
| VOC-003 | PV-005 | "로그인 끊김은 이번에는 없었습니다." *(재현 없음 — count 유지)* |
| VOC-003 | PV-006 | "이번엔 로그인 전혀 안 불편했습니다." / "카톡으로 바로 확인할 수 있었습니다." *(P1 해소 — count 유지)* |
| VOC-004 | PV-003 | "추천 훈련 가이드나 드릴 영상 링크가 리포트 맨 밑에…" |
| VOC-005 | PV-004 | "하프타임 때 리포트가 바로 요약돼서…" |
| VOC-006 | PV-004 | "누적된 데이터가 있으면 라인업 짤 때…" |
| VOC-006 | PV-005 | "훈련 세션별 데이터가 누적되면 체력 사이클 관리에…" |
| VOC-007 | PV-005 | "심박수 그래프는 퍼센트만 있어서… 나이대 기준… 어려웠습니다." |
| VOC-008 | PV-005 | "상세 보기 버튼 터치 영역이 좁았습니다." |
| VOC-009 | PV-005 | "학부모나 선수에게 카카오 알림톡으로 자동 발송되면…" |
| VOC-010 | PV-006 | "GPS Tracker(웨어러블) 데이터를 코치 앱에서 버튼 한 번으로 연동해 자동으로 리포트가 생성되면 좋겠습니다." |
| VOC-011 | E3-PV-001 | "같은 학년(또는 같은 포지션) 평균 수치도 같이 표시되면 좋겠습니다." |
| VOC-011 | E3-PV-002 | "팀 평균선이나 또래 평균 수치가 같이 표시되면 좋겠습니다." |
| VOC-011 | E3-PV-003 | "또래 평균 기준선이 같이 표시되면 좋겠습니다." |
| VOC-012 | BETA-DAY-001 | "지난주와 비교한 성장 그래프" |
| VOC-013 | BETA-DAY-001 | "리포트 히스토리 모아보기" |
| VOC-011 | BETA-DAY-002 | "U-12 평균선" |
| VOC-014 | BETA-DAY-002 | "오늘의 MVP" / "베스트11 추천" |
| VOC-011 | BETA-DAY-003 | "U-12 평균선" |
| VOC-015 | BETA-DAY-003 | "팀 대시보드" |
| VOC-011 | BETA-DAY-004 | "또래 평균 비교선" |
| VOC-016 | BETA-DAY-004 | "PDF 다운로드" |
| VOC-011 | BETA-DAY-005 | "U-12 평균 기준선 제공" |
| VOC-012 | BETA-DAY-005 | "선수별 기간 데이터 누적 추이 그래프" |
| VOC-011 | BETA-DAY-006 | "U-12 평균 기준선 제공" |
| VOC-017 | BETA-DAY-006 | "포지션별 데이터 필터링" |
| VOC-011 | BETA-DAY-007 | "또래 평균 기준선" |
| VOC-018 | BETA-DAY-007 | "상대 팀 비교 분석" |
| VOC-011 | BETA-DAY-008 | "또래 평균 기준선" |
| VOC-012 | BETA-DAY-008 | "기간 데이터 비교 활용" (Coach) |
| VOC-011 | BETA-DAY-009 | "또래 평균 기준선" |
| VOC-012 | BETA-DAY-009 | "기간 데이터 비교 활용" (Coach) |
| VOC-011 | BETA-DAY-010 | "또래 평균 기준선" |
| VOC-012 | BETA-DAY-010 | "기간 데이터 비교 활용" (Coach) |
| VOC-011 | BETA-DAY-011 | "또래 평균 기준선" |
| VOC-012 | BETA-DAY-011 | "기간 데이터 비교 활용" (Coach) |
| VOC-011 | BETA-DAY-012 | "또래 평균 기준선" |
| VOC-011 | Production Day-02 | Parent · 또래/평균 기준선 추가 요청 (+1 → count 15) |
| VOC-012 | BETA-DAY-012 | "기간 데이터 비교 활용" (Coach) |

실 VOC 유입 시에만 count 증가. 추정·가상 행 금지.

---

## 금지

- Synthetic → Gate / Official Fact / Ops SoT  
- 111 맞추기용 대량 생성  
- Track B를 Track A보다 우선  
- 본 문서로 Brain/Wiring PASS 선언  
