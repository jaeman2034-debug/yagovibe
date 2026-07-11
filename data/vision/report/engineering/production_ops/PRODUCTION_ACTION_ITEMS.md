# Production Action Items

**Document ID:** `PRODUCTION-ACTION-ITEMS-001`  
**SoT:** `PRODUCTION_RUN_SHEET.md`  
**Status:** ▶ ACTIVE  
**Source:** Beta Decision §4.2 · VOC Registry · GO with Open Issue → PAI-001 PASS

> 상태 변경은 Official Fact 또는 PM 승인 후만.

---

## P1 — Known Issue / Gate

| ID | Item | Status | Owner | Note |
|---|---|---|---|---|
| **PAI-001** | `BETA-ISSUE-001` 수정 (iPhone + 카카오 인앱 로그인 재요구) | ✅ **CLOSED** | Eng | Verification **PASS** · Issue **CLOSED (Verified)** · `4d508ac` · 범위 일반화 금지 |
| **PAI-002** | iPhone+카카오 인앱 모니터링 · Escalation 경로 운영 | ▶ ACTIVE | Ops | Run Sheet §6 · 모니터링 유지 |
| **PAI-003** | Parent 독립 사용 Gate 재검증 | ✅ **CLOSED** | Ops · PM | **PASS** · 독립 사용 Y · Quote verbatim 적재 · 일반화 금지 |

---

## P2 — VOC / Product

| ID | Item | Status | Owner | Note |
|---|---|---|---|---|
| **PAI-011** | VOC-011 — 또래(팀·연령) 평균 기준선 | ✅ **PASS** · ▶ **Post-Deploy Smoke 대기** | PM · Eng | Hosting **Deployed** `64270a3` · 20:56 KST · `PAI_011_DEPLOY_FACT.md` · **COMPLETE/CLOSED 금지** · Day-03 분리 |
| **PAI-012** | VOC-012 — 기간 데이터 비교 시각화 | ▶ 관찰 | Product | Count **7** · Coach 출처 중심 · 적용 범위 구분 |

VOC SoT: `../YAGO_VOC_Trigger_로그.md` · Backlog: `../e2_step4_pilot_validation/E2_ENGINEERING_BACKLOG.md`

---

## P3 — Ops Hygiene

| ID | Item | Status | Owner | Note |
|---|---|---|---|---|
| **PAI-021** | Production Run Sheet 운영 정착 | ▶ ACTIVE | Ops | 본 체계 SoT |
| **PAI-022** | Weekly Production Review 루틴 시작 | ▶ PLANNED | PM · Ops | `PRODUCTION_WEEKLY_REVIEW.md` |
| **PAI-023** | Production KPI 일/주 누적 시작 | ▶ **ACTIVE** | Ops | Day-01 **ACCEPT** · Day-02 진행 |

---

## Beta → Production 이관 맵

| Beta Action (§4.2) | Production ID | 상태 |
|---|---|---|
| BETA-ISSUE-001 OPEN + P1 Fix 일정 | PAI-001 | ✅ CLOSED (Verified) |
| iPhone+카카오 모니터링·Escalation | PAI-002 | ACTIVE |
| Parent 독립 사용 Gate 재검증 일정 | PAI-003 | ✅ CLOSED (PASS) |
| Production Run Sheet 작성 | PAI-021 | ACTIVE |
| Beta 종료 기록 확정 | — | ✅ 완료 (Archive) |

---

**Updated:** 2026-07-11
