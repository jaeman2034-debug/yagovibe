# Production Run Sheet

**Document ID:** `PRODUCTION-RUN-SHEET-001`  
**Layer:** Engineering · Track A · Production Ops  
**notOpsSoT:** true (Vision Engineering ops — Pilot Ops SoT와 별도)  
**Status:** ▶ **ACTIVE** (Production 운영 기준 문서 · SoT)

> ❌ Pilot Ops SoT 아님 · ❌ Synthetic 혼입 금지  
> **Official Fact**와 **분석/가설**을 분리한다.  
> Beta 산출물은 Baseline으로 보존 · 본 문서는 Production 운영의 **단일 기준 문서(SoT)**다.

---

## 0. Production Decision (Baseline)

| 항목 | 값 |
|---|---|
| **판정** | **GO with Open Issue** |
| **판정일** | 2026-07-21 |
| **Decision SoT** | `../beta_ops/BETA_PM_PRODUCTION_DECISION.md` 🔒 |
| **Review SoT** | `../beta_ops/BETA_WEEK_02_PRODUCTION_REVIEW.md` 🔒 |
| **Known Issue** | `BETA-ISSUE-001` ✅ **CLOSED (Verified)** · **P1** · 모니터링=PAI-002 |
| **운영 원칙** | Official Fact ↔ 분석 분리 · Record ↔ Decision 분리 |

---

## 1. 운영 목표

1. Coach/Parent Report · 알림톡 · 모바일 열람 경로를 **안정적으로 운영**한다.
2. Known Issue(`BETA-ISSUE-001`)는 **CLOSED (Verified)** · 재발 관측·Escalation은 **PAI-002**로 운영한다.
3. Coach·Parent 활용성을 **Official Fact**로 지속 관측한다.
4. VOC·KPI를 축적하여 **Weekly Production Review** 근거를 만든다.
5. Beta Baseline을 깨지 않고 Production 기록을 **별도 체계**로 누적한다.

---

## 2. 운영 체크리스트 (Daily)

운영일마다 아래를 확인하고, 결과는 `PRODUCTION_KPI.md` 또는 Daily log에 Official Fact로만 기록한다.

| # | 항목 | 확인 |
|---:|---|---|
| 1 | Coach Report 생성 | ☐ |
| 2 | Parent Report 생성 | ☐ |
| 3 | 알림톡 발송 | ☐ |
| 4 | 모바일 열람 | ☐ |
| 5 | 로그인/세션 이슈 관측 (`BETA-ISSUE-001`) | ☐ 관측 / ☐ 미관측 |
| 6 | 기타 운영 오류 | ☐ 없음 / ☐ 있음 → Incident |
| 7 | Coach 활용 관측 (Gate 또는 Quote) | ☐ |
| 8 | Parent 활용 관측 (Gate 또는 Quote) | ☐ |

**기록 규칙**

- 관측만 Official Fact로 기록한다.
- 원인 추정은 `devAnalysisMemo` 또는 Incident 분석 섹션에만 둔다.
- Quote는 **원문(verbatim)** 보존한다.

---

## 3. KPI

상세 누적: `PRODUCTION_KPI.md`

| KPI | 정의 (관측) | 주기 |
|---|---|---|
| Report 생성 성공률 | Coach/Parent Report 정상 생성 비율 | Daily / Weekly |
| 알림톡 발송 성공률 | 알림톡 정상 발송 비율 | Daily / Weekly |
| 모바일 열람 성공률 | 모바일 뷰어 정상 열람 비율 | Daily / Weekly |
| 가동률 | 핵심 경로(Report·알림톡·모바일) 정상 운영일 비율 | Weekly |
| Coach 활성도 | Coach Gate/활용 관측 횟수 | Weekly |
| Parent 활성도 | Parent Gate/활용 관측 횟수 | Weekly |
| Known Issue 발생률 | `BETA-ISSUE-001` 재현일 / 운영일 | Weekly |
| Parent 독립 사용 Gate | usableWithoutExplanation = Y 비율 | Weekly |

---

## 4. Known Issues

상세: `PRODUCTION_ACTION_ITEMS.md` · Incident: `PRODUCTION_INCIDENTS.md`

| Issue ID | Priority | Status | Impact | Note |
|---|---|---|---|---|
| **BETA-ISSUE-001** | **P1** | ✅ **CLOSED (Verified)** | `parent_login_friction` | PAI-001 PASS · Day-03 Official Fact · 모니터링=PAI-002 ACTIVE · 일반화 금지 |

**Baseline Fact (변경 금지 · Beta LOCK)**

- Week-2: Day-08~12 **5/5일** iPhone 재현 · Android 미재현
- Parent Gate 독립 사용 **N** × 5일
- 원인: `devAnalysisMemo` — **미확인** (Official Fact 아님)

**Production 운영 규칙**

