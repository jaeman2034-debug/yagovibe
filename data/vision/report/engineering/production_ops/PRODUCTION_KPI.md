# Production KPI

**Document ID:** `PRODUCTION-KPI-001`  
**SoT:** `PRODUCTION_RUN_SHEET.md`  
**Status:** ▶ ACTIVE (누적 시작)

> Official Fact만 기록. 추정·일반화 금지. 미운영일은 공란 유지.

---

## 0. Baseline (Beta Week-2 · 참고 · 변경 금지)

| 지표 | Week-2 Official Fact |
|---|---|
| Report · 알림톡 · 모바일 | 5/5일 정상 |
| 운영 오류 | 0 |
| Coach Gate | 4/4 × 5일 |
| Parent Gate | 3/4 × 5일 (독립 사용 N) |
| BETA-ISSUE-001 | 5/5일 iPhone 재현 |

---

## 0.1 Production Week rule (PM LOCK · 2026-07-12)

| 항목 | 값 |
|---|---|
| Week boundary | **월요일 00:00 KST ~ 일요일 23:59 KST** |
| Launch Partial Baseline Week | **2026-07-06 ~ 2026-07-12** · **≠ Prod-W01** · 정규 Weekly Review 승격 금지 |
| Prod-W01 | **2026-07-13 ~ 2026-07-19** |
| First regular Weekly Review | Prod-W01 종료 후 · PAI-022 별도 PM start GO 필요 |

### Day-01 SoT pointer (파일 미생성)

Production Day-01은 `PRODUCTION_DAY_01.md`를 **만들지 않는다**.  
Canonical evidence: Tracker `2026-07-11 Day-01 · PAI-003` + `PAI_003_PARENT_GATE_REVALIDATION.md` (classification **b**).

---

## 1. Daily Log

동일 운영일(`2026-07-12`)에 Day-02 / Day-03이 공존한다. **병합·평균·덮어쓰기 금지.** Note의 `Source:`로 식별.

| Date | Coach Report | Parent Report | 알림톡 | 모바일 | ISSUE-001 | 운영 오류 | Note |
|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| 2026-07-12 | ✅ Y | ✅ Y | ✅ Y | ✅ Y | ✅ N | ✅ N | **Source: Day-02** · ACCEPT/LOCK · `PRODUCTION_DAY_02.md` |
| 2026-07-12 | ✅ (AI 분석 Y) | ✅ (Quote) | ✅ (Quote) | ✅ (Quote) | ✅ N | ✅ N | **Source: Day-03** · ACCEPT/LOCK · upload Y · players 22 · VOC-011 **15** · `PRODUCTION_DAY_03.md` |
| _YYYY-MM-DD_ | | | | | | | |

**기호:** ✅ 정상 · ⚠️ 이슈 · ❌ 실패 · — 해당 없음

> Day-02 KPI 행 = `PRODUCTION_DAY_02.md` Official Fact 1:1 backfill (PM 2026-07-12).  
> Day-03 KPI 행 = `PRODUCTION_DAY_03.md` 7항 Official Fact 근거 (기존 유지).

---

## 2. Weekly Summary

| Week | 기간 | 가동률 | Report 성공 | 알림톡 성공 | ISSUE-001 재현일 | Coach 활성 | Parent 활성 | Parent 독립사용 Y |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Launch Partial Baseline | 2026-07-06 ~ 2026-07-12 | — | — | — | — | — | — | — |
| Prod-W01 | 2026-07-13 ~ 2026-07-19 | | | | | | | |

> Launch Partial = baseline 분류만 · **정규 completed Weekly Review로 승격 금지**.  
> Prod-W01 KPI 집계·Review = 주간 종료 + PAI-022 PM start GO 후.

---

## 3. KPI 정의 (재확인)

| KPI | 계산 |
|---|---|
| 가동률 | 핵심 경로 정상 운영일 / 운영일 |
| Report 생성 성공률 | 정상 Report 건수 / 시도 건수 |
| 알림톡 발송 성공률 | 정상 발송 / 시도 |
| Known Issue 발생률 | ISSUE-001 재현 운영일 / 운영일 |
| Coach 활성도 | 활용 Gate Y 또는 Quote 수집 일수 |
| Parent 활성도 | 활용 Gate Y 또는 Quote 수집 일수 |

---

**Updated:** 2026-07-12 · PAI-022 pre-start alignment · Day-02 KPI backfill · Week rule LOCK