- Fix Verification **PASS** 후 상태 = **CLOSED (Verified)**. 재오픈은 신규 Official Fact + PM GO만.
- 재현 시 Official Fact만 Incident/KPI에 기록한다.
- Fix 검증 기준: `PAI_001_FIX_VERIFICATION.md` (PASS/FAIL) — 완료
- Parent 독립 사용 Gate 재검증: `PAI-003` — 완료 (CLOSED)

---

## 5. Incident 대응

상세 로그: `PRODUCTION_INCIDENTS.md`

| Severity | 정의 | 대응 |
|---|---|---|
| **S1** | Report/알림톡/모바일 핵심 경로 중단 | 즉시 Escalation · Incident 기록 |
| **S2** | Known Issue 악화 또는 신규 로그인/세션 장애 | P1 경로 · Incident 기록 |
| **S3** | 부분 불편 · 우회 가능 | Weekly Review · Action Item |

**절차**

1. Official Fact 기록 (언제 · 어디서 · 무엇을 관측했는지)
2. Severity 분류
3. Escalation (필요 시)
4. 분석/가설은 별도 섹션
5. Weekly Review에 반영

---

## 6. Escalation

| 조건 | 대상 | 비고 |
|---|---|---|
| S1 핵심 경로 중단 | PM · Engineering Lead | 즉시 |
| `BETA-ISSUE-001` 신규 환경 확대 (예: Android 재현) | PM · Engineering | 당일 |
| Parent 독립 사용 Gate 지속 N (주간) | PM | Weekly Review |
| VOC count 급증 / 신규 VOC | Product · Engineering | Backlog 반영 |

**Known Issue 모니터링 경로 (P1)**

- 환경: iPhone + 카카오톡 인앱 브라우저 · 알림톡 링크 진입
- 관측: `/login` 재요구 여부 · Android 대조
- 기록: `PRODUCTION_INCIDENTS.md` 또는 Daily KPI note

---

## 7. Daily 운영 절차

```text
1. 세션 운영 (Report 생성 · 알림톡 · 모바일)
2. §2 체크리스트 확인
3. Official Fact 기록 (KPI / Incident)
4. BETA-ISSUE-001 관측 여부 기록
5. Quote 원문 수집 (해당 시)
6. Action Items 상태 갱신 (해당 시)
```

---

## 8. Weekly Review 절차

템플릿: `PRODUCTION_WEEKLY_REVIEW.md`  
Action Item: **PAI-022** ▶ **PLANNED** (별도 PM start GO 전 Review 작성 금지)

**Production Week (PM LOCK):** 월요일 00:00 KST ~ 일요일 23:59 KST  
- Launch Partial Baseline: **2026-07-06 ~ 2026-07-12** ≠ Prod-W01  
- Prod-W01: **2026-07-13 ~ 2026-07-19** · 정규 Review는 주간 종료 후

```text
1. 주간 KPI 집계
2. Known Issue (BETA-ISSUE-001) 추이 — review-time Evidence로 Status 기입 (템플릿 기본값 없음)
3. Coach / Parent 활용 Official Fact
4. Incident 요약
5. Action Items 진행
6. VOC 변화
7. 다음 주 우선순위
```

**원칙:** Official Fact만 근거 · 추정은 분석 섹션 · Production 전환 재선언 금지(이미 GO with Open Issue)

---

## 9. 관련 문서

| 문서 | 역할 |
|---|---|
| `PRODUCTION_ACTION_ITEMS.md` | P1/P2/P3 관리 |
| `PRODUCTION_KPI.md` | KPI 누적 |
| `PRODUCTION_INCIDENTS.md` | 장애/이슈 로그 |
| `PRODUCTION_RELEASE_NOTES.md` | 릴리스 기록 |
| `PRODUCTION_WEEKLY_REVIEW.md` | 주간 리뷰 템플릿·누적 |
| `PAI_001_FIX_VERIFICATION.md` | P1 Known Issue Fix 검증 체크리스트 |
| `PAI_001_FIX_INTAKE.md` | Fix 배포 Official Fact 대기·접수 템플릿 |
| `archive/beta/README.md` | Beta Baseline 인덱스 |

**Beta Baseline (읽기 전용 · LOCK)**

- `../beta_ops/records/BETA-DAY-001.json` ~ `012.json`
- `../beta_ops/issues/BETA-ISSUE-001.json`
- `../beta_ops/BETA_WEEK_02_PRODUCTION_REVIEW.md`
- `../beta_ops/BETA_PM_PRODUCTION_DECISION.md`

---

**Owner:** Engineering Track A · PM  
**Updated:** 2026-07-12 · ISSUE-001 **CLOSED (Verified)** 유지 (Day-03 / PAI-001) · Prod-W01 Day-01 DATE_GATE_PENDING  
**Decision:** GO with Open Issue (전환 시점) → ISSUE-001 **CLOSED (Verified)** · 모니터링 PAI-002 ACTIVE
